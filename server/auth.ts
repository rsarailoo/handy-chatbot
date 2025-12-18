import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { User, InsertUser } from "@shared/schema";

// Check if Google OAuth is configured
export function isGoogleOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Helper function to construct callback URL
function getCallbackURL(): string {
  // If explicitly set, use it
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  
  // For local development, construct full URL
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const port = process.env.PORT || "5001";
    return `http://localhost:${port}/api/auth/google/callback`;
  }
  
  // Default to relative path (should be overridden in production)
  return "/api/auth/google/callback";
}

// Configure Google OAuth Strategy only if credentials are provided
if (isGoogleOAuthConfigured()) {
  const callbackURL = getCallbackURL();
  console.log("🔐 Google OAuth callback URL:", callbackURL);
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("🔵 Google OAuth profile received:");
          console.log("  - Google ID:", profile.id);
          console.log("  - Email:", profile.emails?.[0]?.value);
          console.log("  - Name:", profile.displayName);
          
          // Check if user exists
          console.log("🔍 Checking if user exists in database...");
          let user = await storage.getUserByGoogleId(profile.id);

          if (!user) {
            console.log("📝 User not found, creating new user...");
            // Create new user
            const newUser: InsertUser = {
              id: crypto.randomUUID(),
              googleId: profile.id,
              email: profile.emails?.[0]?.value || "",
              name: profile.displayName || "",
              picture: profile.photos?.[0]?.value || null,
              isAdmin: 0, // Default to non-admin
            };
            console.log("📝 Creating user with data:", {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              googleId: newUser.googleId
            });
            user = await storage.createUser(newUser);
            console.log("✅ New user created successfully:", user.id, user.email);
          } else {
            console.log("✅ User found:", user.id, user.email);
            // Update user info if needed
            if (user.picture !== profile.photos?.[0]?.value || user.name !== profile.displayName) {
              console.log("🔄 Updating user info...");
              user = await storage.updateUser(user.id, {
                picture: profile.photos?.[0]?.value || null,
                name: profile.displayName || user.name,
              });
              console.log("✅ User info updated");
            }
          }

          return done(null, user);
        } catch (error: any) {
          console.error("❌ Error in Google OAuth strategy:");
          console.error("  - Error code:", error?.code);
          console.error("  - Error message:", error?.message);
          console.error("  - Error stack:", error?.stack);
          console.error("  - Full error:", JSON.stringify(error, null, 2));
          
          // Check if it's a database table error
          if (error?.code === "42P01" || error?.message?.includes("does not exist") || error?.message?.includes("relation")) {
            console.error("❌ Database tables not found! Please run migration.sql in Neon Console");
            const dbError = new Error("Database tables not found. Please run migration.sql in Neon Console.");
            (dbError as any).code = "DB_TABLES_MISSING";
            return done(dbError, undefined);
          }
          
          // Check for unique constraint violation (user already exists with different googleId)
          if (error?.code === "23505" || error?.message?.includes("unique constraint") || error?.message?.includes("duplicate key")) {
            console.error("❌ User with this email already exists with different Google ID");
            const duplicateError = new Error("User with this email already exists.");
            (duplicateError as any).code = "DUPLICATE_USER";
            return done(duplicateError, undefined);
          }
          
          return done(error, undefined);
        }
      }
    )
  );
  console.log("Google OAuth strategy configured successfully");
} else {
  console.warn("Google OAuth credentials not configured. Authentication will not be available.");
  console.warn("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables to enable authentication.");
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    console.log("Deserializing user with ID:", id);
    const user = await storage.getUserById(id);
    if (user) {
      console.log("User deserialized successfully:", user.email);
    } else {
      console.warn("User not found for ID:", id);
    }
    done(null, user || null);
  } catch (error: any) {
    console.error("Error deserializing user:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    done(error, null);
  }
});

export default passport;

