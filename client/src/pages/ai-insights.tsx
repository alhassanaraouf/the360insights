import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageCircle, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useAthlete } from "@/lib/athlete-context";

interface AiQuery {
  id: number;
  query: string;
  response: string;
  confidence: string;
  timestamp: string;
}
import AthleteSelector from "@/components/ui/athlete-selector";
import AthleteHeaderSelector from "@/components/ui/athlete-header-selector";

export default function AiInsights() {
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { selectedAthleteId, setSelectedAthleteId } = useAthlete();

  // Simple markdown formatter for AI responses
  const formatMarkdown = (text: string) => {
    if (!text) return text;
    
    return text
      .split('\n')
      .map((line, lineIndex) => {
        // Handle bullet points
        if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
          const bulletText = line.replace(/^[\s]*[•-][\s]*/, '');
          return (
            <div key={lineIndex} className="flex items-start space-x-2 mb-1">
              <span className="text-gray-500 mt-0.5">•</span>
              <span>{formatInlineMarkdown(bulletText)}</span>
            </div>
          );
        }
        
        // Regular paragraphs
        return line.trim() ? (
          <p key={lineIndex} className="mb-2 last:mb-0">
            {formatInlineMarkdown(line)}
          </p>
        ) : (
          <br key={lineIndex} />
        );
      })
      .filter(element => element !== null);
  };

  // Format inline markdown (bold, italic)
  const formatInlineMarkdown = (text: string) => {
    const parts = [];
    let currentIndex = 0;
    
    // Handle **bold** and *italic* text
    const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }
      
      // Add formatted text
      const matchedText = match[0];
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        // Bold text
        parts.push(
          <strong key={`bold-${match.index}`} className="font-semibold">
            {matchedText.slice(2, -2)}
          </strong>
        );
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        // Italic text
        parts.push(
          <em key={`italic-${match.index}`} className="italic">
            {matchedText.slice(1, -1)}
          </em>
        );
      }
      
      currentIndex = match.index + matchedText.length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  // Check for athlete ID in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const athleteIdFromUrl = urlParams.get('athlete');
    
    if (athleteIdFromUrl && parseInt(athleteIdFromUrl) !== selectedAthleteId) {
      setSelectedAthleteId(parseInt(athleteIdFromUrl));
    }
  }, [selectedAthleteId, setSelectedAthleteId]);

  const { data: previousQueries, isLoading } = useQuery<AiQuery[]>({
    queryKey: [`/api/athletes/${selectedAthleteId}/queries`],
    enabled: !!selectedAthleteId,
  });

  const aiQueryMutation = useMutation({
    mutationFn: async (data: { query: string; athleteId: number }) => {
      const response = await apiRequest("POST", "/api/ai/query", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/athletes/${selectedAthleteId}/queries`] });
      setQuery("");
      toast({
        title: "Query processed",
        description: "AI analysis complete",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process query",
        variant: "destructive",
      });
    },
  });

  const deleteQueryMutation = useMutation({
    mutationFn: async (queryId: number) => {
      const response = await apiRequest("DELETE", `/api/ai/query/${queryId}`);
      return response.json();
    },
    onMutate: async (queryId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/athletes/${selectedAthleteId}/queries`] });

      // Snapshot the previous value
      const previousQueries = queryClient.getQueryData([`/api/athletes/${selectedAthleteId}/queries`]);

      // Optimistically update to the new value
      queryClient.setQueryData([`/api/athletes/${selectedAthleteId}/queries`], (old: AiQuery[] | undefined) =>
        old?.filter((query) => query.id !== queryId) || []
      );

      // Return a context object with the snapshotted value
      return { previousQueries };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/athletes/${selectedAthleteId}/queries`] });
      toast({
        title: "Insight deleted",
        description: "The insight has been removed",
      });
    },
    onError: (error: any, queryId, context) => {
      // Roll back the cache to the previous state
      if (context?.previousQueries) {
        queryClient.setQueryData([`/api/athletes/${selectedAthleteId}/queries`], context.previousQueries);
      }
      
      // Don't show error toast for "Query not found" since it means it was already deleted
      if (!error?.message?.includes("Query not found")) {
        toast({
          title: "Error",
          description: "Failed to delete insight",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && selectedAthleteId) {
      aiQueryMutation.mutate({ query: query.trim(), athleteId: selectedAthleteId });
    }
  };

  // Show athlete selector if no athlete is selected
  if (!selectedAthleteId) {
    return (
      <div className="min-h-screen">
        <AthleteSelector 
          title="Select Athlete for AI Insights"
          description="Choose an athlete to get personalized AI-powered performance insights and analysis"
        />
      </div>
    );
  }

  return (
    <>
      <Header 
        title={t('insights.title')} 
        description={t('insights.description')}
      />
      <div className="p-6 space-y-6">
        <AthleteHeaderSelector title="AI Insights for:" />
        {/* Query Interface */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('insights.askAi')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('insights.placeholder')}
                className="flex-1 min-h-[80px] resize-none"
                disabled={aiQueryMutation.isPending}
              />
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!query.trim() || aiQueryMutation.isPending}
                >
                {aiQueryMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Query History */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Insights</h3>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : previousQueries && previousQueries.length > 0 ? (
              <div className="space-y-6">
                {previousQueries
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((item) => (
                  <div key={item.id} className="border-l-4 border-primary pl-4">
                    <div className="flex items-start space-x-3">
                      <MessageCircle className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-gray-900 flex-1">{item.query}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQueryMutation.mutate(item.id)}
                            disabled={deleteQueryMutation.isPending}
                            className="text-gray-400 hover:text-red-500 p-1 h-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-gray-700 prose prose-sm max-w-none">
                            {formatMarkdown(item.response)}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm text-gray-500">
                              Confidence: {parseFloat(item.confidence).toFixed(0)}%
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No queries yet. Ask your first question above!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
