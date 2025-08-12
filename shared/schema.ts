import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  cpf: text("cpf").notNull().unique(), // CPF do usuário (agora obrigatório)
  password: text("password").notNull(),
  role: text("role").default('E-BASIC').notNull(), // Using text instead of enum for compatibility
  roleExpiryDate: timestamp("role_expiry_date"), // Data de expiração do papel atual
  resetToken: text("reset_token"), // Token para redefinição de senha
  stripeCustomerId: text("stripe_customer_id"), // ID do cliente no Stripe
  stripeSubscriptionId: text("stripe_subscription_id"), // ID da assinatura no Stripe
  resetTokenExpiry: timestamp("reset_token_expiry"), // Data de expiração do token
  disablePasswordRecovery: boolean("disable_password_recovery").default(false), // Opção para desativar recuperação de senha
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"), // Último login
});

// Tabela para sessões ativas de usuários
export const activeSessions = pgTable("active_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionId: text("session_id").notNull().unique(),
  userAgent: text("user_agent"), // Informações sobre o navegador/dispositivo
  ipAddress: text("ip_address"), // Endereço IP
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tools table
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'mechanical' or 'electrical'
  accessLevel: text("access_level").notNull(), // 'E-BASIC', 'E-TOOL', or 'E-MASTER'
  linkType: text("link_type").notNull(), // 'external', 'internal', ou 'custom'
  link: text("link").notNull(), // URL ou rota interna
  customHtml: text("custom_html"), // HTML personalizado (quando linkType = 'custom')
  showInIframe: boolean("show_in_iframe").default(false), // Se deve mostrar em iframe
  restrictedCpfs: text("restricted_cpfs"), // CPFs que podem acessar a ferramenta (separados por vírgula)
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"), // Média das avaliações
  totalRatings: integer("total_ratings").default(0).notNull(), // Total de avaliações
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Tool ratings table
export const toolRatings = pgTable("tool_ratings", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").references(() => tools.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(), // 1-5 estrelas
  comment: text("comment"), // Comentário opcional
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Promo codes table
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  days: integer("days").notNull(),
  maxUses: integer("max_uses").notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  targetRole: text("target_role").default('E-TOOL').notNull(), // 'E-TOOL', 'E-MASTER'
  promoType: text("promo_type", { enum: ['role', 'course'] }).default('role').notNull(), // Tipo de código promocional: para cargo ou curso
  courseId: integer("course_id").references(() => courses.id), // ID do curso, se for um código específico para curso
  expiryDate: timestamp("expiry_date"),
  validUntil: timestamp("valid_until"), // Data de validade do código promocional
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Promo usage table
export const promoUsage = pgTable("promo_usage", {
  id: serial("id").primaryKey(),
  promoId: integer("promo_id").references(() => promoCodes.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// Courses table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'mechanical', 'electrical', etc.
  instructor: text("instructor").notNull(),
  duration: text("duration").notNull(),
  level: text("level").notNull(), // 'beginner', 'intermediate', 'advanced'
  imageUrl: text("image_url"),
  isHidden: boolean("is_hidden").default(false).notNull(), // Campo para controlar a visibilidade do curso
  requiresPromoCode: boolean("requires_promo_code").default(false).notNull(), // Se o curso precisa de código promocional
  price: decimal("price", { precision: 10, scale: 2 }), // Preço do curso (null = gratuito ou apenas via código)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Tabela de compras de cursos
export const coursePurchases = pgTable("course_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  stripePaymentId: text("stripe_payment_id"), // ID do pagamento no Stripe
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Acesso expira após 30 dias
  active: boolean("active").default(true).notNull(), // Se o acesso está ativo
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Preço pago na compra
});

// Tabela de notificações
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(), // 'info', 'warning', 'success', 'error'
  link: text("link"), // Link opcional para redirecionar quando a notificação é clicada
  targetRole: text("target_role").default("all").notNull(), // 'all', 'E-BASIC', 'E-TOOL', 'E-MASTER', 'admin'
  isRead: boolean("is_read").default(false).notNull(),
  userId: integer("user_id").references(() => users.id), // Se for específico para um usuário
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  expiresAt: timestamp("expires_at"),
});

// Tabela de Chat
export const chatThreads = pgTable("chat_threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  status: text("status").default("open").notNull(), // 'open', 'closed'
  isUserUnread: boolean("is_user_unread").default(false).notNull(), // Mensagens não lidas pelo usuário
  isAdminUnread: boolean("is_admin_unread").default(true).notNull(), // Mensagens não lidas pelo admin
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de Mensagens de Chat
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").references(() => chatThreads.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(), // Quem enviou a mensagem
  message: text("message").notNull(),
  isAdminMessage: boolean("is_admin_message").default(false).notNull(), // Se foi enviada por um admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Lessons table
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  videoSource: text("video_source").default("youtube").notNull(), // 'youtube' ou 'drive'
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Materials table
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  lessonId: integer("lesson_id").references(() => lessons.id),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // 'pdf', 'doc', 'link', etc.
  iconType: text("icon_type").default('file'), // 'file', 'link', 'object'
  downloadable: boolean("downloadable").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tools: many(tools),
  promoUsage: many(promoUsage),
  courses: many(courses),
  notifications: many(notifications),
  chatThreads: many(chatThreads),
  activeSessions: many(activeSessions),
  chatMessages: many(chatMessages),
  toolRatings: many(toolRatings),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [notifications.createdBy],
    references: [users.id],
  }),
}));

export const toolsRelations = relations(tools, ({ one, many }) => ({
  creator: one(users, {
    fields: [tools.createdBy],
    references: [users.id],
  }),
  ratings: many(toolRatings),
}));

export const toolRatingsRelations = relations(toolRatings, ({ one }) => ({
  tool: one(tools, {
    fields: [toolRatings.toolId],
    references: [tools.id],
  }),
  user: one(users, {
    fields: [toolRatings.userId],
    references: [users.id],
  }),
}));

export const promoCodesRelations = relations(promoCodes, ({ one, many }) => ({
  creator: one(users, {
    fields: [promoCodes.createdBy],
    references: [users.id],
  }),
  usage: many(promoUsage),
}));

export const promoUsageRelations = relations(promoUsage, ({ one }) => ({
  promo: one(promoCodes, {
    fields: [promoUsage.promoId],
    references: [promoCodes.id],
  }),
  user: one(users, {
    fields: [promoUsage.userId],
    references: [users.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  creator: one(users, {
    fields: [courses.createdBy],
    references: [users.id],
  }),
  lessons: many(lessons),
  materials: many(materials),
  purchases: many(coursePurchases),
}));

export const coursePurchasesRelations = relations(coursePurchases, ({ one }) => ({
  user: one(users, {
    fields: [coursePurchases.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [coursePurchases.courseId],
    references: [courses.id],
  }),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  course: one(courses, {
    fields: [materials.courseId],
    references: [courses.id],
  }),
  lesson: one(lessons, {
    fields: [materials.lessonId],
    references: [lessons.id],
  }),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  user: one(users, {
    fields: [chatThreads.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, {
    fields: [chatMessages.threadId],
    references: [chatThreads.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const activeSessionsRelations = relations(activeSessions, ({ one }) => ({
  user: one(users, {
    fields: [activeSessions.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  cpf: (schema) => schema.length(11, "CPF deve conter 11 dígitos").refine(
    (val) => /^\d{11}$/.test(val), 
    { message: "CPF deve conter apenas números" }
  ),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
}).extend({
  disablePasswordRecovery: z.boolean().default(false).optional(),
  promoCode: z.string().optional(), // Código promocional (não é parte do banco de dados)
}).omit({ id: true, createdAt: true });

export const insertToolSchema = createInsertSchema(tools, {
  name: (schema) => schema.min(3, "Name must be at least 3 characters"),
  description: (schema) => schema.min(5, "Description must be at least 5 characters"),
  category: (schema) => schema.refine(val => ['mechanical', 'electrical', 'textile', 'informatics', 'chemical'].includes(val), {
    message: "Category must be one of: mechanical, electrical, textile, informatics, chemical"
  }),
  accessLevel: (schema) => schema.refine(val => ['E-BASIC', 'E-TOOL', 'E-MASTER'].includes(val), {
    message: "Access level must be one of: E-BASIC, E-TOOL, E-MASTER"
  }),
  linkType: (schema) => schema.refine(val => ['external', 'internal', 'custom'].includes(val), {
    message: "Link type must be one of: external, internal, custom"
  }),
  link: (schema) => schema.min(1, "Link must not be empty"),
  customHtml: z.string().optional(),
  showInIframe: z.boolean().default(false),
  restrictedCpfs: z.string().optional(),
}).omit({ id: true, createdAt: true });

export const insertPromoCodeSchema = createInsertSchema(promoCodes, {
  code: (schema) => schema.min(3, "Code must be at least 3 characters"),
  days: (schema) => schema.min(1, "Days must be at least 1"),
  maxUses: (schema) => schema.min(1, "Maximum uses must be at least 1"),
  targetRole: (schema) => schema.refine(val => ['E-TOOL', 'E-MASTER'].includes(val), {
    message: "Target role must be one of: E-TOOL, E-MASTER"
  }),
  promoType: (schema) => schema.refine(val => ['role', 'course'].includes(val), {
    message: "Promo type must be one of: role, course"
  }),
  courseId: z.number().optional(),
  validUntil: z.date().optional(),
}).omit({ id: true, createdAt: true, usedCount: true });

export const insertCourseSchema = createInsertSchema(courses, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  description: (schema) => schema.min(10, "Description must be at least 10 characters"),
  category: (schema) => schema.refine(val => ['mechanical', 'electrical', 'textile', 'informatics', 'chemical'].includes(val), {
    message: "Category must be one of: mechanical, electrical, textile, informatics, chemical"
  }),
  instructor: (schema) => schema.min(3, "Instructor name must be at least 3 characters"),
  duration: (schema) => schema.min(1, "Duration must be at least 1 character"),
  level: (schema) => schema.refine(val => ['beginner', 'intermediate', 'advanced'].includes(val), {
    message: "Level must be one of: beginner, intermediate, advanced"
  }),
  isHidden: z.boolean().default(false), // Campo para ocultar/mostrar o curso
  requiresPromoCode: z.boolean().default(false), // Se o curso requer código promocional para acesso
  price: z.string().nullable().optional(), // Preço do curso (null = gratuito ou apenas via código)
}).omit({ id: true, createdAt: true });

export const insertNotificationSchema = createInsertSchema(notifications, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  message: (schema) => schema.min(5, "Message must be at least 5 characters"),
  type: (schema) => schema.refine(val => ['info', 'warning', 'success', 'error'].includes(val), {
    message: "Type must be one of: info, warning, success, error"
  }),
  targetRole: (schema) => schema.refine(val => ['all', 'E-BASIC', 'E-TOOL', 'E-MASTER', 'admin'].includes(val), {
    message: "Target role must be one of: all, E-BASIC, E-TOOL, E-MASTER, admin"
  }),
  link: z.string().optional(),
}).omit({ id: true, createdAt: true, isRead: true });

export const insertLessonSchema = createInsertSchema(lessons, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  description: (schema) => schema.min(10, "Description must be at least 10 characters"),
  youtubeUrl: (schema) => schema.min(5, "Video URL must be at least 5 characters"),
  videoSource: (schema) => schema.refine(val => ['youtube', 'drive'].includes(val), {
    message: "Video source must be one of: youtube, drive"
  }),
}).omit({ id: true, createdAt: true });

export const insertMaterialSchema = createInsertSchema(materials, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  fileUrl: (schema) => schema.min(5, "File URL must be at least 5 characters"),
  fileType: (schema) => schema.refine(val => ['pdf', 'doc', 'xls', 'ppt', 'zip', 'img', 'link', 'object'].includes(val), {
    message: "File type must be one of: pdf, doc, xls, ppt, zip, img, link, object"
  }),
  iconType: (schema) => schema.refine(val => ['file', 'link', 'object'].includes(val), {
    message: "Icon type must be one of: file, link, object"
  }),
}).omit({ id: true, createdAt: true });

// Esquema para inserção e validação de compras de cursos
export const insertCoursePurchaseSchema = createInsertSchema(coursePurchases, {
  price: (schema) => schema.refine(val => parseFloat(val.toString()) > 0, {
    message: "O preço deve ser maior que zero"
  }),
}).omit({ id: true, purchasedAt: true, active: true });

// Types for use in the application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof tools.$inferSelect;

export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

export type PromoUsage = typeof promoUsage.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertCoursePurchase = z.infer<typeof insertCoursePurchaseSchema>;
export type CoursePurchase = typeof coursePurchases.$inferSelect;

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const insertActiveSessionSchema = createInsertSchema(activeSessions, {
  sessionId: (schema) => schema.min(1, "Session ID is required"),
}).omit({ id: true, createdAt: true, lastActivity: true });
export type InsertActiveSession = z.infer<typeof insertActiveSessionSchema>;
export type ActiveSession = typeof activeSessions.$inferSelect;

// Chat schemas e tipos
export const insertChatThreadSchema = createInsertSchema(chatThreads, {
  subject: (schema) => schema.min(3, "Assunto deve ter pelo menos 3 caracteres"),
  status: z.enum(['open', 'closed']).default('open'),
  isUserUnread: z.boolean().default(false),
  isAdminUnread: z.boolean().default(true),
}).omit({ id: true, createdAt: true, lastMessageAt: true });

export const insertChatMessageSchema = createInsertSchema(chatMessages, {
  message: (schema) => schema.min(1, "Mensagem não pode estar vazia"),
}).omit({ id: true, createdAt: true, isAdminMessage: true });

export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;
export type ChatThread = typeof chatThreads.$inferSelect & { userName?: string };

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Login schema for authentication
export const loginUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginUser = z.infer<typeof loginUserSchema>;

// Tabela de configurações de preços dos planos
export const planPrices = pgTable("plan_prices", {
  id: serial("id").primaryKey(),
  planType: text("plan_type").notNull(), // 'E-TOOL' ou 'E-MASTER'
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Schema para inserção e validação
export const insertPlanPriceSchema = createInsertSchema(planPrices, {
  planType: (schema) => schema.refine(val => ['E-TOOL', 'E-MASTER'].includes(val), {
    message: "O tipo de plano deve ser 'E-TOOL' ou 'E-MASTER'"
  }),
  monthlyPrice: (schema) => schema.refine(val => parseFloat(val.toString()) > 0, {
    message: "O preço mensal deve ser maior que zero"
  }),
}).omit({ id: true, updatedAt: true });

export type InsertPlanPrice = z.infer<typeof insertPlanPriceSchema>;
export type PlanPrice = typeof planPrices.$inferSelect;

// Schema para inserção e validação de avaliações de ferramentas
export const insertToolRatingSchema = createInsertSchema(toolRatings, {
  rating: (schema) => schema.min(1, "Avaliação deve ser no mínimo 1").max(5, "Avaliação deve ser no máximo 5"),
  comment: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertToolRating = z.infer<typeof insertToolRatingSchema>;
export type ToolRating = typeof toolRatings.$inferSelect;
