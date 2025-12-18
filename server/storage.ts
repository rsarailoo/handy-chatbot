import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, or, ilike, sql, isNull, and } from "drizzle-orm";
import { 
  conversations, 
  messages, 
  users,
  apiKeys,
  folders,
  attachments,
  type Conversation, 
  type InsertConversation,
  type DbMessage,
  type InsertMessage,
  type User,
  type InsertUser,
  type ApiKey,
  type InsertApiKey,
  type Folder,
  type InsertFolder,
  type Attachment,
  type InsertAttachment,
  messageReactions,
  type MessageReaction,
  type InsertMessageReaction
} from "@shared/schema";

// Helper function to determine SSL configuration
function getSSLConfig() {
  const dbUrl = process.env.DATABASE_URL || '';
  
  // Check if URL already has sslmode parameter
  if (dbUrl.includes('sslmode=')) {
    // URL already specifies SSL mode, let pg handle it
    return undefined; // undefined means use URL's sslmode
  }
  
  // For cloud databases, enable SSL
  if (dbUrl.includes('supabase') || dbUrl.includes('neon') || dbUrl.includes('aws.neon.tech') || dbUrl.includes('neon.tech')) {
    return { rejectUnauthorized: false };
  }
  
  // For local databases, no SSL
  return false;
}

// Helper function to determine connection timeout
function getConnectionTimeout() {
  const dbUrl = process.env.DATABASE_URL || '';
  
  // Cloud databases might need more time
  if (dbUrl.includes('supabase') || dbUrl.includes('neon') || dbUrl.includes('aws.neon.tech')) {
    return 30000; // 30 seconds for cloud databases
  }
  
  return 15000; // 15 seconds for local databases
}

const poolConfig: any = {
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: getConnectionTimeout(),
  idleTimeoutMillis: 30000,
  max: 20,
  // Allow pool to retry connections
  allowExitOnIdle: false,
};

// Set SSL configuration
const sslConfig = getSSLConfig();
if (sslConfig !== undefined) {
  poolConfig.ssl = sslConfig;
}

const pool = new Pool(poolConfig);
const db = drizzle(pool);

// Test connection on startup
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client:', err.message);
  console.error('  - Error code:', err.code);
});

// Test connection with better error handling
async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.error('   Please set DATABASE_URL in your .env file');
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  const dbUrlPreview = dbUrl.length > 50 ? `${dbUrl.substring(0, 50)}...` : dbUrl;
  
  console.log('🔌 Attempting database connection...');
  console.log('📊 Database URL:', dbUrlPreview);
  
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
      )
    ]) as any;
    
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('📊 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
    console.log('🕐 Server time:', result.rows[0].current_time);
    
    client.release();
  } catch (err: any) {
    console.error('❌ Database connection failed:');
    console.error('  - Error message:', err.message);
    console.error('  - Error code:', err.code);
    
    if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
      console.error('  - Possible causes:');
      console.error('    1. Database server is not accessible (check firewall/network)');
      console.error('    2. DATABASE_URL is incorrect');
      console.error('    3. Database server is down');
      console.error('    4. SSL/TLS configuration issue (for cloud databases)');
    } else if (err.code === 'ENOTFOUND') {
      console.error('  - Possible causes:');
      console.error('    1. Database hostname is incorrect');
      console.error('    2. DNS resolution failed');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('  - Possible causes:');
      console.error('    1. Database server is not running');
      console.error('    2. Port number is incorrect');
      console.error('    3. Firewall is blocking the connection');
    }
    
    console.error('  - Database URL preview:', dbUrlPreview);
    console.error('  - Full error:', err.stack);
  }
}

// Run connection test
testConnection();

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined>;
  
  // Folders
  getFolders(userId?: string): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: string, updates: Partial<InsertFolder>): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<void>;
  
  // Conversations
  getConversations(userId?: string, folderId?: string | null): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<void>;
  searchConversations(query: string, userId?: string): Promise<Conversation[]>;
  
  // Messages
  getMessages(conversationId: string): Promise<DbMessage[]>;
  createMessage(message: InsertMessage): Promise<DbMessage>;
  
  // Message Reactions
  getMessageReactions(messageId: string): Promise<MessageReaction[]>;
  addReaction(reaction: InsertMessageReaction): Promise<MessageReaction>;
  removeReaction(messageId: string, userId: string, reaction: string): Promise<void>;
  
  // API Keys
  getAllApiKeys(): Promise<ApiKey[]>;
  getApiKeyByProvider(provider: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<void>;
  setApiKeyActive(id: string, isActive: boolean): Promise<ApiKey | undefined>;
  
  // Attachments
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachmentsByMessageId(messageId: string): Promise<Attachment[]>;
  deleteAttachment(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // User methods
  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      console.log("🔍 Storage: Looking for user with Google ID:", googleId);
    const result = await db.select().from(users).where(eq(users.googleId, googleId));
      if (result[0]) {
        console.log("✅ Storage: User found:", result[0].id, result[0].email);
      } else {
        console.log("ℹ️ Storage: User not found with Google ID:", googleId);
      }
    return result[0];
    } catch (error: any) {
      console.error("❌ Storage: Error getting user by Google ID:");
      console.error("  - Error code:", error?.code);
      console.error("  - Error message:", error?.message);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      console.log("📝 Storage: Creating user in database...");
      console.log("  - User ID:", user.id);
      console.log("  - Email:", user.email);
      console.log("  - Google ID:", user.googleId);
    const result = await db.insert(users).values(user).returning();
      console.log("✅ Storage: User created successfully in database");
    return result[0];
    } catch (error: any) {
      console.error("❌ Storage: Error creating user:");
      console.error("  - Error code:", error?.code);
      console.error("  - Error message:", error?.message);
      console.error("  - Error stack:", error?.stack);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ isAdmin: isAdmin ? 1 : 0 })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Folder methods
  async getFolders(userId?: string): Promise<Folder[]> {
    if (userId) {
      return await db
        .select()
        .from(folders)
        .where(eq(folders.userId, userId))
        .orderBy(desc(folders.updatedAt));
    }
    return await db.select().from(folders).orderBy(desc(folders.updatedAt));
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const result = await db.select().from(folders).where(eq(folders.id, id));
    return result[0];
  }

  async createFolder(folder: InsertFolder): Promise<Folder> {
    const result = await db.insert(folders).values(folder).returning();
    return result[0];
  }

  async updateFolder(id: string, updates: Partial<InsertFolder>): Promise<Folder | undefined> {
    const result = await db
      .update(folders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    return result[0];
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
  }

  // Delete conversations without userId (cleanup)
  async deleteConversationsWithoutUser(): Promise<any> {
    try {
      // Delete all conversations where userId is NULL
      const result = await db.delete(conversations).where(isNull(conversations.userId));
      return result;
    } catch (error) {
      console.error("Error deleting conversations without user:", error);
      throw error;
    }
  }

  // Delete ALL conversations (dangerous - development only)
  async deleteAllConversations(): Promise<any> {
    try {
      const result = await db.delete(conversations);
      return result;
    } catch (error) {
      console.error("Error deleting all conversations:", error);
      throw error;
    }
  }

  // Conversation methods
  async getConversations(userId?: string, folderId?: string | null, includeArchived: boolean = false): Promise<Conversation[]> {
    let conditions: any[] = [];
    
    if (userId) {
      conditions.push(eq(conversations.userId, userId));
    }
    
    if (!includeArchived) {
      conditions.push(eq(conversations.isArchived, 0));
    }
    
    if (folderId !== undefined) {
      if (folderId === null) {
        conditions.push(sql`${conversations.folderId} IS NULL`);
      } else {
        conditions.push(eq(conversations.folderId, folderId));
      }
    }
    
    // Use AND to combine all conditions
    if (conditions.length === 0) {
      return await db.select().from(conversations).orderBy(desc(conversations.isPinned), desc(conversations.updatedAt));
    }
    
    return await db.select().from(conversations).where(and(...conditions)).orderBy(desc(conversations.isPinned), desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id));
    return result[0];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(conversation).returning();
    return result[0];
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const result = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async searchConversations(query: string, userId?: string): Promise<Conversation[]> {
    const searchTerm = `%${query}%`;
    
    // Search in conversation titles
    const titleQuery = db
      .select()
      .from(conversations)
      .where(
        userId 
          ? and(ilike(conversations.title, searchTerm), eq(conversations.userId, userId))
          : ilike(conversations.title, searchTerm)
      );
    
    const titleMatches = await titleQuery.orderBy(desc(conversations.updatedAt));

    // Search in message content and get unique conversations
    const messageQuery = db
      .selectDistinct({ conversation: conversations })
      .from(conversations)
      .innerJoin(messages, eq(conversations.id, messages.conversationId))
      .where(
        userId
          ? and(ilike(messages.content, searchTerm), eq(conversations.userId, userId))
          : ilike(messages.content, searchTerm)
      );
    
    const messageMatches = await messageQuery.orderBy(desc(conversations.updatedAt));

    // Combine and deduplicate
    const allMatches = new Map<string, Conversation>();
    
    titleMatches.forEach(conv => allMatches.set(conv.id, conv));
    messageMatches.forEach(({ conversation }) => allMatches.set(conversation.id, conversation));

    return Array.from(allMatches.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getMessages(conversationId: string): Promise<DbMessage[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<DbMessage> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  // Message Reaction methods
  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    return await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));
  }

  async addReaction(reaction: InsertMessageReaction): Promise<MessageReaction> {
    // Check if reaction already exists
    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        sql`${messageReactions.messageId} = ${reaction.messageId} AND ${messageReactions.userId} = ${reaction.userId} AND ${messageReactions.reaction} = ${reaction.reaction}`
      );
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const result = await db.insert(messageReactions).values(reaction).returning();
    return result[0];
  }

  async removeReaction(messageId: string, userId: string, reaction: string): Promise<void> {
    await db
      .delete(messageReactions)
      .where(
        sql`${messageReactions.messageId} = ${messageId} AND ${messageReactions.userId} = ${userId} AND ${messageReactions.reaction} = ${reaction}`
      );
  }

  // API Key methods
  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).orderBy(desc(apiKeys.updatedAt));
  }

  async getApiKeyByProvider(provider: string): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys).where(eq(apiKeys.provider, provider));
    return result[0];
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const result = await db.insert(apiKeys).values(apiKey).returning();
    return result[0];
  }

  async updateApiKey(id: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const result = await db
      .update(apiKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return result[0];
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async setApiKeyActive(id: string, isActive: boolean): Promise<ApiKey | undefined> {
    const result = await db
      .update(apiKeys)
      .set({ isActive: isActive ? 1 : 0, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return result[0];
  }

  // Attachment methods
  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const result = await db.insert(attachments).values(attachment).returning();
    return result[0];
  }

  async getAttachmentsByMessageId(messageId: string): Promise<Attachment[]> {
    return await db.select().from(attachments).where(eq(attachments.messageId, messageId));
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }
}

export const storage = new DbStorage();
