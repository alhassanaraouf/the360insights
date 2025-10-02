import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAthlete } from "@/lib/athlete-context";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport } from "@/lib/sport-context";
import { User, Target, Globe } from "lucide-react";

interface AthleteSelectorProps {
  title?: string;
  description?: string;
  onAthleteSelected?: (athleteId: number) => void;
}

export default function AthleteSelector({ 
  title = "Select Athlete", 
  description = "Choose an athlete to view their analytics",
  onAthleteSelected 
}: AthleteSelectorProps) {
  const { selectedAthleteId, setSelectedAthleteId } = useAthlete();
  const { showEgyptianOnly } = useEgyptFilter();
  const { selectedSport } = useSport();
  
  const { data: athletes, isLoading } = useQuery({
    queryKey: ["/api/athletes"],
  });

  // Filter athletes based on sport and Egypt toggle
  const filteredAthletes = (athletes as any[])?.filter((athlete: any) => {
    // First filter by sport (case-insensitive)
    if (athlete.sport?.toLowerCase() !== selectedSport.toLowerCase()) return false;
    
    // Then filter by Egypt toggle
    if (!showEgyptianOnly) return true;
    return athlete.nationality === 'Egypt' || athlete.nationality === 'EGY';
  }) || [];

  const handleAthleteSelect = (athleteId: string) => {
    const id = parseInt(athleteId);
    setSelectedAthleteId(id);
    onAthleteSelected?.(id);
  };

  if (selectedAthleteId) {
    return null; // Don't show selector if athlete is already selected
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] lg:min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-950 p-4">
      <Card className="w-full max-w-2xl border-0 shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mb-4">
            <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <p className="text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Available Athletes
                </h3>
                <Select onValueChange={handleAthleteSelect}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose an athlete..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAthletes?.map((athlete: any) => (
                      <SelectItem key={athlete.id} value={athlete.id.toString()}>
                        <div className="flex items-center space-x-3 py-1">
                          <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <Target className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium">{athlete.name}</p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              <span>{athlete.nationality}</span>
                              {athlete.worldRank && (
                                <Badge variant="outline" className="text-xs">
                                  World #{athlete.worldRank}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Access to Top Athletes */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Quick Access
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredAthletes?.slice(0, 4).map((athlete: any) => (
                    <Button
                      key={athlete.id}
                      variant="outline"
                      className="h-auto p-4 justify-start hover:bg-blue-50 dark:hover:bg-blue-950/50"
                      onClick={() => handleAthleteSelect(athlete.id.toString())}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{athlete.name}</p>
                          <p className="text-xs text-muted-foreground">{athlete.nationality}</p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}