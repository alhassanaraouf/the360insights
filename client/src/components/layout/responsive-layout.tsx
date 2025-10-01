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
    <div className={`flex h-screen overflow-hidden mobile-container ${className}`}>
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-0 relative">
        {/* Mobile header spacer */}
        <div className="lg:hidden h-14 safe-area-top flex-shrink-0" />
        
        {/* Main content area */}
        <div className="min-h-full safe-area-bottom">
          {children}
        </div>
      </main>
    </div>
  );
}