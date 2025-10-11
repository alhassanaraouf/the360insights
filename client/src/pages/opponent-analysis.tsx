import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  Brain, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Zap,
  Shield,
  Activity,
  Users,
  Filter,
  ChevronsUpDown,
  Loader2,
  User,
  Globe
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { useAthlete } from "@/lib/athlete-context";
import { getCountryFlagWithFallback } from "@/lib/country-flags";
import type { Athlete } from "@shared/schema";
import AthleteSelector from "@/components/ui/athlete-selector";
import AthleteHeaderSelector from "@/components/ui/athlete-header-selector";

interface OpponentAnalysis {
  weaknessExploitation: string[];
  tacticalRecommendations: string[];
  winProbability: number;
  keyStrategyPoints: string[];
  mentalPreparation: string[];
  technicalFocus: string[];
}

interface PerformanceInsight {
  trend: 'improving' | 'declining' | 'stable';
  confidence: number;
  keyMetrics: string[];
  recommendations: string[];
  riskFactors: string[];
}

export default function OpponentAnalysis() {
  const [selectedOpponent, setSelectedOpponent] = useState<string>("");
  const [showAllWeightClass, setShowAllWeightClass] = useState<boolean>(false);
  const [opponentSelectorOpen, setOpponentSelectorOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { selectedAthleteId } = useAthlete();

  const { data: athlete } = useQuery<Athlete>({
    queryKey: [`/api/athletes/${selectedAthleteId}`],
    enabled: !!selectedAthleteId,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Build query parameters for opponent search
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '20');
    if (debouncedSearch) params.set('search', debouncedSearch);
    return params.toString();
  }, [debouncedSearch]);

  // Infinite query for opponents with search
  const {
    data: opponentsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError: isOpponentsError,
    isLoading: opponentsLoading,
    isFetching: isOpponentsFetching,
  } = useInfiniteQuery({
    queryKey: [`/api/athletes/${selectedAthleteId}/opponents`, showAllWeightClass, queryParams],
    queryFn: async ({ pageParam = 1 }) => {
      const endpoint = showAllWeightClass 
        ? `/api/athletes/${selectedAthleteId}/opponents/all-weight-class`
        : `/api/athletes/${selectedAthleteId}/opponents`;
      const params = new URLSearchParams(queryParams);
      params.set('page', pageParam.toString());
      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch opponents');
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      // Backend now returns { opponents, total, page, limit, hasMore }
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!selectedAthleteId,
  });

  // Flatten all pages into a single array
  const opponents = useMemo(() => {
    return opponentsData?.pages.flatMap(page => page.opponents || []) || [];
  }, [opponentsData]);

  // Check if we're waiting for debounce or loading
  const isSearching = searchInput !== debouncedSearch || opponentsLoading || isOpponentsFetching;

  const { data: performanceInsight, isLoading: performanceLoading } = useQuery<PerformanceInsight>({
    queryKey: [`/api/ai/performance-insight/${selectedAthleteId}`],
    enabled: true
  });

  const opponentAnalysisMutation = useMutation({
    mutationFn: async (opponentId: string) => {
      const response = await apiRequest("POST", `/api/ai/opponent-analysis/${selectedAthleteId}/${opponentId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/opponent-analysis"] });
    },
  });

  const { data: analysis, isLoading: analysisLoading } = useQuery<OpponentAnalysis>({
    queryKey: ["/api/ai/opponent-analysis", selectedAthleteId, selectedOpponent],
    enabled: !!selectedOpponent && !!selectedAthleteId,
    queryFn: async () => {
      if (!selectedOpponent || !selectedAthleteId) return null;
      const response = await apiRequest("POST", `/api/ai/opponent-analysis/${selectedAthleteId}/${selectedOpponent}`, {});
      return response.json();
    }
  });

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!opponentSelectorOpen) return;

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
  }, [opponentSelectorOpen, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleOpponentSelect = async (opponentId: string) => {
    setSelectedOpponent(opponentId);
    setOpponentSelectorOpen(false);
    
    // Check if opponent has a playing style, if not generate one
    const opponent = opponents?.find((o) => o.id.toString() === opponentId);
    if (opponent) {
      const playingStyleNormalized = opponent.playingStyle?.trim().toLowerCase() || "";
      const needsGeneration = !opponent.playingStyle || playingStyleNormalized === "";
      
      if (needsGeneration) {
        console.log(`Generating playing style for opponent: ${opponent.name}`);
        try {
          const response = await apiRequest("POST", `/api/generate/playing-style/${opponentId}`, {});
          const data = await response.json();
          console.log(`✓ Generated playing style: ${data.playingStyle}`);
          // Invalidate queries to refresh the opponent data
          queryClient.invalidateQueries({ queryKey: [`/api/athletes/${selectedAthleteId}/opponents`] });
        } catch (error) {
          console.error("Failed to generate playing style:", error);
        }
      }
    }
  };

  const selectedOpponentData = opponents?.find((o) => o.id.toString() === selectedOpponent);

  // Show athlete selector if no athlete is selected
  if (!selectedAthleteId) {
    return (
      <div className="min-h-screen flex flex-col">
        <AthleteSelector 
          title="Select Athlete for Analysis"
          description="Choose an athlete to analyze their opponents and strategies"
        />
      </div>
    );
  }

  return (
    <>
      <Header 
        title={athlete?.name ? `${athlete.name} - AI Opponent Analysis` : "AI Opponent Analysis"}
        description="Advanced machine learning powered tactical analysis"
      />
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <AthleteHeaderSelector title="Analyzing opponents for:" />
        
        {/* Opponent Selection */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Select Opponent for Analysis
            </CardTitle>
            <CardDescription className="text-sm">
              {showAllWeightClass 
                ? "Choose an international opponent from all athletes in the same weight class to generate AI-powered tactical recommendations"
                : "Choose an international opponent from the same weight class (within 10 ranks) to generate AI-powered tactical recommendations"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-all-weight-class"
                checked={showAllWeightClass}
                onCheckedChange={setShowAllWeightClass}
              />
              <Label htmlFor="show-all-weight-class" className="text-sm">
                <Filter className="h-4 w-4 inline mr-1" />
                Show all athletes in weight class
              </Label>
            </div>
            
            <Popover open={opponentSelectorOpen} onOpenChange={setOpponentSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={opponentSelectorOpen}
                  className="w-full h-12 justify-between"
                  data-testid="button-opponent-selector"
                >
                  {selectedOpponentData ? (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedOpponentData.profileImage} alt={selectedOpponentData.name} />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30">
                          <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{selectedOpponentData.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {opponentsLoading ? "Loading..." : "Select an opponent to analyze..."}
                    </span>
                  )}
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
                      {isOpponentsError ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Failed to load opponents
                        </div>
                      ) : isSearching ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Searching...
                        </div>
                      ) : opponents.length === 0 ? (
                        <CommandEmpty>No opponents found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {opponents.map((opponent: any) => (
                            <CommandItem
                              key={opponent.id}
                              value={opponent.id.toString()}
                              onSelect={() => handleOpponentSelect(opponent.id.toString())}
                              className="cursor-pointer"
                              data-testid={`item-opponent-${opponent.id}`}
                            >
                              <div className="flex items-center space-x-3 w-full py-1">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={opponent.profileImage} alt={opponent.name} />
                                  <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30">
                                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{opponent.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                    <div className="flex items-center gap-1">
                                      <Globe className="h-3 w-3 flex-shrink-0" />
                                      <span>{getCountryFlagWithFallback(opponent.nationality)} {opponent.nationality}</span>
                                    </div>
                                    {opponent.worldRank && (
                                      <Badge variant="outline" className="text-xs">
                                        #{opponent.worldRank}
                                      </Badge>
                                    )}
                                    {opponent.worldCategory && (
                                      <span className="text-xs">
                                        {opponent.worldCategory}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                          {/* Infinite scroll trigger */}
                          <div ref={observerTarget} className="h-4" />
                          {isFetchingNextPage && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                          )}
                        </CommandGroup>
                      )}
                    </ScrollArea>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Performance Insight Overview */}
        {performanceInsight && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Your Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    performanceInsight.trend === 'improving' ? 'text-green-600' :
                    performanceInsight.trend === 'declining' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {performanceInsight.trend.toUpperCase()}
                  </div>
                  <p className="text-sm text-gray-500">Current Trend</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {performanceInsight.confidence}%
                  </div>
                  <p className="text-sm text-gray-500">Analysis Confidence</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {performanceInsight.keyMetrics.length}
                  </div>
                  <p className="text-sm text-gray-500">Key Metrics Tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis Results */}
        {selectedOpponentData && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Our Athlete Profile - Left (Blue Theme) */}
              {athlete && (
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <User className="h-5 w-5" />
                      Your Athlete
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="text-center">
                      <Avatar className="h-24 w-24 mx-auto mb-3 border-2 border-blue-500">
                        <AvatarImage src={athlete.profileImage || undefined} alt={athlete.name} />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-2xl">
                          <User className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold text-lg">{athlete.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{athlete.nationality}</p>
                      {(athlete as any).worldRank && (
                        <Badge variant="outline" className="mt-2 border-blue-500 text-blue-700">
                          World Rank #{(athlete as any).worldRank}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Weight Class:</span>
                        <span className="text-sm font-medium">
                          {athlete.worldCategory || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Prediction - Center */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    AI Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="text-center space-y-4 py-8">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-gray-600">
                        AI is analyzing opponent patterns and generating tactical recommendations...
                      </p>
                    </div>
                  ) : analysis ? (
                    <div className="space-y-4">
                      {/* Win probability bar */}
                      <div className="relative h-10 rounded-full overflow-hidden flex items-center">
                        <div 
                          className="absolute left-0 h-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                          style={{ width: `${analysis.winProbability}%` }}
                        >
                          {analysis.winProbability >= 15 && `${analysis.winProbability}%`}
                        </div>
                        <div 
                          className="absolute right-0 h-full bg-red-500 dark:bg-red-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                          style={{ width: `${100 - analysis.winProbability}%` }}
                        >
                          {(100 - analysis.winProbability) >= 15 && `${100 - analysis.winProbability}%`}
                        </div>
                      </div>
                      
                      {/* Labels */}
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-400 font-medium">{athlete?.name || 'Your Athlete'}</span>
                        <span className="text-red-700 dark:text-red-400 font-medium">{selectedOpponentData.name}</span>
                      </div>
                      
                      {/* Winner prediction */}
                      <div className="text-center pt-2">
                        <p className="text-lg font-semibold">
                          {analysis.winProbability >= 50 ? athlete?.name : selectedOpponentData.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Predicted to win
                        </p>
                      </div>
                      
                      <p className="text-xs text-gray-500 text-center">
                        Based on performance data, fighting styles, and historical patterns
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">
                        Select an opponent to see AI predictions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Opponent Profile - Right (Red Theme) */}
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader className="bg-red-50 dark:bg-red-950/30">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <Target className="h-5 w-5" />
                    Opponent Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-3 border-2 border-red-500">
                      <AvatarImage src={selectedOpponentData.profileImage} alt={selectedOpponentData.name} />
                      <AvatarFallback className="bg-red-100 dark:bg-red-900/30 text-2xl">
                        <User className="h-12 w-12 text-red-600 dark:text-red-400" />
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-lg">{selectedOpponentData.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{selectedOpponentData.nationality}</p>
                    <Badge variant="outline" className="mt-2 border-red-500 text-red-700">
                      World Rank #{selectedOpponentData.worldRank}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Weight Class:</span>
                      <span className="text-sm font-medium">
                        {selectedOpponentData.worldCategory && selectedOpponentData.olympicCategory ? 
                          `${selectedOpponentData.worldCategory} / ${selectedOpponentData.olympicCategory}` : 
                          selectedOpponentData.worldCategory || selectedOpponentData.olympicCategory || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Strategy Points - Below the 3 cards */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Key Strategy Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.keyStrategyPoints.map((point, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{point}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Detailed Analysis Tabs */}
        {analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Detailed Tactical Analysis
              </CardTitle>
              <CardDescription>
                AI-generated insights and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tactical" className="w-full">
                <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4 bg-gray-200 dark:bg-gray-800 p-1">
                  <TabsTrigger 
                    value="tactical" 
                    className="h-10 py-2 px-1 sm:px-3 text-xs sm:text-sm text-center transition-all duration-300 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-md"
                  >
                    Tactics
                  </TabsTrigger>
                  <TabsTrigger 
                    value="weaknesses" 
                    className="h-10 py-2 px-1 sm:px-3 text-xs sm:text-sm text-center transition-all duration-300 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-md"
                  >
                    Weaknesses
                  </TabsTrigger>
                  <TabsTrigger 
                    value="technical" 
                    className="h-10 py-2 px-1 sm:px-3 text-xs sm:text-sm text-center transition-all duration-300 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-md"
                  >
                    Technical
                  </TabsTrigger>
                  <TabsTrigger 
                    value="mental" 
                    className="h-10 py-2 px-1 sm:px-3 text-xs sm:text-sm text-center transition-all duration-300 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-md"
                  >
                    Mental
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tactical" className="mt-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Tactical Recommendations
                    </h4>
                    <div className="grid gap-3">
                      {analysis.tacticalRecommendations.map((rec, index) => (
                        <div key={index} className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="weaknesses" className="mt-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Weakness Exploitation
                    </h4>
                    <div className="grid gap-3">
                      {analysis.weaknessExploitation.map((weakness, index) => (
                        <div key={index} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-500">
                          <p className="text-sm">{weakness}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="technical" className="mt-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Technical Focus Areas
                    </h4>
                    <div className="grid gap-3">
                      {analysis.technicalFocus.map((focus, index) => (
                        <div key={index} className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-500">
                          <p className="text-sm">{focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="mental" className="mt-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Mental Preparation
                    </h4>
                    <div className="grid gap-3">
                      {analysis.mentalPreparation.map((prep, index) => (
                        <div key={index} className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-500">
                          <p className="text-sm">{prep}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Loading States */}
        {analysisLoading && selectedOpponent && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">AI is analyzing opponent patterns and generating tactical recommendations...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}