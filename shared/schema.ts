import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Folders table
export const folders = pgTable("folders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  folderId: varchar("folder_id", { length: 36 }).references(() => folders.id, { onDelete: "set null" }),
  title: text("title").notNull().default("گفتگوی جدید"),
  model: varchar("model", { length: 50 }).notNull().default("gpt-5"),
  systemPrompt: text("system_prompt"),
  isPinned: integer("is_pinned").default(0).notNull(), // 0 = false, 1 = true
  isArchived: integer("is_archived").default(0).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  googleId: varchar("google_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name").notNull(),
  picture: text("picture"),
  isAdmin: integer("is_admin").default(0).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 36 }).notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Message Reactions table
export const messageReactions = pgTable("message_reactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  messageId: varchar("message_id", { length: 36 }).notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  reaction: varchar("reaction", { length: 10 }).notNull(), // emoji like 👍, ❤️, 😊, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API Keys table
export const apiKeys = pgTable("api_keys", {
  id: varchar("id", { length: 36 }).primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull().unique(), // e.g., "openai", "anthropic", "google", "mistral"
  apiKey: text("api_key").notNull(), // Encrypted or hashed
  isActive: integer("is_active").default(1).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Attachments table
export const attachments = pgTable("attachments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  messageId: varchar("message_id", { length: 36 }).notNull().references(() => messages.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // "image" or "file"
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  size: integer("size"), // Size in bytes
  mimeType: varchar("mime_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertFolderSchema = createInsertSchema(folders).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations)
  .omit({
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    folderId: z.string().nullable().optional(),
    systemPrompt: z.string().nullable().optional(),
    isPinned: z.number().default(0).optional(),
    isArchived: z.number().default(0).optional(),
  });

export const insertMessageSchema = createInsertSchema(messages).omit({
  createdAt: true,
});

export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({
  createdAt: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type DbMessage = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

// API request schemas
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
});

export const chatRequestSchema = z.object({
  message: z.string().optional().default(""),
  conversationId: z.string().optional(),
  model: z.string().optional(),
  stream: z.boolean().optional().default(false),
  imageUrl: z.string().optional(),
});

export const apiKeySchema = z.object({
  apiKey: z.string().min(1),
});

export type Message = z.infer<typeof messageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ApiKeyRequest = z.infer<typeof apiKeySchema>;

// User insert schema
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
});
