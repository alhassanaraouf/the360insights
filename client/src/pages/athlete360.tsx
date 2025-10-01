import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAthlete } from "@/lib/athlete-context";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import type { Athlete, KpiMetric, Strength, Weakness, AthleteRank, CareerEvent } from "@shared/schema";
import AthleteSelector from "@/components/ui/athlete-selector";
import AthleteHeaderSelector from "@/components/ui/athlete-header-selector";
import RankChangeIndicator from "@/components/ui/rank-change-indicator";
import { BidFormDialog } from "@/components/bid-form-dialog";
import { 
  User, 
  Heart, 
  Brain, 
  Activity, 
  Target, 
  TrendingUp, 
  Award,
  Calendar,
  AlertTriangle,
  Edit,
  Trash2,
  Settings,
  Globe,
  Trophy
} from "lucide-react";

export default function Athlete360() {
  const { t } = useLanguage();
  const { selectedAthleteId, setSelectedAthleteId } = useAthlete();
  const [location, navigate] = useLocation();
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    nationality: "",
    sport: "",
    gender: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get athlete ID from URL parameter or fall back to context
  const urlParams = new URLSearchParams(window.location.search);
  const athleteIdFromUrl = urlParams.get('athlete');
  const athleteId = athleteIdFromUrl ? parseInt(athleteIdFromUrl) : selectedAthleteId;

  // Update athlete context when URL parameter changes
  useEffect(() => {
    if (athleteIdFromUrl && parseInt(athleteIdFromUrl) !== selectedAthleteId) {
      setSelectedAthleteId(parseInt(athleteIdFromUrl));
    }
  }, [athleteIdFromUrl, selectedAthleteId, setSelectedAthleteId]);
  
  console.log('Location:', location);
  console.log('URL Params:', window.location.search);
  console.log('Athlete ID from URL:', athleteIdFromUrl);
  console.log('Final athlete ID:', athleteId);

  const { data: athlete, isLoading: athleteLoading } = useQuery<Athlete>({
    queryKey: [`/api/athletes/${athleteId}`],
    enabled: !!athleteId,
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery<KpiMetric[]>({
    queryKey: [`/api/athletes/${athleteId}/kpis`],
    enabled: !!athleteId,
  });

  const { data: strengths, isLoading: strengthsLoading } = useQuery<Strength[]>({
    queryKey: [`/api/athletes/${athleteId}/strengths`],
    enabled: !!athleteId,
  });

  const { data: weaknesses, isLoading: weaknessesLoading } = useQuery<Weakness[]>({
    queryKey: [`/api/athletes/${athleteId}/weaknesses`],
    enabled: !!athleteId,
  });

  const { data: athleteRanks, isLoading: ranksLoading } = useQuery<AthleteRank[]>({
    queryKey: [`/api/athletes/${athleteId}/ranks`],
    enabled: !!athleteId,
  });

  const { data: careerEvents, isLoading: careerLoading } = useQuery<CareerEvent[]>({
    queryKey: [`/api/athletes/${athleteId}/career`],
    enabled: !!athleteId,
  });

  const isLoading = athleteLoading || kpisLoading || strengthsLoading || weaknessesLoading || careerLoading || ranksLoading;

  // Delete athlete mutation
  const deleteAthleteMutation = useMutation({
    mutationFn: async (athleteId: number) => {
      await apiRequest('DELETE', `/api/athletes/${athleteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      toast({
        title: "Success",
        description: "Athlete deleted successfully",
      });
      navigate("/athletes"); // Redirect to athletes directory
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete athlete",
        variant: "destructive",
      });
    },
  });

  // Update athlete mutation
  const updateAthleteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/athletes/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/athletes/${athleteId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      setEditingAthlete(null);
      toast({
        title: "Success",
        description: "Athlete updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update athlete",
        variant: "destructive",
      });
    },
  });

  const handleEditAthlete = (athlete: any) => {
    setEditingAthlete(athlete);
    setEditForm({
      name: athlete.name || "",
      nationality: athlete.nationality || "",
      sport: athlete.sport || "",
      gender: athlete.gender || ""
    });
  };

  const handleUpdateAthlete = () => {
    if (!editingAthlete) return;
    
    const updateData = {
      ...editForm,
    };
    
    updateAthleteMutation.mutate({
      id: editingAthlete.id,
      data: updateData
    });
  };

  const handleDeleteAthlete = (athleteId: number) => {
    deleteAthleteMutation.mutate(athleteId);
  };

  // Show athlete selector if no athlete is selected
  if (!athleteId) {
    return (
      <div className="min-h-screen">
        <AthleteSelector 
          title="Select Athlete for 360° Analysis"
          description="Choose an athlete to view their complete performance profile"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <Header 
          title="Athlete 360°" 
          description="Complete performance profile and analysis"
        />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Calculate achievements from career events
  const achievements = careerEvents?.filter((event) => event.eventType === 'achievement') || [];
  
  // Calculate top 3 placements from career events
  const top3Placements = careerEvents?.filter((event) => {
    if (!event.eventResult) return false;
    const result = event.eventResult.toLowerCase();
    
    // Check for various top 3 indicators
    return result.includes('gold') || 
           result.includes('silver') || 
           result.includes('bronze') ||
           result.includes('1st') || 
           result.includes('2nd') || 
           result.includes('3rd') ||
           result.includes('first') || 
           result.includes('second') || 
           result.includes('third') ||
           result.match(/^[123]$/) || // Just numbers 1, 2, or 3
           result.match(/\b[123]\b/); // Numbers 1, 2, or 3 as whole words
  }) || [];
  
  // Get recent career events (all types) sorted by date
  const recentCareerEvents = careerEvents?.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  }).slice(0, 3) || [];

  const physicalReadiness = 87;
  const mentalReadiness = 92;
  const technicalReadiness = 85;
  const overallReadiness = Math.round((physicalReadiness + mentalReadiness + technicalReadiness) / 3);

  return (
    <>
      <Header 
        title={t('athlete360.title')} 
        description={t('athlete360.description')}
      />
      <div className="mobile-padding mobile-space-y">
        <AthleteHeaderSelector title="Viewing 360° analysis for:" />
        
        {/* Enhanced Athlete Profile Header */}
        <Card className="mb-6">
          <CardContent className="mobile-card pt-8">
            <div className="mobile-flex-col lg:items-start lg:justify-between">
              {/* Profile Section */}
              <div className="flex items-start mobile-space-x">
                <div className="relative">
                  <img 
                    src={athlete?.profileImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"} 
                    alt="Athlete profile" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                </div>
                
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center mobile-space-y sm:space-y-0 sm:space-x-3">
                    <h1 className="mobile-heading text-gray-900 dark:text-white mobile-text-container truncate">{athlete?.name}</h1>
                    {/* Management Buttons */}
                    {athlete && (
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setBidDialogOpen(true)}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-sponsor-athlete"
                        >
                          Sponsor
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditAthlete(athlete)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Edit Athlete</DialogTitle>
                              <DialogDescription>
                                Update athlete information below.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input
                                  id="name"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="nationality" className="text-right">Country</Label>
                                <Input
                                  id="nationality"
                                  value={editForm.nationality}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, nationality: e.target.value }))}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sport" className="text-right">Sport</Label>
                                <Input
                                  id="sport"
                                  value={editForm.sport}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, sport: e.target.value }))}
                                  className="col-span-3"
                                />
                              </div>


                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="gender" className="text-right">Gender</Label>
                                <Select 
                                  value={editForm.gender} 
                                  onValueChange={(value) => setEditForm(prev => ({ ...prev, gender: value }))}
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button 
                                type="submit" 
                                onClick={handleUpdateAthlete}
                                disabled={updateAthleteMutation.isPending}
                              >
                                {updateAthleteMutation.isPending ? "Updating..." : "Save Changes"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Athlete</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {athlete.name}? This action cannot be undone and will remove all associated data including KPIs, strengths, weaknesses, and performance history.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAthlete(athlete.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteAthleteMutation.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row mobile-space-y sm:space-y-0 sm:space-x-4 mobile-text text-gray-600 dark:text-gray-300">
                    <span className="flex items-center">
                      <Globe className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span>{athlete?.nationality}</span>
                    </span>
                    <span className="flex items-center">
                      <Trophy className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span>{athlete?.sport} Professional</span>
                    </span>
                    {athlete?.gender && (
                      <Badge 
                        variant="secondary" 
                        className="w-fit flex-shrink-0 max-w-[80px] text-center"
                      >
                        {athlete.gender}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      World Rank #{athlete?.worldRank || 'Unranked'}
                    </Badge>
                    {athlete?.category && (
                      <Badge variant="outline">{athlete.category}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex justify-center sm:justify-end lg:justify-center lg:min-w-[200px]">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg min-w-[120px]">
                  <div className="text-2xl font-bold text-yellow-600">{top3Placements?.length || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Career Titles</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rankings Overview */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Trophy className="text-primary mr-2" />
              Rankings Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {athleteRanks?.map((rank: any, index: number) => {
                const getBackgroundColor = (type: string) => {
                  switch (type.toLowerCase()) {
                    case 'world':
                      return 'bg-gradient-to-b from-blue-50 to-blue-100';
                    case 'olympic':
                      return 'bg-gradient-to-b from-gray-50 to-gray-100';
                    case 'national':
                      return 'bg-gradient-to-b from-green-50 to-green-100';
                    case 'continental':
                      return 'bg-gradient-to-b from-purple-50 to-purple-100';
                    case 'regional':
                      return 'bg-gradient-to-b from-yellow-50 to-yellow-100';
                    default:
                      return 'bg-gradient-to-b from-gray-50 to-gray-100';
                  }
                };
                
                const getTextColor = (type: string) => {
                  switch (type.toLowerCase()) {
                    case 'world':
                      return 'text-blue-800';
                    case 'olympic':
                      return 'text-gray-800';
                    case 'national':
                      return 'text-green-800';
                    case 'continental':
                      return 'text-purple-800';
                    case 'regional':
                      return 'text-yellow-800';
                    default:
                      return 'text-gray-800';
                  }
                };

                return (
                  <div key={index} className={`text-center p-4 border rounded-lg ${getBackgroundColor(rank.rankingType)}`}>
                    <div className="text-xs text-gray-500 mb-2 font-medium">
                      {rank.category || 'M-58 kg'} | {rank.rankingType.charAt(0).toUpperCase() + rank.rankingType.slice(1)} Senior Division | {rank.rankingType.charAt(0).toUpperCase() + rank.rankingType.slice(1)} Kyorugi Rankings
                    </div>
                    <div className={`text-4xl font-bold ${getTextColor(rank.rankingType)} mb-1`}>
                      {rank.ranking}
                    </div>
                    {(rank.ranking && rank.previousRanking) && (
                      <div className="mt-2">
                        <RankChangeIndicator 
                          currentRank={rank.ranking}
                          previousRank={rank.previousRanking}
                          size="md"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Show message if no rankings available */}
              {(!athleteRanks || athleteRanks.length === 0) && (
                <div className="col-span-full text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No rankings available</p>
                  <p className="text-sm text-gray-400">Rankings will appear here when available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="mobile-grid lg:grid-cols-2">
          {/* Strengths Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="text-green-500 mr-2" />
                  Key Strengths
                </h3>
                <button
                  onClick={async () => {
                    if (isAnalyzing) return;
                    
                    setIsAnalyzing(true);
                    try {
                      const response = await fetch(`/api/ai/generate-and-save-strengths-weaknesses/${athleteId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      const result = await response.json();
                      console.log('AI Analysis Result:', result);
                      
                      // Refresh the data to show new strengths and weaknesses
                      queryClient.invalidateQueries({ queryKey: [`/api/athletes/${athleteId}/strengths`] });
                      queryClient.invalidateQueries({ queryKey: [`/api/athletes/${athleteId}/weaknesses`] });
                      
                      toast({
                        title: "AI Analysis Complete",
                        description: result.message || `Generated ${result.strengths?.length || 0} strengths and ${result.weaknesses?.length || 0} weaknesses`,
                      });
                    } catch (error) {
                      console.error('Analysis error:', error);
                      toast({
                        title: "Analysis Error",
                        description: "Failed to analyze athlete",
                        variant: "destructive",
                      });
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  disabled={isAnalyzing}
                  className={`text-sm px-3 py-1 rounded flex items-center gap-2 ${
                    isAnalyzing 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isAnalyzing && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                </button>
              </div>
              <div className="space-y-3">
                {strengths?.length > 0 ? strengths.map((strength: any) => (
                  <div key={strength.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-700">{strength.score}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{strength.name}</p>
                      <p className="text-sm text-gray-600">{strength.description}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4">
                    <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No strengths recorded</p>
                    <p className="text-sm text-gray-400">Strengths analysis will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weaknesses Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Target className="text-orange-500 mr-2" />
                  Areas for Improvement
                </h3>
                <button
                  onClick={async () => {
                    if (isAnalyzing) return;
                    
                    setIsAnalyzing(true);
                    try {
                      const response = await fetch(`/api/ai/generate-and-save-strengths-weaknesses/${athleteId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      const result = await response.json();
                      console.log('AI Analysis Result:', result);
                      
                      // Refresh the data to show new strengths and weaknesses
                      queryClient.invalidateQueries({ queryKey: [`/api/athletes/${athleteId}/strengths`] });
                      queryClient.invalidateQueries({ queryKey: [`/api/athletes/${athleteId}/weaknesses`] });
                      
                      toast({
                        title: "AI Analysis Complete",
                        description: result.message || `Generated ${result.strengths?.length || 0} strengths and ${result.weaknesses?.length || 0} weaknesses`,
                      });
                    } catch (error) {
                      console.error('Analysis error:', error);
                      toast({
                        title: "Analysis Error",
                        description: "Failed to analyze athlete",
                        variant: "destructive",
                      });
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  disabled={isAnalyzing}
                  className={`text-sm px-3 py-1 rounded flex items-center gap-2 ${
                    isAnalyzing 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isAnalyzing && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                </button>
              </div>
              <div className="space-y-3">
                {weaknesses?.length > 0 ? weaknesses.map((weakness: any) => (
                  <div key={weakness.id} className="flex items-center space-x-3 p-3 rounded-lg" style={{backgroundColor: 'rgba(255, 187, 171, 1)'}}>
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-orange-700">{weakness.score}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{weakness.name}</p>
                      <p className="text-sm text-gray-600">{weakness.description}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4">
                    <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No weaknesses identified</p>
                    <p className="text-sm text-gray-400">Areas for improvement will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Career Journey */}
        <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="text-primary mr-2" />
                  Career Journey
                </h3>
                <Link to="/career-journey" className="text-sm text-blue-600 hover:text-blue-800">
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {recentCareerEvents?.length > 0 ? recentCareerEvents.map((event: any) => {
                  const getEventIcon = (eventType: string) => {
                    switch (eventType) {
                      case 'achievement':
                        return <Award className="w-5 h-5 text-yellow-600" />;
                      case 'match':
                        return <Target className="w-5 h-5 text-blue-600" />;
                      case 'injury':
                        return <AlertTriangle className="w-5 h-5 text-red-600" />;
                      default:
                        return <Calendar className="w-5 h-5 text-gray-600" />;
                    }
                  };

                  const getEventBgColor = (eventType: string) => {
                    switch (eventType) {
                      case 'achievement':
                        return 'bg-yellow-50';
                      case 'match':
                        return 'bg-blue-50';
                      case 'injury':
                        return 'bg-red-50';
                      default:
                        return 'bg-gray-50';
                    }
                  };

                  return (
                    <div key={event.id} className={`flex items-start space-x-3 p-3 ${getEventBgColor(event.eventType)} rounded-lg`}>
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(event.eventType)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="font-medium text-gray-900 leading-relaxed break-words overflow-wrap-anywhere max-w-full">{event.title}</p>
                        <p className="text-sm text-gray-600 pt-1">{event.date}</p>
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed break-words">{event.description}</p>
                        )}

                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-4">
                    <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No career milestones</p>
                    <p className="text-sm text-gray-400">Achievements will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
        </Card>
      </div>

      {/* Bid Form Dialog */}
      {athlete && (
        <BidFormDialog
          open={bidDialogOpen}
          onOpenChange={setBidDialogOpen}
          athleteId={athlete.id}
          athleteName={athlete.name}
        />
      )}
    </>
  );
}
