import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAthlete } from "@/lib/athlete-context";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport } from "@/lib/sport-context";
import { User, Globe, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useMemo, memo, useCallback } from "react";

interface AthleteSelectorProps {
  title?: string;
  description?: string;
  onAthleteSelected?: (athleteId: number) => void;
}

// Memoized Quick Access component to prevent re-renders
const QuickAccessSection = memo(({ 
  topAthletes, 
  onSelect 
}: { 
  topAthletes: any[]; 
  onSelect: (id: string) => void;
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Quick Access - Top Athletes
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {topAthletes.map((athlete: any) => (
          <Button
            key={athlete.id}
            variant="outline"
            className="h-auto p-4 justify-start hover:bg-blue-50 dark:hover:bg-blue-950/50"
            onClick={() => onSelect(athlete.id.toString())}
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
  );
});

QuickAccessSection.displayName = "QuickAccessSection";

// Memoized dropdown component to prevent re-rendering the whole page
const AthleteDropdown = memo(({ 
  open,
  setOpen,
  selectedSport,
  showEgyptianOnly,
  onSelect,
  isLoading
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedSport: string;
  showEgyptianOnly: boolean;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Build query parameters for search
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '20');
    if (selectedSport) params.set('sport', selectedSport);
    if (showEgyptianOnly) params.set('nationality', 'Egypt');
    if (debouncedSearch) params.set('search', debouncedSearch);
    return params.toString();
  }, [selectedSport, showEgyptianOnly, debouncedSearch]);

  // Infinite query for athletes (with search)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: ['/api/athletes', queryParams],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams(queryParams);
      params.set('page', pageParam.toString());
      const response = await fetch(`/api/athletes?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch athletes');
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentCount = allPages.reduce((sum, page) => sum + (page.athletes?.length || 0), 0);
      const total = lastPage.total || 0;
      return currentCount < total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Flatten all pages into a single array
  const athletes = useMemo(() => {
    return data?.pages.flatMap(page => page.athletes || []) || [];
  }, [data]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    // Only setup observer when popover is open
    if (!open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSelect = useCallback((athleteId: string) => {
    onSelect(athleteId);
    setSearchInput("");
  }, [onSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-12 justify-between"
          data-testid="button-athlete-selector"
        >
          <span className="text-muted-foreground">
            {isLoading ? "Loading..." : "Search athletes..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by name, nationality..." 
            value={searchInput}
            onValueChange={setSearchInput}
          />
          <CommandList>
            <ScrollArea className="h-[300px]">
              {isError ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Failed to load athletes
                </div>
              ) : athletes.length === 0 && !isLoading ? (
                <CommandEmpty>No athlete found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {athletes.map((athlete: any) => (
                    <CommandItem
                      key={athlete.id}
                      value={athlete.id.toString()}
                      onSelect={() => handleSelect(athlete.id.toString())}
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
                  {/* Infinite scroll sentinel */}
                  <div ref={observerTarget} className="h-4">
                    {isFetchingNextPage && (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading more...</span>
                      </div>
                    )}
                  </div>
                </CommandGroup>
              )}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

AthleteDropdown.displayName = "AthleteDropdown";

export default function AthleteSelector({ 
  title = "Select Athlete", 
  description = "Choose an athlete to view their analytics",
  onAthleteSelected 
}: AthleteSelectorProps) {
  const { selectedAthleteId, setSelectedAthleteId } = useAthlete();
  const { showEgyptianOnly } = useEgyptFilter();
  const { selectedSport } = useSport();
  const [open, setOpen] = useState(false);

  // Build query parameters for top athletes (no search)
  const topAthletesParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '4');
    params.set('sortBy', 'worldRank');
    if (selectedSport) params.set('sport', selectedSport);
    if (showEgyptianOnly) params.set('nationality', 'Egypt');
    return params.toString();
  }, [selectedSport, showEgyptianOnly]);

  // Query for top athletes (independent of search)
  const { data: topAthletesData, isLoading } = useQuery({
    queryKey: ['/api/athletes/top', topAthletesParams],
    queryFn: async () => {
      const response = await fetch(`/api/athletes?${topAthletesParams}`);
      if (!response.ok) throw new Error('Failed to fetch top athletes');
      return response.json();
    },
  });

  const topAthletes = useMemo(() => {
    return topAthletesData?.athletes || [];
  }, [topAthletesData]);

  const handleAthleteSelect = useCallback((athleteId: string) => {
    const id = parseInt(athleteId);
    setSelectedAthleteId(id);
    onAthleteSelected?.(id);
    setOpen(false);
  }, [setSelectedAthleteId, onAthleteSelected]);

  if (selectedAthleteId) {
    return null;
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
                <AthleteDropdown
                  open={open}
                  setOpen={setOpen}
                  selectedSport={selectedSport}
                  showEgyptianOnly={showEgyptianOnly}
                  onSelect={handleAthleteSelect}
                  isLoading={isLoading}
                />
              </div>

              {/* Quick Access to Top Athletes - Memoized to prevent re-renders */}
              {topAthletes.length > 0 && (
                <QuickAccessSection 
                  topAthletes={topAthletes}
                  onSelect={handleAthleteSelect}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
