import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Calendar, 
  Target, 
  TrendingUp, 
  Clock,
  Zap,
  Dumbbell,
  Brain,
  Heart,
  Play,
  CheckCircle,
  Plus,
  Activity,
  Star,
  BarChart3,
  Calendar as CalendarIcon,
  RefreshCw,
  History,
  Trash2,
  Trophy
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { useAthlete } from "@/lib/athlete-context";
import { useToast } from "@/hooks/use-toast";
import AthleteSelector from "@/components/ui/athlete-selector";
import AthleteHeaderSelector from "@/components/ui/athlete-header-selector";

// Competition interface based on schema
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
  registrationDeadline?: string;
  status: string;
  createdAt: string;
}

interface TrainingPlan {
  athleteId: number;
  planName: string;
  startDate: string;
  duration: number;
  planType: string;
  microCycles: MicroCycle[];
  overallObjectives: string[];
  progressionStrategy: string;
  adaptationProtocol: string;
  id?: number; // Added for the plan ID
}

interface MicroCycle {
  weekNumber: number;
  startDate: string;
  endDate: string;
  theme: string;
  objectives: string[];
  trainingDays: TrainingDay[];
  loadDistribution: {
    technical: number;
    tactical: number;
    physical: number;
    mental: number;
    recovery: number;
  };
  expectedOutcomes: string[];
}

interface TrainingDay {
  day: number;
  date: string;
  phase: string;
  intensity: string;
  focus: string[];
  sessions: TrainingSession[];
  duration: number;
  targetZones: string[];
}

interface TrainingSession {
  type: string;
  name: string;
  duration: number;
  intensity: number;
  exercises: Exercise[];
  objectives: string[];
  notes?: string;
}

interface Exercise {
  name: string;
  description: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restPeriod?: number;
  progressionNotes?: string;
  targetMetric?: string;
}

export default function TrainingPlanner() {
  const { selectedAthleteId } = useAthlete();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [planParameters, setPlanParameters] = useState({
    planType: '',
    duration: 4,
    targetCompetition: '',
    intensityPreference: 'moderate',
    trainingDaysPerWeek: 5,
    sessionDuration: 90,
    focusAreas: [] as string[],
    includeRecovery: true,
    competitionDate: '',
    targetWeight: '',
    currentWeight: ''
  });

  const [generatedPlan, setGeneratedPlan] = useState<TrainingPlan | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [selectedGLevels, setSelectedGLevels] = useState<string[]>(['G1', 'G2', 'G4', 'G6', 'G8', 'G12', 'G14', 'G20']); // Show all by default
  const [customCompetitionName, setCustomCompetitionName] = useState('');

  const { data: athlete } = useQuery({
    queryKey: [`/api/athletes/${selectedAthleteId}`],
    enabled: !!selectedAthleteId,
  });

  // Fetch saved training plans for the selected athlete
  const { data: savedPlans, refetch: refetchPlans } = useQuery<any[]>({
    queryKey: [`/api/training/plans/${selectedAthleteId}`],
    enabled: !!selectedAthleteId,
  });

  // Fetch upcoming competitions for competition preparation
  const { data: upcomingCompetitions } = useQuery<Competition[]>({
    queryKey: ['/api/competitions'],
  });

  // Filter for upcoming competitions only, with G-level filtering
  const availableCompetitions = upcomingCompetitions?.filter(comp => {
    // First filter by upcoming status/date
    const isUpcoming = comp.status === 'upcoming' || (comp.startDate && new Date(comp.startDate) > new Date());
    if (!isUpcoming) return false;
    
    // Then filter by selected G-levels
    if (selectedGLevels.length === 0) return false; // Show NO competitions if no levels selected
    return comp.gradeLevel && selectedGLevels.includes(comp.gradeLevel);
  }) || [];

  // Check if competition plan is selected
  const isCompetitionPlan = planParameters.planType === 'competition-prep';

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/training/generate-plan", {
        athleteId: selectedAthleteId,
        ...planParameters
      });
      const data = await response.json();
      // The API should now return the plan with an ID after saving
      return data;
    },
    onSuccess: (data) => {
      setGeneratedPlan(data);
      setIsGenerating(false);
      refetchPlans(); // Refresh saved plans list
      toast({
        title: "Training Plan Generated",
        description: `Comprehensive ${planParameters.duration}-week plan created and saved for ${(athlete as any)?.name || 'athlete'}`,
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: "Unable to generate training plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Show athlete selector if no athlete is selected
  if (!selectedAthleteId) {
    return (
      <div className="min-h-screen flex flex-col">
        <AthleteSelector 
          title="Select Athlete for Training Planner"
          description="Choose an athlete to create personalized training plans"
        />
      </div>
    );
  }

  const handleGeneratePlan = () => {
    if (!planParameters.planType || !planParameters.duration) {
      toast({
        title: "Missing Parameters",
        description: "Please select plan type and duration.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    generatePlanMutation.mutate();
  };



  const handleFocusAreaToggle = (area: string) => {
    setPlanParameters(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'peak': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'preparation': return <Target className="h-4 w-4" />;
      case 'development': return <TrendingUp className="h-4 w-4" />;
      case 'competition': return <Star className="h-4 w-4" />;
      case 'recovery': return <Heart className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'technical': return <Target className="h-4 w-4" />;
      case 'tactical': return <Brain className="h-4 w-4" />;
      case 'physical': return <Dumbbell className="h-4 w-4" />;
      case 'mental': return <Heart className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const selectedMicroCycle = generatedPlan?.microCycles.find(cycle => cycle.weekNumber === selectedWeek);
  const selectedTrainingDay = selectedMicroCycle?.trainingDays.find(day => day.day === selectedDay);

  return (
    <>
      <Header 
        title="Training Plan Generator" 
        description="AI-powered micro-cycle scheduling and periodization"
      />

      <div className="p-6 space-y-6">
        <AthleteHeaderSelector title="Creating training plan for:" />
        {/* Plan Generation Interface */}
        {!generatedPlan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Create Training Plan
              </CardTitle>
              <CardDescription>
                Generate a comprehensive, periodized training program based on athlete analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="planType">Plan Type</Label>
                  <Select 
                    value={planParameters.planType} 
                    onValueChange={(value) => setPlanParameters(prev => ({...prev, planType: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competition-prep">Competition Preparation</SelectItem>
                      <SelectItem value="off-season">Off-Season Development</SelectItem>
                      <SelectItem value="skill-development">Skill Development</SelectItem>
                      <SelectItem value="injury-recovery">Injury Recovery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (weeks)</Label>
                  <Select 
                    value={planParameters.duration.toString()} 
                    onValueChange={(value) => setPlanParameters(prev => ({...prev, duration: parseInt(value)}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 weeks</SelectItem>
                      <SelectItem value="3">3 weeks</SelectItem>
                      <SelectItem value="4">4 weeks</SelectItem>
                      <SelectItem value="5">5 weeks</SelectItem>
                      <SelectItem value="6">6 weeks</SelectItem>
                      <SelectItem value="7">7 weeks</SelectItem>
                      <SelectItem value="8">8 weeks</SelectItem>
                      <SelectItem value="9">9 weeks</SelectItem>
                      <SelectItem value="10">10 weeks</SelectItem>
                      <SelectItem value="11">11 weeks</SelectItem>
                      <SelectItem value="12">12 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Competition Level Filter - Only show when competition-prep is selected */}
                {isCompetitionPlan && (
                  <div className="space-y-2">
                    <Label>Competition Levels</Label>
                    <div className="flex flex-wrap gap-2">
                      {['G1', 'G2', 'G4', 'G6', 'G8', 'G12', 'G14', 'G20'].map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant={selectedGLevels.includes(level) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedGLevels(prev => 
                              prev.includes(level) 
                                ? prev.filter(l => l !== level)
                                : [...prev, level]
                            );
                          }}
                          data-testid={`button-level-${level.toLowerCase()}`}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Select competition levels to filter available competitions ({selectedGLevels.length} selected)
                    </p>
                  </div>
                )}

                {/* Target Competition - Only show when competition-prep is selected */}
                {isCompetitionPlan && (
                  <div className="space-y-2">
                    <Label htmlFor="targetCompetition">Target Competition</Label>
                    <Select 
                      value={planParameters.targetCompetition} 
                      onValueChange={(value) => setPlanParameters(prev => ({...prev, targetCompetition: value}))}
                    >
                      <SelectTrigger className="text-left h-auto min-h-[2.5rem] py-2">
                        <SelectValue 
                          placeholder="Select target competition" 
                          className="whitespace-normal break-words leading-snug pr-6 block w-full text-sm" 
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCompetitions.length > 0 ? (
                          availableCompetitions.map((competition) => (
                            <SelectItem key={competition.id} value={competition.name}>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1 sm:gap-2">
                                <span className="font-medium text-sm leading-tight break-words hyphens-auto">{competition.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {competition.startDate} • {competition.country}{competition.city ? `, ${competition.city}` : ''}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            {selectedGLevels.length === 0 ? "Please select competition levels first" : "No upcoming competitions available for selected levels"}
                          </SelectItem>
                        )}
                        <SelectItem value="custom">Other (Custom Competition)</SelectItem>
                      </SelectContent>
                    </Select>
                    {planParameters.targetCompetition === 'custom' && (
                      <Input
                        placeholder="Enter custom competition name"
                        value={customCompetitionName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCustomCompetitionName(value);
                          setPlanParameters(prev => ({...prev, targetCompetition: value || 'custom'}));
                        }}
                        className="mt-2"
                        data-testid="input-custom-competition"
                      />
                    )}
                  </div>
                )}

                {/* Competition Date - Only show when competition-prep is selected */}
                {isCompetitionPlan && (
                  <div className="space-y-2">
                    <Label htmlFor="competitionDate">Competition Date</Label>
                    <Input
                      type="date"
                      value={planParameters.competitionDate}
                      onChange={(e) => setPlanParameters(prev => ({...prev, competitionDate: e.target.value}))}
                    />
                  </div>
                )}

                {/* Target Weight - Only show when competition-prep is selected */}
                {isCompetitionPlan && (
                  <div className="space-y-2">
                    <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 68"
                      value={planParameters.targetWeight}
                      onChange={(e) => setPlanParameters(prev => ({...prev, targetWeight: e.target.value}))}
                    />
                  </div>
                )}

                {/* Current Weight - Only show when competition-prep is selected */}
                {isCompetitionPlan && (
                  <div className="space-y-2">
                    <Label htmlFor="currentWeight">Current Weight (kg)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 70"
                      value={planParameters.currentWeight}
                      onChange={(e) => setPlanParameters(prev => ({...prev, currentWeight: e.target.value}))}
                    />
                  </div>
                )}
              </div>

              {/* Advanced Parameters */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Advanced Configuration</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Training Days Per Week */}
                  <div className="space-y-2">
                    <Label>Training Days/Week</Label>
                    <Slider
                      value={[planParameters.trainingDaysPerWeek]}
                      onValueChange={([value]) => setPlanParameters(prev => ({...prev, trainingDaysPerWeek: value}))}
                      max={7}
                      min={3}
                      step={1}
                    />
                    <div className="text-sm text-muted-foreground text-center">
                      {planParameters.trainingDaysPerWeek} days
                    </div>
                  </div>

                  {/* Session Duration */}
                  <div className="space-y-2">
                    <Label>Session Duration (min)</Label>
                    <Slider
                      value={[planParameters.sessionDuration]}
                      onValueChange={([value]) => setPlanParameters(prev => ({...prev, sessionDuration: value}))}
                      max={180}
                      min={60}
                      step={15}
                    />
                    <div className="text-sm text-muted-foreground text-center">
                      {planParameters.sessionDuration} minutes
                    </div>
                  </div>

                  {/* Intensity Preference */}
                  <div className="space-y-2">
                    <Label>Intensity Preference</Label>
                    <Select 
                      value={planParameters.intensityPreference} 
                      onValueChange={(value) => setPlanParameters(prev => ({...prev, intensityPreference: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Focus Areas */}
                <div className="space-y-2">
                  <Label>Focus Areas</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Technical Skills', 'Tactical Awareness', 'Physical Conditioning', 'Mental Preparation', 'Competition Strategy', 'Injury Prevention'].map((area) => (
                      <Button
                        key={area}
                        type="button"
                        variant={planParameters.focusAreas.includes(area) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFocusAreaToggle(area)}
                      >
                        {area}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Include Recovery */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeRecovery"
                    checked={planParameters.includeRecovery}
                    onCheckedChange={(checked) => setPlanParameters(prev => ({...prev, includeRecovery: checked}))}
                  />
                  <Label htmlFor="includeRecovery">Include Recovery Sessions</Label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleGeneratePlan} 
                  className="w-full sm:flex-1" 
                  size="lg"
                  disabled={isGenerating || !planParameters.planType}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Generate Training Plan
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => setShowSavedPlans(!showSavedPlans)}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <History className="mr-2 h-4 w-4" />
                  Saved Plans ({savedPlans?.length || 0})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Plans Display */}
        {!generatedPlan && showSavedPlans && savedPlans && savedPlans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Saved Training Plans
              </CardTitle>
              <CardDescription>
                Previously generated plans for {(athlete as any)?.name || 'this athlete'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {savedPlans.map((plan: any) => (
                  <Card key={plan.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{plan.planName}</h4>
                        <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                          <span>{plan.duration} weeks</span>
                          <span className="capitalize">{plan.planType.replace('-', ' ')}</span>
                          {plan.targetCompetition && (
                            <span className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              {plan.targetCompetition}
                            </span>
                          )}
                          <span>Created: {new Date(plan.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            // Load the saved plan and ensure the ID is properly maintained
                            const loadedPlan = {
                              ...plan, // Copy all properties from the saved plan
                              id: plan.id, // Explicitly ensure ID is set
                              overallObjectives: plan.overallObjectives || [],
                              progressionStrategy: plan.progressionStrategy || '',
                              adaptationProtocol: plan.adaptationProtocol || ''
                            };
                            console.log("Loading plan with ID:", plan.id, "Full plan:", loadedPlan);
                            setGeneratedPlan(loadedPlan);
                            setShowSavedPlans(false);
                            toast({
                              title: "Plan Loaded",
                              description: `${plan.planName} has been loaded successfully (ID: ${plan.id})`,
                            });
                          }}
                        >
                          Load Plan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await apiRequest("DELETE", `/api/training/plan/${plan.id}`);
                              refetchPlans();
                              toast({
                                title: "Plan Deleted",
                                description: "Training plan has been removed",
                              });
                            } catch (error) {
                              toast({
                                title: "Delete Failed",
                                description: "Could not delete the training plan",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Plan Display */}
        {generatedPlan && (
          <div className="space-y-6">
            {/* Plan Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    {generatedPlan.planName}
                  </span>
                  {/* New Plan Button */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setGeneratedPlan(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Plan
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {generatedPlan.duration}-week {generatedPlan.planType} plan for {(athlete as any)?.name || 'Athlete'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{generatedPlan.duration}</div>
                    <div className="text-sm text-muted-foreground">Weeks</div>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{generatedPlan.microCycles.length}</div>
                    <div className="text-sm text-muted-foreground">Micro-cycles</div>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {generatedPlan.microCycles.reduce((total, cycle) => total + cycle.trainingDays.length, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Training Days</div>
                  </div>
                </div>

                {/* Overall Objectives */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Overall Objectives</h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedPlan.overallObjectives.map((objective, index) => (
                      <Badge key={index} variant="secondary">{objective}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Micro-cycle Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Micro-cycle Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
                  <TabsList className="grid w-full auto-cols-fr overflow-x-auto" style={{ gridTemplateColumns: `repeat(${generatedPlan.microCycles.length}, minmax(0, 1fr))` }}>
                    {generatedPlan.microCycles.map((cycle) => (
                      <TabsTrigger key={cycle.weekNumber} value={cycle.weekNumber.toString()}>
                        Week {cycle.weekNumber}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {generatedPlan.microCycles.map((cycle) => (
                    <TabsContent key={cycle.weekNumber} value={cycle.weekNumber.toString()}>
                      <div className="space-y-4">
                        {/* Micro-cycle Header */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">{cycle.theme}</h3>
                            <p className="text-sm text-muted-foreground">
                              {cycle.startDate} - {cycle.endDate}
                            </p>
                            <div className="mt-2">
                              <h4 className="font-medium mb-1">Objectives</h4>
                              <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {cycle.objectives.map((objective, index) => (
                                  <li key={index}>{objective}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Load Distribution */}
                          <div>
                            <h4 className="font-medium mb-2">Training Load Distribution</h4>
                            <div className="space-y-2">
                              {Object.entries(cycle.loadDistribution).map(([type, percentage]) => (
                                <div key={type} className="flex items-center justify-between">
                                  <span className="text-sm capitalize">{type}</span>
                                  <div className="flex items-center gap-2">
                                    <Progress value={percentage} className="w-20" />
                                    <span className="text-sm w-8">{percentage}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Training Days Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
                          {cycle.trainingDays.map((day) => (
                            <Card 
                              key={day.day} 
                              className={`cursor-pointer transition-all ${selectedDay === day.day ? 'ring-2 ring-primary' : ''}`}
                              onClick={() => setSelectedDay(day.day)}
                            >
                              <CardContent className="p-3">
                                <div className="text-center">
                                  <div className="font-medium">Day {day.day}</div>
                                  <div className="text-xs text-muted-foreground">{day.date}</div>
                                  <div className="mt-2">
                                    <Badge className={getIntensityColor(day.intensity)} variant="secondary">
                                      {day.intensity}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex justify-center">
                                    {getPhaseIcon(day.phase)}
                                  </div>
                                  <div className="mt-1 text-xs">{day.duration}min</div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Expected Outcomes */}
                        <div>
                          <h4 className="font-medium mb-2">Expected Outcomes</h4>
                          <div className="flex flex-wrap gap-2">
                            {cycle.expectedOutcomes.map((outcome, index) => (
                              <Badge key={index} variant="outline">{outcome}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Selected Day Details */}
            {selectedTrainingDay && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Training Day {selectedDay} Details
                  </CardTitle>
                  <CardDescription>
                    {selectedTrainingDay.date} • {selectedTrainingDay.phase} Phase • {selectedTrainingDay.intensity} Intensity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Focus Areas */}
                    <div>
                      <h4 className="font-medium mb-2">Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainingDay.focus.map((focus, index) => (
                          <Badge key={index} variant="secondary">{focus}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Training Sessions */}
                    <div>
                      <h4 className="font-medium mb-2">Training Sessions</h4>
                      <div className="space-y-3">
                        {selectedTrainingDay.sessions.map((session, sessionIndex) => (
                          <Card key={sessionIndex} className="border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {getSessionTypeIcon(session.type)}
                                  <span className="font-medium">{session.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {session.duration}min
                                  <Badge variant="outline">Intensity {session.intensity}/10</Badge>
                                </div>
                              </div>

                              <div className="text-sm text-muted-foreground mb-2">
                                <strong>Objectives:</strong> {session.objectives.join(', ')}
                              </div>

                              {/* Exercises */}
                              <div className="space-y-2">
                                {session.exercises.map((exercise, exerciseIndex) => (
                                  <div key={exerciseIndex} className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                    <div className="font-medium">{exercise.name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {exercise.description}
                                    </div>
                                    <div className="flex gap-4 mt-2 text-sm">
                                      {exercise.sets && <span>Sets: {exercise.sets}</span>}
                                      {exercise.reps && <span>Reps: {exercise.reps}</span>}
                                      {exercise.duration && <span>Duration: {exercise.duration}min</span>}
                                      {exercise.restPeriod && <span>Rest: {exercise.restPeriod}s</span>}
                                    </div>
                                    {exercise.progressionNotes && (
                                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        Progression: {exercise.progressionNotes}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {session.notes && (
                                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                                  <strong>Notes:</strong> {session.notes}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Target Zones */}
                    <div>
                      <h4 className="font-medium mb-2">Target Training Zones</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainingDay.targetZones.map((zone, index) => (
                          <Badge key={index} variant="outline">{zone}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}