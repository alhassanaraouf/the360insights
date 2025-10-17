import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Loader2,
  Video,
  BarChart3,
  FileText,
  Activity,
  Award,
  AlertCircle,
  TrendingUp,
  Clock,
  PlayCircle,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VideoPlayerWithMarkers from "@/components/video-player-with-markers";

interface MatchAnalysisResult {
  id: number;
  match_analysis: string;
  score_analysis: PlayerEvents;
  punch_analysis: PlayerEvents;
  kick_count_analysis: PlayerEvents;
  yellow_card_analysis: PlayerEvents;
  advice_analysis: PlayerAdvice;
  sport: string;
  roundAnalyzed: number | null;
  processedAt: string;
  processingTimeMs: number;
  errors: any;
  videoPath?: string;
  // NEW: prefer this if backend provides it; fallback to yellow_card_analysis
  gam_jeom_analysis?: PlayerEvents;
}

interface PlayerEvent {
  timestamp: string;
  description: string;
  value: number;
}

interface Player {
  name: string;
  total: number;
  events: PlayerEvent[];
}

interface PlayerEvents {
  players: Player[];
}

interface AdviceCategory {
  issues: string[];
  improvements: string[];
}

interface PlayerWithAdvice {
  name: string;
  tactical_advice: AdviceCategory;
  technical_advice: AdviceCategory;
  mental_advice: AdviceCategory;
}

interface PlayerAdvice {
  players: PlayerWithAdvice[];
}

// Helper function to convert MM:SS to seconds
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

// Video Player Section Component
function VideoPlayerSection({
  matchResult,
}: {
  matchResult: MatchAnalysisResult;
}) {
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  // Pick source for Gam-jeom analysis
  const gamJeom = matchResult.gam_jeom_analysis || matchResult.yellow_card_analysis;

  // Get full player stats (final totals)
  const bluePlayer = matchResult.score_analysis?.players?.[0];
  const redPlayer = matchResult.score_analysis?.players?.[1];
  const blueKicks = matchResult.kick_count_analysis?.players?.[0];
  const redKicks = matchResult.kick_count_analysis?.players?.[1];
  const blueViolations = gamJeom?.players?.[0];
  const redViolations = gamJeom?.players?.[1];

  // Reset state when viewing a different match analysis
  useEffect(() => {
    setHasStartedPlaying(false);
    setCurrentVideoTime(0);
  }, [matchResult.id]);

  // Handle play state changes
  const handlePlayStateChange = (playing: boolean) => {
    if (playing && !hasStartedPlaying) {
      // First time playing - mark as started
      setHasStartedPlaying(true);
    }
  };

  // Extract all events from analysis data for timeline markers
  // Memoize to ensure stable object references for hover state
  const timelineEvents = useMemo(() => {
    const events: Array<{
      timestamp: string;
      description: string;
      type: "score" | "kick" | "punch" | "violation";
      player?: string;
    }> = [];

    // Extract score events
    matchResult.score_analysis?.players?.forEach((player) => {
      player.events?.forEach((event) => {
        events.push({
          timestamp: event.timestamp,
          description: event.description,
          type: "score",
          player: player.name,
        });
      });
    });

    // Extract punch events
    matchResult.punch_analysis?.players?.forEach((player) => {
      player.events?.forEach((event) => {
        events.push({
          timestamp: event.timestamp,
          description: event.description,
          type: "punch",
          player: player.name,
        });
      });
    });

    // Extract kick events
    matchResult.kick_count_analysis?.players?.forEach((player) => {
      player.events?.forEach((event) => {
        events.push({
          timestamp: event.timestamp,
          description: event.description,
          type: "kick",
          player: player.name,
        });
      });
    });

    // Extract violation events (Gam-jeom)
    gamJeom?.players?.forEach((player) => {
      player.events?.forEach((event) => {
        events.push({
          timestamp: event.timestamp,
          description: event.description,
          type: "violation",
          player: player.name,
        });
      });
    });

    return events;
  }, [matchResult, gamJeom]);

  // Calculate dynamic stats based on video playback
  const dynamicStats = useMemo(() => {
    if (!hasStartedPlaying) {
      // Show full results when video hasn't been played yet
      return {
        blueScore: bluePlayer?.total || 0,
        redScore: redPlayer?.total || 0,
        blueKicksCount: blueKicks?.total || 0,
        redKicksCount: redKicks?.total || 0,
        blueWarnings: blueViolations?.total || 0,
        redWarnings: redViolations?.total || 0,
      };
    }

    // Once playing has started, count events up to current time
    let blueScore = 0;
    let redScore = 0;
    let blueKicksCount = 0;
    let redKicksCount = 0;
    let blueWarnings = 0;
    let redWarnings = 0;

    // Get events with their values from the original data
    const blueScoreEvents = bluePlayer?.events || [];
    const redScoreEvents = redPlayer?.events || [];
    const blueKickEvents = blueKicks?.events || [];
    const redKickEvents = redKicks?.events || [];
    const blueViolationEvents = blueViolations?.events || [];
    const redViolationEvents = redViolations?.events || [];

    // Calculate scores based on actual event values up to current time
    blueScoreEvents.forEach((event) => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        blueScore += event.value || 1;
      }
    });

    redScoreEvents.forEach((event) => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        redScore += event.value || 1;
      }
    });

    // Count kicks
    blueKickEvents.forEach((event) => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        blueKicksCount += event.value || 1;
      }
    });

    redKickEvents.forEach((event) => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        redKicksCount += event.value || 1;
      }
    });

    // Count violations
    blueViolationEvents.forEach((event) => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        blueWarnings += event.value || 1;
      }
    });

    redViolationEvents.forEach((event) => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        redWarnings += event.value || 1;
      }
    });

    return {
      blueScore,
      redScore,
      blueKicksCount,
      redKicksCount,
      blueWarnings,
      redWarnings,
    };
  }, [
    hasStartedPlaying,
    currentVideoTime,
    bluePlayer,
    redPlayer,
    blueKicks,
    redKicks,
    blueViolations,
    redViolations,
  ]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Match Analysis Results
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-0">
          {/* Blue Player Stats (Left) */}
          <div className="p-4 flex flex-col justify-center gap-4 border-r border-gray-200 dark:border-gray-700">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                BLUE SCORE
              </div>
              <div
                className="text-5xl font-bold text-blue-600 dark:text-blue-400"
                data-testid="score-blue"
              >
                {dynamicStats.blueScore}
              </div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                TOTAL KICKS
              </div>
              <div
                className="text-3xl font-bold text-blue-600 dark:text-blue-400"
                data-testid="kicks-blue"
              >
                {dynamicStats.blueKicksCount}
              </div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                GAM-JEOM
              </div>
              <div
                className="text-3xl font-bold text-yellow-600 dark:text-yellow-400"
                data-testid="warnings-blue"
              >
                {dynamicStats.blueWarnings}
              </div>
            </div>
          </div>

          {/* Video Player (Center) */}
          <div className="bg-white dark:bg-slate-900/30 flex items-center justify-center p-4">
            <VideoPlayerWithMarkers
              videoUrl={`/api/video-analysis/${matchResult.id}/video`}
              events={timelineEvents}
              onPlayStateChange={handlePlayStateChange}
              onTimeUpdate={setCurrentVideoTime}
              data-testid="video-player-section"
            />
          </div>

          {/* Red Player Stats (Right) */}
          <div className="p-4 flex flex-col justify-center gap-4 border-l border-gray-200 dark:border-gray-700">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                RED SCORE
              </div>
              <div
                className="text-5xl font-bold text-red-600 dark:text-red-400"
                data-testid="score-red"
              >
                {dynamicStats.redScore}
              </div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                TOTAL KICKS
              </div>
              <div
                className="text-3xl font-bold text-red-600 dark:text-red-400"
                data-testid="kicks-red"
              >
                {dynamicStats.redKicksCount}
              </div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                GAM-JEOM
              </div>
              <div
                className="text-3xl font-bold text-yellow-600 dark:text-yellow-400"
                data-testid="warnings-red"
              >
                {dynamicStats.redWarnings}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MatchAnalysis() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [matchResult, setMatchResult] = useState<MatchAnalysisResult | null>(
    null,
  );
  const { toast } = useToast();

  // Fetch previous analyses
  const { data: previousAnalyses, isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ['/api/video-analysis/history'],
  });

  // Debug: Log the actual data structure
  useEffect(() => {
    console.log('All previous analyses:', previousAnalyses);
    if (previousAnalyses && previousAnalyses.length > 0) {
      console.log('Previous analyses data:', previousAnalyses[0]);
      console.log('Analysis type:', previousAnalyses[0].analysis_type);
      console.log('Processed at:', previousAnalyses[0].processed_at);
      const matchOnly = previousAnalyses.filter((a: any) => a.analysis_type === 'match');
      console.log('Match analyses only:', matchOnly);
      console.log('Match count:', matchOnly.length);
    }
  }, [previousAnalyses]);

  const deleteAnalysisMutation = useMutation({
    mutationFn: async (analysisId: number) => {
      const response = await fetch(`/api/video-analysis/${analysisId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete analysis");
      }

      return analysisId;
    },
    onSuccess: () => {
      toast({
        title: "Analysis Deleted",
        description: "Video analysis has been successfully deleted",
      });
      // Invalidate and refetch the history
      queryClient.invalidateQueries({ queryKey: ['/api/video-analysis/history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete analysis",
        variant: "destructive",
      });
    },
  });

  const analyzeVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch("/api/video-analysis/match", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to analyze video");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setMatchResult(data);
      toast({
        title: "Analysis Complete",
        description: "Match video has been successfully analyzed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze video",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Video file must be under 500MB",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const handleAnalyze = () => {
    if (!videoFile) {
      toast({
        title: "No File Selected",
        description: "Please select a video file to analyze",
        variant: "destructive",
      });
      return;
    }
    analyzeVideoMutation.mutate(videoFile);
  };

  const handleReset = () => {
    setVideoFile(null);
    setMatchResult(null);
  };

  const loadPreviousAnalysis = (analysis: any) => {
    console.log('Loading previous analysis:', analysis);
    
    // Parse JSON strings if needed
    const parseIfString = (data: any) => {
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          console.error('Error parsing JSON:', e);
          return data;
        }
      }
      return data;
    };

    const parsedResult = {
      id: analysis.id,
      match_analysis: analysis.matchAnalysis || analysis.match_analysis,
      score_analysis: parseIfString(analysis.scoreAnalysis || analysis.score_analysis),
      punch_analysis: parseIfString(analysis.punchAnalysis || analysis.punch_analysis),
      kick_count_analysis: parseIfString(analysis.kickCountAnalysis || analysis.kick_count_analysis),
      yellow_card_analysis: parseIfString(analysis.yellowCardAnalysis || analysis.yellow_card_analysis),
      advice_analysis: parseIfString(analysis.adviceAnalysis || analysis.advice_analysis),
      sport: analysis.sport,
      roundAnalyzed: analysis.roundAnalyzed || analysis.round_analyzed,
      processedAt: analysis.processedAt || analysis.processed_at,
      processingTimeMs: analysis.processingTimeMs || analysis.processing_time_ms,
      errors: analysis.errors,
      videoPath: analysis.videoPath || analysis.video_path,
    };

    console.log('Parsed result:', parsedResult);
    setMatchResult(parsedResult);
  };

  const getPlayerNames = (analysis: any) => {
    const analysisType = analysis.analysisType || analysis.analysis_type;
    if (analysisType === 'match') {
      try {
        const rawScore = analysis.scoreAnalysis ?? analysis.score_analysis;
        const scoreData = typeof rawScore === 'string' ? JSON.parse(rawScore) : rawScore;

        if (scoreData?.players && scoreData.players.length >= 2) {
          const p1 = scoreData.players[0]?.name?.trim() || 'Unknown';
          const p2 = scoreData.players[1]?.name?.trim() || 'Unknown';
          return `${p1} vs ${p2}`;
        }
      } catch (e) {
        console.error('Error parsing score analysis:', e);
      }
    }
    return 'Video Analysis';
  };

  const getAnalysisDate = (analysis: any) => {
    const date = analysis.processedAt || analysis.processed_at;
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <Header
        title="Match Analysis"
        description="AI-powered video match analysis"
      />

      <div className="p-6 space-y-6">
        {/* Previous Analyses Section */}
        {previousAnalyses && previousAnalyses.filter((a: any) => (a.analysisType || a.analysis_type) === 'match').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Previous Match Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previousAnalyses
                ?.filter((a: any) => (a.analysisType || a.analysis_type) === 'match')
                .sort((a: any, b: any) => 
                  new Date(b.processedAt || b.processed_at || b.createdAt || b.created_at).getTime() - 
                  new Date(a.processedAt || a.processed_at || a.createdAt || a.created_at).getTime()
                )
                .map((analysis: any) => (
                  <Card
                    key={analysis.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow relative group"
                    data-testid={`previous-analysis-${analysis.id}`}
                  >
                    <CardContent className="p-4" onClick={() => loadPreviousAnalysis(analysis)}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <PlayCircle className="h-10 w-10 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {getPlayerNames(analysis)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {getAnalysisDate(analysis)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnalysisMutation.mutate(analysis.id);
                      }}
                      data-testid={`delete-analysis-${analysis.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Match Analysis Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Match Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="video-file">
                Video File (MP4, max 500MB)
              </Label>
              <Input
                id="video-file"
                type="file"
                accept="video/mp4"
                onChange={handleFileChange}
                disabled={analyzeVideoMutation.isPending}
                data-testid="input-video-file"
              />
              {videoFile && (
                <p className="text-sm text-gray-500">
                  Selected: {videoFile.name} (
                  {(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={analyzeVideoMutation.isPending || !videoFile}
                className="flex-1"
                data-testid="button-analyze"
              >
                {analyzeVideoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Analyze Video
                  </>
                )}
              </Button>
              {(matchResult || videoFile) && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={analyzeVideoMutation.isPending}
                  data-testid="button-reset"
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {analyzeVideoMutation.isPending && (
          <Card>
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">Analyzing video...</p>
                  <p className="text-sm text-gray-500">
                    This may take 4-7 minutes depending on video length
                  </p>
                </div>
                <Progress value={50} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match Analysis Results */}
        {matchResult && !analyzeVideoMutation.isPending && (
          <div className="space-y-6">
            {/* Video Player with Stats */}
            {matchResult.id && <VideoPlayerSection matchResult={matchResult} />}

            {matchResult.match_analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Match Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                      <div
                        className="text-gray-700 dark:text-gray-300"
                        data-testid="text-match-analysis"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {matchResult.match_analysis}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="scores" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <TabsTrigger
                  value="scores"
                  data-testid="tab-scores"
                  className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:dark:bg-blue-900/50 data-[state=active]:dark:text-blue-300 data-[state=active]:font-semibold"
                >
                  Scores
                </TabsTrigger>
                <TabsTrigger
                  value="punches"
                  data-testid="tab-punches"
                  className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=active]:dark:bg-red-900/50 data-[state=active]:dark:text-red-300 data-[state=active]:font-semibold"
                >
                  Punches
                </TabsTrigger>
                <TabsTrigger
                  value="kicks"
                  data-testid="tab-kicks"
                  className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=active]:dark:bg-red-900/50 data-[state=active]:dark:text-red-300 data-[state=active]:font-semibold"
                >
                  Kicks
                </TabsTrigger>
                <TabsTrigger
                  value="violations"
                  data-testid="tab-violations"
                  className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700 data-[state=active]:dark:bg-yellow-900/50 data-[state=active]:dark:text-yellow-300 data-[state=active]:font-semibold"
                >
                  Gam-jeom
                </TabsTrigger>
                <TabsTrigger
                  value="advice"
                  data-testid="tab-advice"
                  className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:dark:bg-indigo-900/50 data-[state=active]:dark:text-indigo-300 data-[state=active]:font-semibold"
                >
                  Advice
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scores" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matchResult.score_analysis?.players?.map((player, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {player.name
                            .toLowerCase()
                            .split(" ")
                            .map(
                              (word: string) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ")}
                          <span
                            className={`text-sm font-medium px-2 py-0.5 rounded ${idx === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}
                          >
                            {idx === 0 ? "blue" : "red"}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div
                          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                          data-testid={`score-total-${idx}`}
                        >
                          {player.total} points
                        </div>
                        <div className="space-y-2">
                          {player.events?.map((event, eventIdx) => (
                            <div
                              key={eventIdx}
                              className={`flex justify-between items-center p-2 rounded ${idx === 0 ? "bg-blue-100 dark:bg-blue-900/40" : "bg-red-100 dark:bg-red-900/40"}`}
                            >
                              <span
                                className={`text-sm font-medium ${idx === 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}
                              >
                                {event.timestamp}
                              </span>
                              <span
                                className={`text-sm ${idx === 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {event.description}
                              </span>
                              <span
                                className={`text-sm font-bold ${idx === 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}
                              >
                                +{event.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="punches" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matchResult.punch_analysis?.players?.map((player, idx) => {
                    // Use player name from score_analysis for consistency
                    const playerName = matchResult.score_analysis?.players?.[idx]?.name || player.name;
                    
                    return (
                      <Card key={idx}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {playerName
                              .toLowerCase()
                              .split(" ")
                              .map(
                                (word: string) =>
                                  word.charAt(0).toUpperCase() + word.slice(1),
                              )
                              .join(" ")}
                            <span
                              className={`text-sm font-medium px-2 py-0.5 rounded ${idx === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}
                            >
                              {idx === 0 ? "blue" : "red"}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div
                            className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                            data-testid={`punches-total-${idx}`}
                          >
                            {player.total} punches
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {player.events?.map((event, eventIdx) => (
                              <div
                                key={eventIdx}
                                className={`flex justify-between items-center p-2 rounded text-sm ${idx === 0 ? "bg-blue-100 dark:bg-blue-900/40" : "bg-red-100 dark:bg-red-900/40"}`}
                              >
                                <span
                                  className={`font-medium ${idx === 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}
                                >
                                  {event.timestamp}
                                </span>
                                <span
                                  className={
                                    idx === 0
                                      ? "text-blue-600 dark:text-blue-400"
                                      : "text-red-600 dark:text-red-400"
                                  }
                                >
                                  {event.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="kicks" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matchResult.kick_count_analysis?.players?.map(
                    (player, idx) => {
                      // Use player name from score_analysis for consistency
                      const playerName = matchResult.score_analysis?.players?.[idx]?.name || player.name;
                      
                      return (
                        <Card key={idx}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              {playerName
                                .toLowerCase()
                                .split(" ")
                                .map(
                                  (word: string) =>
                                    word.charAt(0).toUpperCase() + word.slice(1),
                                )
                                .join(" ")}
                              <span
                                className={`text-sm font-medium px-2 py-0.5 rounded ${idx === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}
                              >
                                {idx === 0 ? "blue" : "red"}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div
                              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                              data-testid={`kicks-total-${idx}`}
                            >
                              {player.total} kicks
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {player.events?.map((event, eventIdx) => (
                                <div
                                  key={eventIdx}
                                  className={`flex justify-between items-center p-2 rounded text-sm ${idx === 0 ? "bg-blue-100 dark:bg-blue-900/40" : "bg-red-100 dark:bg-red-900/40"}`}
                                >
                                  <span
                                    className={`font-medium ${idx === 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}
                                  >
                                    {event.timestamp}
                                  </span>
                                  <span
                                    className={
                                      idx === 0
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-red-600 dark:text-red-400"
                                    }
                                  >
                                    {event.description}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    },
                  )}
                </div>
              </TabsContent>

              <TabsContent value="violations" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(gamJeom?.players ?? []).slice().reverse().map(
                    (player, idx) => {
                      // keep name alignment with score_analysis (accounting for reverse)
                      const totalPlayers = gamJeom?.players?.length ?? 0;
                      const scoreIdx = totalPlayers ? totalPlayers - 1 - idx : idx;
                      const playerName = matchResult.score_analysis?.players?.[scoreIdx]?.name || player.name;

                      return (
                        <Card key={idx}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              {playerName
                                .toLowerCase()
                                .split(" ")
                                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(" ")}
                              <span
                                className={`text-sm font-medium px-2 py-0.5 rounded ${idx === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}
                              >
                                {idx === 0 ? "blue" : "red"}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div
                              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                              data-testid={`violations-total-${idx}`}
                            >
                              {player.total} gam-jeom
                            </div>
                            <div className="space-y-2">
                              {player.events?.map((event, eventIdx) => (
                                <div
                                  key={eventIdx}
                                  className={`flex justify-between items-center p-2 rounded text-sm ${idx === 0 ? "bg-blue-100 dark:bg-blue-900/40" : "bg-red-100 dark:bg-red-900/40"}`}
                                >
                                  <span className={`font-medium ${idx === 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}>
                                    {event.timestamp}
                                  </span>
                                  <span className={idx === 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}>
                                    {event.description}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    },
                  )}
                </div>
              </TabsContent>

              <TabsContent value="advice" className="mt-6">
                <div className="grid grid-cols-1 gap-6">
                  {matchResult.advice_analysis?.players?.map((player, idx) => {
                    const isBlue = idx === 0;
                    const playerColor = isBlue
                      ? "text-blue-600 dark:text-blue-300"
                      : "text-red-600 dark:text-red-300";
                    
                    // Use player name from score_analysis for consistency
                    const playerName = matchResult.score_analysis?.players?.[idx]?.name || player.name;

                    return (
                      <Card key={idx}>
                        <CardHeader className="pb-3">
                          <CardTitle
                            className={`flex items-center gap-2 ${playerColor} text-lg font-bold`}
                          >
                            <Award className="h-5 w-5" />
                            {playerName
                              .toLowerCase()
                              .split(" ")
                              .map(
                                (word: string) =>
                                  word.charAt(0).toUpperCase() + word.slice(1),
                              )
                              .join(" ")}
                            <span
                              className={`text-sm font-medium px-2 py-0.5 rounded ${idx === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}
                            >
                              {idx === 0 ? "blue" : "red"}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 font-normal">
                              - Coaching Advice
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Tactical Advice */}
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                              <TrendingUp className="h-4 w-4" />
                              Tactical
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                                  Issues:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {player.tactical_advice?.issues?.map(
                                    (issue, i) => <li key={i}>{issue}</li>,
                                  )}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                  Improvements:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {player.tactical_advice?.improvements?.map(
                                    (imp, i) => <li key={i}>{imp}</li>,
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Technical Advice */}
                          <div className="space-y-3 pt-2 border-t">
                            <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                              <Activity className="h-4 w-4" />
                              Technical
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                                  Issues:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {player.technical_advice?.issues?.map(
                                    (issue, i) => <li key={i}>{issue}</li>,
                                  )}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                  Improvements:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {player.technical_advice?.improvements?.map(
                                    (imp, i) => <li key={i}>{imp}</li>,
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Mental Advice */}
                          <div className="space-y-3 pt-2 border-t">
                            <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                              <BarChart3 className="h-4 w-4" />
                              Mental
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                                  Issues:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {player.mental_advice?.issues?.map(
                                    (issue, i) => <li key={i}>{issue}</li>,
                                  )}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                  Improvements:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {player.mental_advice?.improvements?.map(
                                    (imp, i) => <li key={i}>{imp}</li>,
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty State */}
        {!matchResult && !analyzeVideoMutation.isPending && (
          <Card>
            <CardContent className="p-12 text-center">
              <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                No analysis yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Upload a video and click "Analyze Video" to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}