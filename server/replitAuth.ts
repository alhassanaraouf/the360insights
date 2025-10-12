import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { UserRole } from "@shared/access-control";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false, // We already created the sessions table
    ttl: sessionTtl / 1000, // Convert to seconds

    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  const sessionMiddleware = getSession();
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  // Replit Auth Strategy
  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        const user = await storage.upsertUser({
          id: `google_${profile.id}`,
          email: profile.emails?.[0]?.value || null,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
        });
        return done(null, { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          provider: 'google'
        });
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Microsoft OAuth Strategy
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    passport.use(new MicrosoftStrategy({
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: "/api/auth/microsoft/callback",
      scope: ['user.read']
    }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        const user = await storage.upsertUser({
          id: `microsoft_${profile.id}`,
          email: profile.emails?.[0]?.value || null,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
        });
        return done(null, { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          provider: 'microsoft'
        });
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Local Strategy (Username/Password)
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email: string, password: string, done: any) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, undefined, { message: 'Invalid email or password' });
      }
      
      if (!user.passwordHash) {
        return done(null, undefined, { message: 'This account was created with a different login method. Please use that method or set up a password first.' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return done(null, undefined, { message: 'Invalid email or password' });
      }
      
      return done(null, { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        provider: 'local'
      });
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  // Replit Auth Routes
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login",
    })(req, res, next);
  });

  // Google Auth Routes
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { 
      successRedirect: "/",
      failureRedirect: "/login"
    })
  );

  // Microsoft Auth Routes
  app.get("/api/auth/microsoft",
    passport.authenticate("microsoft", { scope: ["user.read"] })
  );

  app.get("/api/auth/microsoft/callback",
    passport.authenticate("microsoft", {
      successRedirect: "/",
      failureRedirect: "/login"
    })
  );

  // Local Auth Routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        return res.json({ message: "Login successful", user });
      });
    })(req, res, next);
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      // Validate and sanitize role - only allow non-privileged roles during registration
      const allowedRegistrationRoles = [UserRole.ATHLETE, UserRole.ORG_ADMIN, UserRole.SPONSOR];
      let validatedRole = UserRole.ATHLETE; // Default to athlete
      
      if (role && allowedRegistrationRoles.includes(role as any)) {
        validatedRole = role;
      } else if (role) {
        // Log suspicious attempts to claim admin or invalid roles
        console.warn(`Registration attempt with invalid/privileged role: ${role} for email: ${email}`);
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.passwordHash) {
        return res.status(400).json({ message: "User already exists with a password. Please use the login form." });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      let user;
      if (existingUser) {
        // User exists but no password (from OAuth), add password
        user = await storage.upsertUser({
          ...existingUser,
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
          role: validatedRole,
          passwordHash,
        });
      } else {
        // Create new user
        user = await storage.upsertUser({
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email,
          firstName,
          lastName,
          role: validatedRole,
          passwordHash,
          profileImageUrl: null,
        });
      }
      
      // Log in the user
      req.login({ 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        provider: 'local'
      }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.json({ message: "Account setup successful", user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl
        }});
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Profile management routes
  app.put("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const { firstName, lastName, email, bio } = req.body;
      const user = req.user as any;
      let userId;
      
      if (user.claims) {
        userId = user.claims.sub;
      } else {
        userId = user.id;
      }

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email is already in use by another account" });
        }
      }

      const updatedUser = await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        bio,
        profileImageUrl: user.profileImageUrl || null,
        passwordHash: user.passwordHash || null,
      });

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user as any;
      let userId;
      
      if (user.claims) {
        userId = user.claims.sub;
      } else {
        userId = user.id;
      }

      // Get current user from database
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // For OAuth users without password, allow setting password without current password
      if (dbUser.passwordHash) {
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, dbUser.passwordHash);
        if (!isValidPassword) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await storage.upsertUser({
        ...dbUser,
        passwordHash,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.delete("/api/auth/delete-account", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let userId;
      
      if (user.claims) {
        userId = user.claims.sub;
      } else {
        userId = user.id;
      }

      // Delete user account
      await storage.deleteUser(userId);

      // Log out the user
      req.logout(() => {
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    
    req.logout(() => {
      // If user logged in via Replit, redirect to Replit logout
      if (user?.claims) {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } else {
        // For other providers, just redirect to home
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;

  // For Replit auth users, check token expiration and refresh if needed
  if (user.claims && user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
      } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
      }
    }
  }

  // For other auth providers (Google, Microsoft, Local), just check if authenticated
  return next();
};