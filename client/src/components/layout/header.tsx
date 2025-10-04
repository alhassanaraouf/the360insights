import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import LanguageSwitcher from "@/components/language-switcher";
import AthleteSearch from "@/components/shared/athlete-search";
import SportSwitcher from "@/components/sport-switcher";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useAthlete } from "@/lib/athlete-context";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { queryClient } from "@/lib/queryClient";

interface HeaderProps {
  title: string;
  description: string;
}

export default function Header({ title, description }: HeaderProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { setSelectedAthleteId, selectedAthleteId } = useAthlete();
  const { showEgyptianOnly, setShowEgyptianOnly } = useEgyptFilter();
  const [isExporting, setIsExporting] = useState(false);

  const handleAthleteSelect = (athlete: any) => {
    setSelectedAthleteId(athlete.id);
    
    // Invalidate all queries to refresh data for the new athlete
    queryClient.invalidateQueries();
    
    toast({
      title: "Athlete Selected",
      description: `Switched to ${athlete.name} - World Rank #${athlete.worldRank} (${athlete.category})`,
    });
  };

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      
      // Determine report type based on current page
      const getReportType = (): string => {
        const path = window.location.pathname;
        if (path === '/' || path === '' || path.startsWith('/?') || path === '/dashboard') {
          return 'rankings-overview';
        }
        if (path.includes('/opponents')) return 'opponent-analysis';
        if (path.includes('/rankings')) return 'rankings-report';
        if (path.includes('/tactical-training')) return 'tactical-training';
        if (path.includes('/injury-prevention')) return 'injury-prevention';
        if (path.includes('/career-journey')) return 'career-journey';
        if (path.includes('/training-planner')) return 'training-plan';
        return 'athlete-report';
      };

      const reportType = getReportType();
      
      // Dashboard rankings overview doesn't need an athlete selected
      if (reportType === 'rankings-overview') {
        // No athlete selection check for dashboard
      } else if (!selectedAthleteId) {
        toast({
          title: "No Athlete Selected",
          description: "Please select an athlete to export their report.",
          variant: "destructive",
        });
        return;
      }

      // For rankings overview, don't include athlete ID in URL but include Egypt filter
      const apiUrl = reportType === 'rankings-overview' 
        ? `/api/export/${reportType}?egyptOnly=${showEgyptianOnly}`
        : `/api/export/${reportType}/${selectedAthleteId}`;
        
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Generate descriptive filename based on current page
      const getReportTitle = (): string => {
        const path = window.location.pathname;
        if (path === '/' || path === '' || path.startsWith('/?') || path === '/dashboard') {
          return showEgyptianOnly ? 'Egypt_Rankings_Overview' : 'Global_Rankings_Overview';
        }
        if (path.includes('/opponents')) return 'Opponent_Analysis_Report';
        if (path.includes('/rankings')) return 'Rankings_Analysis_Report';
        if (path.includes('/tactical-training')) return 'Tactical_Training_Report';
        if (path.includes('/injury-prevention')) return 'Injury_Prevention_Report';
        if (path.includes('/career-journey')) return 'Career_Journey_Report';
        if (path.includes('/training-planner')) return 'Training_Plan_Report';
        return 'Performance_Dashboard_Report';
      };

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${getReportTitle()}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Generated Successfully",
        description: "Performance report has been downloaded.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Check if we should hide the export button for specific pages
  const shouldHideExportButton = () => {
    const path = window.location.pathname;
    return path.includes('/opponent-analysis') || 
           path.includes('/live-match') || 
           path.includes('/ai-insights') ||
           path.includes('/athletes');
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 mobile-padding w-full overflow-hidden">
      <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between w-full">
        <div className="min-w-0 flex-1 w-full lg:w-auto">
          <h2 className="mobile-heading text-gray-900 dark:text-white truncate">{title}</h2>
          <p className="mobile-text text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{description}</p>
        </div>
        <div className="flex flex-col space-y-2 w-full lg:w-auto lg:flex-row lg:items-center lg:space-y-0 lg:space-x-4">
          {/* Egyptian Taekwondo Athletes Search */}
          <div className="w-full lg:w-auto lg:min-w-[280px]">
            <AthleteSearch 
              onAthleteSelect={handleAthleteSelect}
              placeholder="Search athletes..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Sport Switcher */}
            <div className="flex-shrink-0">
              <SportSwitcher />
            </div>
            {/* Egypt/Global Toggle - always visible */}
            <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 bg-blue-50 dark:bg-blue-950 rounded-lg flex-shrink-0">
              <Label htmlFor="header-egypt-filter" className="text-xs font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                Egypt
              </Label>
              <Switch
                id="header-egypt-filter"
                checked={!showEgyptianOnly}
                onCheckedChange={(checked) => setShowEgyptianOnly(!checked)}
                className="scale-75"
              />
              <Label htmlFor="header-egypt-filter" className="text-xs font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                Global
              </Label>
            </div>
            <div className="flex-shrink-0">
              <LanguageSwitcher />
            </div>
            {!shouldHideExportButton() && (
              <Button 
                className="mobile-button touch-target w-full sm:w-auto flex-shrink-0"
                onClick={handleExportReport}
                disabled={isExporting}
              >
                <Download className={`mr-1 lg:mr-2 h-4 w-4 ${isExporting ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isExporting ? 'Exporting...' : t('common.exportReport')}</span>
                <span className="sm:hidden">{isExporting ? 'Exporting...' : 'Export'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
