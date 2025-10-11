import { useState, useMemo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
  Target,
  TrendingUp
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
}

interface ClipAnalysisResult {
  id: number;
  analysisType: string;
  userRequest: string;
  sport: string;
  language: string;
  analysis: string;
  processedAt: string;
  processingTimeMs: number;
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
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

// Video Player Section Component
function VideoPlayerSection({ matchResult }: { matchResult: MatchAnalysisResult }) {
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  
  // Get full player stats (final totals)
  const bluePlayer = matchResult.score_analysis?.players?.[0];
  const redPlayer = matchResult.score_analysis?.players?.[1];
  const blueKicks = matchResult.kick_count_analysis?.players?.[0];
  const redKicks = matchResult.kick_count_analysis?.players?.[1];
  const blueViolations = matchResult.yellow_card_analysis?.players?.[0];
  const redViolations = matchResult.yellow_card_analysis?.players?.[1];

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
      type: 'score' | 'kick' | 'punch' | 'violation';
      player?: string;
    }> = [];

    // Extract score events
    matchResult.score_analysis?.players?.forEach(player => {
      player.events?.forEach(event => {
        events.push({
          timestamp: event.timestamp,
          description: event.description,
          type: 'score',
          player: player.name
        });
      });
    });

    // Extract punch events
    matchResult.punch_analysis?.players?.forEach(player => {
      player.events?.forEach(event => {
        events.push({
          timestamp: event.timestamp,
          description: event.description,
          type: 'punch',
          player: player.name
        });
      });
    });

    // Extract kick events
    matchResult.kick_count_analysis?.players?.forEach(player => {
      player.events?.forEach(event => {
        events.push({
          timestamp: event.timestamp,
          description: event.description,
          type: 'kick',
          player: player.name
        });
      });
    });

    // Extract violation events
    matchResult.yellow_card_analysis?.players?.forEach(player => {
      player.events?.forEach(event => {
        events.push({
          timestamp: event.timestamp,
          description: event.description,
          type: 'violation',
          player: player.name
        });
      });
    });

    return events;
  }, [matchResult]);

  // Calculate dynamic counters based on video playback
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
    blueScoreEvents.forEach(event => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        blueScore += event.value || 1;
      }
    });

    redScoreEvents.forEach(event => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        redScore += event.value || 1;
      }
    });

    // Count kicks
    blueKickEvents.forEach(event => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        blueKicksCount += event.value || 1;
      }
    });

    redKickEvents.forEach(event => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        redKicksCount += event.value || 1;
      }
    });

    // Count violations
    blueViolationEvents.forEach(event => {
      const eventTime = timeToSeconds(event.timestamp);
      if (eventTime <= currentVideoTime) {
        blueWarnings += event.value || 1;
      }
    });

    redViolationEvents.forEach(event => {
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
  }, [hasStartedPlaying, currentVideoTime, bluePlayer, redPlayer, blueKicks, redKicks, blueViolations, redViolations]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600">
        <CardTitle className="text-white text-2xl">Match Analysis Results</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-0">
          {/* Blue Player Stats (Left) */}
          <div className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-6 flex flex-col justify-center gap-6 border-r border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 tracking-wider">BLUE SCORE</div>
              <div className="text-6xl font-bold text-blue-600 dark:text-blue-500" data-testid="score-blue">
                {dynamicStats.blueScore}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 tracking-wider">TOTAL KICKS</div>
              <div className="text-4xl font-bold text-blue-500 dark:text-blue-300" data-testid="kicks-blue">
                {dynamicStats.blueKicksCount}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2 tracking-wider">WARNINGS</div>
              <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-500" data-testid="warnings-blue">
                {dynamicStats.blueWarnings}
              </div>
            </div>
          </div>

          {/* Video Player (Center) */}
          <div className="bg-black flex items-center justify-center">
            <VideoPlayerWithMarkers
              videoUrl={`/api/video-analysis/${matchResult.id}/video`}
              events={timelineEvents}
              onPlayStateChange={handlePlayStateChange}
              onTimeUpdate={setCurrentVideoTime}
              data-testid="video-player-section"
            />
          </div>

          {/* Red Player Stats (Right) */}
          <div className="bg-gradient-to-b from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 p-6 flex flex-col justify-center gap-6 border-l border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 tracking-wider">RED SCORE</div>
              <div className="text-6xl font-bold text-red-600 dark:text-red-500" data-testid="score-red">
                {dynamicStats.redScore}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 tracking-wider">TOTAL KICKS</div>
              <div className="text-4xl font-bold text-red-500 dark:text-red-300" data-testid="kicks-red">
                {dynamicStats.redKicksCount}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2 tracking-wider">WARNINGS</div>
              <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-500" data-testid="warnings-red">
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
  const [analysisType, setAnalysisType] = useState<"match" | "clip">("match");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [round, setRound] = useState<string>("entire-match");
  const [clipRequest, setClipRequest] = useState("");
  const [matchResult, setMatchResult] = useState<MatchAnalysisResult | null>(null);
  const [clipResult, setClipResult] = useState<ClipAnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeVideoMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: "match" | "clip" }) => {
      const formData = new FormData();
      formData.append('video', file);
      
      if (type === 'match') {
        if (round && round !== 'entire-match') {
          formData.append('round', round);
        }
        const response = await fetch('/api/video-analysis/match', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to analyze video');
        }
        
        return { type: 'match', data: await response.json() };
      } else {
        if (!clipRequest) {
          throw new Error('Please describe what you want to analyze');
        }
        formData.append('whatToAnalyze', clipRequest);
        
        const response = await fetch('/api/video-analysis/clip', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to analyze video clip');
        }
        
        return { type: 'clip', data: await response.json() };
      }
    },
    onSuccess: (result) => {
      if (result.type === 'match') {
        setMatchResult(result.data);
      } else {
        setClipResult(result.data);
      }
      toast({
        title: "Analysis Complete",
        description: "Video has been successfully analyzed",
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
    analyzeVideoMutation.mutate({ file: videoFile, type: analysisType });
  };

  const handleReset = () => {
    setVideoFile(null);
    setRound("entire-match");
    setClipRequest("");
    setMatchResult(null);
    setClipResult(null);
  };

  return (
    <>
      <Header 
        title="Match Analysis" 
        description="AI-powered video match analysis"
      />
      
      <div className="p-6 space-y-6">
        {/* Analysis Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Video Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Analysis Type Tabs */}
            <Tabs value={analysisType} onValueChange={(v) => setAnalysisType(v as "match" | "clip")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="match" data-testid="tab-match-analysis">
                  Match Analysis
                </TabsTrigger>
                <TabsTrigger value="clip" data-testid="tab-clip-analysis">
                  Clip Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="match" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="video-file">Video File (MP4, max 500MB)</Label>
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
                      Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="round">Round (Optional)</Label>
                  <Select value={round} onValueChange={setRound} disabled={analyzeVideoMutation.isPending}>
                    <SelectTrigger data-testid="select-round">
                      <SelectValue placeholder="Analyze entire match" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entire-match">Entire Match</SelectItem>
                      <SelectItem value="no-rounds">No Rounds</SelectItem>
                      {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>Round {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="clip" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="clip-video-file">Video File (MP4, max 500MB)</Label>
                  <Input
                    id="clip-video-file"
                    type="file"
                    accept="video/mp4"
                    onChange={handleFileChange}
                    disabled={analyzeVideoMutation.isPending}
                    data-testid="input-clip-video-file"
                  />
                  {videoFile && (
                    <p className="text-sm text-gray-500">
                      Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clip-request">What would you like to analyze?</Label>
                  <Textarea
                    id="clip-request"
                    placeholder="e.g., Analyze my spinning hook kick technique"
                    value={clipRequest}
                    onChange={(e) => setClipRequest(e.target.value)}
                    disabled={analyzeVideoMutation.isPending}
                    rows={3}
                    data-testid="textarea-clip-request"
                  />
                </div>
              </TabsContent>
            </Tabs>

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
              {(matchResult || clipResult || videoFile) && (
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
            {matchResult.id && (
              <VideoPlayerSection matchResult={matchResult} />
            )}

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
                    <div className="text-gray-700 dark:text-gray-300" data-testid="text-match-analysis">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {matchResult.match_analysis}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  Violations
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
                    <Card key={idx} className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
                      <CardHeader className="bg-blue-100 dark:bg-blue-900/30">
                        <CardTitle className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                          <span>{player.name}</span>
                          <Award className="h-5 w-5 text-blue-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4" data-testid={`score-total-${idx}`}>
                          {player.total} points
                        </div>
                        <div className="space-y-2">
                          {player.events?.map((event, eventIdx) => (
                            <div key={eventIdx} className="flex justify-between items-center p-2 bg-blue-100 dark:bg-blue-900/40 rounded">
                              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{event.timestamp}</span>
                              <span className="text-sm text-blue-600 dark:text-blue-400">{event.description}</span>
                              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">+{event.value}</span>
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
                  {matchResult.punch_analysis?.players?.map((player, idx) => (
                    <Card key={idx} className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20">
                      <CardHeader className="bg-red-100 dark:bg-red-900/30">
                        <CardTitle className="text-red-700 dark:text-red-300">{player.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4" data-testid={`punches-total-${idx}`}>
                          {player.total} punches
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {player.events?.map((event, eventIdx) => (
                            <div key={eventIdx} className="flex justify-between items-center p-2 bg-red-100 dark:bg-red-900/40 rounded text-sm">
                              <span className="font-medium text-red-700 dark:text-red-300">{event.timestamp}</span>
                              <span className="text-red-600 dark:text-red-400">{event.description}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="kicks" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matchResult.kick_count_analysis?.players?.map((player, idx) => (
                    <Card key={idx} className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20">
                      <CardHeader className="bg-red-100 dark:bg-red-900/30">
                        <CardTitle className="text-red-700 dark:text-red-300">{player.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4" data-testid={`kicks-total-${idx}`}>
                          {player.total} kicks
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {player.events?.map((event, eventIdx) => (
                            <div key={eventIdx} className="flex justify-between items-center p-2 bg-red-100 dark:bg-red-900/40 rounded text-sm">
                              <span className="font-medium text-red-700 dark:text-red-300">{event.timestamp}</span>
                              <span className="text-red-600 dark:text-red-400">{event.description}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="violations" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matchResult.yellow_card_analysis?.players?.map((player, idx) => (
                    <Card key={idx} className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/20">
                      <CardHeader className="bg-yellow-100 dark:bg-yellow-900/30">
                        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                          {player.name}
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-4" data-testid={`violations-total-${idx}`}>
                          {player.total} violations
                        </div>
                        <div className="space-y-2">
                          {player.events?.map((event, eventIdx) => (
                            <div key={eventIdx} className="flex justify-between items-center p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-sm">
                              <span className="font-medium text-yellow-700 dark:text-yellow-300">{event.timestamp}</span>
                              <span className="text-yellow-600 dark:text-yellow-400">{event.description}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="advice" className="mt-6">
                <div className="grid grid-cols-1 gap-6">
                  {matchResult.advice_analysis?.players?.map((player, idx) => {
                    const isBlue = idx === 0;
                    const playerColor = isBlue ? 'text-blue-600 dark:text-blue-300' : 'text-red-600 dark:text-red-300';
                    const borderColor = isBlue ? 'border-blue-200 dark:border-blue-800' : 'border-red-200 dark:border-red-800';
                    const bgColor = isBlue ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'bg-red-50/50 dark:bg-red-950/20';
                    const headerBg = isBlue ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30';
                    
                    return (
                      <Card key={idx} className={`${borderColor} ${bgColor} border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20`}>
                        <CardHeader className="bg-indigo-100 dark:bg-indigo-900/30">
                          <CardTitle className={`flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xl font-bold`}>
                            <Target className="h-6 w-6" />
                            {player.name} - Coaching Advice
                          </CardTitle>
                        </CardHeader>
                      <CardContent className="space-y-6 pt-6">
                        {/* Tactical Advice */}
                        <div className="p-4 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-lg">
                          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                            <TrendingUp className="h-4 w-4" />
                            Tactical
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded">
                              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Issues:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                                {player.tactical_advice?.issues?.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Improvements:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                                {player.tactical_advice?.improvements?.map((imp, i) => (
                                  <li key={i}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Technical Advice */}
                        <div className="p-4 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-lg">
                          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                            <Activity className="h-4 w-4" />
                            Technical
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded">
                              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Issues:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                                {player.technical_advice?.issues?.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Improvements:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                                {player.technical_advice?.improvements?.map((imp, i) => (
                                  <li key={i}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Mental Advice */}
                        <div className="p-4 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-lg">
                          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                            <BarChart3 className="h-4 w-4" />
                            Mental
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded">
                              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Issues:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                                {player.mental_advice?.issues?.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Improvements:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                                {player.mental_advice?.improvements?.map((imp, i) => (
                                  <li key={i}>{imp}</li>
                                ))}
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

        {/* Clip Analysis Results */}
        {clipResult && !analyzeVideoMutation.isPending && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Coaching Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Your Request: {clipResult.userRequest}
                </p>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="text-gray-700 dark:text-gray-300" data-testid="text-clip-analysis">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {clipResult.analysis}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!matchResult && !clipResult && !analyzeVideoMutation.isPending && (
          <Card>
            <CardContent className="p-12 text-center">
              <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No analysis yet</p>
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
