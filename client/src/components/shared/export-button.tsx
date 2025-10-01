import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAthlete } from '@/lib/athlete-context';
import { useLanguage } from '@/lib/i18n';
import { useLocation } from 'wouter';
import { useEgyptFilter } from '@/lib/egypt-filter-context';

interface ExportButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function ExportButton({ variant = 'default', size = 'default', className = '' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { selectedAthleteId } = useAthlete();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [location] = useLocation();
  const { showEgyptianOnly } = useEgyptFilter();

  const getReportType = (): string => {
    console.log('Current location:', location);
    
    // Check if we're on the dashboard (root path or any dashboard variation)
    if (location === '/' || location === '' || location.startsWith('/?') || location === '/dashboard') {
      return 'rankings-overview';
    }
    
    if (location.includes('/opponents')) return 'opponent-analysis';
    if (location.includes('/rankings')) return 'rankings-report';
    if (location.includes('/tactical-training')) return 'tactical-training';
    if (location.includes('/injury-prevention')) return 'injury-prevention';
    if (location.includes('/career-journey')) return 'career-journey';
    if (location.includes('/training-planner')) return 'training-plan';
    
    return 'athlete-report'; // Default for athlete360
  };

  const getReportTitle = (): string => {
    const reportType = getReportType();
    switch (reportType) {
      case 'opponent-analysis': return 'Opponent_Analysis_Report';
      case 'rankings-report': return 'Rankings_Analysis_Report';
      case 'tactical-training': return 'Tactical_Training_Report';
      case 'injury-prevention': return 'Injury_Prevention_Report';
      case 'career-journey': return 'Career_Journey_Report';
      case 'training-plan': return 'Training_Plan_Report';
      case 'rankings-overview': return showEgyptianOnly ? 'Egypt_Rankings_Overview' : 'Global_Rankings_Overview';
      default: return 'Performance_Dashboard_Report';
    }
  };

  const handleExport = async () => {
    const reportType = getReportType();
    
    console.log('Export button clicked - Location:', location, 'Report Type:', reportType, 'Selected Athlete:', selectedAthleteId);
    
    // Dashboard rankings overview doesn't need an athlete selected
    if (reportType === 'rankings-overview') {
      console.log('Dashboard export - proceeding without athlete selection');
    } else if (!selectedAthleteId) {
      console.log('Blocking export - athlete page requires athlete selection');
      toast({
        title: t('common.error'),
        description: 'Please select an athlete first',
        variant: "destructive",
      });
      return;
    }
    
    console.log('Proceeding with export for report type:', reportType);

    setIsExporting(true);
    
    try {
      toast({
        title: t('dashboard.generating'),
        description: t('dashboard.creatingPDF'),
      });

      // For rankings overview, don't include athlete ID in URL but include Egypt filter
      const apiUrl = reportType === 'rankings-overview' 
        ? `/api/export/${reportType}?egyptOnly=${showEgyptianOnly}`
        : `/api/export/${reportType}/${selectedAthleteId}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${getReportTitle()}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: t('dashboard.success'),
        description: t('dashboard.downloadReady'),
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: t('common.error'),
        description: t('dashboard.exportFailed'),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {isExporting ? t('dashboard.generating') : t('common.exportReport')}
    </Button>
  );
}