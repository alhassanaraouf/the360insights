import { useState } from "react";
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
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-match-analysis">
                      {matchResult.match_analysis}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="scores" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="scores" data-testid="tab-scores">Scores</TabsTrigger>
                <TabsTrigger value="punches" data-testid="tab-punches">Punches</TabsTrigger>
                <TabsTrigger value="kicks" data-testid="tab-kicks">Kicks</TabsTrigger>
                <TabsTrigger value="violations" data-testid="tab-violations">Violations</TabsTrigger>
                <TabsTrigger value="advice" data-testid="tab-advice">Advice</TabsTrigger>
              </TabsList>

              <TabsContent value="scores" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matchResult.score_analysis?.players?.map((player, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{player.name}</span>
                          <Award className="h-5 w-5 text-yellow-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-primary mb-4" data-testid={`score-total-${idx}`}>
                          {player.total} points
                        </div>
                        <div className="space-y-2">
                          {player.events?.map((event, eventIdx) => (
                            <div key={eventIdx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                              <span className="text-sm font-medium">{event.timestamp}</span>
                              <span className="text-sm">{event.description}</span>
                              <span className="text-sm font-bold text-green-600">+{event.value}</span>
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
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle>{player.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600 mb-4" data-testid={`punches-total-${idx}`}>
                          {player.total} punches
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {player.events?.map((event, eventIdx) => (
                            <div key={eventIdx} className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-sm">
                              <span className="font-medium">{event.timestamp}</span>
                              <span>{event.description}</span>
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
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle>{player.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600 mb-4" data-testid={`kicks-total-${idx}`}>
                          {player.total} kicks
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {player.events?.map((event, eventIdx) => (
                            <div key={eventIdx} className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/30 rounded text-sm">
                              <span className="font-medium">{event.timestamp}</span>
                              <span>{event.description}</span>
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
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {player.name}
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-yellow-600 mb-4" data-testid={`violations-total-${idx}`}>
                          {player.total} violations
                        </div>
                        <div className="space-y-2">
                          {player.events?.map((event, eventIdx) => (
                            <div key={eventIdx} className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded text-sm">
                              <span className="font-medium">{event.timestamp}</span>
                              <span>{event.description}</span>
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
                  {matchResult.advice_analysis?.players?.map((player, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          {player.name} - Coaching Advice
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Tactical Advice */}
                        <div>
                          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Tactical
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-2">Issues:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {player.tactical_advice?.issues?.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-600 mb-2">Improvements:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {player.tactical_advice?.improvements?.map((imp, i) => (
                                  <li key={i}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Technical Advice */}
                        <div>
                          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Technical
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-2">Issues:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {player.technical_advice?.issues?.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-600 mb-2">Improvements:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {player.technical_advice?.improvements?.map((imp, i) => (
                                  <li key={i}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Mental Advice */}
                        <div>
                          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Mental
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-2">Issues:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {player.mental_advice?.issues?.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-600 mb-2">Improvements:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {player.mental_advice?.improvements?.map((imp, i) => (
                                  <li key={i}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-clip-analysis">
                    {clipResult.analysis}
                  </p>
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
