import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Loader2,
  Video,
  BarChart3,
  FileText,
  Activity
} from "lucide-react";

interface MatchAnalysis {
  punches: number;
  kicks: number;
  spinning_kicks: number;
}

interface MatchStory {
  story: string;
}

export default function LiveMatch() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [matchStory, setMatchStory] = useState<MatchStory | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const { toast } = useToast();

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const processVideoMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch('/process_live_youtube_video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtube_url: url }),
      });

      if (!response.ok) {
        throw new Error('Failed to process video');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setMatchAnalysis(data.analysis || data);
      setMatchStory(data.story || { story: data.match_story || '' });
      
      const vId = extractVideoId(youtubeUrl);
      setVideoId(vId);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }
    processVideoMutation.mutate(youtubeUrl);
  };

  const handleReset = () => {
    setYoutubeUrl("");
    setMatchAnalysis(null);
    setMatchStory(null);
    setVideoId(null);
  };

  return (
    <>
      <Header 
        title="Live Match Analysis" 
        description="AI-powered YouTube video match analysis"
      />
      
      <div className="p-6 space-y-6">
        {/* Video URL Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              YouTube Video Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube Video URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="youtube-url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={processVideoMutation.isPending}
                    className="flex-1"
                    data-testid="input-youtube-url"
                  />
                  <Button 
                    type="submit"
                    disabled={processVideoMutation.isPending || !youtubeUrl}
                    data-testid="button-analyze"
                  >
                    {processVideoMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Analyze Video
                      </>
                    )}
                  </Button>
                  {(matchAnalysis || matchStory) && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      data-testid="button-reset"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Video and Analysis Display */}
        {videoId && (matchAnalysis || matchStory) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Player */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Match Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video w-full">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  ></iframe>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Match Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="stats" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="stats" data-testid="tab-stats">
                      <Activity className="h-4 w-4 mr-2" />
                      Statistics
                    </TabsTrigger>
                    <TabsTrigger value="story" data-testid="tab-story">
                      <FileText className="h-4 w-4 mr-2" />
                      Match Story
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="stats" className="space-y-4 mt-4">
                    {matchAnalysis && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Punches</p>
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-punches">
                                  {matchAnalysis.punches}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-lg px-3 py-1">
                                Punches
                              </Badge>
                            </div>
                          </div>

                          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Kicks</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-kicks">
                                  {matchAnalysis.kicks}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-lg px-3 py-1">
                                Kicks
                              </Badge>
                            </div>
                          </div>

                          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Spinning Kicks</p>
                                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-spinning-kicks">
                                  {matchAnalysis.spinning_kicks}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-lg px-3 py-1">
                                Spinning
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <h4 className="font-semibold mb-2">Total Actions</h4>
                          <p className="text-2xl font-bold text-primary">
                            {matchAnalysis.punches + matchAnalysis.kicks + matchAnalysis.spinning_kicks}
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="story" className="mt-4">
                    {matchStory && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-match-story">
                            {matchStory.story}
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {processVideoMutation.isPending && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Analyzing video...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!videoId && !processVideoMutation.isPending && (
          <Card>
            <CardContent className="p-12 text-center">
              <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No video analyzed yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Enter a YouTube URL above to start analyzing a match
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
