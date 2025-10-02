import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAthlete } from "@/lib/athlete-context";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport } from "@/lib/sport-context";
import { User, Globe, Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: athletesData, isLoading } = useQuery({
    queryKey: ["/api/athletes?limit=500"],
  });

  // Filter athletes based on sport and Egypt toggle
  const filteredAthletes = (athletesData as any)?.athletes?.filter((athlete: any) => {
    // First filter by sport (case-insensitive)
    if (athlete.sport?.toLowerCase() !== selectedSport.toLowerCase()) return false;
    
    // Then filter by Egypt toggle
    if (!showEgyptianOnly) return true;
    return athlete.nationality === 'Egypt' || athlete.nationality === 'EGY';
  }) || [];

  // Further filter by search query
  const searchFilteredAthletes = filteredAthletes.filter((athlete: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      athlete.name?.toLowerCase().includes(query) ||
      athlete.nationality?.toLowerCase().includes(query) ||
      athlete.worldRank?.toString().includes(query)
    );
  });

  const handleAthleteSelect = (athleteId: string) => {
    const id = parseInt(athleteId);
    setSelectedAthleteId(id);
    onAthleteSelected?.(id);
    setOpen(false);
  };

  if (selectedAthleteId) {
    return null; // Don't show selector if athlete is already selected
  }

  return (
    <div className="flex items-center justify-center flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-950 p-4">
      <Card className="w-full max-w-2xl border-0 shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm my-auto">
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
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full h-12 justify-between"
                      data-testid="button-athlete-selector"
                    >
                      <span className="text-muted-foreground">Choose an athlete...</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search athletes..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No athlete found.</CommandEmpty>
                        <CommandGroup>
                          {searchFilteredAthletes.map((athlete: any) => (
                            <CommandItem
                              key={athlete.id}
                              value={athlete.id.toString()}
                              onSelect={() => handleAthleteSelect(athlete.id.toString())}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center space-x-3 w-full py-1">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={athlete.profileImage} alt={athlete.name} />
                                  <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30">
                                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{athlete.name}</p>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <Globe className="h-3 w-3 flex-shrink-0" />
                                    <span>{athlete.nationality}</span>
                                    {athlete.worldRank && (
                                      <Badge variant="outline" className="text-xs">
                                        #{athlete.worldRank}
                                      </Badge>
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
                      data-testid={`button-quick-athlete-${athlete.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={athlete.profileImage} alt={athlete.name} />
                          <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </AvatarFallback>
                        </Avatar>
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
