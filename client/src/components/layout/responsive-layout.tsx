import { ReactNode } from "react";
import Sidebar from "./sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function ResponsiveLayout({ children, className = "" }: ResponsiveLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className={`flex h-screen overflow-hidden mobile-container relative ${className}`}>
      {/* Sidebar is absolute on mobile (outside flex flow), relative on desktop (in flex flow) */}
      <Sidebar />
      
      {/* Main content takes full width on mobile, shares with sidebar on desktop */}
      <main className="flex-1 overflow-auto w-full max-w-full lg:w-auto">
        {/* Mobile header spacer */}
        <div className="lg:hidden h-14 safe-area-top flex-shrink-0" />
        
        {/* Main content area */}
        <div className="min-h-full safe-area-bottom w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}