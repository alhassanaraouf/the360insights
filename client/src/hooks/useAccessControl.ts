import { useQuery } from "@tanstack/react-query";
import { canAccess, getAccessiblePages, getAccessiblePaths, type UserRole, type PageId } from "@shared/access-control";
import type { User } from "@shared/schema";

export function useAccessControl() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const userRole = user?.role as UserRole | undefined;

  const hasAccess = (pageIdOrPath: PageId | string): boolean => {
    return canAccess(userRole, pageIdOrPath);
  };

  const accessiblePages = getAccessiblePages(userRole);
  const accessiblePaths = getAccessiblePaths(userRole);

  return {
    userRole,
    hasAccess,
    accessiblePages,
    accessiblePaths,
    isAdmin: userRole === "admin",
    isOrgAdmin: userRole === "org_admin",
    isSponsor: userRole === "sponsor",
    isAthlete: userRole === "athlete",
  };
}
