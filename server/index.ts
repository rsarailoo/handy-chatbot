import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
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
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",
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

(async () => {
  try {
    console.log("Starting server initialization...");
    console.log("PORT:", process.env.PORT || "5000");
    
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
    if (process.env.NODE_ENV === "production") {
      console.log("Production mode: serving static files");
      serveStatic(app);
    } else {
      console.log("Development mode: setting up Vite...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      console.log("Vite setup complete");
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    console.log(`Attempting to listen on port ${port}...`);
    
    httpServer.listen(
        port,
      "0.0.0.0",
      () => {
        log(`✅ Server is serving on port ${port}`);
        console.log(`✅ Server is running at http://localhost:${port}`);
      },
    );
    
    httpServer.on("error", (error: any) => {
      console.error("❌ Server error:", error);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Please use a different port.`);
      }
      process.exit(1);
    });
    
  } catch (error: any) {
    console.error("❌ Failed to start server:", error);
    console.error(error.stack);
    process.exit(1);
  }
})();
