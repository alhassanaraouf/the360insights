import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
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
  Brain
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
}

interface RankUpResult {
  currentRank: number;
  currentPoints: number;
  targetPoints: number;
  pointsNeeded: number;
  suggestedCompetitions: Competition[];
  aiRecommendations: AIRecommendations;
}

export default function RankUp() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showEgyptianOnly } = useEgyptFilter();

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [targetRank, setTargetRank] = useState<string>("");
  const [rankingType, setRankingType] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [rankUpResult, setRankUpResult] = useState<RankUpResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [userChangedRankingType, setUserChangedRankingType] = useState(false);

  // Fetch all athletes
  const { data: athleteData, isLoading: athletesLoading } = useQuery({
    queryKey: ["/api/athletes", showEgyptianOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '1000', // Get a large number of athletes for rank-up feature
      });
      
      if (showEgyptianOnly) {
        params.append('nationality', 'Egypt');
      }
      
      const response = await fetch(`/api/athletes?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch athletes');
      return response.json();
    }
  });

  // Extract athletes array from response and apply any additional filtering
  const athletes = athleteData?.athletes || [];

  // Clear selection if current athlete is not in filtered list
  useEffect(() => {
    if (selectedAthleteId && !athletes.find(a => a.id.toString() === selectedAthleteId)) {
      setSelectedAthleteId("");
      setRankingType("");
      setCategory("");
      setTargetRank("");
      setTargetDate("");
      setRankUpResult(null);
    }
  }, [selectedAthleteId, athletes]);

  // Get available ranking types for selected athlete
  const availableRankingTypes = useMemo(() => {
    if (!selectedAthleteId) return [];
    
    const selectedAthlete = athletes.find(a => a.id === parseInt(selectedAthleteId));
    if (!selectedAthlete) return [];
    
    const types = [];
    if (selectedAthlete.worldRank) types.push({ value: "world", label: "World Rankings" });
    if (selectedAthlete.olympicRank) types.push({ value: "olympic", label: "Olympic Rankings" });
    
    return types;
  }, [athletes, selectedAthleteId]);

  // Get categories specific to selected athlete and ranking type
  const categories = useMemo(() => {
    if (!selectedAthleteId || !rankingType) return [];
    
    const selectedAthlete = athletes.find(a => a.id === parseInt(selectedAthleteId));
    if (!selectedAthlete) return [];
    
    const cats = new Set<string>();
    if (rankingType === "world" && selectedAthlete.worldCategory) {
      cats.add(selectedAthlete.worldCategory);
    }
    if (rankingType === "olympic" && selectedAthlete.olympicCategory) {
      cats.add(selectedAthlete.olympicCategory);
    }
    
    return Array.from(cats).sort();
  }, [athletes, selectedAthleteId, rankingType]);

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
      const isCurrentValid = availableRankingTypes.some(type => type.value === rankingType);
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
    const categoriesChanged = JSON.stringify(prevCategoriesRef.current) !== JSON.stringify(categories);
    if (categoriesChanged && category && categories.length > 0 && !categories.includes(category)) {
      setCategory("");
    }
    prevCategoriesRef.current = categories;
  }, [categories, category]);

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
      if (selectedAthleteCurrentRank && targetRankNum >= selectedAthleteCurrentRank) {
        toast({
          title: "Invalid Target Rank",
          description: `Target rank must be better (lower) than current rank #${selectedAthleteCurrentRank}`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsCalculating(true);
    try {
      const response = await fetch("/api/rank-up/calculate", {
        method: "POST",
        body: JSON.stringify({
          athleteId: parseInt(selectedAthleteId),
          targetRank: parseInt(effectiveTargetRank),
          rankingType,
          category,
          targetDate: targetDate || null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setRankUpResult(await response.json());
      toast({
        title: "Calculation Complete",
        description: isAlreadyTopRank 
          ? "Rank maintenance strategy generated successfully"
          : "Rank up requirements calculated successfully",
      });
    } catch (error) {
      console.error("Calculation error:", error);
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate rank up requirements",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const selectedAthlete = athletes.find(a => a.id === parseInt(selectedAthleteId));

  // Get current athlete's ranking for the selected ranking type
  const getCurrentRanking = (athlete: Athlete, type: string) => {
    if (type === 'world') return athlete.worldRank;
    if (type === 'olympic') return athlete.olympicRank;
    return null;
  };

  const selectedAthleteCurrentRank = selectedAthlete ? getCurrentRanking(selectedAthlete, rankingType) : null;
  const isAlreadyTopRank = selectedAthleteCurrentRank === 1;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header title="Rank Up Calculator" description="Find the competitions you need to advance your ranking" />
      
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
                  <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose athlete...">
                        {selectedAthleteId && (() => {
                          const selectedAthlete = athletes.find(a => a.id.toString() === selectedAthleteId);
                          return selectedAthlete ? `${selectedAthlete.name} (${selectedAthlete.nationality})` : 'Choose athlete...';
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map((athlete) => {
                        const worldRank = athlete.worldRank;
                        const olympicRank = athlete.olympicRank;
                        return (
                          <SelectItem key={athlete.id} value={athlete.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">
                                {athlete.name} ({athlete.nationality})
                              </span>
                              <div className="flex gap-1 ml-2 flex-shrink-0">
                                {worldRank && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    W#{worldRank}
                                  </Badge>
                                )}
                                {olympicRank && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    O#{olympicRank}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
                        Currently Rank #1 - Get AI strategy to maintain your top position!
                      </span>
                    </div>
                  ) : (
                    <Input
                      id="targetRank"
                      type="number"
                      placeholder={selectedAthleteCurrentRank ? `1-${selectedAthleteCurrentRank - 1}` : "e.g., 1"}
                      value={targetRank}
                      onChange={(e) => setTargetRank(e.target.value)}
                      min="1"
                      max={selectedAthleteCurrentRank ? selectedAthleteCurrentRank - 1 : undefined}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rankingType">Ranking Type</Label>
                  <Select value={rankingType || undefined} onValueChange={(value) => {
                    setUserChangedRankingType(true);
                    setRankingType(value);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={availableRankingTypes.length === 0 ? "Select athlete first" : "Select ranking type"} />
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
                      <SelectValue placeholder={categories.length === 0 ? (selectedAthleteId ? "No categories available" : "Select athlete first") : "Select category..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <SelectItem value="no-categories" disabled>
                          {selectedAthleteId ? "No weight categories found for this athlete" : "Select an athlete first"}
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
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="input-target-date"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    When do you want to reach your target rank?
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                onClick={calculateRankUp}
                disabled={isCalculating || !selectedAthleteId || !rankingType || !category || (!isAlreadyTopRank && !targetRank)}
                className="w-full md:w-auto px-8 py-2"
              >
                {isCalculating ? "Calculating..." : isAlreadyTopRank ? "Get Maintenance Strategy" : "Calculate Requirements"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {rankUpResult && (
            <div className="space-y-6">
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
                      <div className="text-sm text-gray-600 dark:text-gray-400">Current Rank</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {rankUpResult.currentPoints.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Current Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {rankUpResult.pointsNeeded.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Points Needed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {(rankUpResult.targetPoints + 10).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Required</div>
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
                            <th className="text-left p-3 font-semibold">Competition Name</th>
                            <th className="text-left p-3 font-semibold">Country/Region</th>
                            <th className="text-left p-3 font-semibold">Date</th>
                            <th className="text-center p-3 font-semibold">Points Available</th>
                            <th className="text-center p-3 font-semibold">Cumulative Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankUpResult.suggestedCompetitions.map((comp) => (
                            <tr key={comp.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Medal className="h-4 w-4 text-gold" />
                                  <div>
                                    <div className="font-medium">{comp.name}</div>
                                    {comp.gradeLevel && (
                                      <Badge variant="secondary" className="text-xs mt-1">
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
                                      <div className="text-sm text-gray-500">{comp.city}</div>
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
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  {comp.pointsAvailable} pts
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="font-semibold text-blue-600 dark:text-blue-400">
                                  {comp.cumulativePoints ?? 0} pts
                                </div>
                                {(comp.cumulativePoints ?? 0) >= rankUpResult.pointsNeeded && (
                                  <Badge variant="default" className="text-xs mt-1">
                                    <Star className="h-3 w-3 mr-1" />
                                    Sufficient
                                  </Badge>
                                )}
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
                      <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">Strategy Overview</h4>
                      <p className="text-gray-700 dark:text-gray-300">{rankUpResult.aiRecommendations.strategy}</p>
                    </div>

                    {/* Priority Competitions */}
                    {rankUpResult.aiRecommendations.priorityCompetitions && rankUpResult.aiRecommendations.priorityCompetitions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">Priority Competitions</h4>
                        <div className="space-y-3">
                          {rankUpResult.aiRecommendations.priorityCompetitions.map((comp, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{comp.name}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {comp.points} points
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(comp.startDate)}
                                  {comp.endDate && comp.endDate !== comp.startDate && (
                                    <> - {formatDate(comp.endDate)}</>
                                  )}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{comp.reasoning}</p>
                              <div className="text-sm text-purple-600 dark:text-purple-400">
                                <strong>Required Performance:</strong> {comp.rank_needed}
                              </div>
                            </div>
                          ))}
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
                        <p className="text-gray-700 dark:text-gray-300">{rankUpResult.aiRecommendations.timelineToTarget}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">Risk Assessment</h4>
                        <p className="text-gray-700 dark:text-gray-300">{rankUpResult.aiRecommendations.riskAssessment}</p>
                      </div>
                    </div>

                    {/* Alternative Strategies */}
                    {rankUpResult.aiRecommendations.alternativeStrategies && rankUpResult.aiRecommendations.alternativeStrategies.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400">Alternative Strategies</h4>
                        <ul className="space-y-2">
                          {rankUpResult.aiRecommendations.alternativeStrategies.map((strategy, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                              <span className="text-gray-700 dark:text-gray-300">{strategy}</span>
                            </li>
                          ))}
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
                          {rankUpResult.aiRecommendations.totalPointsFromRecommendations} points
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
                      <li>• Calculates points needed to exceed by 10+ points</li>
                      <li>• Suggests optimal competition combinations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Competition Selection</h4>
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