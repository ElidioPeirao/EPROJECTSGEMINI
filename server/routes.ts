import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./new-storage";
import { setupAuth } from "./auth";
import { eq, sql, and, lt, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import { promisify } from "util";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { pool, db } from "@db";
import Stripe from "stripe";
import { setupLessonsMaterialsRoutes } from "./api-routes/lessons-materials";

export async function registerRoutes(app: Express): Promise<Server> {
  // Inicializar Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  
  // Setup authentication routes
  setupAuth(app);
  
  // Middleware para verificar sessão ativa
  const checkActiveSession = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return next(); // Passar para o próximo middleware - tratará a autenticação
    }
    
    try {
      // Verificar se a sessão atual está registrada como uma sessão ativa deste usuário
      const activeSession = await storage.getSessionBySessionId(req.sessionID);
      
      // Se não existe uma sessão ativa com este ID ou se a sessão pertence a outro usuário
      if (!activeSession || activeSession.userId !== req.user.id) {
        console.log(`[SESSÃO ENCERRADA] Sessão inválida detectada para ${req.user.username} (ID: ${req.user.id})`);
        console.log(`  - Rota acessada: ${req.originalUrl}`);
        console.log(`  - SessionID inválido: ${req.sessionID.substring(0, 8)}...`);
        console.log(`  - IP do cliente: ${req.ip || req.socket.remoteAddress || 'desconhecido'}`);
        
        // Verificar se há outra sessão ativa para este usuário
        const otherSessions = await storage.getUserActiveSessions(req.user.id);
        if (otherSessions.length > 0) {
          console.log(`  - Sessões ativas para este usuário: ${otherSessions.length}`);
          otherSessions.forEach(session => {
            console.log(`    > ${session.sessionId.substring(0, 8)}... (IP: ${session.ipAddress}) - Último acesso: ${session.lastActivity}`);
          });
        }
        
        // Fazer logout
        req.logout((err: any) => {
          if (err) console.error("Erro ao fazer logout de sessão inativa:", err);
        });
        
        // Destruir a sessão atual explicitamente
        req.session.destroy((err: any) => {
          if (err) console.error("Erro ao destruir sessão inválida:", err);
        });
        
        return res.status(401).json({ 
          message: "Sua conta foi acessada em outro dispositivo. Por favor, faça login novamente.",
          sessionExpired: true
        });
      }
      
      // Atualizar timestamp de atividade da sessão
      await storage.updateSessionActivity(req.sessionID);
      return next();
    } catch (error) {
      console.warn("Erro ao verificar sessão:", error);
      return next(); // Continuar mesmo com erro
    }
  };
  
  // Aplicar middleware de verificação de sessão em todas as rotas
  app.use(checkActiveSession);
  
  // Setup aulas e materiais routes
  setupLessonsMaterialsRoutes(app);
  
  // Definição de planos
  const PLANS: {
    [key: string]: {
      name: string;
      description: string;
      price: number;
      days: number;
      role: string;
    }
  } = {
    'E-TOOL': {
      name: 'Plano E-TOOL',
      description: 'Acesso a todas as ferramentas E-BASIC e E-TOOL',
      price: 9900, // R$ 99,00 em centavos
      days: 90, // 3 meses
      role: 'E-TOOL'
    },
    'E-MASTER': {
      name: 'Plano E-MASTER',
      description: 'Acesso a todas as ferramentas e cursos da plataforma',
      price: 19900, // R$ 199,00 em centavos
      days: 180, // 6 meses
      role: 'E-MASTER'
    }
  };

  // Get all tools
  app.get("/api/tools", async (req, res) => {
    try {
      const tools = await storage.getAllTools();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create new tool (admin only)
  app.post("/api/tools", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const toolData = {
        ...req.body,
        createdBy: req.user.id
      };
      
      // Validação para garantir que os dados estão completos
      if (!toolData.name || !toolData.description || !toolData.category || !toolData.accessLevel || !toolData.linkType) {
        return res.status(400).json({ message: "Dados incompletos. Todos os campos obrigatórios devem ser preenchidos." });
      }
      
      // Validação específica com base no tipo de link
      if (toolData.linkType !== "custom" && !toolData.link) {
        return res.status(400).json({ message: "O link é obrigatório para ferramentas com tipo de link externo ou interno." });
      }
      
      if (toolData.linkType === "custom" && !toolData.customHtml) {
        return res.status(400).json({ message: "O HTML personalizado é obrigatório para ferramentas com tipo de link personalizado." });
      }
      
      const newTool = await storage.createTool(toolData);
      res.status(201).json(newTool);
    } catch (error) {
      console.error("Error creating tool:", error);
      res.status(500).json({ message: "Erro ao criar ferramenta" });
    }
  });
  
  // Update tool (admin only)
  app.patch("/api/tools/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const toolId = parseInt(req.params.id);
      
      // Verificar se a ferramenta existe
      const existingTool = await storage.getToolById(toolId);
      if (!existingTool) {
        return res.status(404).json({ message: "Ferramenta não encontrada" });
      }
      
      const toolData = {
        ...req.body
      };
      
      // Validação específica com base no tipo de link, se estiver sendo atualizado
      if (toolData.linkType) {
        if (toolData.linkType !== "custom" && !toolData.link) {
          return res.status(400).json({ message: "O link é obrigatório para ferramentas com tipo de link externo ou interno." });
        }
        
        if (toolData.linkType === "custom" && !toolData.customHtml) {
          return res.status(400).json({ message: "O HTML personalizado é obrigatório para ferramentas com tipo de link personalizado." });
        }
      }
      
      const updatedTool = await storage.updateTool(toolId, toolData);
      res.json(updatedTool);
    } catch (error) {
      console.error("Error updating tool:", error);
      res.status(500).json({ message: "Erro ao atualizar ferramenta" });
    }
  });
  
  // Delete tool (admin only)
  app.delete("/api/tools/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const toolId = parseInt(req.params.id);
      
      // Verificar se a ferramenta existe
      const existingTool = await storage.getToolById(toolId);
      if (!existingTool) {
        return res.status(404).json({ message: "Ferramenta não encontrada" });
      }
      
      const success = await storage.deleteTool(toolId);
      
      if (success) {
        res.json({ success: true, message: "Ferramenta excluída com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao excluir ferramenta" });
      }
    } catch (error) {
      console.error("Error deleting tool:", error);
      res.status(500).json({ message: "Erro ao excluir ferramenta" });
    }
  });

  // Rate a tool
  app.post("/api/tools/:id/rate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const toolId = parseInt(req.params.id);
      const { rating, comment } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Avaliação deve ser entre 1 e 5" });
      }
      
      // Verificar se a ferramenta existe
      const existingTool = await storage.getToolById(toolId);
      if (!existingTool) {
        return res.status(404).json({ message: "Ferramenta não encontrada" });
      }
      
      const success = await storage.rateToolByUser(toolId, req.user.id, rating, comment);
      
      if (success) {
        res.json({ success: true, message: "Avaliação salva com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao salvar avaliação" });
      }
    } catch (error) {
      console.error("Error rating tool:", error);
      res.status(500).json({ message: "Erro ao avaliar ferramenta" });
    }
  });

  // Get tool ratings
  app.get("/api/tools/:id/ratings", async (req, res) => {
    try {
      const toolId = parseInt(req.params.id);
      
      const ratings = await storage.getToolRatings(toolId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching tool ratings:", error);
      res.status(500).json({ message: "Erro ao buscar avaliações" });
    }
  });

  // Get user's rating for a tool
  app.get("/api/tools/:id/user-rating", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const toolId = parseInt(req.params.id);
      
      const userRating = await storage.getUserRatingForTool(toolId, req.user.id);
      res.json(userRating);
    } catch (error) {
      console.error("Error fetching user rating:", error);
      res.status(500).json({ message: "Erro ao buscar avaliação do usuário" });
    }
  });
  
  // Get all users (admin only)
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const users = await storage.getAllUsers();
      
      // Remove sensitive data like passwords
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create new user (admin only)
  app.post("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const { username, email, password, role, proDays } = req.body;
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }
      
      // Hash the password
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Create the user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        cpf: req.body.cpf || "",  // CPF é obrigatório, mas usamos string vazia para admin
        role: role as any,
      });
      
      // If proDays is provided and role is not E-BASIC, extend pro status
      if (proDays && parseInt(proDays) > 0 && role !== "E-BASIC") {
        await storage.extendProStatus(user.id, parseInt(proDays));
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update user (admin only)
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const userId = parseInt(req.params.id);
      const { username, email, role, proDays, cpf } = req.body;
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Check if email already exists (if changing email)
      if (email && email !== user.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail && existingEmail.id !== userId) {
          return res.status(400).json({ message: "Email já está em uso" });
        }
      }
      
      // Check if username already exists (if changing username)
      if (username && username !== user.username) {
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername && existingUsername.id !== userId) {
          return res.status(400).json({ message: "Nome de usuário já está em uso" });
        }
      }
      
      // Verificar se é o admin modificando outro usuário
      const isAdminEditingOtherUser = req.user.role === 'admin' && req.user.id !== userId;
      
      // Preparar os dados para atualização
      const updateData: any = {};
      
      // Adicionar apenas os campos que foram fornecidos
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (role) updateData.role = role as any;
      
      // Se for um usuário editando seu próprio perfil, CPF é obrigatório
      if (!isAdminEditingOtherUser) {
        if (!cpf) {
          return res.status(400).json({ message: "CPF é obrigatório para atualização do perfil" });
        }
        updateData.cpf = cpf;
      } 
      // Se for admin editando outro usuário e cpf foi fornecido, atualizar o cpf
      else if (cpf) {
        updateData.cpf = cpf;
      }
      
      // Se não há dados para atualizar, retornar erro
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização" });
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, updateData);
      
      // If proDays is provided and role is not E-BASIC, extend pro status
      if (proDays && parseInt(proDays) > 0 && role !== "E-BASIC") {
        await storage.extendProStatus(userId, parseInt(proDays));
      }
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Falha ao atualizar usuário" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Reset user password (admin only)
  app.patch("/api/users/:id/reset-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const userId = parseInt(req.params.id);
      const { password } = req.body;
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Hash the password
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Update the user's password
      const updatedUser = await storage.updateUser(userId, {
        password: hashedPassword
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Falha ao atualizar senha" });
      }
      
      res.json({ success: true, message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Toggle password recovery settings
  app.patch("/api/users/:id/password-recovery", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = parseInt(req.params.id);
      
      // Verifique se o usuário está alterando suas próprias configurações ou é um administrador
      if (req.user.id !== userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden - You can only change your own settings" });
      }
      
      const { disablePasswordRecovery } = req.body;
      
      if (typeof disablePasswordRecovery !== 'boolean') {
        return res.status(400).json({ message: "Invalid value for disablePasswordRecovery" });
      }
      
      const updatedUser = await storage.updateUser(userId, { 
        disablePasswordRecovery: disablePasswordRecovery 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating password recovery settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Recover password - Step 1: Verify credentials and generate reset token
  app.post("/api/recover-password", async (req, res) => {
    try {
      const { identifier, cpf } = req.body;
      
      // Get user by username or email
      let user;
      if (identifier.includes('@')) {
        user = await storage.getUserByEmail(identifier);
      } else {
        user = await storage.getUserByUsername(identifier);
      }
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Check if password recovery is disabled for this user
      if (user.disablePasswordRecovery) {
        return res.status(403).json({ 
          message: "Recuperação de senha desativada. Entre em contato com o administrador via eprojects.contato@gmail.com para obter assistência." 
        });
      }
      
      // Validate CPF
      if (!user.cpf || user.cpf !== cpf) {
        return res.status(400).json({ message: "CPF inválido" });
      }
      
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token válido por 1 hora
      
      // Save reset token to user record
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry: expiresAt
      });
      
      // Return token to client for step 2
      res.status(200).json({ 
        success: true, 
        token: resetToken,
        message: "Verificação realizada com sucesso. Prossiga para redefinir sua senha."
      });
    } catch (error) {
      console.error("Error in password recovery:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Reset password - Step 2: Set new password using the token
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(404).json({ message: "Token inválido ou expirado" });
      }
      
      // Check if token is expired
      if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ message: "Token expirado. Inicie o processo de recuperação novamente." });
      }
      
      // Hash the new password
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Update user's password and clear reset token
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Falha ao atualizar senha" });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Senha redefinida com sucesso"
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Delete user (admin only)
  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent deleting your own account
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Delete the user
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Falha ao excluir usuário" });
      }
      
      res.json({ success: true, message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all courses
  app.get("/api/courses", async (req, res) => {
    try {
      // Admin can see all courses, others only visible ones
      if (req.isAuthenticated() && req.user.role === "admin") {
        const courses = await storage.getAllCourses(true);
        res.json(courses);
      } else {
        const courses = await storage.getVisibleCourses();
        res.json(courses);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create new course (admin only)
  app.post("/api/courses", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const courseData = {
        ...req.body,
        createdBy: req.user.id,
        isHidden: req.body.isHidden || false
      };
      
      const course = await storage.createCourse(courseData);
      
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update course (admin only)
  app.patch("/api/courses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const courseId = parseInt(req.params.id);
      
      // Check if course exists
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      const updatedCourse = await storage.updateCourse(courseId, req.body);
      
      if (!updatedCourse) {
        return res.status(500).json({ message: "Falha ao atualizar curso" });
      }
      
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete course (admin only)
  app.delete("/api/courses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const courseId = parseInt(req.params.id);
      
      // Check if course exists
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      const success = await storage.deleteCourse(courseId);
      
      if (!success) {
        return res.status(500).json({ message: "Falha ao excluir curso" });
      }
      
      res.json({ success: true, message: "Curso excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Toggle course visibility (admin only)
  app.patch("/api/courses/:id/toggle-visibility", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const courseId = parseInt(req.params.id);
      const { isHidden } = req.body;
      
      if (isHidden === undefined) {
        return res.status(400).json({ message: "O campo isHidden é obrigatório" });
      }
      
      // Check if course exists
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      const updatedCourse = await storage.toggleCourseVisibility(courseId, isHidden);
      
      if (!updatedCourse) {
        return res.status(500).json({ message: "Falha ao atualizar visibilidade do curso" });
      }
      
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error toggling course visibility:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all promo codes (admin only)
  app.get("/api/promocodes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create new promo code (admin only)
  app.post("/api/promocodes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const { code, days, maxUses, promoType, targetRole, courseId, expiryDate } = req.body;
      
      // Check if code already exists
      const existingPromoCode = await storage.getPromoCodeByCode(code);
      if (existingPromoCode) {
        return res.status(400).json({ message: "Código promocional já existe" });
      }
      
      // Convert days and maxUses to numbers
      const daysNum = parseInt(days);
      const maxUsesNum = parseInt(maxUses);
      
      // Convert courseId to number if provided
      let courseIdNum = undefined;
      if (courseId) {
        courseIdNum = parseInt(courseId);
        
        // Verify course exists if courseId is provided
        if (promoType === 'course') {
          const course = await storage.getCourseById(courseIdNum);
          if (!course) {
            return res.status(400).json({ message: "Curso não encontrado" });
          }
        }
      }
      
      // Calculate expiry date if provided
      let expiryDateObj = undefined;
      if (expiryDate) {
        expiryDateObj = new Date(expiryDate);
      }
      
      const promoCode = await storage.createPromoCode({
        code,
        days: daysNum,
        maxUses: maxUsesNum,
        promoType: promoType as 'role' | 'course',
        targetRole: targetRole || 'E-BASIC',
        courseId: courseIdNum,
        isActive: true,
        createdBy: req.user.id,
        validUntil: expiryDateObj,
      });
      
      res.status(201).json(promoCode);
    } catch (error) {
      console.error("Error creating promo code:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Use promo code
  app.post("/api/promocodes/use", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Código promocional é obrigatório" });
      }
      
      // Check if it's a course promo code
      const promoCode = await storage.getPromoCodeByCode(code);
      
      if (!promoCode) {
        return res.status(404).json({ message: "Código promocional não encontrado" });
      }
      
      if (promoCode.promoType === 'course') {
        if (!promoCode.courseId) {
          return res.status(400).json({ message: "Código promocional inválido: curso não especificado" });
        }
        
        const result = await storage.useCoursePromoCode(code, promoCode.courseId, req.user.id);
        return res.json(result);
      } else {
        // Role promo code
        const result = await storage.usePromoCode(code, req.user.id);
        return res.json(result);
      }
    } catch (error) {
      console.error("Error using promo code:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete promo code (admin only)
  app.delete("/api/promocodes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const promoId = parseInt(req.params.id);
      
      // Verificar se o código promocional existe
      const promoCode = await db.query.promoCodes.findFirst({
        where: eq(schema.promoCodes.id, promoId)
      });
      
      if (!promoCode) {
        return res.status(404).json({ message: "Código promocional não encontrado" });
      }
      
      // Excluir usando transação SQL direta para garantir a ordem correta
      await db.transaction(async (tx) => {
        // 1. Primeiro, excluir todos os registros de uso do código promocional
        await tx.execute(sql`DELETE FROM ${schema.promoUsage} WHERE promo_id = ${promoId}`);
        
        // 2. Depois, excluir o próprio código promocional
        await tx.execute(sql`DELETE FROM ${schema.promoCodes} WHERE id = ${promoId}`);
      });
      
      res.json({ success: true, message: "Código promocional excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forçar verificação de planos expirados (admin only)
  app.post("/api/admin/check-expired-plans", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      // Buscar manualmente usuários com planos expirados usando SQL direto
      const expiredUsers = await pool.query(`
        SELECT id, username, email, role, role_expiry_date 
        FROM users 
        WHERE role_expiry_date < NOW() 
        AND role IN ('E-TOOL', 'E-MASTER')
      `);
      
      let processedCount = 0;
      
      for (const user of expiredUsers.rows) {
        // Rebaixar para E-BASIC
        await storage.updateUser(user.id, {
          role: 'E-BASIC',
          roleExpiryDate: null
        });
        
        // Criar notificação
        await storage.createNotification({
          title: "Plano Expirado",
          message: `Seu upgrade para ${user.role} expirou e sua conta foi revertida para E-BASIC. Para continuar usando as funcionalidades avançadas, adquira um novo plano ou use um código promocional.`,
          type: "warning",
          targetRole: "E-BASIC",
          userId: user.id
        });
        
        processedCount++;
        console.log(`Manual check: Reverted user ${user.username} (ID: ${user.id}) from ${user.role} to E-BASIC`);
      }
      
      res.json({ 
        success: true, 
        message: `Verificação executada com sucesso. ${processedCount} usuários processados.`,
        processedUsers: processedCount
      });
    } catch (error) {
      console.error("Error checking expired plans:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all notifications
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const targetRole = req.user.role;
      const userId = req.user.id;
      
      const notifications = await storage.getNotifications(targetRole, userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create notification (admin only)
  app.post("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const { title, message, type, targetRole, link, userId } = req.body;
      
      // Verificar se é uma notificação para um usuário específico
      if (userId) {
        // Notificação individual para um usuário específico
        const notification = await storage.createNotification({
          title,
          message,
          type,
          targetRole: 'individual', // Definir como individual quando destinada a um usuário específico
          link,
          userId,
          createdBy: req.user.id
        });
        
        res.status(201).json(notification);
      } 
      // Notificação para um papel específico ou para todos
      else {
        const notification = await storage.createNotification({
          title,
          message,
          type,
          targetRole: targetRole || 'all', // Default para 'all' se não especificado
          link,
          userId: null, // Garantir que userId seja null para notificações de papel ou gerais
          createdBy: req.user.id
        });
        
        res.status(201).json(notification);
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Criar notificações para todos os usuários de um determinado papel
  app.post("/api/notifications/bulk", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const { title, message, type, targetRole, link } = req.body;
      
      if (!targetRole || targetRole === 'all') {
        // Se o targetRole for 'all' ou não for especificado, busca todos os usuários
        const allUsers = await storage.getAllUsers();
        
        const notifications = await Promise.all(
          allUsers.map(user => 
            storage.createNotification({
              title,
              message,
              type: type || 'info',
              targetRole: 'individual', // Sempre individual para notificações em massa
              link,
              userId: user.id,
              createdBy: req.user.id
            })
          )
        );
        
        res.status(201).json({ 
          message: `Notificação enviada para ${notifications.length} usuários`,
          count: notifications.length 
        });
      } 
      else {
        // Buscar todos os usuários com o papel específico
        const usersWithRole = await storage.getAllUsers().then(users => 
          users.filter(user => user.role === targetRole)
        );
        
        const notifications = await Promise.all(
          usersWithRole.map(user => 
            storage.createNotification({
              title,
              message,
              type: type || 'info',
              targetRole: 'individual', // Sempre individual para notificações em massa
              link,
              userId: user.id,
              createdBy: req.user.id
            })
          )
        );
        
        res.status(201).json({ 
          message: `Notificação enviada para ${notifications.length} usuários com papel ${targetRole}`,
          count: notifications.length 
        });
      }
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const notificationId = parseInt(req.params.id);
      
      const notification = await storage.markNotificationAsRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get notifications for current user
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      // Obter o papel do usuário atual e seu ID
      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Buscar notificações relevantes para o usuário
      const notifications = await storage.getNotifications(userRole, userId);
      
      // Filtrar as notificações de ticket/suporte e upgrade de plano, mantendo apenas as de compra de curso
      const filteredNotifications = notifications.filter(notification => {
        // Excluir notificações de ticket de suporte
        if (notification.title.includes("ticket") || 
            notification.title.includes("Ticket") || 
            notification.title.includes("suporte") || 
            notification.title.toLowerCase().includes("nova mensagem")) {
          return false;
        }
        
        // Excluir notificações de upgrade de plano
        if (notification.title.includes("Upgrade de plano")) {
          return false;
        }
        
        // Manter as demais notificações
        return true;
      });
      
      res.json(filteredNotifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete notification (admin only)
  app.delete("/api/notifications/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const notificationId = parseInt(req.params.id);
      
      const success = await storage.deleteNotification(notificationId);
      
      if (!success) {
        return res.status(500).json({ message: "Falha ao excluir notificação" });
      }
      
      res.json({ success: true, message: "Notificação excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Verificar acesso a um curso específico
  app.get("/api/courses/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const courseId = parseInt(req.params.id);
    
    if (isNaN(courseId)) {
      return res.status(400).json({ message: "ID do curso inválido" });
    }
    
    try {
      // Verificar se o curso existe
      const course = await storage.getCourseById(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      // Administradores têm acesso a todos os cursos
      if (req.user.role === 'admin') {
        return res.json({
          hasAccess: true,
          requiresPromoCode: course.requiresPromoCode,
          message: "Acesso de administrador",
          hasPurchased: false
        });
      }
      
      // Verificar se o usuário já comprou o curso (para cursos pagos)
      let hasPurchased = false;
      
      if (course.price) {
        // Verificar se há uma compra ativa para o curso
        hasPurchased = await storage.checkCoursePurchaseActive(req.user.id, courseId);
      }
      
      // Verificar se o usuário tem acesso ao curso
      const hasAccess = await storage.checkCourseAccess(courseId, req.user.id);
      
      // Se o curso é pago e foi comprado, ou se o usuário tem acesso de outra forma
      if (hasPurchased || hasAccess) {
        return res.json({
          hasAccess: true,
          requiresPromoCode: course.requiresPromoCode,
          message: hasPurchased ? "Curso comprado" : "Acesso disponível",
          hasPurchased
        });
      }
      
      // Verificar se o usuário tem o nível de acesso necessário (E-MASTER)
      if (req.user.role === 'E-MASTER' && !course.requiresPromoCode && !course.isHidden) {
        return res.json({
          hasAccess: true,
          requiresPromoCode: false,
          message: "Acesso com papel E-MASTER",
          hasPurchased: false
        });
      }
      
      // Sem acesso
      return res.json({
        hasAccess: false,
        requiresPromoCode: course.requiresPromoCode,
        message: course.requiresPromoCode 
          ? "Este curso requer um código promocional para acesso" 
          : (course.price ? "Este curso requer compra para acesso" : "Você não tem acesso a este curso"),
        hasPurchased: false
      });
      
    } catch (error) {
      console.error("Erro ao verificar acesso ao curso:", error);
      return res.status(500).json({ message: "Erro ao verificar acesso ao curso" });
    }
  });
  
  // Rota para criar intenção de pagamento para compra de curso
  app.post("/api/courses/:id/purchase", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const courseId = parseInt(req.params.id);
      
      if (isNaN(courseId)) {
        return res.status(400).json({ message: "ID do curso inválido" });
      }
      
      // Verificar se o curso existe
      const course = await storage.getCourseById(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      // Verificar se o curso é pago
      if (!course.price) {
        return res.status(400).json({ message: "Este curso não está disponível para compra" });
      }
      
      // Verificar se o preço está definido corretamente
      const price = course.price.toString();
      if (!price || parseFloat(price) <= 0) {
        return res.status(400).json({ message: "Preço do curso inválido" });
      }
      
      // Verificar se o usuário já tem comprado o curso
      const hasPurchased = await storage.checkCoursePurchaseActive(req.user.id, courseId);
      if (hasPurchased) {
        return res.status(400).json({ message: "Você já adquiriu este curso" });
      }
      
      // Verificar se o usuário já tem acesso ao curso via código promocional ou outro meio
      const hasAccess = await storage.checkCourseAccess(courseId, req.user.id);
      if (hasAccess) {
        return res.status(400).json({ message: "Você já tem acesso a este curso" });
      }
      
      // Criar ou atualizar cliente no Stripe
      let customerId = req.user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.username,
          metadata: {
            userId: req.user.id.toString()
          }
        });
        
        customerId = customer.id;
        
        // Atualizar o ID do cliente do Stripe no banco de dados
        await storage.updateStripeCustomerId(req.user.id, customerId);
      }
      
      // Criar produto no Stripe para o curso (se necessário)
      let product;
      
      try {
        // Verificar se o produto já existe
        product = await stripe.products.retrieve(`course_${courseId}`);
      } catch (error) {
        // Criar o produto se não existir
        product = await stripe.products.create({
          id: `course_${courseId}`,
          name: course.title,
          description: course.description || `Curso: ${course.title}`,
          metadata: {
            courseId: courseId.toString()
          }
        });
      }
      
      // Converter o preço para centavos e garantir valor mínimo
      const priceValue = parseFloat(price);
      
      // Garantir que o valor seja pelo menos 0.50 BRL (valor mínimo aceito pelo Stripe)
      const minAmount = 0.50;
      const adjustedPrice = priceValue < minAmount ? minAmount : priceValue;
      
      const amountInCents = Math.round(adjustedPrice * 100);
      
      // Criar intenção de pagamento
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'brl',
        customer: customerId,
        metadata: {
          type: 'course_purchase',
          courseId: courseId.toString(),
          userId: req.user.id.toString(),
          productId: product.id
        }
      });
      
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error: any) {
      console.error("Erro ao criar intenção de pagamento:", error);
      res.status(500).json({ message: "Erro ao processar pagamento" });
    }
  });
  
  // Get course details
  app.get("/api/courses/:id", async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      
      const course = await storage.getCourseById(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      // If course is hidden and user is not admin, don't show it
      if (course.isHidden && (!req.isAuthenticated() || req.user.role !== "admin")) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      // Get lessons for this course
      const lessons = await storage.getLessonsByCourseId(courseId);
      
      // Get materials for this course
      const materials = await storage.getMaterialsByCourseId(courseId);
      
      // Check if user has course access
      let hasAccess = false;
      if (req.isAuthenticated()) {
        // Admins have access to everything
        if (req.user.role === "admin") {
          hasAccess = true;
        } else if (req.user.role === "E-MASTER") {
          // E-MASTER has access to all non-hidden courses
          hasAccess = !course.isHidden;
        } else {
          // Check specific course access for other roles
          hasAccess = await storage.checkCourseAccess(courseId, req.user.id);
        }
      }
      
      res.json({
        course,
        lessons,
        materials,
        hasAccess
      });
    } catch (error) {
      console.error("Error fetching course details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // ===== CHAT ROUTES =====
  
  // Get user's chat threads
  app.get("/api/chat/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const threads = await storage.getChatThreads(req.user.id);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching chat threads:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get admin chat threads
  app.get("/api/chat/admin/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const threads = await storage.getAdminChatThreads();
      res.json(threads);
    } catch (error) {
      console.error("Error fetching admin chat threads:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get unread count for admin
  app.get("/api/chat/admin/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const count = await storage.getUnreadThreadsCountForAdmin();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get unread count for user
  app.get("/api/chat/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const count = await storage.getUnreadThreadsCountForUser(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create new chat thread
  app.post("/api/chat/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { subject } = req.body;
      
      if (!subject) {
        return res.status(400).json({ message: "Assunto é obrigatório" });
      }
      
      const thread = await storage.createChatThread({
        subject,
        userId: req.user.id,
        status: "open",
        isUserUnread: false,
        isAdminUnread: true
      });
      
      // As notificações de ticket foram removidas conforme solicitado
      
      res.status(201).json(thread);
    } catch (error) {
      console.error("Error creating chat thread:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get chat thread details
  app.get("/api/chat/threads/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const threadId = parseInt(req.params.id);
      
      const thread = await storage.getChatThreadById(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Only the thread owner or an admin can view it
      if (thread.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mark thread as read by the user
      if (thread.userId === req.user.id) {
        await storage.markThreadAsReadForUser(threadId);
      } else if (req.user.role === "admin") {
        await storage.markThreadAsReadForAdmin(threadId);
      }
      
      // Se o admin estiver visualizando, adicione informações do usuário
      if (req.user.role === "admin") {
        const user = await storage.getUser(thread.userId);
        if (user) {
          thread.userName = user.username;
        }
      }
      
      res.json({ thread });
    } catch (error) {
      console.error("Error fetching chat thread details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get messages for chat thread
  app.get("/api/chat/threads/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const threadId = parseInt(req.params.id);
      
      const thread = await storage.getChatThreadById(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Only the thread owner or an admin can view messages
      if (thread.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const messages = await storage.getChatMessagesByThreadId(threadId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create new chat message
  app.post("/api/chat/threads/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const threadId = parseInt(req.params.id);
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Conteúdo da mensagem é obrigatório" });
      }
      
      const thread = await storage.getChatThreadById(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Only the thread owner or an admin can post messages
      if (thread.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // If thread is closed, only admin can reopen it
      if (thread.status === "closed" && req.user.role !== "admin") {
        return res.status(400).json({ message: "Esta conversa está fechada" });
      }
      
      // If thread was closed and admin is responding, reopen it
      if (thread.status === "closed" && req.user.role === "admin") {
        await storage.updateChatThread(threadId, { status: "open" });
      }
      
      // Determine if this is an admin message
      const isAdminMessage = req.user.role === "admin";
      
      // Update read status based on who's sending the message
      if (isAdminMessage) {
        await storage.markThreadAsReadForAdmin(threadId);
        await storage.updateChatThread(threadId, { isUserUnread: true });
        // Notificação de resposta do admin removida conforme solicitado
      } else {
        await storage.markThreadAsReadForUser(threadId);
        await storage.updateChatThread(threadId, { isAdminUnread: true });
      }
      
      // Create the message
      const chatMessage = await storage.createChatMessage({
        threadId,
        message,
        userId: req.user.id,
        isAdminMessage
      });
      
      res.status(201).json(chatMessage);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Close chat thread
  app.patch("/api/chat/threads/:id/close", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const threadId = parseInt(req.params.id);
      
      const thread = await storage.getChatThreadById(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Only the thread owner or an admin can close it
      if (thread.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedThread = await storage.closeChatThread(threadId);
      
      if (!updatedThread) {
        return res.status(500).json({ message: "Falha ao fechar conversa" });
      }
      
      // If admin closed the thread, notify the user
      if (req.user.role === "admin" && thread.userId !== req.user.id) {
        await storage.createNotification({
          title: "Ticket fechado",
          message: `Seu ticket "${thread.subject}" foi fechado pelo administrador`,
          type: "chat",
          targetRole: "individual",
          userId: thread.userId,
          link: `/chat/${threadId}`,
          createdBy: req.user.id
        });
      }
      
      res.json(updatedThread);
    } catch (error) {
      console.error("Error closing chat thread:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete chat thread (admin only)
  app.delete("/api/chat/threads/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const threadId = parseInt(req.params.id);
      
      const thread = await storage.getChatThreadById(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Delete all messages in this thread
      const success = await pool.query('DELETE FROM chat_messages WHERE thread_id = $1', [threadId]);
      
      if (!success) {
        return res.status(500).json({ message: "Falha ao excluir mensagens" });
      }
      
      // Delete the thread
      const threadSuccess = await pool.query('DELETE FROM chat_threads WHERE id = $1', [threadId]);
      
      if (!threadSuccess) {
        return res.status(500).json({ message: "Falha ao excluir conversa" });
      }
      
      res.json({ success: true, message: "Conversa excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting chat thread:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Webservices e outras rotas existentes...
  // (código existente omitido para brevidade)

  // ===== ROTAS DE UPGRADE COM STRIPE =====
  
  // Rota movida para implementação mais abaixo que usa preços do banco de dados
  
  // Criar intenção de pagamento para upgrade de plano
  app.post("/api/upgrade/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { planType, months } = req.body;
      
      if (!planType || !months) {
        return res.status(400).json({ message: "Plano e duração são obrigatórios" });
      }
      
      // Validação de meses (entre 1 e 12)
      const monthsNum = parseInt(months);
      if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 12) {
        return res.status(400).json({ message: "Duração inválida. Escolha entre 1 e 12 meses" });
      }
      
      // Verificar se o usuário está tentando fazer upgrade para um plano menor
      const roleHierarchy: { [key: string]: number } = {
        'E-BASIC': 1,
        'E-TOOL': 2,
        'E-MASTER': 3,
        'admin': 4
      };
      
      const currentRoleValue = roleHierarchy[req.user.role] || 0;
      const planRoleValue = roleHierarchy[planType] || 0;
      
      if (planRoleValue <= currentRoleValue) {
        return res.status(400).json({ 
          message: "Você não pode fazer upgrade para um plano de nível inferior ou igual ao seu plano atual" 
        });
      }
      
      // Buscar preço do plano no banco de dados
      const planPrices = await db.query.planPrices.findMany({
        where: eq(schema.planPrices.planType, planType)
      });
      
      if (!planPrices || planPrices.length === 0) {
        return res.status(400).json({ message: "Plano não encontrado" });
      }
      
      const monthlyPrice = parseFloat(planPrices[0].monthlyPrice.toString());
      const totalPrice = monthlyPrice * monthsNum;
      
      // Garantir que o valor seja pelo menos 0.50 BRL (valor mínimo aceito pelo Stripe)
      const minAmount = 0.50;
      const adjustedPrice = totalPrice < minAmount ? minAmount : totalPrice;
      
      const amountInCents = Math.round(adjustedPrice * 100);
      const totalDays = monthsNum * 30; // Aproximadamente 30 dias por mês
      
      // Criar ou atualizar cliente no Stripe
      let customerId = req.user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.username,
          metadata: {
            userId: req.user.id.toString()
          }
        });
        
        customerId = customer.id;
        
        // Atualizar o ID do cliente do Stripe no banco de dados
        await storage.updateStripeCustomerId(req.user.id, customerId);
      }
      
      // Criar intenção de pagamento
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'brl',
        customer: customerId,
        metadata: {
          type: 'plan_upgrade',
          upgradeType: 'role', // Adicionando o campo upgradeType que é verificado no webhook
          planType,
          userId: req.user.id.toString(),
          days: totalDays.toString(),
          months: monthsNum.toString(),
          durationDays: totalDays.toString(), // Também adicionando durationDays que é usado no webhook
          monthlyPrice: monthlyPrice.toString(),
          totalPrice: totalPrice.toString()
        }
      });
      
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error: any) {
      console.error("Erro ao criar intenção de pagamento:", error);
      res.status(500).json({ message: "Erro ao processar pagamento" });
    }
  });
  
  // Criar intenção de pagamento para um curso específico
  app.post("/api/courses/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { courseId, price } = req.body;
      
      if (!courseId || !price) {
        return res.status(400).json({ message: "ID do curso e preço são obrigatórios" });
      }
      
      // Buscar o curso para verificar se ele existe
      const course = await storage.getCourseById(parseInt(courseId));
      
      if (!course) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      // Verificar se o usuário já tem acesso ao curso
      const hasAccess = await storage.checkCourseAccess(parseInt(courseId), req.user.id);
      
      if (hasAccess) {
        return res.status(400).json({ message: "Você já tem acesso a este curso" });
      }
      
      // Criar ou atualizar cliente no Stripe
      let customerId = req.user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.username,
          metadata: {
            userId: req.user.id.toString()
          }
        });
        
        customerId = customer.id;
        
        // Atualizar o ID do cliente do Stripe no banco de dados
        await storage.updateStripeCustomerId(req.user.id, customerId);
      }
      
      // Criar produto no Stripe para o curso (se necessário)
      let product;
      
      try {
        // Verificar se o produto já existe
        product = await stripe.products.retrieve(`course_${courseId}`);
      } catch (error) {
        // Criar o produto se não existir
        product = await stripe.products.create({
          id: `course_${courseId}`,
          name: course.title,
          description: course.description || `Curso: ${course.title}`,
          metadata: {
            courseId: courseId.toString()
          }
        });
      }
      
      // Converter o preço para centavos e garantir valor mínimo
      const priceValue = parseFloat(price);
      
      // Garantir que o valor seja pelo menos 0.50 BRL (valor mínimo aceito pelo Stripe)
      const minAmount = 0.50;
      const adjustedPrice = priceValue < minAmount ? minAmount : priceValue;
      
      const amountInCents = Math.round(adjustedPrice * 100);
      
      // Criar intenção de pagamento
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'brl',
        customer: customerId,
        metadata: {
          type: 'course_purchase',
          courseId: courseId.toString(),
          userId: req.user.id.toString(),
          productId: product.id
        }
      });
      
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error: any) {
      console.error("Erro ao criar intenção de pagamento para curso:", error);
      res.status(500).json({ message: "Erro ao processar pagamento" });
    }
  });
  
  // Confirmar pagamento e atualizar o usuário
  app.post("/api/upgrade/confirm-payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "ID da intenção de pagamento é obrigatório" });
      }
      
      // Recuperar intenção de pagamento do Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Verificar se o pagamento foi bem-sucedido
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Pagamento não concluído com sucesso" });
      }
      
      // Verificar se o usuário é o dono do pagamento
      if (paymentIntent.metadata.userId !== req.user.id.toString()) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Determinar o tipo de pagamento (upgrade de plano ou compra de curso)
      const paymentType = paymentIntent.metadata.type;
      
      if (paymentType === 'plan_upgrade') {
        // Processamento de upgrade de plano
        const planType = paymentIntent.metadata.planType;
        const days = parseInt(paymentIntent.metadata.days || '0');
        
        if (!planType || !days) {
          return res.status(400).json({ message: "Dados de plano inválidos" });
        }
        
        // Atualizar o usuário com os detalhes do Stripe
        await storage.updateStripeInfo(
          req.user.id, 
          paymentIntent.customer as string, 
          paymentIntent.id
        );
        
        // Estender status pro com os dias do plano
        const updatedUser = await storage.extendProStatus(req.user.id, days);
        
        // Atualizar o papel do usuário
        if (updatedUser) {
          await storage.updateUser(req.user.id, { role: planType });
          
          // Notificação de upgrade de plano removida conforme solicitado
        }
        
        res.json({ 
          success: true,
          message: "Upgrade de plano concluído com sucesso!"
        });
      } 
      else if (paymentType === 'course_purchase') {
        // Processamento de compra de curso
        const courseId = parseInt(paymentIntent.metadata.courseId || '0');
        
        if (!courseId) {
          return res.status(400).json({ message: "Dados do curso inválidos" });
        }
        
        // Verificar se o curso existe
        const course = await storage.getCourseById(courseId);
        
        if (!course) {
          return res.status(404).json({ message: "Curso não encontrado" });
        }
        
        // Criar registro de compra de curso com acesso de 30 dias
        try {
          // Definir data de expiração (30 dias a partir de agora)
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          
          const purchase = await storage.createCoursePurchase({
            userId: req.user.id,
            courseId,
            price: (paymentIntent.amount / 100).toFixed(2), // Converter de centavos para reais com 2 casas decimais
            stripePaymentId: paymentIntent.id,
            expiresAt: expiryDate
          });
          
          if (!purchase) {
            return res.status(500).json({ message: "Falha ao registrar compra do curso" });
          }
        } catch (error) {
          console.error("Erro ao registrar compra de curso:", error);
          return res.status(500).json({ message: "Erro ao processar compra do curso" });
        }
        
        // Adicionar notificação sobre a compra APENAS para o usuário que comprou
        await storage.createNotification({
          title: "Compra de curso concluída",
          message: `Sua compra do curso "${course.title}" foi concluída com sucesso. Você já tem acesso ao conteúdo por 30 dias!`,
          type: "success",
          targetRole: "individual",
          userId: req.user.id, // ID do usuário que fez a compra
          link: `/course/${courseId}`,
          createdBy: req.user.id
        });
        
        res.json({ 
          success: true,
          message: "Compra de curso concluída com sucesso!"
        });
      }
      else {
        return res.status(400).json({ message: "Tipo de pagamento não reconhecido" });
      }
    } catch (error: any) {
      console.error("Erro ao confirmar pagamento:", error);
      res.status(500).json({ message: "Erro ao processar confirmação de pagamento" });
    }
  });
  
  // Obter planos disponíveis para upgrade
  app.get("/api/upgrade/plans", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      // Planos disponíveis baseados no papel atual do usuário
      const currentRole = req.user.role;
      const plans: Record<string, any> = {};
      
      // Obter preços dos planos do banco de dados
      const planPricesResult = await db.query.planPrices.findMany();
      const planPrices: Record<string, any> = {};
      
      planPricesResult.forEach(plan => {
        planPrices[plan.planType] = {
          monthlyPrice: parseFloat(plan.monthlyPrice.toString())
        };
      });
      
      // Lógica para definir quais planos estão disponíveis
      if (currentRole === "E-BASIC") {
        if (planPrices["E-TOOL"]) {
          plans["E-TOOL"] = {
            name: "Plano E-TOOL", 
            description: "Acesso às ferramentas exclusivas E-TOOL",
            price: Math.round(planPrices["E-TOOL"].monthlyPrice * 100), // Converter para centavos
            monthlyPrice: planPrices["E-TOOL"].monthlyPrice,
            days: 30,
            minMonths: 1,
            maxMonths: 12
          };
        }
        
        if (planPrices["E-MASTER"]) {
          plans["E-MASTER"] = {
            name: "Plano E-MASTER",
            description: "Acesso completo a todas as ferramentas e cursos disponíveis",
            price: Math.round(planPrices["E-MASTER"].monthlyPrice * 100), // Converter para centavos
            monthlyPrice: planPrices["E-MASTER"].monthlyPrice,
            days: 30,
            minMonths: 1,
            maxMonths: 12
          };
        }
      } else if (currentRole === "E-TOOL") {
        if (planPrices["E-MASTER"]) {
          // Desconto de 20% para upgrade de E-TOOL para E-MASTER
          const discountedPrice = planPrices["E-MASTER"].monthlyPrice * 0.8;
          
          plans["E-MASTER"] = {
            name: "Plano E-MASTER",
            description: "Acesso completo a todas as ferramentas e cursos disponíveis",
            price: Math.round(discountedPrice * 100), // Converter para centavos
            monthlyPrice: discountedPrice,
            days: 30,
            minMonths: 1,
            maxMonths: 12
          };
        }
      }
      
      res.json(plans);
    } catch (error) {
      console.error("Erro ao obter planos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota movida para a parte superior do arquivo

  // Atualizar preço de um curso (admin)
  app.post("/api/courses/:id/set-price", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const { id } = req.params;
      const { price } = req.body;
      
      if (price === undefined) {
        return res.status(400).json({ message: "Preço é obrigatório" });
      }
      
      const courseId = parseInt(id);
      
      // Verificar se o curso existe
      const course = await storage.getCourseById(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Curso não encontrado" });
      }
      
      // Atualizar o preço do curso - garantir que o preço seja uma string para o decimal no banco
      const updatedCourse = await storage.updateCourse(courseId, { price: price.toString() });
      
      if (!updatedCourse) {
        return res.status(400).json({ message: "Falha ao atualizar o preço do curso" });
      }
      
      // Atualizar ou criar o preço no Stripe
      let product;
      
      try {
        // Verificar se o produto já existe
        product = await stripe.products.retrieve(`course_${courseId}`);
      } catch (error) {
        // Criar o produto se não existir
        product = await stripe.products.create({
          id: `course_${courseId}`,
          name: course.title,
          description: course.description || `Curso: ${course.title}`,
          metadata: {
            courseId: courseId.toString()
          }
        });
      }
      
      res.json({
        success: true,
        course: updatedCourse
      });
    } catch (error: any) {
      console.error("Erro ao definir preço do curso:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Novos endpoints para gerenciamento de preços (para uso no novo sistema de gerenciamento de preços)
  // Endpoint para atualizar preço de curso
  app.post("/api/admin/course-prices", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const { courseId, price } = req.body;
      
      if (courseId === undefined) {
        return res.status(400).json({
          message: "ID do curso é obrigatório"
        });
      }
      
      // Verificar se o curso existe
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({
          message: "Curso não encontrado"
        });
      }
      
      // Se o preço for null, remover o preço do curso
      // Caso contrário, atualizar para o novo preço
      const priceUpdate = price === null ? { price: null } : { price: price.toString() };
      
      const updatedCourse = await storage.updateCourse(courseId, priceUpdate);
      
      res.status(200).json({
        success: true,
        course: updatedCourse
      });
    } catch (error) {
      console.error("Erro ao atualizar preço do curso:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Endpoint para obter preços dos planos
  app.get("/api/upgrade/plans/prices", async (req, res) => {
    try {
      const planPrices = await db.query.planPrices.findMany();
      
      // Formatar os resultados para facilitar acesso no cliente
      const formattedPrices: Record<string, any> = {};
      
      planPrices.forEach(plan => {
        formattedPrices[plan.planType] = {
          monthlyPrice: parseFloat(plan.monthlyPrice.toString())
        };
      });
      
      res.json(formattedPrices);
    } catch (error) {
      console.error("Erro ao buscar preços dos planos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para atualizar preço de plano
  app.post("/api/admin/plan-prices", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      const { planType, monthlyPrice } = req.body;
      
      if (!planType || monthlyPrice === undefined) {
        return res.status(400).json({
          message: "Tipo de plano e preço mensal são obrigatórios"
        });
      }
      
      // Verificar se o tipo de plano é válido
      if (planType !== "E-TOOL" && planType !== "E-MASTER") {
        return res.status(400).json({
          message: "Tipo de plano inválido. Deve ser 'E-TOOL' ou 'E-MASTER'"
        });
      }

      // Atualizar preço no banco de dados
      const existingPrice = await db.query.planPrices.findFirst({
        where: eq(schema.planPrices.planType, planType)
      });

      if (existingPrice) {
        // Atualizar preço existente
        await db.update(schema.planPrices)
          .set({ monthlyPrice: monthlyPrice.toString() })
          .where(eq(schema.planPrices.planType, planType));
      } else {
        // Inserir novo preço
        await db.insert(schema.planPrices).values({
          planType,
          monthlyPrice: monthlyPrice.toString()
        });
      }
      
      res.status(200).json({
        success: true,
        planType,
        monthlyPrice
      });
    } catch (error) {
      console.error("Erro ao atualizar preço do plano:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Função para obter o usuário a partir do ID da sessão
  async function getSessionUser(sessionId: string): Promise<schema.User | null> {
    try {
      // Obter a sessão do banco
      const result = await pool.query(
        'SELECT sess FROM session WHERE sid = $1',
        [sessionId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Extrair o ID do usuário da sessão
      const session = result.rows[0].sess;
      const passport = session?.passport;
      
      if (!passport || !passport.user) {
        return null;
      }
      
      const userId = passport.user;
      
      // Buscar o usuário no banco
      const user = await storage.getUser(userId);
      
      return user || null;
    } catch (error) {
      console.error('Erro ao obter usuário da sessão:', error);
      return null;
    }
  }

  // Webhook para receber eventos do Stripe
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      
      if (!sig) {
        return res.status(400).json({ message: "Faltando assinatura do Stripe" });
      }
      
      let event;
      
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET || ""
        );
      } catch (err: any) {
        console.error(`Erro na verificação da assinatura: ${err.message}`);
        return res.status(400).json({ message: `Erro na verificação da assinatura: ${err.message}` });
      }
      
      // Processar evento de pagamento bem-sucedido
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { metadata } = paymentIntent;
        
        if (!metadata) {
          return res.status(400).json({ message: "Pagamento sem metadados" });
        }
        
        // Verificar o tipo de upgrade
        const upgradeType = metadata.upgradeType;
        
        if (upgradeType === "role") {
          // Processar upgrade de papel
          const userId = parseInt(metadata.userId || "0");
          const planType = metadata.planType;
          
          if (!userId || !planType) {
            return res.status(400).json({ message: "Metadados de pagamento inválidos" });
          }
          
          // Verificar se o plano é válido
          if (planType !== 'E-TOOL' && planType !== 'E-MASTER') {
            return res.status(400).json({ message: "Tipo de plano inválido" });
          }
          
          // Pegar o usuário atual
          const user = await storage.getUser(userId);
          
          if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
          }
          
          // Obter a duração em dias dos metadados ou usar 30 dias como padrão
          const durationDays = parseInt(metadata.durationDays || "30");
          
          // Calcular data de expiração com base na duração
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + durationDays);
          
          // Atualizar papel do usuário
          const updatedUser = await storage.updateUser(userId, { 
            role: planType,
            roleExpiryDate: expiryDate
          });
          
          // Notificação de upgrade de plano removida conforme solicitado
          if (updatedUser) {
            console.log(`Usuário ${userId} atualizado para ${planType} com sucesso`);
          }
        } else if (metadata.type === 'course_purchase') {
          // Processar compra de curso
          const userId = parseInt(metadata.userId || "0");
          const courseId = parseInt(metadata.courseId || "0");
          
          if (!userId || !courseId) {
            return res.status(400).json({ message: "Metadados de pagamento inválidos" });
          }
          
          // Verificar se o curso existe
          const course = await storage.getCourseById(courseId);
          
          if (!course) {
            return res.status(404).json({ message: "Curso não encontrado" });
          }
          
          // Definir data de expiração (30 dias a partir de agora)
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          
          try {
            // Criar registro de compra
            const purchase = await storage.createCoursePurchase({
              userId: userId,
              courseId: courseId,
              price: (paymentIntent.amount / 100).toFixed(2),
              stripePaymentId: paymentIntent.id,
              expiresAt: expiryDate
            });
            
            if (purchase) {
              // Adicionar notificação sobre a compra APENAS para o usuário que comprou
              await storage.createNotification({
                title: "Compra de curso concluída",
                message: `Sua compra do curso "${course.title}" foi concluída com sucesso. Você já tem acesso ao conteúdo!`,
                type: "success",
                targetRole: "individual",
                userId: userId,
                link: `/course/${courseId}`
              });
              
              console.log(`Compra de curso ${courseId} registrada para o usuário ${userId}`);
            }
          } catch (error) {
            console.error("Erro ao registrar compra de curso via webhook:", error);
            return res.status(500).json({ message: "Erro ao processar compra do curso" });
          }
        }
      }
      
      // Processar eventos de assinatura expirada ou cancelada
      if (event.type === 'customer.subscription.deleted' || 
          event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Verificar se a assinatura foi cancelada ou expirou
        if (subscription.status === 'canceled' || 
            subscription.status === 'unpaid' || 
            subscription.status === 'past_due') {
          
          console.log(`Assinatura ${subscription.status}: ${subscription.id}`);
          
          // Buscar usuário pela subscription ID
          const users = await storage.getAllUsers();
          const user = users.find(u => u.stripeSubscriptionId === subscription.id);
          
          if (user && (user.role === 'E-TOOL' || user.role === 'E-MASTER')) {
            console.log(`Rebaixando usuário ${user.username} (ID: ${user.id}) para E-BASIC devido à assinatura ${subscription.status}`);
            
            // Rebaixar para E-BASIC
            await storage.updateUser(user.id, {
              role: 'E-BASIC',
              roleExpiryDate: null
            });
            
            // Criar notificação para o usuário
            await storage.createNotification({
              title: "Assinatura Expirada",
              message: `Sua assinatura ${user.role} foi ${subscription.status === 'canceled' ? 'cancelada' : 'expirou'} e sua conta foi revertida para E-BASIC. Para continuar usando as funcionalidades avançadas, renove sua assinatura.`,
              type: "warning",
              targetRole: "E-BASIC",
              userId: user.id
            });
          }
        }
      }
      
      res.json({ received: true });
    } catch (error: any) {
      console.error("Erro no webhook do Stripe:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Endpoint para forçar verificação de planos expirados (admin only)
  app.post("/api/admin/force-expiration-check", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    try {
      console.log(`[${new Date().toISOString()}] Verificação manual de planos expirados iniciada pelo admin ${req.user.username}`);
      
      // Executar verificação de planos expirados
      await storage.checkAndRemoveExpiredPromoUpgrades();
      
      res.json({
        success: true,
        message: "Verificação de planos expirados executada com sucesso"
      });
    } catch (error) {
      console.error("Erro ao executar verificação de planos expirados:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Configurar servidor HTTP
  const httpServer = createServer(app);
  
  // Configurar WebSocket Server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  // Manipular conexões de WebSocket
  wss.on('connection', (ws: WebSocket) => {
    let userId: number | null = null;
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'auth') {
          // Autenticar usuário pelo sessionId
          const sessionId = data.sessionId;
          if (!sessionId) return;
          
          const user = await getSessionUser(sessionId);
          
          if (user) {
            userId = user.id;
            console.log(`WebSocket autenticado: usuário ${userId}`);
            
            // Enviar confirmação de autenticação
            ws.send(JSON.stringify({
              type: 'auth_result',
              success: true,
              userId
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'auth_result',
              success: false,
              error: 'Falha na autenticação'
            }));
          }
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        console.log(`WebSocket desconectado: usuário ${userId}`);
      }
    });
  });

  return httpServer;
}