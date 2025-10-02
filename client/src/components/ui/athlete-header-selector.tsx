import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAthlete } from "@/lib/athlete-context";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport } from "@/lib/sport-context";
import { User, Globe, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  
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
    setOpen(false);
  };

  const selectedAthlete = filteredAthletes.find((a: any) => a.id === selectedAthleteId);

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
          {showCurrentAthlete && currentAthlete ? (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={(currentAthlete as any).profileImage} alt={(currentAthlete as any).name} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30">
                  <User className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                </AvatarFallback>
              </Avatar>
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
          ) : null}
        </div>
      </div>
      
      <div className="flex items-center mobile-space-x mt-3 lg:mt-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full sm:w-80 justify-between bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700"
              data-testid="button-athlete-selector"
            >
              {selectedAthlete ? (
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedAthlete.profileImage} alt={selectedAthlete.name} />
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{selectedAthlete.name}</span>
                  <span className="text-xs text-muted-foreground">({selectedAthlete.nationality})</span>
                  {selectedAthlete.worldRank && (
                    <span className="text-xs text-blue-600 font-medium">#{selectedAthlete.worldRank}</span>
                  )}
                </div>
              ) : (
                "Choose athlete..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] sm:w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search athletes..." data-testid="input-search-athletes" />
              <CommandList>
                <CommandEmpty>No athlete found.</CommandEmpty>
                <CommandGroup>
                  {filteredAthletes?.map((athlete: any) => (
                    <CommandItem
                      key={athlete.id}
                      value={`${athlete.name} ${athlete.nationality} ${athlete.worldRank || ''}`}
                      onSelect={() => handleAthleteSelect(athlete.id.toString())}
                      data-testid={`item-athlete-${athlete.id}`}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedAthleteId === athlete.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={athlete.profileImage} alt={athlete.name} />
                          <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
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
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}