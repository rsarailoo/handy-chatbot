import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import passport from "passport";
import multer from "multer";
import path from "path";
import fs from "fs";
import { chatRequestSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { storage } from "./storage";
import { isGoogleOAuthConfigured } from "./auth";
import { z } from "zod";
import crypto from "crypto";

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "لطفاً ابتدا وارد شوید" });
}

// Admin middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "لطفاً ابتدا وارد شوید" });
  }
  const user = req.user as any;
  if (!user || user.isAdmin !== 1) {
    return res.status(403).json({ error: "شما دسترسی ادمین ندارید" });
  }
  return next();
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "amazon/nova-2-lite-v1:free";
const OPENROUTER_VISION_MODEL = "openai/gpt-4o"; // Vision-capable model (GPT-4o supports vision)

// Security: Validate and sanitize API key
function validateApiKey(apiKey: string | undefined): string {
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("API key is missing or invalid");
  }
  // Basic validation - should start with sk- or similar
  if (!apiKey.startsWith("sk-") && !apiKey.startsWith("sk-or-")) {
    console.warn("API key format may be invalid");
  }
  return apiKey.trim();
}

// Security: Sanitize message content to prevent injection
function sanitizeMessageContent(content: string): string {
  if (typeof content !== "string") {
    return "";
  }
  // Remove null bytes and control characters
  return content.replace(/\0/g, "").replace(/[\x00-\x1F\x7F]/g, "").trim();
}

// Security: Validate messages array
function validateMessages(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages array is required and must not be empty");
  }
  if (messages.length > 100) {
    throw new Error("Too many messages (max 100)");
  }
  return messages.map(msg => ({
    role: msg.role,
    content: sanitizeMessageContent(msg.content).slice(0, 100000), // Max 100KB per message
  }));
}

async function callOpenRouter(
  apiKey: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
  const validatedApiKey = validateApiKey(apiKey);
  const validatedMessages = validateMessages(messages);
  
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${validatedApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: validatedMessages,
      reasoning: { enabled: true },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Don't expose full error details in production
    const errorMessage = process.env.NODE_ENV === "development" 
      ? `OpenRouter request failed: ${response.status} ${response.statusText}`
      : "خطا در ارتباط با سرویس هوش مصنوعی";
    throw new Error(errorMessage);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter response missing content");
  }
  return sanitizeMessageContent(content);
}

// Streaming version of callOpenRouter
async function* callOpenRouterStream(
  apiKey: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): AsyncGenerator<string, void, unknown> {
  // Always use the regular model (images are not sent to API)
  const model = OPENROUTER_MODEL;
  const validatedApiKey = validateApiKey(apiKey);
  const validatedMessages = validateMessages(messages);

  console.log("Calling OpenRouter with model:", model);

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${validatedApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: validatedMessages,
      stream: true,
      reasoning: { enabled: true },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Don't expose full error details in production
    const errorMessage = process.env.NODE_ENV === "development" 
      ? `OpenRouter request failed: ${response.status} ${response.statusText}`
      : "خطا در ارتباط با سرویس هوش مصنوعی";
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            return;
      }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta && typeof delta === "string") {
              // Sanitize each chunk
              yield sanitizeMessageContent(delta);
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Generate a smart title from the first user message using OpenRouter
async function generateSmartTitle(apiKey: string, userMessage: string): Promise<string> {
  try {
    const title = await callOpenRouter(apiKey, [
      {
        role: "system",
        content: "یک عنوان کوتاه و مناسب (حداکثر 5 کلمه) برای این گفتگو تولید کن. فقط عنوان را برگردان.",
      },
      { role: "user", content: userMessage },
    ]);
    return title.length > 50 ? `${title.substring(0, 50)}...` : title;
  } catch (error) {
    console.error("Error generating smart title:", error);
    return userMessage.length > 30 ? `${userMessage.substring(0, 30)}...` : userMessage;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Rate limiters - must be defined before use
  const chatRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: {
      error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for authenticated admin users
      const user = req.user as any;
      return user?.isAdmin === 1;
    },
  });

  // General API rate limiter (stricter)
  const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: {
      error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Strict rate limiter for authentication endpoints
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: {
      error: "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });
  
  // Test database connection endpoint
  app.get("/api/test/db", async (req, res) => {
    const dbUrl = process.env.DATABASE_URL;
    const dbUrlPreview = dbUrl ? (dbUrl.length > 50 ? `${dbUrl.substring(0, 50)}...` : dbUrl) : "not set";
    
    if (!dbUrl) {
      return res.status(500).json({
        success: false,
        message: "DATABASE_URL is not set",
        error: "DATABASE_URL environment variable is missing",
        hint: "Please set DATABASE_URL in your .env file"
      });
    }

    try {
      // Try to query users table with timeout
      const users = await Promise.race([
        storage.getAllUsers(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Database query timeout after 10 seconds")), 10000)
        )
      ]) as any[];
      
      return res.json({ 
        success: true, 
        message: "Database connection successful",
        tablesExist: true,
        userCount: users.length,
        databaseUrl: dbUrlPreview,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Database test error:", error);
      const isTableError = error?.code === "42P01" || error?.message?.includes("does not exist") || error?.message?.includes("relation");
      const isTimeoutError = error?.message?.includes("timeout") || error?.code === "ETIMEDOUT";
      const isConnectionError = error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND";
      
      let hint = "Check DATABASE_URL in .env file";
      if (isTableError) {
        hint = "Please run migration.sql in your database SQL editor";
      } else if (isTimeoutError) {
        hint = "Database connection timeout - check network, firewall, or database server status";
      } else if (isConnectionError) {
        hint = "Cannot connect to database - verify DATABASE_URL, check if database is running, and ensure firewall allows connections";
      }
      
      return res.status(500).json({ 
        success: false,
        message: "Database connection failed",
        error: error?.message,
        code: error?.code,
        tablesExist: !isTableError,
        databaseUrl: dbUrlPreview,
        hint: hint,
        troubleshooting: {
          checkDatabaseUrl: "Verify DATABASE_URL is correct in .env file",
          checkNetwork: "Ensure database server is accessible from your network",
          checkSSL: "For cloud databases (Neon/Supabase), ensure SSL is properly configured",
          checkMigrations: isTableError ? "Run migration.sql in your database SQL editor" : undefined
        }
      });
    }
  });

  // Test OAuth configuration endpoint
  app.get("/api/test/oauth", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Construct callback URL same way as auth.ts
    let callbackUrl = process.env.GOOGLE_CALLBACK_URL;
    if (!callbackUrl) {
      if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
        const port = process.env.PORT || "5001";
        callbackUrl = `http://localhost:${port}/api/auth/google/callback`;
      } else {
        callbackUrl = "/api/auth/google/callback";
      }
    }
    
    // Determine full callback URL for display
    let fullCallbackUrl = callbackUrl;
    if (callbackUrl.startsWith("/")) {
      // Relative path - construct full URL
      const protocol = req.protocol;
      const host = req.get("host");
      fullCallbackUrl = `${protocol}://${host}${callbackUrl}`;
    }
    
    return res.json({
      configured: !!(clientId && clientSecret),
      clientId: clientId ? `${clientId.substring(0, 20)}...` : "not set",
      clientSecret: clientSecret ? `${clientSecret.substring(0, 10)}...` : "not set",
      callbackUrl: callbackUrl,
      fullCallbackUrl: fullCallbackUrl,
      hint: "Make sure this full callback URL is added to Google Cloud Console as 'Authorized redirect URIs'",
      googleConsoleUrl: "https://console.cloud.google.com/apis/credentials"
    });
  });

  // Create uploads directory if it doesn't exist
  // On Vercel, the filesystem is read-only except for /tmp, so we must use /tmp for uploads
  const uploadsBaseDir = process.env.VERCEL ? "/tmp" : process.cwd();
  const uploadsDir = path.join(uploadsBaseDir, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `image-${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({
    storage: storageConfig,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("فرمت فایل پشتیبانی نمی‌شود. فقط تصاویر JPG, PNG, GIF, WebP مجاز هستند."));
      }
    },
  });

  // Upload endpoint
  app.post("/api/upload", requireAuth, apiRateLimiter, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "هیچ فایلی آپلود نشده است" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      
      return res.json({
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      return res.status(500).json({
        error: error.message || "خطا در آپلود فایل",
      });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));
  
  // Auth routes with rate limiting
  app.get("/api/auth/google", authRateLimiter, (req, res, next) => {
    console.log("🔵 Google OAuth login request received");
    console.log("Request URL:", req.url);
    console.log("Request headers:", req.headers);
    
    if (!isGoogleOAuthConfigured()) {
      console.error("❌ Google OAuth not configured");
      return res.status(503).json({ 
        message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables." 
      });
    }
    
    console.log("✅ Google OAuth configured, redirecting to Google...");
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  });
  
  app.get(
    "/api/auth/google/callback",
    authRateLimiter,
    passport.authenticate("google", {
      failureRedirect: "/login?error=auth_failed",
      session: true,
    }),
    (req, res) => {
      console.log("Google OAuth callback successful");
      console.log("User authenticated:", req.user);
      console.log("Is authenticated:", req.isAuthenticated());
      
      // Redirect to home page after successful authentication
      // Use absolute URL for better compatibility with Vercel and proxies
      const protocol = req.protocol || (req.get("x-forwarded-proto") || "https");
      const host = req.get("host") || req.hostname;
      const redirectUrl = `${protocol}://${host}/`;
      
      console.log("Redirecting to:", redirectUrl);
      res.redirect(redirectUrl);
    }
  );

  app.get("/api/auth/me", apiRateLimiter, (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as any;
      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isAdmin: user.isAdmin || 0,
      });
    }
    return res.status(401).json({ error: "وارد نشده‌اید" });
  });

  app.post("/api/auth/logout", apiRateLimiter, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true });
    });
  });

  // Temporary endpoint to make current user admin (for first-time setup)
  app.post("/api/auth/make-admin", requireAuth, authRateLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: "وارد نشده‌اید" });
      }

      // Check if there are any admins
      const allUsers = await storage.getAllUsers();
      const hasAdmin = allUsers.some(u => u.isAdmin === 1);

      // If no admin exists, make current user admin
      // Otherwise, only allow if current user is already admin
      if (!hasAdmin || user.isAdmin === 1) {
        const updatedUser = await storage.setUserAdmin(user.id, true);
        return res.json({ 
          success: true, 
          message: "شما به ادمین تبدیل شدید",
          user: updatedUser 
        });
      }

      return res.status(403).json({ 
        error: "فقط ادمین‌ها می‌توانند کاربران دیگر را به ادمین تبدیل کنند" 
      });
    } catch (error) {
      console.error("Error making user admin:", error);
      return res.status(500).json({ error: "خطا در تبدیل به ادمین" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allConversations = await storage.getConversations();
      
      // Count messages
      let totalMessages = 0;
      for (const conv of allConversations) {
        const messages = await storage.getMessages(conv.id);
        totalMessages += messages.length;
      }

      return res.json({
        totalUsers: allUsers.length,
        totalConversations: allConversations.length,
        totalMessages,
        adminUsers: allUsers.filter(u => u.isAdmin === 1).length,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return res.status(500).json({ error: "خطا در دریافت آمار" });
    }
  });

  app.get("/api/admin/users", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      return res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "خطا در دریافت کاربران" });
    }
  });

  app.get("/api/admin/conversations", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      return res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ error: "خطا در دریافت گفتگوها" });
    }
  });

  app.patch("/api/admin/users/:id/admin", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { isAdmin } = req.body;
      const user = await storage.setUserAdmin(id, isAdmin === true);
      if (!user) {
        return res.status(404).json({ error: "کاربر یافت نشد" });
      }
      return res.json(user);
    } catch (error) {
      console.error("Error updating user admin status:", error);
      return res.status(500).json({ error: "خطا در بروزرسانی وضعیت ادمین" });
    }
  });

  app.get("/api/admin/settings", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      return res.json({
        openaiApiKeySet: !!process.env.OPENAI_API_KEY || apiKeys.some(k => k.provider === "openai" && k.isActive === 1),
        googleOAuthSet: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      });
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      return res.status(500).json({ error: "خطا در دریافت تنظیمات" });
    }
  });

  // API Keys management routes
  app.get("/api/admin/api-keys", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      // Don't send the actual API keys, just mask them
      const maskedKeys = apiKeys.map(key => ({
        id: key.id,
        provider: key.provider,
        apiKey: key.apiKey ? `${key.apiKey.substring(0, 8)}...${key.apiKey.substring(key.apiKey.length - 4)}` : "",
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      }));
      return res.json(maskedKeys);
    } catch (error: any) {
      console.error("Error fetching API keys:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      
      // Check if table doesn't exist
      if (error?.code === "42P01" || error?.message?.includes("does not exist") || error?.message?.includes("relation") && error?.message?.includes("does not exist")) {
        return res.status(500).json({ 
          error: "جدول api_keys در دیتابیس وجود ندارد",
          hint: "لطفاً migration را در Neon Console اجرا کنید",
          migrationSQL: `
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(36) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
          `
        });
      }
      
      return res.status(500).json({ 
        error: "خطا در دریافت API Keys",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  });

  app.post("/api/admin/api-keys", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      
      // Security: Input validation
      if (!provider || typeof provider !== "string" || provider.trim().length === 0) {
        return res.status(400).json({ error: "provider الزامی است و باید رشته معتبر باشد" });
      }
      if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
        return res.status(400).json({ error: "apiKey الزامی است و باید رشته معتبر باشد" });
      }
      
      // Security: Sanitize inputs
      const sanitizedProvider = provider.trim().slice(0, 50); // Max 50 chars
      const sanitizedApiKey = apiKey.trim();

      // Check if provider already exists
      let existing;
      try {
        existing = await storage.getApiKeyByProvider(sanitizedProvider);
      } catch (dbError: any) {
        // If table doesn't exist, provide helpful error
        if (dbError?.message?.includes("does not exist") || dbError?.code === "42P01") {
          return res.status(500).json({ 
            error: "جدول api_keys در دیتابیس وجود ندارد. لطفاً migration را اجرا کنید.",
            migrationHint: "به Neon Console بروید و migration.sql را اجرا کنید"
          });
        }
        throw dbError;
      }
      
      if (existing) {
        // Update existing
        const updated = await storage.updateApiKey(existing.id, { apiKey: sanitizedApiKey, isActive: 1 });
        return res.json({
          id: updated!.id,
          provider: updated!.provider,
          apiKey: `${updated!.apiKey.substring(0, 8)}...${updated!.apiKey.substring(updated!.apiKey.length - 4)}`,
          isActive: updated!.isActive,
        });
      } else {
        // Create new
        const newKey = await storage.createApiKey({
          id: crypto.randomUUID(),
          provider: sanitizedProvider,
          apiKey: sanitizedApiKey,
          isActive: 1,
        });
        return res.json({
          id: newKey.id,
          provider: newKey.provider,
          apiKey: `${newKey.apiKey.substring(0, 8)}...${newKey.apiKey.substring(newKey.apiKey.length - 4)}`,
          isActive: newKey.isActive,
        });
      }
    } catch (error: any) {
      console.error("Error creating/updating API key:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      
      // Check for specific database errors
      if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
        return res.status(500).json({ 
          error: "جدول api_keys در دیتابیس وجود ندارد. لطفاً migration را اجرا کنید.",
          hint: "به Neon Console بروید و migration.sql را اجرا کنید"
        });
      }
      
      if (error?.code === "23505" || error?.message?.includes("unique constraint")) {
        return res.status(400).json({ 
          error: "این provider قبلاً ثبت شده است. لطفاً از ویرایش استفاده کنید."
        });
      }
      
      const errorMessage = error?.message || "خطا در ذخیره API Key";
      return res.status(500).json({ 
        error: "خطا در ذخیره API Key",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: error?.code
      });
    }
  });

  app.patch("/api/admin/api-keys/:id", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { apiKey, isActive } = req.body;
      
      // Security: Validate ID parameter
      if (!id || typeof id !== "string" || id.trim().length === 0) {
        return res.status(400).json({ error: "شناسه نامعتبر است" });
      }
      
      const updates: any = {};
      if (apiKey !== undefined) {
        // Security: Validate and sanitize API key
        if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
          return res.status(400).json({ error: "apiKey باید رشته معتبر باشد" });
        }
        updates.apiKey = apiKey.trim();
      }
      if (isActive !== undefined) {
        // Security: Validate isActive is boolean
        if (typeof isActive !== "boolean") {
          return res.status(400).json({ error: "isActive باید boolean باشد" });
        }
        updates.isActive = isActive ? 1 : 0;
      }
      
      const updated = await storage.updateApiKey(id, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "API Key یافت نشد" });
      }

      return res.json({
        id: updated.id,
        provider: updated.provider,
        apiKey: `${updated.apiKey.substring(0, 8)}...${updated.apiKey.substring(updated.apiKey.length - 4)}`,
        isActive: updated.isActive,
      });
    } catch (error) {
      console.error("Error updating API key:", error);
      return res.status(500).json({ error: "خطا در بروزرسانی API Key" });
    }
  });

  app.delete("/api/admin/api-keys/:id", requireAuth, requireAdmin, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApiKey(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting API key:", error);
      return res.status(500).json({ error: "خطا در حذف API Key" });
    }
  });

  // Get all conversations (protected)
  // Clean up conversations with NULL userId (development only)
  app.post("/api/admin/cleanup-conversations", requireAuth, requireAdmin, async (req, res) => {
    try {
      // This endpoint helps fix conversations without userId
      const result = await storage.deleteConversationsWithoutUser();
      return res.json({ 
        success: true, 
        message: "Cleanup complete",
        result 
      });
    } catch (error: any) {
      console.error("Cleanup error:", error);
      return res.status(500).json({ error: "خطا در پاکسازی" });
    }
  });

  // Development cleanup endpoint (no auth required)
  app.post("/api/dev/cleanup-conversations", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "این endpoint فقط در development دستیاب است" });
    }
    try {
      const result = await storage.deleteConversationsWithoutUser();
      console.log("Cleanup result:", result);
      return res.json({ 
        success: true, 
        message: "تمام conversations بدون userId حذف شدند",
        result 
      });
    } catch (error: any) {
      console.error("Cleanup error:", error);
      return res.status(500).json({ error: "خطا در پاکسازی", details: error.message });
    }
  });

  // Direct cleanup - delete ALL conversations (dangerous - development only)
  app.delete("/api/dev/all-conversations", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "این endpoint فقط در development دستیاب است" });
    }
    try {
      // Delete ALL conversations
      const result = await storage.deleteAllConversations();
      console.log("All conversations deleted:", result);
      return res.json({ 
        success: true, 
        message: "تمام conversations حذف شدند",
        result 
      });
    } catch (error: any) {
      console.error("Delete all error:", error);
      return res.status(500).json({ error: "خطا در حذف", details: error.message });
    }
  });

  app.get("/api/conversations", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      console.log("📌 /api/conversations - User ID:", user?.id, "Email:", user?.email);
      const searchQuery = req.query.q as string | undefined;
      const folderId = req.query.folderId as string | undefined;
      const includeArchived = req.query.archived === "true";
      
      if (searchQuery && searchQuery.trim()) {
        const conversations = await storage.searchConversations(searchQuery.trim(), user.id);
        return res.json(conversations);
      }
      
      const conversations = await storage.getConversations(user.id, folderId === "null" ? null : folderId, includeArchived);
      console.log("📌 Returning conversations for user:", user?.id, "Count:", conversations.length);
      return res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ error: "خطا در دریافت گفتگوها" });
    }
  });

  // Folders endpoints
  app.get("/api/folders", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const folders = await storage.getFolders(user.id);
      return res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      return res.status(500).json({ error: "خطا در دریافت پوشه‌ها" });
    }
  });

  app.post("/api/folders", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { name, color } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "نام پوشه الزامی است" });
      }

      const folder = await storage.createFolder({
        id: crypto.randomUUID(),
        userId: user.id,
        name: name.trim(),
        color: color || null,
      });
      
      return res.json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      return res.status(500).json({ error: "خطا در ایجاد پوشه" });
    }
  });

  app.patch("/api/folders/:id", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const folder = await storage.getFolder(id);
      
      if (!folder) {
        return res.status(404).json({ error: "پوشه یافت نشد" });
      }
      
      if (folder.userId !== user.id) {
        return res.status(403).json({ error: "شما دسترسی به این پوشه ندارید" });
      }
      
      const updated = await storage.updateFolder(id, req.body);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating folder:", error);
      return res.status(500).json({ error: "خطا در بروزرسانی پوشه" });
    }
  });

  app.delete("/api/folders/:id", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const folder = await storage.getFolder(id);
      
      if (!folder) {
        return res.status(404).json({ error: "پوشه یافت نشد" });
      }
      
      if (folder.userId !== user.id) {
        return res.status(403).json({ error: "شما دسترسی به این پوشه ندارید" });
      }
      
      await storage.deleteFolder(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting folder:", error);
      return res.status(500).json({ error: "خطا در حذف پوشه" });
    }
  });

  // Get single conversation with messages (protected)
  app.get("/api/conversations/:id", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "گفتگو یافت نشد" });
      }

      // Security: Check if conversation belongs to the current user
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: "شما دسترسی به این گفتگو ندارید" });
      }

      const messages = await storage.getMessages(id);
      return res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ error: "خطا در دریافت گفتگو" });
    }
  });

  // Create new conversation (protected)
  app.post("/api/conversations", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      // Prepare conversation data with defaults for new fields
      const conversationData: any = {
        id: req.body.id || crypto.randomUUID(),
        userId: user.id,
        title: req.body.title || "گفتگوی جدید",
        model: req.body.model || "gpt-5",
      };
      
      // Only include new fields if they exist in request or set defaults
      if (req.body.folderId !== undefined) {
        conversationData.folderId = req.body.folderId;
      }
      if (req.body.systemPrompt !== undefined) {
        conversationData.systemPrompt = req.body.systemPrompt;
      }
      conversationData.isPinned = req.body.isPinned ?? 0;
      conversationData.isArchived = req.body.isArchived ?? 0;
      
      const parsed = insertConversationSchema.safeParse(conversationData);
      
      if (!parsed.success) {
        console.error("Validation error:", parsed.error);
        return res.status(400).json({ error: "درخواست نامعتبر است", details: parsed.error.errors });
      }

      const conversation = await storage.createConversation(parsed.data);
      return res.json(conversation);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      console.error("Error stack:", error.stack);
      return res.status(500).json({ 
        error: "خطا در ایجاد گفتگو", 
        details: error.message,
        code: error.code
      });
    }
  });

  // Update conversation (protected)
  app.patch("/api/conversations/:id/pin", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "گفتگو یافت نشد" });
      }
      
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: "شما دسترسی به این گفتگو ندارید" });
      }
      
      const updated = await storage.updateConversation(id, {
        isPinned: conversation.isPinned === 1 ? 0 : 1,
      });
      
      return res.json(updated);
    } catch (error) {
      console.error("Error toggling pin:", error);
      return res.status(500).json({ error: "خطا در تغییر وضعیت pin" });
    }
  });

  app.patch("/api/conversations/:id/archive", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "گفتگو یافت نشد" });
      }
      
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: "شما دسترسی به این گفتگو ندارید" });
      }
      
      const updated = await storage.updateConversation(id, {
        isArchived: conversation.isArchived === 1 ? 0 : 1,
      });
      
      return res.json(updated);
    } catch (error) {
      console.error("Error toggling archive:", error);
      return res.status(500).json({ error: "خطا در تغییر وضعیت archive" });
    }
  });

  app.patch("/api/conversations/:id", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "گفتگو یافت نشد" });
      }

      // Security: Check if conversation belongs to the current user
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: "شما دسترسی به این گفتگو ندارید" });
      }

      const updated = await storage.updateConversation(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "گفتگو یافت نشد" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error updating conversation:", error);
      return res.status(500).json({ error: "خطا در بروزرسانی گفتگو" });
    }
  });

  // Delete conversation (protected)
  app.delete("/api/conversations/:id", requireAuth, apiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "گفتگو یافت نشد" });
      }

      // Security: Check if conversation belongs to the current user
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: "شما دسترسی به این گفتگو ندارید" });
      }

      await storage.deleteConversation(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return res.status(500).json({ error: "خطا در حذف گفتگو" });
    }
  });

  // Demo chat endpoint (no auth required) - OpenRouter, non-streaming
  app.post("/api/demo/chat", chatRateLimiter, async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "پیام نامعتبر است" });
      }

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "کلید OpenRouter تنظیم نشده است." });
      }

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      try {
        // Stream the response
        for await (const chunk of callOpenRouterStream(apiKey, [
          { 
            role: "system", 
            content: "شما یک دستیار هوشمند و حرفه‌ای هستید که به زبان فارسی روان و طبیعی صحبت می‌کنید. " +
              "پاسخ‌های شما باید به زبان فارسی معیار و صحیح نوشته شوند، طبیعی و روان باشند، " +
              "مختصر و مفید باشند، و از ساختارهای دستوری صحیح فارسی استفاده کنند. " +
              "همیشه سعی کنید پاسخ‌های خود را به صورت کامل و جامع ارائه دهید."
          },
          { role: "user", content: message },
        ])) {
          // Send chunk to client via SSE
          res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
          }

        // Send final message
        res.write(`data: ${JSON.stringify({ content: "", done: true })}\n\n`);
        res.end();
      } catch (streamError: any) {
        console.error("Demo streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ error: "خطا در دریافت پاسخ", done: true })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error("Demo chat error:", error);
      if (!res.headersSent) {
      return res.status(500).json({ error: "خطا در پردازش درخواست" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "خطا در پردازش درخواست", done: true })}\n\n`);
        res.end();
      }
    }
  });

  // Chat endpoint (protected) - OpenRouter, non-streaming
  app.post("/api/chat", requireAuth, chatRateLimiter, async (req, res) => {
    try {
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("Schema validation error:", parsed.error.errors);
        return res.status(400).json({ error: "درخواست نامعتبر است", details: parsed.error.errors });
      }

      const { message, conversationId, imageUrl } = parsed.data;

      // Validate that either message or imageUrl is provided
      const hasMessage = message && message.trim().length > 0;
      const hasImage = imageUrl && imageUrl.trim() !== "";
      
      if (!hasMessage && !hasImage) {
        return res.status(400).json({ error: "پیام یا تصویر باید ارسال شود" });
      }

      console.log("Chat request received:", { 
        message: message?.substring(0, 50) || "(empty)", 
        messageLength: message?.length || 0,
        conversationId, 
        hasImage: !!imageUrl,
        imageUrl: imageUrl?.substring(0, 50) || "none"
      });

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "کلید OpenRouter تنظیم نشده است." });
      }

      // Save user message first if conversationId provided
      if (conversationId) {
        // Security: Verify that conversation belongs to the current user
        const conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "گفتگو یافت نشد" });
        }
        const user = req.user as any;
        if (conversation.userId !== user.id) {
          return res.status(403).json({ error: "شما دسترسی به این گفتگو ندارید" });
        }

        const userMessageId = crypto.randomUUID();
        await storage.createMessage({
          id: userMessageId,
          conversationId,
          role: "user",
          content: message,
        });

        // Save attachment if imageUrl provided
        if (imageUrl && imageUrl.trim() !== "") {
          try {
            const fullUrl = imageUrl.startsWith("http") ? imageUrl : `${req.protocol}://${req.get("host")}${imageUrl}`;
            await storage.createAttachment({
              id: crypto.randomUUID(),
              messageId: userMessageId,
              type: "image",
              url: fullUrl,
              filename: path.basename(imageUrl),
              mimeType: "image/jpeg", // Default, could be improved
            });
          } catch (attachmentError: any) {
            console.error("Error creating attachment:", attachmentError);
            // Continue even if attachment creation fails
          }
        }
      }
      
      // Get conversation for custom system prompt
      let customSystemPrompt: string | null = null;
      if (conversationId) {
        const conversation = await storage.getConversation(conversationId);
        if (conversation?.systemPrompt) {
          customSystemPrompt = conversation.systemPrompt;
        }
      }
      
      const conversationMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: customSystemPrompt || 
            "شما یک دستیار هوشمند و حرفه‌ای هستید که به زبان فارسی روان و طبیعی صحبت می‌کنید. " +
            "پاسخ‌های شما باید:\n" +
            "- به زبان فارسی معیار و صحیح نوشته شوند (بدون استفاده از کلمات انگلیسی غیرضروری)\n" +
            "- طبیعی و روان باشند، مثل یک فارسی‌زبان بومی\n" +
            "- مختصر، مفید و دقیق باشند\n" +
            "- دوستانه و صمیمی باشند اما حرفه‌ای بمانند\n" +
            "- از ساختارهای دستوری صحیح فارسی استفاده کنند\n" +
            "- از علائم نگارشی فارسی به درستی استفاده کنند\n\n" +
            "اگر کاربر به زبان دیگری سوال پرسید، به همان زبان پاسخ دهید. " +
            "می‌توانید از مارک‌داون برای فرمت‌بندی پاسخ‌ها استفاده کنید. " +
            "همیشه سعی کنید پاسخ‌های خود را به صورت کامل و جامع ارائه دهید.",
        },
      ];
      
      if (conversationId) {
        const dbMessages = await storage.getMessages(conversationId);
        conversationMessages.push(
          ...dbMessages.map((m) => ({
          role: m.role as "user" | "assistant",
            content: m.content,
          })),
        );
      }

      // Build user message (images are displayed in UI but not sent to API)
      conversationMessages.push({ role: "user", content: message || "" });

      // Set up SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        let fullContent = "";
      const assistantMessageId = crypto.randomUUID();

      try {
        // Stream the response (images are not sent to API, only text)
        for await (const chunk of callOpenRouterStream(apiKey, conversationMessages)) {
          fullContent += chunk;
          // Send chunk to client via SSE
          res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
        }

        // Send final message
        res.write(`data: ${JSON.stringify({ content: "", done: true, messageId: assistantMessageId })}\n\n`);

        // Save the complete message to database
        if (conversationId) {
            await storage.createMessage({
              id: assistantMessageId,
              conversationId,
              role: "assistant",
            content: fullContent,
            });

            const messages = await storage.getMessages(conversationId);
            if (messages.length <= 2) {
            const title = await generateSmartTitle(apiKey, message);
                await storage.updateConversation(conversationId, { title });
            }
          }

          res.end();
        } catch (streamError: any) {
        console.error("Streaming error:", streamError);
        console.error("Streaming error details:", {
          message: streamError.message,
          stack: streamError.stack,
          hasImage: !!imageUrl,
        });
        res.write(`data: ${JSON.stringify({ error: streamError.message || "خطا در دریافت پاسخ", done: true })}\n\n`);
          res.end();
        }
    } catch (error: any) {
      console.error("Chat API error:", error);
      if (!res.headersSent) {
      return res.status(500).json({ 
        error: "خطایی در پردازش درخواست رخ داد. لطفاً دوباره تلاش کنید.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
      } else {
        res.write(`data: ${JSON.stringify({ error: "خطایی در پردازش درخواست رخ داد", done: true })}\n\n`);
        res.end();
      }
    }
  });

  return httpServer;
}
