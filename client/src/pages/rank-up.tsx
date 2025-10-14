import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, memo, useCallback } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { apiRequest, getInfiniteQueryFn, queryClient } from "@/lib/queryClient";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport } from "@/lib/sport-context";
import { getCountryFlagWithFallback } from "@/lib/country-flags";
import {
  Target,
  TrendingUp,
  Trophy,
  Calendar,
  MapPin,
  Star,
  Calculator,
  Users,
  Medal,
  Brain,
  ChevronsUpDown,
  Loader2,
  User as UserIcon,
  CheckCircle2,
  History,
  Eye,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface Athlete {
  id: number;
  name: string;
  nationality: string;
  sport: string;
  worldRank?: number;
  olympicRank?: number;
  worldCategory?: string;
  olympicCategory?: string;
}

interface Competition {
  id: number;
  name: string;
  country: string;
  city?: string;
  startDate: string;
  endDate?: string;
  category?: string;
  gradeLevel?: string;
  pointsAvailable: number;
  competitionType: string;
  status: string;
  cumulativePoints?: number;
}

interface PriorityCompetition {
  competitionId: number;
  name: string;
  points: number;
  reasoning: string;
  rank_needed: string;
  startDate: string;
  endDate: string;
}

interface AIRecommendations {
  strategy: string;
  priorityCompetitions: PriorityCompetition[];
  totalPointsFromRecommendations: number;
  timelineToTarget: string;
  riskAssessment: string;
  alternativeStrategies: string[];
  aiPrompt?: string; // The AI prompt to show the model's thinking
}

interface RankUpResult {
  currentRank: number;
  currentPoints: number;
  targetPoints: number;
  pointsNeeded: number;
  suggestedCompetitions: Competition[];
  aiRecommendations: AIRecommendations;
}

// Memoized athlete dropdown component with search and infinite scroll
const AthleteDropdownList = memo(
  ({
    open,
    setOpen,
    selectedSport,
    showEgyptianOnly,
    selectedAthleteId,
    onSelect,
  }: {
    open: boolean;
    setOpen: (open: boolean) => void;
    selectedSport: string;
    showEgyptianOnly: boolean;
    selectedAthleteId: string;
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

    // Build query URL with parameters (excluding page)
    const baseQueryUrl = useMemo(() => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (selectedSport) params.set("sport", selectedSport);
      if (showEgyptianOnly) params.set("nationality", "Egypt");
      if (debouncedSearch) params.set("search", debouncedSearch);
      return `/api/athletes?${params.toString()}`;
    }, [selectedSport, showEgyptianOnly, debouncedSearch]);

    // Infinite query for athletes using shared authenticated infinite fetcher
    const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isError,
      isLoading: isQueryLoading,
      isFetching,
    } = useInfiniteQuery<{ athletes: Athlete[]; total: number }>({
      queryKey: [
        baseQueryUrl,
        selectedSport,
        showEgyptianOnly,
        debouncedSearch,
      ],
      queryFn: getInfiniteQueryFn<{ athletes: Athlete[]; total: number }>({
        on401: "throw",
      }),
      getNextPageParam: (lastPage, allPages) => {
        const currentCount = allPages.reduce(
          (sum, page) => sum + (page.athletes?.length || 0),
          0,
        );
        const total = lastPage.total || 0;
        return currentCount < total ? allPages.length + 1 : undefined;
      },
      initialPageParam: 1,
    });

    // Flatten all pages into a single array
    const athletes = useMemo(() => {
      return data?.pages.flatMap((page) => page.athletes || []) || [];
    }, [data]);

    // Check if we're waiting for debounce or loading
    const isSearching =
      searchInput !== debouncedSearch || isQueryLoading || isFetching;

    // Intersection Observer for infinite scroll
    useEffect(() => {
      const target = observerTarget.current;
      if (!target) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );

      observer.observe(target);
      return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleSelect = useCallback(
      (athleteId: string) => {
        onSelect(athleteId);
        setOpen(false);
        setSearchInput("");
      },
      [onSelect, setOpen],
    );

    return (
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search athletes..."
            value={searchInput}
            onValueChange={setSearchInput}
          />
          <CommandList>
            <ScrollArea className="h-[300px]">
              {isError && (
                <div className="p-4 text-sm text-destructive">
                  Error loading athletes. Please try again.
                </div>
              )}
              {!isError && (
                <CommandGroup>
                  {athletes.length === 0 && !isSearching && (
                    <CommandEmpty>No athlete found</CommandEmpty>
                  )}
                  {athletes.length === 0 && isSearching && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Searching...
                      </span>
                    </div>
                  )}
                  <div className="p-1">
                    {athletes.map((athlete: any) => {
                      const isSelected =
                        selectedAthleteId === athlete.id.toString();
                      return (
                        <CommandItem
                          key={athlete.id}
                          value={athlete.id.toString()}
                          onSelect={() => handleSelect(athlete.id.toString())}
                          className="flex items-center gap-3 p-2 cursor-pointer"
                          data-testid={`athlete-item-${athlete.id}`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage
                              src={athlete.profileImage}
                              alt={athlete.name}
                            />
                            <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30">
                              <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {athlete.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getCountryFlagWithFallback(athlete.nationality)}{" "}
                              {athlete.nationality}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {athlete.worldRank && (
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0"
                              >
                                W#{athlete.worldRank}
                              </Badge>
                            )}
                            {athlete.olympicRank && (
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0"
                              >
                                O#{athlete.olympicRank}
                              </Badge>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                    {hasNextPage && (
                      <div
                        ref={observerTarget}
                        className="flex items-center justify-center p-2"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2 text-xs text-muted-foreground">
                          Loading more...
                        </span>
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
  },
);

AthleteDropdownList.displayName = "AthleteDropdownList";

export default function RankUp() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showEgyptianOnly } = useEgyptFilter();
  const { selectedSport } = useSport();

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [targetRank, setTargetRank] = useState<string>("");
  const [rankingType, setRankingType] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [customNotes, setCustomNotes] = useState<string>("");
  const [rankUpResult, setRankUpResult] = useState<RankUpResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [userChangedRankingType, setUserChangedRankingType] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState<{
    step: number;
    message: string;
  }>({ step: 0, message: "" });

  // Cleanup timers on unmount
  const progressTimersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      // Clear all progress timers on component unmount
      progressTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Fetch selected athlete details for ranking data
  const { data: selectedAthlete } = useQuery({
    queryKey: ["/api/athletes", selectedAthleteId],
    queryFn: async () => {
      if (!selectedAthleteId) return null;
      const response = await fetch(`/api/athletes/${selectedAthleteId}`);
      if (!response.ok) throw new Error("Failed to fetch athlete");
      return response.json();
    },
    enabled: !!selectedAthleteId,
  });

  // Fetch all ranks for the selected athlete
  const { data: athleteRanks = [] } = useQuery({
    queryKey: ["/api/athletes", selectedAthleteId, "ranks"],
    queryFn: async () => {
      if (!selectedAthleteId) return [];
      const response = await fetch(`/api/athletes/${selectedAthleteId}/ranks`);
      if (!response.ok) throw new Error("Failed to fetch athlete ranks");
      return response.json();
    },
    enabled: !!selectedAthleteId,
  });

  // Fetch saved rank up analyses for the selected athlete
  const { data: savedAnalyses = [] } = useQuery({
    queryKey: ["/api/athletes", selectedAthleteId, "rank-up-analyses"],
    queryFn: async () => {
      if (!selectedAthleteId) return [];
      const response = await fetch(
        `/api/athletes/${selectedAthleteId}/rank-up-analyses`,
      );
      if (!response.ok) throw new Error("Failed to fetch saved analyses");
      return response.json();
    },
    enabled: !!selectedAthleteId,
  });

  // Get available ranking types for selected athlete based on their actual ranks
  const availableRankingTypes = useMemo(() => {
    if (!athleteRanks || athleteRanks.length === 0) return [];

    const types = [];
    const hasWorldRanks = athleteRanks.some(
      (rank: any) => rank.rankingType === "world",
    );
    const hasOlympicRanks = athleteRanks.some(
      (rank: any) => rank.rankingType === "olympic",
    );

    if (hasWorldRanks) types.push({ value: "world", label: "World Rankings" });
    if (hasOlympicRanks)
      types.push({ value: "olympic", label: "Olympic Rankings" });

    return types;
  }, [athleteRanks]);

  // Get categories specific to selected athlete and ranking type from their actual ranks
  const categories = useMemo(() => {
    if (!athleteRanks || athleteRanks.length === 0 || !rankingType) return [];

    // Filter ranks by ranking type and extract unique categories
    const relevantRanks = athleteRanks.filter(
      (rank: any) => rank.rankingType === rankingType,
    );
    const cats = new Set<string>();

    relevantRanks.forEach((rank: any) => {
      if (rank.category) {
        cats.add(rank.category);
      }
    });

    return Array.from(cats).sort();
  }, [athleteRanks, rankingType]);

  // Reset states when athlete changes (but not when just availableRankingTypes recalculates)
  useEffect(() => {
    setCategory("");
    setTargetRank("");
    setTargetDate("");
    if (availableRankingTypes.length > 0) {
      setRankingType(availableRankingTypes[0].value);
    } else {
      setRankingType("");
    }
  }, [selectedAthleteId]); // Only reset when athlete actually changes, not when ranking types recalculate

  // Handle when availableRankingTypes changes and current rankingType becomes invalid
  useEffect(() => {
    if (rankingType && availableRankingTypes.length > 0) {
      const isCurrentValid = availableRankingTypes.some(
        (type) => type.value === rankingType,
      );
      if (!isCurrentValid) {
        setRankingType(availableRankingTypes[0].value);
        setCategory("");
        setTargetDate("");
      }
    }
  }, [availableRankingTypes, rankingType]);

  // Reset category only when ranking type changes (not when categories recalculate)
  useEffect(() => {
    if (!userChangedRankingType) {
      // Automatic ranking type change - clear category
      setCategory("");
    }
    setUserChangedRankingType(false);
  }, [rankingType]);

  // Only clear category if it becomes invalid (not on recalculation)
  const prevCategoriesRef = useRef<string[]>([]);
  useEffect(() => {
    const categoriesChanged =
      JSON.stringify(prevCategoriesRef.current) !== JSON.stringify(categories);
    if (
      categoriesChanged &&
      category &&
      categories.length > 0 &&
      !categories.includes(category)
    ) {
      setCategory("");
    }
    prevCategoriesRef.current = categories;
  }, [categories, category]);

  // Get current athlete's ranking for the selected ranking type and category
  const selectedAthleteCurrentRank = useMemo(() => {
    if (!athleteRanks || athleteRanks.length === 0 || !rankingType || !category)
      return null;

    // Find the rank entry that matches both ranking type and category
    const matchingRank = athleteRanks.find(
      (rank: any) =>
        rank.rankingType === rankingType && rank.category === category,
    );

    return matchingRank?.ranking || null;
  }, [athleteRanks, rankingType, category]);
  const isAlreadyTopRank = selectedAthleteCurrentRank === 1;

  // Calculate rank up requirements
  const calculateRankUp = async () => {
    if (!selectedAthleteId || !rankingType || !category) {
      toast({
        title: "Missing Information",
        description: "Please select athlete, ranking type and category",
        variant: "destructive",
      });
      return;
    }

    // For top rank athletes, set target to maintain rank 1
    let effectiveTargetRank = targetRank;
    if (isAlreadyTopRank) {
      effectiveTargetRank = "1"; // Maintenance mode
    } else {
      if (!targetRank) {
        toast({
          title: "Missing Target Rank",
          description: "Please enter a target rank",
          variant: "destructive",
        });
        return;
      }

      const targetRankNum = parseInt(targetRank);
      if (
        selectedAthleteCurrentRank &&
        targetRankNum >= selectedAthleteCurrentRank
      ) {
        toast({
          title: "Invalid Target Rank",
          description: `Target rank must be better (lower) than current rank #${selectedAthleteCurrentRank}`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsCalculating(true);
    setCalculationProgress({ step: 0, message: "" });

    // Simulate AI thought process with progress updates
    const progressSteps = [
      {
        step: 1,
        message: "📊 Analyzing your current ranking position...",
        delay: 500,
      },
      {
        step: 2,
        message: "🔍 Gathering upcoming competition data...",
        delay: 3000,
      },
      {
        step: 3,
        message: "📈 Calculating points requirements...",
        delay: 6000,
      },
      {
        step: 4,
        message: "🧠 AI is analyzing optimal competition strategies...",
        delay: 20000,
      },
      {
        step: 5,
        message: "🎯 Evaluating competition difficulty and timing...",
        delay: 45000,
      },
      {
        step: 6,
        message: "⚡ Generating personalized recommendations...",
        delay: 90000,
      },
      {
        step: 7,
        message: "🏆 Finalizing your rank-up strategy...",
        delay: 150000,
      },
    ];

    // Start progress simulation
    progressTimersRef.current.forEach((timer) => clearTimeout(timer)); // Clear any existing timers
    progressTimersRef.current = [];
    progressSteps.forEach(({ step, message, delay }) => {
      const timer = setTimeout(() => {
        setCalculationProgress({ step, message });
      }, delay);
      progressTimersRef.current.push(timer);
    });

    try {
      const response = await fetch("/api/rank-up/calculate", {
        method: "POST",
        body: JSON.stringify({
          athleteId: parseInt(selectedAthleteId),
          targetRank: parseInt(effectiveTargetRank),
          rankingType,
          category,
          targetDate: targetDate || null,
          customNotes: customNotes || null,
          force: true, // Always force fresh calculation
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setRankUpResult(await response.json());

      // Clear all progress timers
      progressTimersRef.current.forEach((timer) => clearTimeout(timer));

      setCalculationProgress({ step: 8, message: "✅ Analysis complete!" });

      toast({
        title: "✅ Calculation Complete",
        description: isAlreadyTopRank
          ? "Rank maintenance strategy generated successfully"
          : "Rank up requirements calculated successfully",
      });
    } catch (error) {
      console.error("Calculation error:", error);

      // Clear all progress timers
      progressTimersRef.current.forEach((timer) => clearTimeout(timer));

      toast({
        title: "Calculation Failed",
        description: "Failed to calculate rank up requirements. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
      setTimeout(() => setCalculationProgress({ step: 0, message: "" }), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header
        title="Rank Up Calculator"
        description="Find the competitions you need to advance your ranking"
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Rank Up Calculator
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Find the competitions you need to advance your ranking
                </p>
              </div>
            </div>
          </div>

          {/* Input Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculate Rank Up Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="athlete">Select Athlete</Label>
                  <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={dropdownOpen}
                        className="w-full justify-between"
                        data-testid="button-select-athlete"
                      >
                        {selectedAthlete ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarImage
                                src={selectedAthlete.profileImage}
                                alt={selectedAthlete.name}
                              />
                              <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30">
                                <UserIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                              {selectedAthlete.name}
                            </span>
                          </div>
                        ) : (
                          "Choose athlete..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <AthleteDropdownList
                      open={dropdownOpen}
                      setOpen={setDropdownOpen}
                      selectedSport={selectedSport}
                      showEgyptianOnly={showEgyptianOnly}
                      selectedAthleteId={selectedAthleteId}
                      onSelect={setSelectedAthleteId}
                    />
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetRank">
                    Target Rank
                    {selectedAthleteCurrentRank && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Current: #{selectedAthleteCurrentRank})
                      </span>
                    )}
                  </Label>
                  {isAlreadyTopRank ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <Trophy className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        Currently Rank #1 - Get AI strategy to maintain your top
                        position!
                      </span>
                    </div>
                  ) : (
                    <Input
                      id="targetRank"
                      type="number"
                      placeholder={
                        selectedAthleteCurrentRank
                          ? `1-${selectedAthleteCurrentRank - 1}`
                          : "e.g., 1"
                      }
                      value={targetRank}
                      onChange={(e) => setTargetRank(e.target.value)}
                      min="1"
                      max={
                        selectedAthleteCurrentRank
                          ? selectedAthleteCurrentRank - 1
                          : undefined
                      }
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rankingType">Ranking Type</Label>
                  <Select
                    value={rankingType || undefined}
                    onValueChange={(value) => {
                      setUserChangedRankingType(true);
                      setRankingType(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          availableRankingTypes.length === 0
                            ? "Select athlete first"
                            : "Select ranking type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRankingTypes.length === 0 ? (
                        <SelectItem value="no-data" disabled>
                          No ranking data available
                        </SelectItem>
                      ) : (
                        availableRankingTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Weight Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          categories.length === 0
                            ? selectedAthleteId
                              ? "No categories available"
                              : "Select athlete first"
                            : "Select category..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <SelectItem value="no-categories" disabled>
                          {selectedAthleteId
                            ? "No weight categories found for this athlete"
                            : "Select an athlete first"}
                        </SelectItem>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target Date (Optional)</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    data-testid="input-target-date"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    When do you want to reach your target rank?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customNotes">Custom Notes (Optional)</Label>
                  <Textarea
                    id="customNotes"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Add any specific requirements, constraints, or preferences for the AI to consider..."
                    className="min-h-[80px]"
                    data-testid="textarea-custom-notes"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Additional context to help AI generate better recommendations
                  </p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button
                  onClick={calculateRankUp}
                  disabled={
                    isCalculating ||
                    !selectedAthleteId ||
                    !rankingType ||
                    !category ||
                    (!isAlreadyTopRank && !targetRank)
                  }
                  className="px-8 py-2"
                  data-testid="button-calculate-rank-up"
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : isAlreadyTopRank ? (
                    "Get Maintenance Strategy"
                  ) : (
                    "Calculate Requirements"
                  )}
                </Button>
              </div>

              {/* Progress Indicator - Compact */}
              {isCalculating && calculationProgress.step > 0 && (
                <div className="mt-4 p-3 bg-blue-50/50 dark:bg-gray-800/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {calculationProgress.message}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {calculationProgress.step}/7
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out"
                        style={{
                          width: `${(calculationProgress.step / 7) * 100}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Typically takes 3-5 minutes
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Analyses Section */}
          {selectedAthleteId && savedAnalyses && savedAnalyses.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Saved Analyses ({savedAnalyses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {savedAnalyses.map((analysis: any) => (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      data-testid={`saved-analysis-${analysis.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {analysis.rankingType === "world"
                              ? "World"
                              : "Olympic"}{" "}
                            Rankings - {analysis.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            #{analysis.currentRank} → #{analysis.targetRank}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            {parseFloat(analysis.pointsNeeded).toFixed(1)}{" "}
                            points needed
                          </span>
                          <span>•</span>
                          {analysis.targetDate && (
                            <>
                              <span>Target: {analysis.targetDate}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>
                            Created:{" "}
                            {new Date(analysis.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Load the saved analysis
                            setRankUpResult({
                              currentRank: analysis.currentRank,
                              currentPoints: parseFloat(analysis.currentPoints),
                              targetPoints: parseFloat(analysis.targetPoints),
                              pointsNeeded: parseFloat(analysis.pointsNeeded),
                              suggestedCompetitions:
                                analysis.suggestedCompetitions,
                              aiRecommendations: analysis.aiRecommendations,
                            });
                            // Scroll to results
                            setTimeout(() => {
                              document
                                .querySelector(
                                  '[data-testid="results-section"]',
                                )
                                ?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          data-testid={`button-view-analysis-${analysis.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Recalculate - set form values and trigger recalculation
                            setTargetRank(analysis.targetRank.toString());
                            setRankingType(analysis.rankingType);
                            setRankUpResult(null);
                            // Set category and targetDate after a brief delay to prevent them from being cleared
                            setTimeout(() => {
                              setCategory(analysis.category);
                              setTargetDate(analysis.targetDate || "");
                            }, 50);
                            toast({
                              title: "Ready to Recalculate",
                              description:
                                "Form populated with saved parameters. Click Calculate for fresh results.",
                            });
                          }}
                          data-testid={`button-recalculate-analysis-${analysis.id}`}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Recalc
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={async () => {
                            if (
                              confirm(
                                "Are you sure you want to delete this saved analysis?",
                              )
                            ) {
                              try {
                                const response = await fetch(
                                  `/api/rank-up/saved/${analysis.id}`,
                                  {
                                    method: "DELETE",
                                  },
                                );
                                if (!response.ok)
                                  throw new Error("Failed to delete");
                                queryClient.invalidateQueries({
                                  queryKey: [
                                    "/api/athletes",
                                    selectedAthleteId,
                                    "rank-up-analyses",
                                  ],
                                });
                                toast({
                                  title: "Analysis Deleted",
                                  description:
                                    "The saved analysis has been removed",
                                });
                              } catch (error) {
                                toast({
                                  title: "Delete Failed",
                                  description: "Could not delete the analysis",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                          data-testid={`button-delete-analysis-${analysis.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {rankUpResult && (
            <div className="space-y-6" data-testid="results-section">
              {/* Overview Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Rank Up Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        #{rankUpResult.currentRank}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Current Rank
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {rankUpResult.currentPoints.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Current Points
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {rankUpResult.pointsNeeded.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Points Needed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {(rankUpResult.targetPoints + 10).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total Required
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suggested Competitions */}
              {rankUpResult.suggestedCompetitions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Suggested Competitions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">
                              Competition Name
                            </th>
                            <th className="text-left p-3 font-semibold">
                              Country/Region
                            </th>
                            <th className="text-left p-3 font-semibold">
                              Date
                            </th>
                            <th className="text-center p-3 font-semibold">
                              Cumulative Points
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankUpResult.suggestedCompetitions.map((comp) => (
                            <tr
                              key={comp.id}
                              className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Medal className="h-4 w-4 text-gold" />
                                  <div>
                                    <div className="font-medium">
                                      {comp.name}
                                    </div>
                                    {comp.gradeLevel && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs mt-1"
                                      >
                                        {comp.gradeLevel}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <div>{comp.country}</div>
                                    {comp.city && (
                                      <div className="text-sm text-gray-500">
                                        {comp.city}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <div>{formatDate(comp.startDate)}</div>
                                    {comp.endDate && (
                                      <div className="text-sm text-gray-500">
                                        to {formatDate(comp.endDate)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="font-semibold text-blue-600 dark:text-blue-400">
                                  {comp.cumulativePoints ?? 0} pts
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Recommendations */}
              {rankUpResult.aiRecommendations && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      {rankUpResult.currentRank === 1
                        ? "AI Rank Maintenance Strategy"
                        : "AI Strategic Recommendations"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Strategy Overview */}
                    <div>
                      <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
                        Strategy Overview
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {rankUpResult.aiRecommendations.strategy}
                      </p>
                    </div>

                    {/* AI Thought Process */}
                    {rankUpResult.aiRecommendations.aiPrompt && (
                      <Accordion
                        type="single"
                        collapsible
                        className="border rounded-lg"
                      >
                        <AccordionItem value="ai-thinking" className="border-0">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-purple-600 dark:text-purple-400">
                                View AI's Thought Process
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                This is the detailed prompt that was sent to the
                                AI model, showing exactly what context and
                                instructions were provided:
                              </p>
                              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-600 max-h-96 overflow-y-auto">
                                {rankUpResult.aiRecommendations.aiPrompt}
                              </pre>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {/* Priority Competitions */}
                    {rankUpResult.aiRecommendations.priorityCompetitions &&
                      rankUpResult.aiRecommendations.priorityCompetitions
                        .length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">
                            Priority Competitions
                          </h4>
                          <div className="space-y-3">
                            {rankUpResult.aiRecommendations.priorityCompetitions.map(
                              (comp, index) => (
                                <div
                                  key={index}
                                  className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                      {comp.name}
                                    </h5>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {comp.points} points
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {formatDate(comp.startDate)}
                                      {comp.endDate &&
                                        comp.endDate !== comp.startDate && (
                                          <> - {formatDate(comp.endDate)}</>
                                        )}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {comp.reasoning}
                                  </p>
                                  <div className="text-sm text-purple-600 dark:text-purple-400">
                                    <strong>Required Performance:</strong>{" "}
                                    {comp.rank_needed}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Grid for Timeline and Risk */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2 text-orange-600 dark:text-orange-400">
                          {rankUpResult.currentRank === 1
                            ? "Maintenance Timeline"
                            : "Timeline to Target"}
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {rankUpResult.aiRecommendations.timelineToTarget}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                          Risk Assessment
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {rankUpResult.aiRecommendations.riskAssessment}
                        </p>
                      </div>
                    </div>

                    {/* Alternative Strategies */}
                    {rankUpResult.aiRecommendations.alternativeStrategies &&
                      rankUpResult.aiRecommendations.alternativeStrategies
                        .length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400">
                            Alternative Strategies
                          </h4>
                          <ul className="space-y-2">
                            {rankUpResult.aiRecommendations.alternativeStrategies.map(
                              (strategy, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {strategy}
                                  </span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Points Summary */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-800 dark:text-blue-200">
                          Total Points from AI Recommendations:
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {
                            rankUpResult.aiRecommendations
                              .totalPointsFromRecommendations
                          }{" "}
                          points
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Information Card */}
          {!rankUpResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  How Rank Up Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Calculation Method</h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Analyzes your current ranking and points</li>
                      <li>• Finds the athlete at your target rank</li>
                      <li>
                        • Calculates points needed to exceed by 10+ points
                      </li>
                      <li>• Suggests optimal competition combinations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">
                      Competition Selection
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Prioritizes higher point-value competitions</li>
                      <li>• Shows upcoming competitions only</li>
                      <li>• Matches your weight category</li>
                      <li>• Considers geographic proximity</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
