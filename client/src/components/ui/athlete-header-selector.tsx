import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAthlete } from "@/lib/athlete-context";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport } from "@/lib/sport-context";
import { User, Globe, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountryFlagWithFallback } from "@/lib/country-flags";

interface AthleteHeaderSelectorProps {
  title?: string;
  showCurrentAthlete?: boolean;
}

// Memoized dropdown component to prevent re-rendering
const AthleteDropdownList = memo(({ 
  open,
  setOpen,
  selectedSport,
  showEgyptianOnly,
  selectedAthleteId,
  onSelect
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedSport: string;
  showEgyptianOnly: boolean;
  selectedAthleteId: number | null;
  onSelect: (id: string) => void;
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
    isLoading: isQueryLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['/api/athletes/header', queryParams],
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

  // Check if we're waiting for debounce or loading
  const isSearching = searchInput !== debouncedSearch || isQueryLoading || isFetching;

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
    <PopoverContent className="w-[320px] sm:w-[400px] p-0" align="start">
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search athletes..."
          value={searchInput}
          onValueChange={setSearchInput}
          data-testid="input-search-athletes"
        />
        <CommandList>
          <ScrollArea className="h-[300px]">
            {isError ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Failed to load athletes
              </div>
            ) : isSearching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : athletes.length === 0 ? (
              <CommandEmpty>No athlete found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {athletes.map((athlete: any) => (
                  <CommandItem
                    key={athlete.id}
                    value={athlete.id.toString()}
                    onSelect={() => handleSelect(athlete.id.toString())}
                    data-testid={`item-athlete-${athlete.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedAthleteId === athlete.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={athlete.profileImage}
                          alt={athlete.name}
                        />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium truncate">
                            {athlete.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({getCountryFlagWithFallback(athlete.nationality)} {athlete.nationality})
                          </span>
                          {athlete.worldRank && (
                            <span className="text-xs text-blue-600 font-medium">
                              #{athlete.worldRank}
                            </span>
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
  );
});

AthleteDropdownList.displayName = "AthleteDropdownList";

export default function AthleteHeaderSelector({
  title = "Select Athlete:",
  showCurrentAthlete = true,
}: AthleteHeaderSelectorProps) {
  const { selectedAthleteId, setSelectedAthleteId } = useAthlete();
  const { showEgyptianOnly } = useEgyptFilter();
  const { selectedSport } = useSport();
  const [open, setOpen] = useState(false);

  const { data: currentAthlete, isLoading } = useQuery({
    queryKey: [`/api/athletes/${selectedAthleteId}`],
    enabled: !!selectedAthleteId,
  });

  const handleAthleteSelect = useCallback((athleteId: string) => {
    setSelectedAthleteId(parseInt(athleteId));
    setOpen(false);
  }, [setSelectedAthleteId]);

  if (isLoading && selectedAthleteId) {
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
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage
            src={(currentAthlete as any)?.profileImage}
            alt={(currentAthlete as any)?.name}
          />
          <AvatarFallback className="bg-blue-100 dark:bg-blue-900/50">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="mobile-text font-medium text-blue-900 dark:text-blue-100 truncate">
            {title}
          </p>
          {showCurrentAthlete && currentAthlete ? (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="mobile-text text-blue-700 dark:text-blue-300 truncate">
                  {getCountryFlagWithFallback((currentAthlete as any).nationality)} {(currentAthlete as any).nationality}
                </span>
              </div>
              {(currentAthlete as any).worldRank && (
                <Badge
                  variant="outline"
                  className="mobile-text bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                >
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
              {currentAthlete ? (
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={(currentAthlete as any).profileImage}
                      alt={(currentAthlete as any).name}
                    />
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{(currentAthlete as any).name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({getCountryFlagWithFallback((currentAthlete as any).nationality)} {(currentAthlete as any).nationality})
                  </span>
                  {(currentAthlete as any).worldRank && (
                    <span className="text-xs text-blue-600 font-medium">
                      #{(currentAthlete as any).worldRank}
                    </span>
                  )}
                </div>
              ) : (
                "Choose athlete..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <AthleteDropdownList
            open={open}
            setOpen={setOpen}
            selectedSport={selectedSport}
            showEgyptianOnly={showEgyptianOnly}
            selectedAthleteId={selectedAthleteId}
            onSelect={handleAthleteSelect}
          />
        </Popover>
      </div>
    </div>
  );
}
