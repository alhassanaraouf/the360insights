import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAthlete } from "@/lib/athlete-context";
import { useLanguage } from "@/lib/i18n";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Trophy, Target, AlertTriangle, Medal, Award, Calendar, TrendingUp } from "lucide-react";
import AthleteSelector from "@/components/ui/athlete-selector";
import AthleteHeaderSelector from "@/components/ui/athlete-header-selector";

export default function CareerJourney() {
  const { t } = useLanguage();
  const { selectedAthleteId, setSelectedAthleteId } = useAthlete();
  
  // Check for athlete ID in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const athleteIdFromUrl = urlParams.get('athlete');
    
    if (athleteIdFromUrl && parseInt(athleteIdFromUrl) !== selectedAthleteId) {
      setSelectedAthleteId(parseInt(athleteIdFromUrl));
    }
  }, [selectedAthleteId, setSelectedAthleteId]);

  const { data: careerEvents, isLoading } = useQuery({
    queryKey: [`/api/athletes/${selectedAthleteId}/career`],
    enabled: !!selectedAthleteId,
  });

  const { data: athlete } = useQuery({
    queryKey: [`/api/athletes/${selectedAthleteId}`],
    enabled: !!selectedAthleteId,
  });

  // Show athlete selector if no athlete is selected
  if (!selectedAthleteId) {
    return (
      <div className="min-h-screen flex flex-col">
        <AthleteSelector 
          title="Select Athlete for Career Journey"
          description="Choose an athlete to view their career timeline and achievements"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <Header 
          title={(athlete as any)?.name ? `${(athlete as any).name} - Career Journey` : "Career Journey"}
          description="Interactive timeline and progression tracking"
        />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "achievement":
        return <Trophy className="h-5 w-5 text-yellow-600" />;
      case "match":
        return <Target className="h-5 w-5 text-blue-600" />;
      case "injury":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Target className="h-5 w-5 text-gray-600" />;
    }
  };

  // Sort events by date (most recent first) and group by year
  const groupEventsByYear = (events: any[]) => {
    if (!events || events.length === 0) return {};
    
    // Sort events by date in descending order (most recent first)
    const sortedEvents = [...events].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Group events by year
    const grouped: { [year: string]: any[] } = {};
    sortedEvents.forEach((event) => {
      const year = new Date(event.date).getFullYear().toString();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(event);
    });
    
    return grouped;
  };

  const eventsByYear = groupEventsByYear(careerEvents as any[]);
  const years = Object.keys(eventsByYear).sort((a, b) => parseInt(b) - parseInt(a)); // Sort years descending

  return (
    <>
      <Header 
        title={(athlete as any)?.name ? `${(athlete as any).name} - Career Journey` : "Career Journey"}
        description="Interactive timeline and progression tracking"
      />
      <div className="p-6 space-y-6">
        <AthleteHeaderSelector title="Viewing career journey for:" />
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Career Timeline</h3>
            <div className="space-y-8">
              {years.length > 0 ? (
                years.map((year) => (
                  <div key={year} className="space-y-4">
                    <h4 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-200 pb-2">
                      {year}
                    </h4>
                    <div className="space-y-4 pl-4">
                      {eventsByYear[year].map((event: any) => (
                        <div 
                          key={event.id} 
                          className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => window.location.href = `/competition/${event.competitionId}`}
                          data-testid={`competition-card-${event.competitionId}`}
                        >
                          {/* Competition Logo */}
                          <div className="flex-shrink-0 mt-1">
                            {event.logo ? (
                              <img 
                                src={event.logo} 
                                alt={event.title}
                                className="h-10 w-10 rounded-md object-cover"
                                data-testid={`competition-logo-${event.competitionId}`}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                                {getEventIcon(event.eventType)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-gray-900">{event.title}</h5>
                              <span className="text-sm text-gray-500">{event.date}</span>
                            </div>
                            <p className="text-gray-600 mt-1">
                              Place: {event.eventResult || 'N/A'} | Points: {event.points || '0'}
                            </p>

                            <div className="mt-2 flex items-center gap-2">
                              {event.gradeLevel && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800" data-testid={`grade-level-${event.competitionId}`}>
                                  {event.gradeLevel}
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                event.eventType === 'achievement' ? 'bg-yellow-100 text-yellow-800' :
                                event.eventType === 'match' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`} data-testid={`event-type-${event.competitionId}`}>
                                {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No data</p>
                  <p className="text-gray-400 text-sm mt-2">No career events available for this athlete</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
