import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import helmet from "helmet";
import cors from "cors";
import passport from "./auth";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import https from "https";

// Fix SSL certificate issues for OAuth (development only)
if (process.env.NODE_ENV !== "production") {
  https.globalAgent.options.rejectUnauthorized = false;
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security: Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for Vite in dev
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://openrouter.ai"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow Vite HMR
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Security: CORS configuration
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" 
      ? process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5001"]
      : true, // Allow all origins in development
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security: Body parsing with size limits
app.use(
  express.json({
    limit: "10mb", // Prevent large payload attacks
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Session configuration
// For Vercel, we MUST use PostgreSQL session store because serverless functions are stateless
// Memory sessions won't persist across different function instances
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL;
const isSecure = isProduction; // Vercel uses HTTPS

// Helper function to determine SSL configuration (same as storage.ts)
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

// Configure PostgreSQL session store
let sessionStore: session.Store;

if (process.env.DATABASE_URL) {
  try {
    // Create a separate pool for session store to avoid conflicts
    const sessionPoolConfig: any = {
      connectionString: process.env.DATABASE_URL,
    };
    
    // Set SSL configuration
    const sslConfig = getSSLConfig();
    if (sslConfig !== undefined) {
      sessionPoolConfig.ssl = sslConfig;
    }

    const sessionPool = new Pool(sessionPoolConfig);

    const PgStore = connectPgSimple(session);
    sessionStore = new PgStore({
      pool: sessionPool,
      tableName: 'session', // Table name for sessions
      createTableIfMissing: true, // Automatically create table if it doesn't exist
    });
    
    console.log('✅ PostgreSQL session store configured');
  } catch (error: any) {
    console.error('❌ Failed to configure PostgreSQL session store:', error.message);
    console.error('  - Error stack:', error.stack);
    console.warn('⚠️ Falling back to memory store (sessions won\'t persist on Vercel)');
    sessionStore = new session.MemoryStore();
  }
} else {
  console.warn('⚠️ DATABASE_URL not set, using memory store (sessions won\'t persist on Vercel)');
  sessionStore = new session.MemoryStore();
}

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isSecure, // Use secure cookies in production/Vercel
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax", // lax works for both HTTP and HTTPS
      // For Vercel, ensure cookie domain is not set (defaults to current domain)
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Initialize the app (register routes, setup middleware, etc.)
async function initializeApp() {
  try {
    console.log("Starting server initialization...");
    console.log("PORT:", process.env.PORT || "5001");
    
    await registerRoutes(httpServer, app);
    console.log("Routes registered");

    // Security: Error handling - don't expose sensitive information
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      
      // Log full error for debugging (server-side only)
      console.error("Error:", err);
      
      // Don't expose internal error details in production
      const message = process.env.NODE_ENV === "development" 
        ? (err.message || "Internal Server Error")
        : status === 500 
          ? "خطای داخلی سرور"
          : (err.message || "خطا در پردازش درخواست");

      res.status(status).json({ 
        error: message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
      });
      
      // Don't throw in production to prevent crash
      if (process.env.NODE_ENV === "development") {
      throw err;
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
      console.log("Production mode: serving static files");
      serveStatic(app);
    } else if (!process.env.VERCEL) {
      console.log("Development mode: setting up Vite...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      console.log("Vite setup complete");
    } else {
      // For Vercel, serve static files from dist/public
      console.log("Vercel mode: serving static files");
      serveStatic(app);
    }
  } catch (error: any) {
    console.error("❌ Failed to initialize app:", error);
    console.error(error.stack);
    throw error;
  }
}

// Start the HTTP server (only for non-Vercel environments)
async function startServer() {
  const port = parseInt(process.env.PORT || "5001", 10);
  console.log(`Attempting to listen on port ${port}...`);
  
  return new Promise<void>((resolve, reject) => {
    httpServer.listen(
      port,
      "0.0.0.0",
      () => {
        log(`✅ Server is serving on port ${port}`);
        console.log(`✅ Server is running at http://localhost:${port}`);
        resolve();
      },
    );
    
    httpServer.on("error", (error: any) => {
      console.error("❌ Server error:", error);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Please use a different port.`);
      }
      reject(error);
    });
  });
}

// For Vercel: Create handler that initializes on first call
let initialized = false;
let initializationPromise: Promise<void> | null = null;

async function vercelHandler(req: any, res: any) {
  // Ensure initialization only happens once, even with concurrent requests
  if (!initialized) {
    if (!initializationPromise) {
      initializationPromise = initializeApp()
        .then(() => {
          initialized = true;
          console.log("✅ Vercel handler initialized successfully");
        })
        .catch((error: any) => {
          console.error("❌ Failed to initialize app for Vercel:", error);
          console.error("Error stack:", error.stack);
          // Reset promise so we can retry on next request
          initializationPromise = null;
          throw error;
        });
    }
    
    try {
      await initializationPromise;
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Server initialization failed",
          message: process.env.NODE_ENV === "development" ? error.message : undefined
        });
      }
      return;
    }
  }
  
  // Handle the request
  try {
    return app(req, res);
  } catch (error: any) {
    console.error("❌ Error in request handler:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

// Initialize and start server for local development
if (!process.env.VERCEL) {
  (async () => {
    try {
      await initializeApp();
      await startServer();
    } catch (error: any) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  })();
}

// Export handler for Vercel (only used when VERCEL env is set)
export default vercelHandler;
