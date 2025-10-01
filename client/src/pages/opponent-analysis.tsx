import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Filter
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { useAthlete } from "@/lib/athlete-context";
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
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { selectedAthleteId } = useAthlete();

  const { data: athlete } = useQuery<Athlete>({
    queryKey: [`/api/athletes/${selectedAthleteId}`],
    enabled: !!selectedAthleteId,
  });

  const { data: opponents, isLoading: opponentsLoading } = useQuery<(Athlete & { worldRank?: number; olympicRank?: number })[]>({
    queryKey: [`/api/athletes/${selectedAthleteId}/opponents`, showAllWeightClass],
    enabled: !!selectedAthleteId,
    queryFn: async () => {
      const endpoint = showAllWeightClass 
        ? `/api/athletes/${selectedAthleteId}/opponents/all-weight-class`
        : `/api/athletes/${selectedAthleteId}/opponents`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch opponents');
      return response.json();
    }
  });

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

  const handleOpponentSelect = (opponentId: string) => {
    setSelectedOpponent(opponentId);
  };

  const selectedOpponentData = opponents?.find((o) => o.id.toString() === selectedOpponent);

  // Show athlete selector if no athlete is selected
  if (!selectedAthleteId) {
    return (
      <div className="min-h-screen">
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
            
            <Select value={selectedOpponent} onValueChange={handleOpponentSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an opponent to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {opponents && (opponents as any[]).map((opponent) => (
                  <SelectItem key={opponent.id} value={opponent.id.toString()}>
                    <span className="block sm:hidden">
                      {opponent.name} {opponent.worldCategory && opponent.olympicCategory ? 
                        `(${opponent.worldCategory}/${opponent.olympicCategory})` : 
                        `(${opponent.worldCategory || opponent.olympicCategory})`}
                    </span>
                    <span className="hidden sm:block">
                      {opponent.name} - #{opponent.worldRank || 'NR'} ({opponent.nationality}) {opponent.worldCategory && opponent.olympicCategory ? 
                        `[${opponent.worldCategory}/${opponent.olympicCategory}]` : 
                        `[${opponent.worldCategory || opponent.olympicCategory}]`}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Opponent Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Opponent Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-lg">{selectedOpponentData.name}</h3>
                  <p className="text-gray-600">{selectedOpponentData.nationality}</p>
                  <Badge variant="outline" className="mt-2">
                    World Rank #{selectedOpponentData.worldRank}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Threat Level:</span>
                    <Badge variant={selectedOpponentData.threatLevel === 'High' ? 'destructive' : 'secondary'}>
                      {selectedOpponentData.threatLevel}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Weight Class:</span>
                    <span className="text-sm font-medium">
                      {selectedOpponentData.worldCategory && selectedOpponentData.olympicCategory ? 
                        `${selectedOpponentData.worldCategory} / ${selectedOpponentData.olympicCategory}` : 
                        selectedOpponentData.worldCategory || selectedOpponentData.olympicCategory || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Playing Style:</span>
                    <span className="text-sm font-medium">{selectedOpponentData.playingStyle || 'Unknown'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Win Probability */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    AI Win Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="text-4xl font-bold text-green-600">
                      {analysis.winProbability}%
                    </div>
                    <Progress value={analysis.winProbability} className="w-full" />
                    <p className="text-sm text-gray-600">
                      Based on performance data, fighting styles, and historical patterns
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Strategy Summary */}
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
                    {analysis.keyStrategyPoints.slice(0, 3).map((point, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{point}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
                <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4">
                  <TabsTrigger value="tactical" className="h-8 py-0 leading-none data-[state=active]:shadow-none px-1 sm:px-3 text-xs sm:text-sm text-center">Tactics</TabsTrigger>
                  <TabsTrigger value="weaknesses" className="h-8 py-0 leading-none data-[state=active]:shadow-none px-1 sm:px-3 text-xs sm:text-sm text-center">Weaknesses</TabsTrigger>
                  <TabsTrigger value="technical" className="h-8 py-0 leading-none data-[state=active]:shadow-none px-1 sm:px-3 text-xs sm:text-sm text-center">Technical</TabsTrigger>
                  <TabsTrigger value="mental" className="h-8 py-0 leading-none data-[state=active]:shadow-none px-1 sm:px-3 text-xs sm:text-sm text-center">Mental</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tactical" className="mt-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Tactical Recommendations
                    </h4>
                    <div className="grid gap-3">
                      {analysis.tacticalRecommendations.map((rec, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="weaknesses" className="mt-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Weakness Exploitation
                    </h4>
                    <div className="grid gap-3">
                      {analysis.weaknessExploitation.map((weakness, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <p className="text-sm">{weakness}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="technical" className="mt-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Technical Focus Areas
                    </h4>
                    <div className="grid gap-3">
                      {analysis.technicalFocus.map((focus, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <p className="text-sm">{focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="mental" className="mt-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Mental Preparation
                    </h4>
                    <div className="grid gap-3">
                      {analysis.mentalPreparation.map((prep, index) => (
                        <div key={index} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
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