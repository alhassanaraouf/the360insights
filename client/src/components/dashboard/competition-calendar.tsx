import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trophy, Clock, Users, Sparkles, Star, Globe } from "lucide-react";
import { format, isFuture, isPast } from "date-fns";
import { useLocation } from "wouter";

interface Competition {
  id: number;
  title: string;
  name: string;
  startDate: string;
  endDate?: string;
  city?: string;
  country?: string;
  location?: string;
  status?: string;
  competitionLevel?: string;
  eventType: string;
  description?: string;
  gradeLevel?: string;
}

interface CompetitionCalendarProps {
  competitions: Competition[];
  allCompetitions?: Competition[];
}

export default function CompetitionCalendar({ competitions, allCompetitions }: CompetitionCalendarProps) {
  const [, setLocation] = useLocation();
  
  // If competitions are already provided (pre-filtered), use them directly without re-filtering
  // The dashboard has already filtered for upcoming competitions
  const upcomingCompetitions = competitions
    .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime())
    .slice(0, 6);

  // For recent competitions, filter from all competitions to show past events
  const recentCompetitions = (allCompetitions || [])
    .filter(comp => comp.startDate && isPast(new Date(comp.startDate)))
    .sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())
    .slice(0, 4);

  const getCompetitionLevelColor = (level?: string) => {
    switch (level) {
      case 'olympic': return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300 shadow-sm';
      case 'world_championship': return 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-300 shadow-sm';
      case 'international': return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300 shadow-sm';
      case 'national': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 shadow-sm';
      default: return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-300 shadow-sm';
    }
  };

  const formatCompetitionLevel = (level?: string) => {
    switch (level) {
      case 'olympic': return 'Olympic';
      case 'world_championship': return 'World Championship';
      case 'international': return 'International';
      case 'national': return 'National';
      default: return 'Competition';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Upcoming Competitions */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-emerald-950/10">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Upcoming Competitions</CardTitle>
                <CardDescription className="text-sm">Major global Taekwondo events</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap flex-shrink-0">
              <Globe className="h-3 w-3 mr-1" />
              {upcomingCompetitions.length} Events
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingCompetitions.length > 0 ? (
            <div className="space-y-4">
              {upcomingCompetitions.map((competition) => (
                <div 
                  key={competition.id} 
                  onClick={() => setLocation(`/competition-detail/${competition.id}`)}
                  className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-700/50 p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                  data-testid={`competition-${competition.id}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-full flex-shrink-0 ${
                      competition.competitionLevel === 'olympic' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      competition.competitionLevel === 'world_championship' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <Trophy className={`h-5 w-5 ${
                        competition.competitionLevel === 'olympic' ? 'text-yellow-600 dark:text-yellow-400' :
                        competition.competitionLevel === 'world_championship' ? 'text-purple-600 dark:text-purple-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-foreground">{competition.title || competition.name}</h3>
                            {competition.competitionLevel === 'olympic' && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span className="font-medium">{format(new Date(competition.startDate), 'MMM dd, yyyy')}</span>
                            </div>
                            {(competition.location || competition.city) && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{competition.location || `${competition.city}, ${competition.country}`}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={`${getCompetitionLevelColor(competition.competitionLevel)} font-medium`}>
                          {formatCompetitionLevel(competition.competitionLevel)}
                        </Badge>
                      </div>
                      {competition.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{competition.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1 bg-white/80 dark:bg-gray-800/80 rounded-full">
                      <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <Calendar className="h-8 w-8 opacity-50" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 opacity-30" />
              </div>
              <p className="font-medium">No upcoming competitions scheduled</p>
              <p className="text-sm mt-1 opacity-75">Competition schedule will be updated as events are announced</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Competition Results */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-amber-50/30 dark:from-gray-900 dark:to-amber-950/10">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Recent Results</CardTitle>
              <CardDescription className="text-sm">Latest competition outcomes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentCompetitions.length > 0 ? (
            <div className="space-y-3">
              {recentCompetitions.map((competition) => (
                <div 
                  key={competition.id} 
                  onClick={() => setLocation(`/competition-detail/${competition.id}`)}
                  className="group flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-white to-amber-50/30 dark:from-gray-800 dark:to-amber-900/10 hover:shadow-md transition-all duration-200 cursor-pointer"
                  data-testid={`recent-competition-${competition.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      competition.competitionLevel === 'olympic' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      competition.competitionLevel === 'world_championship' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      <Trophy className={`h-4 w-4 ${
                        competition.competitionLevel === 'olympic' ? 'text-yellow-600 dark:text-yellow-400' :
                        competition.competitionLevel === 'world_championship' ? 'text-purple-600 dark:text-purple-400' :
                        'text-amber-600 dark:text-amber-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{competition.title || competition.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="font-medium">{format(new Date(competition.startDate), 'MMM dd, yyyy')}</span>
                        {(competition.location || competition.city) && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{competition.location || `${competition.city}, ${competition.country}`}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getCompetitionLevelColor(competition.competitionLevel)} font-medium`}>
                      {formatCompetitionLevel(competition.competitionLevel)}
                    </Badge>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Star className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-3">
                <Trophy className="h-6 w-6 opacity-50" />
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 opacity-30" />
              </div>
              <p className="font-medium">No recent competition results</p>
              <p className="text-sm mt-1 opacity-75">Results will appear as competitions conclude</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}