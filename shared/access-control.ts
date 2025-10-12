import { z } from "zod";

export const UserRole = {
  ATHLETE: "athlete",
  ORG_ADMIN: "org_admin",
  SPONSOR: "sponsor",
  ADMIN: "admin",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const userRoleSchema = z.enum([
  UserRole.ATHLETE,
  UserRole.ORG_ADMIN,
  UserRole.SPONSOR,
  UserRole.ADMIN,
]);

export const PageId = {
  DASHBOARD: "dashboard",
  ATHLETE_DIRECTORY: "athlete_directory",
  ATHLETE_360: "athlete_360",
  CAREER_JOURNEY: "career_journey",
  OPPONENT_ANALYSIS: "opponent_analysis",
  TRAINING_PLAN: "training_plan",
  RANK_UP: "rank_up",
  DRAW_SHEET: "draw_sheet",
  AI_INSIGHTS: "ai_insights",
  SPONSORSHIP_HUB: "sponsorship_hub",
  LIVE_MATCH: "live_match",
  ACCOUNT_SETTINGS: "account_settings",
  DATA_SCRAPER: "data_scraper",
  COMPETITION_PREFERENCES: "competition_preferences",
} as const;

export type PageId = typeof PageId[keyof typeof PageId];

export const PageIdToPath: Record<PageId, string> = {
  [PageId.DASHBOARD]: "/",
  [PageId.ATHLETE_DIRECTORY]: "/athletes",
  [PageId.ATHLETE_360]: "/athlete360",
  [PageId.CAREER_JOURNEY]: "/career-journey",
  [PageId.OPPONENT_ANALYSIS]: "/opponent-analysis",
  [PageId.TRAINING_PLAN]: "/training-planner",
  [PageId.RANK_UP]: "/rank-up",
  [PageId.DRAW_SHEET]: "/competition-draws",
  [PageId.AI_INSIGHTS]: "/ai-insights",
  [PageId.SPONSORSHIP_HUB]: "/sponsorship-hub",
  [PageId.LIVE_MATCH]: "/live-match",
  [PageId.ACCOUNT_SETTINGS]: "/account-settings",
  [PageId.DATA_SCRAPER]: "/data-scraper",
  [PageId.COMPETITION_PREFERENCES]: "/competition-preferences",
};

export const PathToPageId: Record<string, PageId> = Object.fromEntries(
  Object.entries(PageIdToPath).map(([pageId, path]) => [path, pageId as PageId])
);

export const RolePagePolicy: Record<UserRole, Set<PageId>> = {
  [UserRole.ATHLETE]: new Set([
    PageId.DASHBOARD,
    PageId.ATHLETE_360,
    PageId.CAREER_JOURNEY,
    PageId.OPPONENT_ANALYSIS,
    PageId.TRAINING_PLAN,
    PageId.RANK_UP,
    PageId.DRAW_SHEET,
    PageId.AI_INSIGHTS,
    PageId.LIVE_MATCH,
    PageId.ACCOUNT_SETTINGS,
  ]),
  
  [UserRole.ORG_ADMIN]: new Set([
    PageId.DASHBOARD,
    PageId.ATHLETE_DIRECTORY,
    PageId.ATHLETE_360,
    PageId.CAREER_JOURNEY,
    PageId.TRAINING_PLAN,
    PageId.RANK_UP,
    PageId.DRAW_SHEET,
    PageId.AI_INSIGHTS,
    PageId.SPONSORSHIP_HUB,
    PageId.LIVE_MATCH,
    PageId.ACCOUNT_SETTINGS,
    PageId.DATA_SCRAPER,
    PageId.COMPETITION_PREFERENCES,
  ]),
  
  [UserRole.SPONSOR]: new Set([
    PageId.DASHBOARD,
    PageId.ATHLETE_DIRECTORY,
    PageId.ATHLETE_360,
    PageId.CAREER_JOURNEY,
    PageId.SPONSORSHIP_HUB,
    PageId.AI_INSIGHTS,
    PageId.ACCOUNT_SETTINGS,
  ]),
  
  [UserRole.ADMIN]: new Set([
    PageId.DASHBOARD,
    PageId.ATHLETE_DIRECTORY,
    PageId.ATHLETE_360,
    PageId.CAREER_JOURNEY,
    PageId.OPPONENT_ANALYSIS,
    PageId.TRAINING_PLAN,
    PageId.RANK_UP,
    PageId.DRAW_SHEET,
    PageId.AI_INSIGHTS,
    PageId.SPONSORSHIP_HUB,
    PageId.LIVE_MATCH,
    PageId.ACCOUNT_SETTINGS,
    PageId.DATA_SCRAPER,
    PageId.COMPETITION_PREFERENCES,
  ]),
};

export function canAccess(userRole: UserRole | undefined | null, pageIdOrPath: PageId | string): boolean {
  if (!userRole) {
    return false;
  }

  if (userRole === UserRole.ADMIN) {
    return true;
  }

  let pageId: PageId;
  
  if (pageIdOrPath in PageId) {
    pageId = pageIdOrPath as PageId;
  } else {
    const foundPageId = PathToPageId[pageIdOrPath];
    if (!foundPageId) {
      return false;
    }
    pageId = foundPageId;
  }

  const allowedPages = RolePagePolicy[userRole];
  if (!allowedPages) {
    return false;
  }

  return allowedPages.has(pageId);
}

export function getAccessiblePages(userRole: UserRole | undefined | null): PageId[] {
  if (!userRole) {
    return [];
  }

  if (userRole === UserRole.ADMIN) {
    return Object.values(PageId);
  }

  const allowedPages = RolePagePolicy[userRole];
  return allowedPages ? Array.from(allowedPages) : [];
}

export function getAccessiblePaths(userRole: UserRole | undefined | null): string[] {
  const accessiblePages = getAccessiblePages(userRole);
  return accessiblePages.map(pageId => PageIdToPath[pageId]);
}

export const PageMetadata: Record<PageId, { title: string; description: string; icon?: string }> = {
  [PageId.DASHBOARD]: {
    title: "Dashboard",
    description: "Overview of key metrics and insights",
    icon: "LayoutDashboard",
  },
  [PageId.ATHLETE_DIRECTORY]: {
    title: "Athlete Directory",
    description: "Browse and manage athletes",
    icon: "Users",
  },
  [PageId.ATHLETE_360]: {
    title: "Athlete 360",
    description: "Comprehensive athlete profile and analytics",
    icon: "User",
  },
  [PageId.CAREER_JOURNEY]: {
    title: "Career Journey",
    description: "Track athlete career progression",
    icon: "TrendingUp",
  },
  [PageId.OPPONENT_ANALYSIS]: {
    title: "Opponent Analysis",
    description: "AI-powered opponent insights",
    icon: "Target",
  },
  [PageId.TRAINING_PLAN]: {
    title: "Training Plan",
    description: "Structured training programs",
    icon: "Calendar",
  },
  [PageId.RANK_UP]: {
    title: "Rank Up",
    description: "Calculate path to next rank",
    icon: "Trophy",
  },
  [PageId.DRAW_SHEET]: {
    title: "Competition Draws",
    description: "Tournament brackets and draws",
    icon: "GitBranch",
  },
  [PageId.AI_INSIGHTS]: {
    title: "AI Insights",
    description: "Ask AI about athlete performance",
    icon: "Brain",
  },
  [PageId.SPONSORSHIP_HUB]: {
    title: "Sponsorship Hub",
    description: "Manage sponsorship opportunities",
    icon: "Handshake",
  },
  [PageId.LIVE_MATCH]: {
    title: "Live Match Analysis",
    description: "Real-time match video analysis",
    icon: "Video",
  },
  [PageId.ACCOUNT_SETTINGS]: {
    title: "Account Settings",
    description: "Manage your profile and preferences",
    icon: "Settings",
  },
  [PageId.DATA_SCRAPER]: {
    title: "Data Scraper",
    description: "Import external athlete data",
    icon: "Download",
  },
  [PageId.COMPETITION_PREFERENCES]: {
    title: "Competition Preferences",
    description: "Set competition preferences",
    icon: "Settings",
  },
};
