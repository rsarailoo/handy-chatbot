// Vercel serverless function adapter
// This file exports the Express app for Vercel's serverless environment

// Set VERCEL environment variable before importing
process.env.VERCEL = "1";

// Import the handler from the built server file
// The server is built to dist/index.cjs during the build process
// We use dynamic import with an absolute path to ensure correct resolution
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Resolve the built server file path
const serverPath = join(__dirname, "..", "dist", "index.cjs");

// Load the handler using require (since it's CommonJS)
let handler: any;

const loadHandler = () => {
  if (!handler) {
    try {
      handler = require(serverPath);
      // Handle both default export and module.exports
      handler = handler.default || handler;
    } catch (error: any) {
      console.error("Failed to load server handler:", error);
      throw error;
    }
  }
  return handler;
};

// Export the handler for Vercel
export default function vercelHandler(req: any, res: any) {
  const h = loadHandler();
  return h(req, res);
}

