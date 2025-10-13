import { Link, useLocation } from "wouter";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Home,
  User,
  FlagTriangleRight,
  Users,
  Trophy,
  Brain,
  BarChart3,
  Activity,
  Calendar,
  Target,
  Menu,
  X,
  Database,
  LogOut,
  Settings,
  ChevronDown,
  ChevronUp,
  DollarSign,
  GripVertical,
} from "lucide-react";
import logoImage from "@assets/76391ba4-3093-4647-ba0e-5a5f17895db7_1760365957109.png";
import { useLanguage } from "@/lib/i18n";
import { useAthlete } from "@/lib/athlete-context";
import { useQuery } from "@tanstack/react-query";
import { useAccessControl } from "@/hooks/useAccessControl";
import { PageIdToPath } from "@shared/access-control";

export default function Sidebar() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const { selectedAthleteId } = useAthlete();
  const { hasAccess } = useAccessControl();

  // Handle mouse move for resizing
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 400) {
        // Min 200px, Max 400px
        setSidebarWidth(newWidth);
      }
    },
    [isResizing],
  );

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none"; // Prevent text selection during resize
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const { data: athlete } = useQuery({
    queryKey: [`/api/athletes/${selectedAthleteId}`],
  });

  // Fetch current user data
  const { data: currentUser } = useQuery<{
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    bio?: string;
  }>({
    queryKey: ["/api/auth/user"],
  });

  // Helper function to add athlete ID to href if present
  const buildHref = (basePath: string) => {
    if (
      selectedAthleteId &&
      basePath !== "/" &&
      basePath !== "/athletes" &&
      basePath !== "/competitions" &&
      basePath !== "/competition-draws" &&
      basePath !== "/sponsorship-hub"
    ) {
      return `${basePath}?athlete=${selectedAthleteId}`;
    }
    return basePath;
  };

  const navigation = [
    { name: t("nav.dashboard"), href: "/", icon: Home },
    { name: "Athletes Directory", href: "/athletes", icon: Users },
    { name: "Competitions", href: "/competitions", icon: Trophy },
    { name: t("nav.athlete360"), href: "/athlete360", icon: User },
    { name: t("nav.career"), href: "/career-journey", icon: FlagTriangleRight },

    {
      name: t("nav.opponentAnalysis"),
      href: "/opponent-analysis",
      icon: Brain,
    },
    { name: t("nav.liveMatch"), href: "/live-match", icon: Activity },

    {
      name: t("nav.trainingPlanner"),
      href: "/training-planner",
      icon: Calendar,
    },
    { name: "Rank Up", href: "/rank-up", icon: Target },
    { name: "Drawsheet", href: "/competition-draws", icon: Calendar },

    { name: t("nav.insights"), href: "/ai-insights", icon: Brain },
    { name: "Sponsorship Hub", href: "/sponsorship-hub", icon: DollarSign },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors safe-area-top"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 
        absolute lg:relative
        inset-y-0 left-0 
        w-72 lg:flex-shrink-0
        bg-white dark:bg-gray-900 shadow-lg border-r border-gray-200 dark:border-gray-700 
        flex flex-col 
        transition-transform duration-300 ease-in-out 
        z-40 lg:z-auto safe-area-left safe-area-right
      `}
        style={{
          width: window.innerWidth >= 1024 ? `${sidebarWidth}px` : undefined,
        }}
      >
        <div className="mobile-padding border-b border-gray-200">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-32 h-32 flex items-center justify-center flex-shrink-0">
              <img
                src={logoImage}
                alt="The360 Insights Symbol"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                The360 Insights
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 mobile-padding space-y-2 overflow-y-auto">
          {navigation
            .filter((item) => hasAccess(item.href))
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                location === item.href || location.startsWith(item.href + "?");
              const href = buildHref(item.href);

              return (
                <Link key={item.name} href={href}>
                  <div
                    className={`mobile-button touch-target justify-start transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                </Link>
              );
            })}
        </nav>

        <div className="mobile-padding border-t border-gray-200 space-y-3">
          <div className="space-y-1">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-full mobile-button touch-target justify-start hover:bg-gray-100 transition-colors"
            >
              {currentUser?.profileImageUrl ? (
                <img
                  src={currentUser.profileImageUrl}
                  alt="Profile"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-full flex-shrink-0 flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-medium">
                    {currentUser?.firstName && currentUser?.lastName
                      ? `${currentUser.firstName[0]}${currentUser.lastName[0]}`
                      : currentUser?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                  {currentUser?.firstName && currentUser?.lastName
                    ? `${currentUser.firstName} ${currentUser.lastName}`
                    : currentUser?.email || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser?.bio && currentUser.bio.trim() !== ""
                    ? currentUser.bio
                    : "Sports Analytics User"}
                </p>
              </div>
              {isUserMenuOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
            </button>

            {isUserMenuOpen && (
              <div className="ml-2 space-y-1 border-l border-gray-200 pl-3">
                {hasAccess("/account-settings") && (
                  <Link href="/account-settings">
                    <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                      <Settings className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Account Settings</span>
                    </div>
                  </Link>
                )}

                {hasAccess("/data-scraper") && (
                  <Link href="/data-scraper">
                    <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                      <Database className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Data Scraper</span>
                    </div>
                  </Link>
                )}

                <button
                  onClick={() => (window.location.href = "/api/logout")}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle - Only visible on desktop */}
        <div
          className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-300 hover:bg-opacity-50 transition-colors group"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-6 text-gray-400" />
          </div>
        </div>
      </aside>
    </>
  );
}
