import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAthlete } from "@/lib/athlete-context";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport } from "@/lib/sport-context";
import { User, Target, Globe } from "lucide-react";

interface AthleteHeaderSelectorProps {
  title?: string;
  showCurrentAthlete?: boolean;
}

export default function AthleteHeaderSelector({ 
  title = "Select Athlete:", 
  showCurrentAthlete = true 
}: AthleteHeaderSelectorProps) {
  const { selectedAthleteId, setSelectedAthleteId } = useAthlete();
  const { showEgyptianOnly } = useEgyptFilter();
  const { selectedSport } = useSport();
  
  const { data: athletesData, isLoading } = useQuery({
    queryKey: ["/api/athletes"],
  });

  // Filter athletes based on sport and Egypt toggle
  const filteredAthletes = ((athletesData as any)?.athletes || [])?.filter((athlete: any) => {
    // First filter by sport (case-insensitive)
    if (athlete.sport?.toLowerCase() !== selectedSport.toLowerCase()) return false;
    
    // Then filter by Egypt toggle
    if (!showEgyptianOnly) return true;
    return athlete.nationality === 'Egypt' || athlete.nationality === 'EGY';
  }) || [];

  const { data: currentAthlete } = useQuery({
    queryKey: [`/api/athletes/${selectedAthleteId}`],
    enabled: !!selectedAthleteId,
  });

  const handleAthleteSelect = (athleteId: string) => {
    setSelectedAthleteId(parseInt(athleteId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border border-blue-200 dark:border-blue-800/30">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="h-8 w-8 bg-blue-200 dark:bg-blue-800 rounded-full"></div>
          <div className="h-4 w-32 bg-blue-200 dark:bg-blue-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-flex-col mobile-gap lg:items-center lg:justify-between mobile-card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border border-blue-200 dark:border-blue-800/30 mb-6">
      <div className="flex items-center mobile-space-x">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mobile-text font-medium text-blue-900 dark:text-blue-100 truncate">{title}</p>
          {showCurrentAthlete && currentAthlete && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {(currentAthlete as any).profileImageUrl && (
                <img 
                  src={(currentAthlete as any).profileImageUrl} 
                  alt={(currentAthlete as any).name}
                  className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="mobile-text text-blue-700 dark:text-blue-300 truncate">{(currentAthlete as any).nationality}</span>
              </div>
              {(currentAthlete as any).worldRank && (
                <Badge variant="outline" className="mobile-text bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                  World #{(currentAthlete as any).worldRank}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center mobile-space-x mt-3 lg:mt-0">
        <Select value={selectedAthleteId?.toString() || ""} onValueChange={handleAthleteSelect}>
          <SelectTrigger className="w-full sm:w-64 bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700">
            <SelectValue placeholder="Choose athlete..." />
          </SelectTrigger>
          <SelectContent>
            {filteredAthletes?.map((athlete: any) => (
              <SelectItem key={athlete.id} value={athlete.id.toString()}>
                <div className="flex items-center space-x-2 w-full">
                  <div className="flex-shrink-0">
                    {athlete.profileImageUrl ? (
                      <img 
                        src={athlete.profileImageUrl} 
                        alt={athlete.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate">{athlete.name}</span>
                      <span className="text-xs text-muted-foreground">({athlete.nationality})</span>
                      {athlete.worldRank && (
                        <span className="text-xs text-blue-600 font-medium">#{athlete.worldRank}</span>
                      )}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}