import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Use process.cwd() which works in both CommonJS and ES modules
  // In Vercel, this will be the project root
  // In local builds, this will also be the project root
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    // In Vercel, static files are served by Vercel's CDN, so this is just for SPA fallback
    if (process.env.VERCEL) {
      console.log("Vercel mode: Static files served by Vercel CDN, skipping Express static serving");
      // Only add SPA fallback for client-side routing
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        app.get("*", (req, res, next) => {
          // Skip API routes
          if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
            return next();
          }
          res.sendFile(indexPath);
        });
      }
      return;
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // For local production, serve static files normally
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
