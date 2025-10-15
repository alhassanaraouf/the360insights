import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import RankingsOverview from "@/components/dashboard/rankings-overview";
import CompetitionCalendar from "@/components/dashboard/competition-calendar";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Calendar,
  Target,
  BarChart3,
  Users,
  Eye,
  TrendingUp,
  Medal,
  Globe,
  Zap,
  Activity,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAthlete } from "@/lib/athlete-context";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport, getSportConfig } from "@/lib/sport-context";
import { getCountryFlagWithFallback } from "@/lib/country-flags";


export default function Dashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { showEgyptianOnly } = useEgyptFilter();
  const { selectedSport } = useSport();
  const [, navigate] = useLocation();

  const { selectedAthleteId } = useAthlete();
  
  const sportConfig = getSportConfig(selectedSport);

  const handleAthleteClick = (athleteId: number) => {
    navigate(`/athlete360?athlete=${athleteId}`);
  };

  // Optimized athlete stats for dashboard
  const { data: athleteStats, isLoading: athletesLoading } = useQuery({
    queryKey: ["/api/athletes/stats", selectedSport, showEgyptianOnly],
    queryFn: async () => {
      const response = await fetch(`/api/athletes/stats?sport=${selectedSport}&egyptOnly=${showEgyptianOnly}`);
      if (!response.ok) throw new Error('Failed to fetch athlete stats');
      return response.json();
    }
  });

  // Fetch top-ranked athletes for dashboard display
  const { data: topAthletes, isLoading: topAthletesLoading } = useQuery({
    queryKey: ["/api/athletes/top-ranked", selectedSport, showEgyptianOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        sport: selectedSport,
        limit: '30',
        topRankedOnly: 'true'
      });
      
      if (showEgyptianOnly) {
        params.append('nationality', 'Egypt');
      }
      
      const response = await fetch(`/api/athletes?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch top athletes');
      return response.json();
    }
  });

  const { data: globalCompetitions, isLoading: competitionsLoading } = useQuery({
    queryKey: ["/api/competitions", selectedSport],
    queryFn: async () => {
      const response = await fetch(`/api/competitions?sport=${selectedSport}`);
      if (!response.ok) throw new Error('Failed to fetch competitions');
      return response.json();
    }
  });

  // Filter and show only upcoming competitions (future dates)
  const upcomingCompetitions = useMemo(() => {
    if (!globalCompetitions || !Array.isArray(globalCompetitions)) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Filter for upcoming status competitions (matching competitions page filter)
    return [...globalCompetitions]
      .filter(comp => comp.status === 'upcoming')
      .sort((a, b) => 
        new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()
      );
  }, [globalCompetitions]);

  const isLoading = athletesLoading || competitionsLoading || topAthletesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-muted-foreground font-medium">
            Loading sport insights...
          </p>
        </div>
      </div>
    );
  }

  // Use stats from optimized API endpoint
  const totalAthletes = athleteStats?.totalAthletes || 0;
  const worldRankedAthletes = athleteStats?.worldRankedAthletes || 0;
  const olympicQualified = athleteStats?.olympicQualified || 0;
  
  // Count upcoming competitions (matching competitions page filter by status)
  const selectedCompetitions = upcomingCompetitions.length;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Header
        title={`${sportConfig.name}`}
        description="Comprehensive analytics for coaches, managers, and scouts"
      />

      <div className="mobile-padding mobile-space-y w-full max-w-full">
        {/* Modern Stats Overview */}
        <div className="mobile-grid w-full">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Total Athletes
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {totalAthletes}
                  </p>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                    Active in database
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-500/20 rounded-full flex-shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 hidden sm:block">
                <Users className="h-16 w-16" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                    World Ranked
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                    {worldRankedAthletes}
                  </p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    Global rankings
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-emerald-500/20 rounded-full flex-shrink-0">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 hidden sm:block">
                <Globe className="h-16 w-16" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                    Olympic Ranked
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-100">
                    {olympicQualified}
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    Elite athletes
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-500/20 rounded-full flex-shrink-0">
                  <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 hidden sm:block">
                <Medal className="h-16 w-16" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                    Upcoming Events
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {selectedCompetitions}
                  </p>
                  <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">
                    Future competitions
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-500/20 rounded-full flex-shrink-0">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 hidden sm:block">
                <Target className="h-16 w-16" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Ranked Athletes Section */}
        <div className="space-y-4 sm:space-y-6 !mt-8 sm:!mt-12 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Featured Athletes
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Elite performers in world and Olympic rankings
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1 w-fit">
              <Activity className="h-3 w-3 mr-1" />
              Live Rankings
            </Badge>
          </div>
          
          {topAthletes?.athletes?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
              {topAthletes.athletes.slice(0, 6).map((athlete: any) => (
                <Card 
                  key={athlete.id} 
                  onClick={() => handleAthleteClick(athlete.id)}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`card-athlete-${athlete.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={athlete.profileImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"} 
                        alt={athlete.name} 
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{athlete.name}</h3>
                        <p className="text-sm text-muted-foreground">{getCountryFlagWithFallback(athlete.nationality)} {athlete.nationality}</p>
                        <div className="flex items-center gap-4 mt-2">
                          {athlete.worldRank && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-4 w-4 text-emerald-600" />
                              <span className="text-sm font-medium">#{athlete.worldRank}</span>
                            </div>
                          )}
                          {athlete.olympicRank && (
                            <div className="flex items-center gap-1">
                              <Medal className="h-4 w-4 text-amber-600" />
                              <span className="text-sm font-medium">#{athlete.olympicRank}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Top Athletes Found</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {showEgyptianOnly 
                    ? "No top-ranked Egyptian athletes found in this sport." 
                    : "No top-ranked athletes found in this sport."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Enhanced Rankings Section */}
        <div className="space-y-4 sm:space-y-6 !mt-8 sm:!mt-12 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Global Rankings
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                World and Olympic standings across all categories
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1 w-fit">
              <Activity className="h-3 w-3 mr-1" />
              Live Data
            </Badge>
          </div>
          <RankingsOverview athletes={topAthletes?.athletes || []} />
        </div>

        {/* Competition Calendar */}
        <div className="mt-6 sm:mt-8 w-full">
          <CompetitionCalendar
            competitions={upcomingCompetitions}
            allCompetitions={Array.isArray(globalCompetitions) ? globalCompetitions : []}
          />
        </div>


      </div>
    </div>
  );
}
