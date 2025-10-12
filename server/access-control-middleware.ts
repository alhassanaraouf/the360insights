import type { Request, Response, NextFunction } from "express";
import { canAccess, PathToPageId, type UserRole } from "@shared/access-control";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export function requirePageAccess(pagePathOrId: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "Authentication required" 
        });
      }

      let userId: string;
      if (req.user.claims) {
        userId = req.user.claims.sub;
      } else {
        userId = req.user.id;
      }

      const { storage } = await import("./storage");
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "User not found" 
        });
      }

      const userRole = user.role as UserRole;
      
      if (!canAccess(userRole, pagePathOrId)) {
        return res.status(403).json({ 
          error: "Forbidden", 
          message: "You do not have access to this resource",
          requiredRole: "Contact your administrator for access"
        });
      }

      (req as any).userRole = userRole;
      next();
    } catch (error) {
      console.error("Access control error:", error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        message: "Failed to verify access" 
      });
    }
  };
}

export async function getUserRole(req: AuthenticatedRequest): Promise<UserRole | null> {
  if (!req.user) {
    return null;
  }

  let userId: string;
  if (req.user.claims) {
    userId = req.user.claims.sub;
  } else {
    userId = req.user.id;
  }

  const { storage } = await import("./storage");
  const user = await storage.getUser(userId);
  
  if (!user) {
    return null;
  }

  return user.role as UserRole;
}

export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "Authentication required" 
        });
      }

      const userRole = await getUserRole(req);
      
      if (!userRole) {
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "User not found" 
        });
      }

      if (!roles.includes(userRole)) {
        return res.status(403).json({ 
          error: "Forbidden", 
          message: "You do not have permission to access this resource",
          requiredRoles: roles
        });
      }

      (req as any).userRole = userRole;
      next();
    } catch (error) {
      console.error("Role verification error:", error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        message: "Failed to verify role" 
      });
    }
  };
}
