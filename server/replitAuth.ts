import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { UserRole } from "@shared/access-control";
import { validatePassword, PASSWORD_POLICY_HINT } from "./password-policy";

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

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  const sessionMiddleware = getSession();
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // Rate limiters for auth endpoints
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10); // default 15 minutes
  const maxLogin = parseInt(process.env.RATE_LIMIT_LOGIN_MAX || "10", 10);
  const maxRegister = parseInt(process.env.RATE_LIMIT_REGISTER_MAX || "5", 10);

  const loginLimiter = rateLimit({
    windowMs,
    max: maxLogin,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again later." },
    keyGenerator: (req) => (req.ip || "") + ":" + (req.body?.email || "")
  });

  const registerLimiter = rateLimit({
    windowMs,
    max: maxRegister,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many signup attempts. Please try again later." },
    keyGenerator: (req) => (req.ip || "") + ":" + (req.body?.email || "")
  });

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

  // Local Auth Routes
  app.post("/api/auth/login", loginLimiter, (req, res, next) => {
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

  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      // Basic input checks
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Valid email is required" });
      }
      const pwdCheck = validatePassword(password);
      if (!pwdCheck.valid) {
        return res.status(400).json({ message: pwdCheck.message || PASSWORD_POLICY_HINT });
      }
      
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

      // Validate new password strength
      const pwdCheck = validatePassword(newPassword);
      if (!pwdCheck.valid) {
        return res.status(400).json({ message: pwdCheck.message || PASSWORD_POLICY_HINT });
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
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
};