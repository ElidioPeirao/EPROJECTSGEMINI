import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "eprojects-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: 'Email ou senha incorretos' });
          } else {
            return done(null, user);
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: unknown, done) => {
    try {
      // Ensure id is a number
      const userId = typeof id === 'number' ? id : parseInt(id as string, 10);
      
      if (isNaN(userId)) {
        return done(new Error("Invalid user ID"), null);
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return done(null, null);
      }
      
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }
      
      // Check if CPF already exists
      if (req.body.cpf) {
        const existingCpf = await storage.getUserByCpf(req.body.cpf);
        if (existingCpf) {
          return res.status(400).json({ 
            message: "CPF já cadastrado no sistema. Se você já possui uma conta, faça login ou entre em contato com o suporte."
          });
        }
      }

      // Default role is E-BASIC for all new users
      // Special promo code for admin role
      let userRole: "E-BASIC" | "E-TOOL" | "E-MASTER" | "admin" = "E-BASIC";
      if (req.body.promoCode === 'ELIDIOFODA') {
        userRole = "admin";
      }

      const user = await storage.createUser({
        username: req.body.username,
        email: req.body.email,
        password: await hashPassword(req.body.password),
        cpf: req.body.cpf, // CPF do usuário
        role: userRole,
        disablePasswordRecovery: false // Por padrão, a recuperação de senha está ativada
      });

      // If they used a regular promo code, apply it now
      if (req.body.promoCode && req.body.promoCode !== 'ELIDIOFODA') {
        await storage.usePromoCode(req.body.promoCode, user.id);
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      req.login(user, async (err) => {
        if (err) return next(err);
        
        try {
          // Capturar informações sobre o dispositivo do usuário
          const userAgent = req.headers['user-agent'] || 'unknown';
          const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
          
          // Registrar nova sessão
          await storage.createSession({
            userId: user.id,
            sessionId: req.sessionID,
            userAgent,
            ipAddress
          });
        } catch (sessionError) {
          console.warn("Erro ao criar sessão durante registro:", sessionError);
          // Continuar mesmo com erro na criação da sessão
        }
        
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(400).json({ message: info?.message || "Email ou senha incorretos" });
      
      try {
        // Registrar sessões existentes antes de removê-las (para depuração)
        const existingSessions = await storage.getUserActiveSessions(user.id);
        if (existingSessions.length > 0) {
          console.log(`Desconectando ${existingSessions.length} sessões existentes para o usuário ${user.id} (${user.username})`);
          existingSessions.forEach(session => {
            console.log(`- Sessão ${session.sessionId.substring(0, 8)}... criada em ${session.createdAt}, última atividade: ${session.lastActivity}`);
          });
        }
        
        // Verificar se o usuário já possui sessões ativas e removê-las
        await storage.deleteSessions(user.id);
        
        // Login normal do passport
        req.login(user, async (loginErr) => {
          if (loginErr) return next(loginErr);
          
          // Captura informações sobre o dispositivo do usuário
          const userAgent = req.headers['user-agent'] || 'unknown';
          const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
          
          console.log(`Novo login: usuário ${user.id} (${user.username}) - Sessão ${req.sessionID.substring(0, 8)}... IP: ${ipAddress}`);
          
          // Registrar nova sessão
          await storage.createSession({
            userId: user.id,
            sessionId: req.sessionID,
            userAgent,
            ipAddress
          });
          
          // Atualizar timestamp de último login
          await storage.updateUser(user.id, { lastLogin: new Date() });
          
          // Remove password from response
          const { password, ...userWithoutPassword } = user;
          return res.status(200).json(userWithoutPassword);
        });
      } catch (error) {
        console.error("Erro ao gerenciar sessão do usuário:", error);
        return next(error);
      }
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    try {
      if (req.isAuthenticated() && req.user) {
        // Remover todas as sessões ativas do usuário
        await storage.deleteSessions(req.user.id);
      }
      
      // Se houver uma sessão atual específica, remover também
      if (req.sessionID) {
        await storage.deleteSession(req.sessionID);
      }
      
      req.logout((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      next(error);
    }
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Verificar se a sessão atual é a mesma que está registrada para o usuário
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        req.logout((err) => {
          if (err) console.error("Erro ao fazer logout de usuário não encontrado:", err);
        });
        return res.sendStatus(401);
      }
      
      try {
        // Verificar se a sessão atual está registrada como uma sessão ativa deste usuário
        const activeSession = await storage.getSessionBySessionId(req.sessionID);
        
        // Se não existe uma sessão ativa com este ID ou se a sessão pertence a outro usuário
        if (!activeSession || activeSession.userId !== user.id) {
          console.log(`Sessão inválida detectada: usuário ${user.id} está tentando usar a sessão ${req.sessionID} que não está registrada ou pertence a outro usuário`);
          
          // Fazer logout
          req.logout((err) => {
            if (err) console.error("Erro ao fazer logout de sessão inativa:", err);
          });
          
          // Destruir a sessão atual explicitamente
          req.session.destroy((err) => {
            if (err) console.error("Erro ao destruir sessão inválida:", err);
          });
          
          return res.status(401).json({ 
            message: "Sua conta foi acessada em outro dispositivo. Por favor, faça login novamente.",
            sessionExpired: true
          });
        }
        
        // Atualizar timestamp de atividade da sessão
        await storage.updateSessionActivity(req.sessionID);
      } catch (error) {
        // Se houver erro ao verificar a sessão (provavelmente porque a tabela ainda não existe),
        // permitir o acesso e registrar a sessão
        console.warn("Erro ao verificar sessão (tabela pode não existir ainda):", error);
        
        // Tente criar a sessão usando o método legado como fallback
        try {
          await storage.updateUserSession(user.id, req.sessionID);
        } catch (sessionError) {
          console.warn("Não foi possível atualizar a sessão:", sessionError);
        }
      }
      
      // Se chegou aqui, a sessão é válida
      // Remove password from response
      const { password, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Erro ao verificar sessão de usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Endpoint para verificar status da sessão
  app.get("/api/session-status", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ authenticated: false });
    }
    
    res.json({ 
      authenticated: true,
      sessionId: req.sessionID,
      userId: req.user.id
    });
  });
}
