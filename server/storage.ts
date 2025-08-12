import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, lt, gte, or, desc, asc, isNull, sql } from "drizzle-orm";
import { addDays } from "date-fns";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "@db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<schema.User | undefined>;
  getUserByUsername(username: string): Promise<schema.User | undefined>;
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  getUserByResetToken(token: string): Promise<schema.User | undefined>;
  getUserByActiveSessionId(sessionId: string): Promise<schema.User | undefined>;
  createUser(user: Omit<schema.InsertUser, "role"> & { role?: string }): Promise<schema.User>;
  updateUser(id: number, data: Partial<schema.User>): Promise<schema.User | undefined>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<schema.User | undefined>;
  updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<schema.User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<schema.User[]>;
  
  // Session methods
  createSession(sessionData: schema.InsertActiveSession & { userAgent?: string; ipAddress?: string }): Promise<schema.ActiveSession>;
  getSessionBySessionId(sessionId: string): Promise<schema.ActiveSession | undefined>;
  getUserActiveSessions(userId: number): Promise<schema.ActiveSession[]>;
  updateSessionActivity(sessionId: string): Promise<schema.ActiveSession | undefined>;
  deleteSession(sessionId: string): Promise<boolean>;
  deleteSessions(userId: number): Promise<boolean>;
  clearAllSessions(): Promise<boolean>;
  
  // Tool methods
  createTool(tool: schema.InsertTool): Promise<schema.Tool>;
  updateTool(id: number, data: Partial<schema.Tool>): Promise<schema.Tool | undefined>;
  deleteTool(id: number): Promise<boolean>;
  getAllTools(): Promise<schema.Tool[]>;
  getToolsByCategory(category: string): Promise<schema.Tool[]>;
  getToolById(id: number): Promise<schema.Tool | undefined>;
  
  // Promo code methods
  createPromoCode(promoCode: schema.InsertPromoCode): Promise<schema.PromoCode>;
  getPromoCodeByCode(code: string): Promise<schema.PromoCode | undefined>;
  updatePromoCode(id: number, data: Partial<schema.PromoCode>): Promise<schema.PromoCode | undefined>;
  deletePromoCode(id: number): Promise<boolean>;
  getAllPromoCodes(): Promise<schema.PromoCode[]>;
  usePromoCode(code: string, userId: number): Promise<{ success: boolean; message: string; days?: number; user?: schema.User }>;
  useCoursePromoCode(code: string, courseId: number, userId: number): Promise<{ success: boolean; message: string; days?: number }>;
  checkCourseAccess(courseId: number, userId: number): Promise<boolean>;
  getCoursePromoCodes(courseId: number): Promise<schema.PromoCode[]>;
  
  // Update pro status
  extendProStatus(userId: number, days: number): Promise<schema.User | undefined>;
  
  // Course methods
  createCourse(course: schema.InsertCourse): Promise<schema.Course>;
  updateCourse(id: number, data: Partial<schema.Course>): Promise<schema.Course | undefined>;
  toggleCourseVisibility(id: number, isHidden: boolean): Promise<schema.Course | undefined>;
  deleteCourse(id: number): Promise<boolean>;
  getAllCourses(includeHidden?: boolean): Promise<schema.Course[]>;
  getVisibleCourses(): Promise<schema.Course[]>;
  getCoursesByCategory(category: string, includeHidden?: boolean): Promise<schema.Course[]>;
  getCourseById(id: number): Promise<schema.Course | undefined>;
  
  // Course purchases methods
  createCoursePurchase(purchase: schema.InsertCoursePurchase & { userId: number }): Promise<schema.CoursePurchase>;
  getUserCoursePurchases(userId: number): Promise<schema.CoursePurchase[]>;
  getCoursePurchase(userId: number, courseId: number): Promise<schema.CoursePurchase | undefined>;
  checkCoursePurchaseActive(userId: number, courseId: number): Promise<boolean>;
  
  // Lesson methods
  createLesson(lesson: schema.InsertLesson): Promise<schema.Lesson>;
  updateLesson(id: number, data: Partial<schema.Lesson>): Promise<schema.Lesson | undefined>;
  deleteLesson(id: number): Promise<boolean>;
  getLessonsByCourseId(courseId: number): Promise<schema.Lesson[]>;
  getLessonById(id: number): Promise<schema.Lesson | undefined>;
  
  // Material methods
  createMaterial(material: schema.InsertMaterial): Promise<schema.Material>;
  updateMaterial(id: number, data: Partial<schema.Material>): Promise<schema.Material | undefined>;
  deleteMaterial(id: number): Promise<boolean>;
  getMaterialsByCourseId(courseId: number): Promise<schema.Material[]>;
  getMaterialsByLessonId(lessonId: number): Promise<schema.Material[]>;
  getMaterialById(id: number): Promise<schema.Material | undefined>;
  
  // Notification methods
  createNotification(notification: schema.InsertNotification): Promise<schema.Notification>;
  getNotifications(targetRole: string, userId?: number): Promise<schema.Notification[]>;
  getNotificationById(id: number): Promise<schema.Notification | undefined>;
  markNotificationAsRead(id: number): Promise<schema.Notification | undefined>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Chat methods
  createChatThread(threadData: schema.InsertChatThread & { userId: number }): Promise<schema.ChatThread>;
  getChatThreads(userId: number): Promise<schema.ChatThread[]>;
  getChatThreadById(threadId: number): Promise<schema.ChatThread | undefined>;
  getAdminChatThreads(): Promise<schema.ChatThread[]>;
  updateChatThread(threadId: number, data: Partial<schema.ChatThread>): Promise<schema.ChatThread | undefined>;
  closeChatThread(threadId: number): Promise<schema.ChatThread | undefined>;
  markThreadAsReadForUser(threadId: number): Promise<schema.ChatThread | undefined>;
  markThreadAsReadForAdmin(threadId: number): Promise<schema.ChatThread | undefined>;
  
  // Chat message methods
  createChatMessage(messageData: schema.InsertChatMessage & { userId: number; isAdminMessage: boolean }): Promise<schema.ChatMessage>;
  getChatMessagesByThreadId(threadId: number): Promise<schema.ChatMessage[]>;
  getUnreadThreadsCountForAdmin(): Promise<number>;
  getUnreadThreadsCountForUser(userId: number): Promise<number>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session',
      pruneSessionInterval: 60 // Clean up sessions every minute
    });
    
    // Clear all sessions on startup
    this.clearAllSessions().catch(err => console.error("Error clearing sessions on startup:", err));
    
    // Schedule job to deactivate expired course purchases
    this.scheduleExpiredPurchasesCheck();
  }
  
  private scheduleExpiredPurchasesCheck() {
    // Check for expired purchases every hour
    setInterval(async () => {
      try {
        // Desativar compras expiradas
        const now = new Date();
        await db.update(schema.coursePurchases)
          .set({ active: false })
          .where(and(
            eq(schema.coursePurchases.active, true),
            lt(schema.coursePurchases.expiresAt, now)
          ));
        console.log('Checked for expired course purchases');
      } catch (error) {
        console.error('Error checking expired purchases:', error);
      }
    }, 60 * 60 * 1000); // 1 hora
  }
  
  // Métodos de gerenciamento de sessão
  
  async createSession(sessionData: schema.InsertActiveSession & { userAgent?: string; ipAddress?: string }): Promise<schema.ActiveSession> {
    try {
      // Primeiro, vamos excluir sessões existentes para esse usuário
      await this.deleteSessions(sessionData.userId);
      
      // Criar a nova sessão
      const [session] = await db.insert(schema.activeSessions)
        .values({
          userId: sessionData.userId,
          sessionId: sessionData.sessionId,
          userAgent: sessionData.userAgent,
          ipAddress: sessionData.ipAddress
        })
        .returning();
      
      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }
  
  async getSessionBySessionId(sessionId: string): Promise<schema.ActiveSession | undefined> {
    try {
      const session = await db.query.activeSessions.findFirst({
        where: eq(schema.activeSessions.sessionId, sessionId)
      });
      
      return session;
    } catch (error) {
      console.error('Error getting session by ID:', error);
      return undefined;
    }
  }
  
  async getUserActiveSessions(userId: number): Promise<schema.ActiveSession[]> {
    try {
      const sessions = await db.query.activeSessions.findMany({
        where: eq(schema.activeSessions.userId, userId)
      });
      
      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }
  
  async updateSessionActivity(sessionId: string): Promise<schema.ActiveSession | undefined> {
    try {
      const [session] = await db.update(schema.activeSessions)
        .set({ lastActivity: new Date() })
        .where(eq(schema.activeSessions.sessionId, sessionId))
        .returning();
      
      return session;
    } catch (error) {
      console.error('Error updating session activity:', error);
      return undefined;
    }
  }
  
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Excluir a sessão do Express
      this.sessionStore.destroy(sessionId);
      
      // Excluir do nosso controle de sessões
      await db.delete(schema.activeSessions)
        .where(eq(schema.activeSessions.sessionId, sessionId));
      
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }
  
  async deleteSessions(userId: number): Promise<boolean> {
    try {
      // Buscar sessões ativas do usuário
      const sessions = await this.getUserActiveSessions(userId);
      
      // Destruir cada sessão do Express
      for (const session of sessions) {
        try {
          this.sessionStore.destroy(session.sessionId);
        } catch (err) {
          console.error(`Erro ao destruir sessão ${session.sessionId}:`, err);
        }
      }
      
      // Remover todas as sessões do banco de dados
      await db.delete(schema.activeSessions)
        .where(eq(schema.activeSessions.userId, userId));
      
      return true;
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      return false;
    }
  }
  
  async clearAllSessions(): Promise<boolean> {
    try {
      // Buscar todas as sessões ativas
      const activeSessions = await db.select().from(schema.activeSessions);
      
      // Destruir cada sessão do Express
      for (const session of activeSessions) {
        try {
          this.sessionStore.destroy(session.sessionId);
        } catch (err) {
          console.error(`Erro ao destruir sessão ${session.sessionId}:`, err);
        }
      }
      
      // Limpar a tabela de sessões do Express
      await pool.query('DELETE FROM session');
      
      // Limpar nossa tabela de controle de sessões - usar query para evitar erros de sintaxe
      await db.delete(schema.activeSessions);
      
      console.log('All sessions cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing sessions:', error);
      return false;
    }
  }
  
  // User methods
  async getUser(id: number): Promise<schema.User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
    return result;
  }
  
  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(schema.users.username, username),
    });
    return result;
  }
  
  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    return result;
  }
  
  async getUserByResetToken(token: string): Promise<schema.User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(schema.users.resetToken, token),
    });
    return result;
  }
  
  async createUser(user: Omit<schema.InsertUser, "role"> & { role?: "E-BASIC" | "E-TOOL" | "E-MASTER" | "admin" }): Promise<schema.User> {
    const role = user.role || "E-BASIC";
    const [result] = await db.insert(schema.users)
      .values({ ...user, role })
      .returning();
    return result;
  }
  
  async getUserByCpf(cpf: string): Promise<schema.User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(schema.users.cpf, cpf),
    });
    return result;
  }
  
  async getUserByActiveSessionId(sessionId: string): Promise<schema.User | undefined> {
    try {
      // Buscar a sessão ativa com esse ID
      const session = await this.getSessionBySessionId(sessionId);
      
      if (!session) {
        return undefined;
      }
      
      // Buscar o usuário associado à sessão
      const user = await this.getUser(session.userId);
      return user;
    } catch (error) {
      console.error('Error getting user by session ID:', error);
      return undefined;
    }
  }
  
  async updateUser(id: number, data: Partial<schema.User>): Promise<schema.User | undefined> {
    const updated = await db.update(schema.users)
      .set(data)
      .where(eq(schema.users.id, id))
      .returning();
    
    return updated.length > 0 ? updated[0] : undefined;
  }
  
  // Estes métodos são obsoletos - preservados para compatibilidade
  // Porém agora delegam para os novos métodos de sessão
  
  async updateUserSession(userId: number, sessionId: string): Promise<schema.User | undefined> {
    try {
      // Criar uma nova sessão para o usuário (isso já vai remover sessões antigas)
      await this.createSession({ 
        userId,
        sessionId,
        userAgent: "unknown", // Este método legado não tem essa informação
        ipAddress: "unknown"  // Este método legado não tem essa informação
      });
      
      // Atualizar o timestamp de último login
      const updated = await db.update(schema.users)
        .set({ lastLogin: new Date() })
        .where(eq(schema.users.id, userId))
        .returning();
      
      return updated.length > 0 ? updated[0] : undefined;
    } catch (error) {
      console.error('Error updating user session:', error);
      return undefined;
    }
  }
  
  async clearUserSession(userId: number): Promise<boolean> {
    // Agora delegamos para o novo método de exclusão de sessões
    return this.deleteSessions(userId);
  }
  
  async updateStripeCustomerId(userId: number, customerId: string): Promise<schema.User | undefined> {
    return await this.updateUser(userId, { stripeCustomerId: customerId });
  }
  
  async updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<schema.User | undefined> {
    return await this.updateUser(userId, { 
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId
    });
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // First, delete all chat threads and messages
      const userThreads = await db.query.chatThreads.findMany({
        where: eq(schema.chatThreads.userId, id),
      });
      
      for (const thread of userThreads) {
        // Delete all messages in this thread
        await db.delete(schema.chatMessages)
          .where(eq(schema.chatMessages.threadId, thread.id));
        
        // Delete the thread
        await db.delete(schema.chatThreads)
          .where(eq(schema.chatThreads.id, thread.id));
      }
      
      // Delete any notifications targeted to this user
      await db.delete(schema.notifications)
        .where(eq(schema.notifications.userId, id));
      
      // Delete any promo code usage
      await db.delete(schema.promoUsage)
        .where(eq(schema.promoUsage.userId, id));
      
      // Delete any course purchases
      await db.delete(schema.coursePurchases)
        .where(eq(schema.coursePurchases.userId, id));
      
      // Finally, delete the user
      const deleted = await db.delete(schema.users)
        .where(eq(schema.users.id, id))
        .returning();
      
      return deleted.length > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
  
  async getAllUsers(): Promise<schema.User[]> {
    return await db.query.users.findMany();
  }
  
  // Tool methods
  async createTool(tool: schema.InsertTool): Promise<schema.Tool> {
    const [result] = await db.insert(schema.tools)
      .values(tool)
      .returning();
    return result;
  }
  
  async updateTool(id: number, data: Partial<schema.Tool>): Promise<schema.Tool | undefined> {
    const updated = await db.update(schema.tools)
      .set(data)
      .where(eq(schema.tools.id, id))
      .returning();
    
    return updated.length > 0 ? updated[0] : undefined;
  }
  
  async deleteTool(id: number): Promise<boolean> {
    const deleted = await db.delete(schema.tools)
      .where(eq(schema.tools.id, id))
      .returning();
    
    return deleted.length > 0;
  }
  
  async getAllTools(): Promise<schema.Tool[]> {
    return await db.query.tools.findMany();
  }
  
  async getToolsByCategory(category: string): Promise<schema.Tool[]> {
    return await db.query.tools.findMany({
      where: eq(schema.tools.category, category),
    });
  }
  
  async getToolById(id: number): Promise<schema.Tool | undefined> {
    return await db.query.tools.findFirst({
      where: eq(schema.tools.id, id),
    });
  }
  
  // Promo code methods
  async createPromoCode(promoCode: schema.InsertPromoCode): Promise<schema.PromoCode> {
    const [result] = await db.insert(schema.promoCodes)
      .values(promoCode)
      .returning();
    return result;
  }
  
  async getPromoCodeByCode(code: string): Promise<schema.PromoCode | undefined> {
    return await db.query.promoCodes.findFirst({
      where: eq(schema.promoCodes.code, code),
    });
  }
  
  async updatePromoCode(id: number, data: Partial<schema.PromoCode>): Promise<schema.PromoCode | undefined> {
    const updated = await db.update(schema.promoCodes)
      .set(data)
      .where(eq(schema.promoCodes.id, id))
      .returning();
    
    return updated.length > 0 ? updated[0] : undefined;
  }
  
  async deletePromoCode(id: number): Promise<boolean> {
    try {
      // Primeiro, verificamos se o código promocional existe
      const promoCode = await db.query.promoCodes.findFirst({
        where: eq(schema.promoCodes.id, id)
      });
      
      if (!promoCode) {
        return false;
      }
      
      // Primeiro, excluímos todos os registros de uso deste código promocional
      await db.delete(schema.promoUsage)
        .where(eq(schema.promoUsage.promoId, id));
      
      // Depois, excluímos o próprio código promocional
      const deleted = await db.delete(schema.promoCodes)
        .where(eq(schema.promoCodes.id, id))
        .returning();
      
      return deleted.length > 0;
    } catch (error) {
      console.error("Erro ao excluir código promocional:", error);
      return false;
    }
  }
  
  async getAllPromoCodes(): Promise<schema.PromoCode[]> {
    return await db.query.promoCodes.findMany();
  }
  
  // Método para usar um código promocional de upgrade de papel
  async usePromoCode(code: string, userId: number): Promise<{ success: boolean; message: string; days?: number; user?: schema.User }> {
    // Verificar se o código existe e está ativo
    const promoCode = await this.getPromoCodeByCode(code);
    
    if (!promoCode || !promoCode.isActive) {
      return { success: false, message: "Código promocional inválido ou inativo." };
    }
    
    // Verificar se o código já atingiu o número máximo de usos
    if (promoCode.usedCount >= promoCode.maxUses) {
      return { success: false, message: "Este código promocional já atingiu o limite máximo de usos." };
    }
    
    // Verificar se o código já expirou (se tiver data de expiração)
    if (promoCode.expiryDate && promoCode.expiryDate < new Date()) {
      return { success: false, message: "Este código promocional expirou." };
    }
    
    // Verificar se é o tipo correto de código promocional
    if (promoCode.promoType !== 'role') {
      return { success: false, message: "Este código promocional não é para upgrade de papel." };
    }
    
    // Verificar se o usuário já usou este código
    const existingUsage = await db.query.promoUsage.findFirst({
      where: and(
        eq(schema.promoUsage.promoId, promoCode.id),
        eq(schema.promoUsage.userId, userId)
      )
    });
    
    if (existingUsage) {
      return { success: false, message: "Você já usou este código promocional." };
    }
    
    // Get user
    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, message: "Usuário não encontrado." };
    }
    
    // Registrar o uso do código
    await db.insert(schema.promoUsage)
      .values({
        promoId: promoCode.id,
        userId: userId,
        usedAt: new Date()
      });
    
    // Estender o status pro do usuário
    const updatedUser = await this.extendProStatus(userId, promoCode.days);
    
    // Increment used count
    await db.update(schema.promoCodes)
      .set({ usedCount: promoCode.usedCount + 1 })
      .where(eq(schema.promoCodes.id, promoCode.id));
    
    return { 
      success: true, 
      message: `Código promocional ativado! Seu plano foi atualizado para ${updatedUser?.role} por ${promoCode.days} dias.`,
      days: promoCode.days,
      user: updatedUser
    };
  }
  
  // Método para usar um código promocional de acesso a curso
  async useCoursePromoCode(code: string, courseId: number, userId: number): Promise<{ success: boolean; message: string; days?: number }> {
    // Verificar se o código existe e está ativo
    const promoCode = await this.getPromoCodeByCode(code);
    
    if (!promoCode || !promoCode.isActive) {
      return { success: false, message: "Código promocional inválido ou inativo." };
    }
    
    // Verificar se o código já atingiu o número máximo de usos
    if (promoCode.usedCount >= promoCode.maxUses) {
      return { success: false, message: "Este código promocional já atingiu o limite máximo de usos." };
    }
    
    // Verificar se o código já expirou (se tiver data de expiração)
    if (promoCode.expiryDate && promoCode.expiryDate < new Date()) {
      return { success: false, message: "Este código promocional expirou." };
    }
    
    // Verificar se é o tipo correto de código promocional e para o curso correto
    if (promoCode.promoType !== 'course' || promoCode.courseId !== courseId) {
      return { success: false, message: "Este código promocional não é válido para este curso." };
    }
    
    // Get course
    const course = await this.getCourseById(courseId);
    if (!course) {
      return { success: false, message: "Curso não encontrado." };
    }
    
    // Verificar se o usuário já usou este código
    const existingUsage = await db.query.promoUsage.findFirst({
      where: and(
        eq(schema.promoUsage.promoId, promoCode.id),
        eq(schema.promoUsage.userId, userId)
      )
    });
    
    if (existingUsage) {
      return { success: false, message: "Você já usou este código promocional." };
    }
    
    // Registrar o uso do código
    await db.insert(schema.promoUsage)
      .values({
        promoId: promoCode.id,
        userId: userId,
        usedAt: new Date()
      });
    
    // Increment used count
    await db.update(schema.promoCodes)
      .set({ usedCount: promoCode.usedCount + 1 })
      .where(eq(schema.promoCodes.id, promoCode.id));
    
    return { 
      success: true, 
      message: `Código promocional ativado! Você ganhou acesso ao curso "${course.title}" por ${promoCode.days} dias.`,
      days: promoCode.days
    };
  }
  
  // Verificar se um usuário tem acesso a um curso específico
  async checkCourseAccess(courseId: number, userId: number): Promise<boolean> {
    try {
      // Get course
      const course = await this.getCourseById(courseId);
      if (!course) {
        return false;
      }
      
      // Get user
      const user = await this.getUser(userId);
      if (!user) {
        return false;
      }
      
      // Admins can access all courses
      if (user.role === "admin") {
        return true;
      }
      
      // Check if user has a valid purchase for this course
      const hasPurchase = await this.checkCoursePurchaseActive(userId, courseId);
      if (hasPurchase) {
        return true;
      }
      
      // E-MASTER users can access all unpaid courses that are visible
      if (user.role === "E-MASTER" && (!course.price || parseFloat(course.price.toString()) === 0) && !course.isHidden) {
        return true;
      }

      // If the course doesn't require a promo code and isn't hidden, it's accessible to all users
      if (!course.requiresPromoCode && !course.isHidden && (!course.price || parseFloat(course.price.toString()) === 0)) {
        return true;
      }
      
      // If course requires a promo code, check if the user has used a valid one
      if (course.requiresPromoCode) {
        // Encontrar um código promocional para este curso que o usuário tenha usado
        const coursePromos = await db.query.promoCodes.findMany({
          where: and(
            eq(schema.promoCodes.promoType, 'course'),
            eq(schema.promoCodes.courseId, courseId),
            eq(schema.promoCodes.isActive, true)
          )
        });
        
        if (coursePromos.length === 0) {
          return false;
        }
        
        // Verificar se o usuário usou algum desses códigos
        for (const promo of coursePromos) {
          const usage = await db.query.promoUsage.findFirst({
            where: and(
              eq(schema.promoUsage.promoId, promo.id),
              eq(schema.promoUsage.userId, userId)
            )
          });
          
          if (usage) {
            // Verificar se o código ainda é válido (não expirou)
            const usageDate = usage.usedAt;
            const validUntil = new Date(usageDate);
            validUntil.setDate(validUntil.getDate() + promo.days);
            
            if (validUntil >= new Date()) {
              return true;
            }
          }
        }
      } else {
        // Se o curso não requer código promocional e o usuário é E-MASTER, já foi tratado acima
        return false;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking course access:", error);
      return false;
    }
  }
  
  // Obter todos os códigos promocionais para um curso específico
  async getCoursePromoCodes(courseId: number): Promise<schema.PromoCode[]> {
    return await db.query.promoCodes.findMany({
      where: and(
        eq(schema.promoCodes.promoType, 'course'),
        eq(schema.promoCodes.courseId, courseId)
      )
    });
  }
  
  // Course purchases methods
  async createCoursePurchase(purchase: schema.InsertCoursePurchase & { userId: number }): Promise<schema.CoursePurchase> {
    try {
      // Calculate expiration date (30 days from now)
      const expiresAt = addDays(new Date(), 30);
      
      const [result] = await db.insert(schema.coursePurchases)
        .values({
          ...purchase,
          expiresAt,
          active: true
        })
        .returning();
        
      return result;
    } catch (error) {
      console.error("Error creating course purchase:", error);
      throw error;
    }
  }
  
  async getUserCoursePurchases(userId: number): Promise<schema.CoursePurchase[]> {
    try {
      return await db.query.coursePurchases.findMany({
        where: eq(schema.coursePurchases.userId, userId),
        orderBy: [desc(schema.coursePurchases.purchasedAt)]
      });
    } catch (error) {
      console.error("Error getting user course purchases:", error);
      return [];
    }
  }
  
  async getCoursePurchase(userId: number, courseId: number): Promise<schema.CoursePurchase | undefined> {
    try {
      return await db.query.coursePurchases.findFirst({
        where: and(
          eq(schema.coursePurchases.userId, userId),
          eq(schema.coursePurchases.courseId, courseId)
        ),
        orderBy: [desc(schema.coursePurchases.purchasedAt)]
      });
    } catch (error) {
      console.error("Error getting course purchase:", error);
      return undefined;
    }
  }
  
  async checkCoursePurchaseActive(userId: number, courseId: number): Promise<boolean> {
    try {
      // Verifica se há alguma compra ativa para este curso
      const activePurchase = await db.query.coursePurchases.findFirst({
        where: and(
          eq(schema.coursePurchases.userId, userId),
          eq(schema.coursePurchases.courseId, courseId),
          eq(schema.coursePurchases.active, true),
          gte(schema.coursePurchases.expiresAt, new Date()) // Ainda não expirou
        )
      });
      
      return !!activePurchase;
    } catch (error) {
      console.error("Error checking course purchase status:", error);
      return false;
    }
  }
  
  // Update pro status
  async extendProStatus(userId: number, days: number): Promise<schema.User | undefined> {
    const user = await this.getUser(userId);
    
    if (!user) {
      return undefined;
    }
    
    const now = new Date();
    let roleExpiryDate = user.roleExpiryDate && user.roleExpiryDate > now ? user.roleExpiryDate : now;
    
    // Add days to the expiry date
    roleExpiryDate = addDays(roleExpiryDate, days);
    
    // Upgrade user role based on the promo code role
    // Get the promo code to determine the role upgrade
    let newRole = user.role;
    
    // Verificar se existe um código promocional recém-utilizado pelo usuário
    // para determinar o papel correto
    const recentUsage = await db.query.promoUsage.findFirst({
      where: eq(schema.promoUsage.userId, userId),
      orderBy: [desc(schema.promoUsage.usedAt)],
      limit: 1
    });
    
    if (recentUsage) {
      const promoCode = await db.query.promoCodes.findFirst({
        where: eq(schema.promoCodes.id, recentUsage.promoId)
      });
      
      if (promoCode && promoCode.promoType === 'role') {
        // Se o código promocional tiver uma role específica, vamos usá-la
        if (promoCode.targetRole) {
          newRole = promoCode.targetRole;
        } else {
          // Caso contrário, seguimos a lógica padrão de promoção
          if (user.role === "E-BASIC") {
            newRole = "E-TOOL";
          } else if (user.role === "E-TOOL") {
            newRole = "E-MASTER";
          }
        }
      }
    } else {
      // Se não tiver uso recente, siga a lógica padrão
      if (user.role === "E-BASIC") {
        newRole = "E-TOOL";
      }
    }
    
    return await this.updateUser(userId, {
      role: newRole,
      roleExpiryDate,
    });
  }
  
  // Course methods
  async createCourse(course: schema.InsertCourse): Promise<schema.Course> {
    const [result] = await db.insert(schema.courses)
      .values(course)
      .returning();
    return result;
  }
  
  async updateCourse(id: number, data: Partial<schema.Course>): Promise<schema.Course | undefined> {
    const updated = await db.update(schema.courses)
      .set(data)
      .where(eq(schema.courses.id, id))
      .returning();
    
    return updated.length > 0 ? updated[0] : undefined;
  }
  
  async deleteCourse(id: number): Promise<boolean> {
    try {
      // First, find all lessons for this course
      const courseLessons = await this.getLessonsByCourseId(id);
      
      // Delete each lesson's materials
      for (const lesson of courseLessons) {
        await db.delete(schema.materials)
          .where(eq(schema.materials.lessonId, lesson.id));
      }
      
      // Delete general course materials (with no specific lessonId)
      await db.delete(schema.materials)
        .where(eq(schema.materials.courseId, id));
      
      // Delete all lessons
      await db.delete(schema.lessons)
        .where(eq(schema.lessons.courseId, id));
      
      // Finally, delete the course
      const deleted = await db.delete(schema.courses)
        .where(eq(schema.courses.id, id))
        .returning();
      
      return deleted.length > 0;
    } catch (error) {
      console.error("Error deleting course:", error);
      throw error;
    }
  }
  
  async toggleCourseVisibility(id: number, isHidden: boolean): Promise<schema.Course | undefined> {
    return await this.updateCourse(id, { isHidden });
  }
  
  async getAllCourses(includeHidden: boolean = true): Promise<schema.Course[]> {
    if (includeHidden) {
      return await db.query.courses.findMany();
    } else {
      return await db.query.courses.findMany({
        where: eq(schema.courses.isHidden, false)
      });
    }
  }
  
  async getVisibleCourses(): Promise<schema.Course[]> {
    return await this.getAllCourses(false);
  }
  
  async getCoursesByCategory(category: string, includeHidden: boolean = true): Promise<schema.Course[]> {
    if (includeHidden) {
      return await db.query.courses.findMany({
        where: eq(schema.courses.category, category),
      });
    } else {
      return await db.query.courses.findMany({
        where: and(
          eq(schema.courses.category, category),
          eq(schema.courses.isHidden, false)
        )
      });
    }
  }
  
  async getCourseById(id: number): Promise<schema.Course | undefined> {
    return await db.query.courses.findFirst({
      where: eq(schema.courses.id, id),
    });
  }
  
  // Lesson methods
  async createLesson(lesson: schema.InsertLesson): Promise<schema.Lesson> {
    const [result] = await db.insert(schema.lessons)
      .values(lesson)
      .returning();
    return result;
  }
  
  async updateLesson(id: number, data: Partial<schema.Lesson>): Promise<schema.Lesson | undefined> {
    const updated = await db.update(schema.lessons)
      .set(data)
      .where(eq(schema.lessons.id, id))
      .returning();
    
    return updated.length > 0 ? updated[0] : undefined;
  }
  
  async deleteLesson(id: number): Promise<boolean> {
    try {
      // First, delete all materials associated with this lesson
      await db.delete(schema.materials)
        .where(eq(schema.materials.lessonId, id));
      
      // Now delete the lesson
      const deleted = await db.delete(schema.lessons)
        .where(eq(schema.lessons.id, id))
        .returning();
      
      return deleted.length > 0;
    } catch (error) {
      console.error("Error deleting lesson:", error);
      throw error;
    }
  }
  
  async getLessonsByCourseId(courseId: number): Promise<schema.Lesson[]> {
    return await db.query.lessons.findMany({
      where: eq(schema.lessons.courseId, courseId),
      orderBy: schema.lessons.order,
    });
  }
  
  async getLessonById(id: number): Promise<schema.Lesson | undefined> {
    return await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, id),
    });
  }
  
  // Material methods
  async createMaterial(material: schema.InsertMaterial): Promise<schema.Material> {
    const [result] = await db.insert(schema.materials)
      .values(material)
      .returning();
    return result;
  }
  
  async updateMaterial(id: number, data: Partial<schema.Material>): Promise<schema.Material | undefined> {
    const updated = await db.update(schema.materials)
      .set(data)
      .where(eq(schema.materials.id, id))
      .returning();
    
    return updated.length > 0 ? updated[0] : undefined;
  }
  
  async deleteMaterial(id: number): Promise<boolean> {
    const deleted = await db.delete(schema.materials)
      .where(eq(schema.materials.id, id))
      .returning();
    
    return deleted.length > 0;
  }
  
  async getMaterialsByCourseId(courseId: number): Promise<schema.Material[]> {
    return await db.query.materials.findMany({
      where: eq(schema.materials.courseId, courseId),
    });
  }
  
  async getMaterialsByLessonId(lessonId: number): Promise<schema.Material[]> {
    return await db.query.materials.findMany({
      where: eq(schema.materials.lessonId, lessonId),
    });
  }
  
  async getMaterialById(id: number): Promise<schema.Material | undefined> {
    return await db.query.materials.findFirst({
      where: eq(schema.materials.id, id),
    });
  }
  
  // Notification methods
  async createNotification(notification: schema.InsertNotification): Promise<schema.Notification> {
    const [result] = await db.insert(schema.notifications)
      .values(notification)
      .returning();
    return result;
  }
  
  async getNotifications(targetRole: string, userId?: number): Promise<schema.Notification[]> {
    if (!userId) {
      return [];
    }
    
    // Use optimized SQL query to get only relevant notifications
    // directly from database (avoid loading all into memory)
    const targetRoleCondition = or(
      // Individual notifications for this user
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.targetRole, 'individual')
      ),
      // Notifications for the user's role
      and(
        eq(schema.notifications.targetRole, targetRole),
        isNull(schema.notifications.userId)
      ),
      // Notifications for everyone
      and(
        eq(schema.notifications.targetRole, 'all'),
        isNull(schema.notifications.userId)
      )
    );
    
    return await db.query.notifications.findMany({
      where: targetRoleCondition,
      orderBy: desc(schema.notifications.createdAt)
    });
  }
  
  async getNotificationById(id: number): Promise<schema.Notification | undefined> {
    return await db.query.notifications.findFirst({
      where: eq(schema.notifications.id, id),
    });
  }
  
  async markNotificationAsRead(id: number): Promise<schema.Notification | undefined> {
    const updated = await db.update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, id))
      .returning();
    
    return updated.length > 0 ? updated[0] : undefined;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const deleted = await db.delete(schema.notifications)
      .where(eq(schema.notifications.id, id))
      .returning();
    
    return deleted.length > 0;
  }
  
  // Chat methods
  async createChatThread(threadData: schema.InsertChatThread & { userId: number }): Promise<schema.ChatThread> {
    const [result] = await db.insert(schema.chatThreads)
      .values({
        ...threadData,
        status: 'open',
        isUserUnread: false,
        isAdminUnread: true, // Always unread for admin at first
        lastMessageAt: new Date(),
      })
      .returning();
    return result;
  }
  
  async getChatThreads(userId: number): Promise<schema.ChatThread[]> {
    return await db.query.chatThreads.findMany({
      where: eq(schema.chatThreads.userId, userId),
      orderBy: [desc(schema.chatThreads.lastMessageAt)],
    });
  }
  
  async getChatThreadById(threadId: number): Promise<schema.ChatThread | undefined> {
    // Get thread with user information (username)
    const thread = await db.query.chatThreads.findFirst({
      where: eq(schema.chatThreads.id, threadId),
    });
    
    if (!thread) {
      return undefined;
    }
    
    // Get the username for display
    const user = await this.getUser(thread.userId);
    
    return {
      ...thread,
      userName: user?.username
    };
  }
  
  async getAdminChatThreads(): Promise<schema.ChatThread[]> {
    // Get all threads with user information
    const threads = await db.query.chatThreads.findMany({
      orderBy: [desc(schema.chatThreads.lastMessageAt)],
    });
    
    // Get usernames for all threads
    const threadsWithUsername = await Promise.all(
      threads.map(async (thread) => {
        const user = await this.getUser(thread.userId);
        return {
          ...thread,
          userName: user?.username
        };
      })
    );
    
    return threadsWithUsername;
  }
  
  async updateChatThread(threadId: number, data: Partial<schema.ChatThread>): Promise<schema.ChatThread | undefined> {
    const updated = await db.update(schema.chatThreads)
      .set(data)
      .where(eq(schema.chatThreads.id, threadId))
      .returning();
    
    if (updated.length === 0) {
      return undefined;
    }
    
    const threadWithUser = await this.getChatThreadById(threadId);
    return threadWithUser;
  }
  
  async closeChatThread(threadId: number): Promise<schema.ChatThread | undefined> {
    return await this.updateChatThread(threadId, { 
      status: 'closed',
      isUserUnread: true, // Mark as unread for user so they notice it was closed
    });
  }
  
  async markThreadAsReadForUser(threadId: number): Promise<schema.ChatThread | undefined> {
    return await this.updateChatThread(threadId, { isUserUnread: false });
  }
  
  async markThreadAsReadForAdmin(threadId: number): Promise<schema.ChatThread | undefined> {
    return await this.updateChatThread(threadId, { isAdminUnread: false });
  }
  
  async createChatMessage(messageData: schema.InsertChatMessage & { userId: number; isAdminMessage: boolean }): Promise<schema.ChatMessage> {
    // First create the message
    const [message] = await db.insert(schema.chatMessages)
      .values(messageData)
      .returning();
    
    // Update thread's lastMessageAt time
    await db.update(schema.chatThreads)
      .set({ 
        lastMessageAt: new Date(),
        isUserUnread: !messageData.isAdminMessage, // If it's an admin message, mark thread as unread for user
        isAdminUnread: messageData.isAdminMessage, // If it's a user message, mark thread as unread for admin
      })
      .where(eq(schema.chatThreads.id, messageData.threadId));
    
    return message;
  }
  
  async getChatMessagesByThreadId(threadId: number): Promise<schema.ChatMessage[]> {
    return await db.query.chatMessages.findMany({
      where: eq(schema.chatMessages.threadId, threadId),
      orderBy: asc(schema.chatMessages.createdAt),
    });
  }
  
  async getUnreadThreadsCountForAdmin(): Promise<number> {
    const unreadThreads = await db.query.chatThreads.findMany({
      where: eq(schema.chatThreads.isAdminUnread, true),
    });
    
    return unreadThreads.length;
  }
  
  async getUnreadThreadsCountForUser(userId: number): Promise<number> {
    const unreadThreads = await db.query.chatThreads.findMany({
      where: and(
        eq(schema.chatThreads.userId, userId),
        eq(schema.chatThreads.isUserUnread, true),
      ),
    });
    
    return unreadThreads.length;
  }
}

export const storage = new DatabaseStorage();