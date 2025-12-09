// Vercel serverless function adapter
// This file exports the Express app for Vercel's serverless environment

// Set VERCEL environment variable before importing
process.env.VERCEL = "1";

// Import the handler from server/index.ts
// The server will export a handler function when VERCEL is set
import handler from "../server/index";

// Export the handler for Vercel
export default handler;

