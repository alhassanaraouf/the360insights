import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Search,
  Filter,
  Save,
  CheckCircle,
  Globe,
  Medal,
  Star,
  Target,
  Activity,
  Users,
  Circle,
  Award
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface Competition {
  id: number;
  name: string;
  startDate: string;
  endDate?: string;
  country: string;
  city?: string;
  status: string;
  gradeLevel?: string; // G1, G2, G4, G6, G8, G10, G12, G14, G20
  eventType?: string;
  description?: string;
}

interface CompetitionPreference {
  id?: number;
  userId: string;
  competitionId: number;
  competitionName: string;
  competitionType?: string;
  location?: string;
  dateRange?: string;
  isSelected: boolean;
}

export default function CompetitionPreferences() {
  const { user } = useAuth() as { user: User | null };
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preferences, setPreferences] = useState<Map<number, boolean>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all competitions
  const { data: competitions = [], isLoading: competitionsLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
  });

  // Fetch user's current preferences
  const { data: userPreferences = [], isLoading: preferencesLoading } = useQuery<CompetitionPreference[]>({
    queryKey: [`/api/competition-preferences/${user?.id}`],
    enabled: !!user?.id,
  });

  // Initialize preferences map when user preferences are loaded
  useEffect(() => {
    if (userPreferences.length > 0) {
      const prefMap = new Map<number, boolean>();
      userPreferences.forEach(pref => {
        prefMap.set(pref.competitionId, pref.isSelected);
      });
      setPreferences(prefMap);
    }
  }, [userPreferences]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      const preferencesToSave = competitions.map(comp => ({
        userId: user!.id,
        competitionId: comp.id,
        competitionName: comp.name,
        competitionType: comp.gradeLevel,
        location: [comp.country, comp.city].filter(Boolean).join(', '),
        dateRange: comp.startDate,
        isSelected: preferences.get(comp.id) || false
      }));

      const response = await apiRequest("POST", "/api/competition-preferences", preferencesToSave);
      return response.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/competition-preferences/${user?.id}`] });
      toast({
        title: "Preferences Saved",
        description: "Your competition preferences have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Unable to save your preferences. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handlePreferenceToggle = (competitionId: number, isSelected: boolean) => {
    const newPreferences = new Map(preferences);
    newPreferences.set(competitionId, isSelected);
    setPreferences(newPreferences);
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    const newPreferences = new Map<number, boolean>();
    filteredCompetitions.forEach(comp => {
      newPreferences.set(comp.id, true);
    });
    setPreferences(prev => new Map([...Array.from(prev), ...Array.from(newPreferences)]));
    setHasChanges(true);
  };

  const handleDeselectAll = () => {
    const newPreferences = new Map<number, boolean>();
    filteredCompetitions.forEach(comp => {
      newPreferences.set(comp.id, false);
    });
    setPreferences(prev => new Map([...Array.from(prev), ...Array.from(newPreferences)]));
    setHasChanges(true);
  };

  // Filter competitions based on search and filters
  const filteredCompetitions = competitions.filter(comp => {
    const location = [comp.country, comp.city].filter(Boolean).join(', ');
    const matchesSearch = (comp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === "all" || comp.gradeLevel === levelFilter;
    
    // Handle status filtering properly
    const isUpcoming = comp.status === 'upcoming' || 
                      (comp.startDate && new Date(comp.startDate) > new Date());
    const matchesStatus = statusFilter === "all" ? true : 
                         statusFilter === "upcoming" ? isUpcoming : 
                         comp.status === statusFilter;
    
    return matchesSearch && matchesLevel && matchesStatus;
  });

  const getCompetitionIcon = (level?: string) => {
    switch (level) {
      case 'G1': return <Trophy className="h-5 w-5 text-yellow-600" />; // World Level
      case 'G2': return <Medal className="h-5 w-5 text-orange-600" />; // Continental
      case 'G4': return <Globe className="h-5 w-5 text-blue-600" />; // International
      case 'G6': return <Star className="h-5 w-5 text-purple-600" />; // Regional
      case 'G8': return <Target className="h-5 w-5 text-green-600" />; // National
      case 'G10': return <Award className="h-5 w-5 text-indigo-600" />; // Local Elite
      case 'G12': return <Activity className="h-5 w-5 text-cyan-600" />; // Development
      case 'G14': return <Users className="h-5 w-5 text-pink-600" />; // Youth
      case 'G20': return <Circle className="h-5 w-5 text-gray-600" />; // Open
      default: return <Target className="h-5 w-5 text-gray-600" />;
    }
  };

  const getLevelBadgeColor = (level?: string) => {
    switch (level) {
      case 'G1': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // World Level
      case 'G2': return 'bg-orange-100 text-orange-800 border-orange-200'; // Continental
      case 'G4': return 'bg-blue-100 text-blue-800 border-blue-200'; // International
      case 'G6': return 'bg-purple-100 text-purple-800 border-purple-200'; // Regional
      case 'G8': return 'bg-green-100 text-green-800 border-green-200'; // National
      case 'G10': return 'bg-indigo-100 text-indigo-800 border-indigo-200'; // Local Elite
      case 'G12': return 'bg-cyan-100 text-cyan-800 border-cyan-200'; // Development
      case 'G14': return 'bg-pink-100 text-pink-800 border-pink-200'; // Youth
      case 'G20': return 'bg-gray-100 text-gray-800 border-gray-200'; // Open
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedCount = Array.from(preferences.values()).filter(value => value === true).length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to manage your competition preferences.</p>
        </div>
      </div>
    );
  }

  const isLoading = competitionsLoading || preferencesLoading;

  return (
    <>
      <Header 
        title="Competition Preferences" 
        description="Select the competitions you're interested in to customize your dashboard"
      />
      
      <div className="p-6 space-y-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Competition Selection
                </CardTitle>
                <CardDescription>
                  Choose which competitions you want to see in your dashboard events
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {selectedCount} Selected
                </Badge>
                {hasChanges && (
                  <Button 
                    onClick={() => savePreferencesMutation.mutate()}
                    disabled={savePreferencesMutation.isPending}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savePreferencesMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search competitions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by G-level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All G-Levels</SelectItem>
                  <SelectItem value="G1">G1</SelectItem>
                  <SelectItem value="G2">G2</SelectItem>
                  <SelectItem value="G4">G4</SelectItem>
                  <SelectItem value="G6">G6</SelectItem>
                  <SelectItem value="G8">G8</SelectItem>
                  <SelectItem value="G10">G10</SelectItem>
                  <SelectItem value="G12">G12</SelectItem>
                  <SelectItem value="G14">G14</SelectItem>
                  <SelectItem value="G20">G20</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competition List */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading competitions...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCompetitions.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No competitions found matching your criteria.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredCompetitions.map((competition) => (
                <Card key={competition.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            {getCompetitionIcon(competition.gradeLevel)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                              {competition.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(competition.startDate).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {[competition.country, competition.city].filter(Boolean).join(', ')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge 
                                variant="outline" 
                                className={getLevelBadgeColor(competition.gradeLevel)}
                              >
                                {competition.gradeLevel || 'Level TBD'}
                              </Badge>
                              <Badge 
                                variant={competition.status === 'upcoming' ? 'default' : 'secondary'}
                                className="capitalize"
                              >
                                {competition.status}
                              </Badge>
                            </div>
                            {competition.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {competition.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {preferences.get(competition.id) && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        <Switch
                          checked={preferences.get(competition.id) || false}
                          onCheckedChange={(checked) => handlePreferenceToggle(competition.id, checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Save Button (Fixed at bottom when changes exist) */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button 
              onClick={() => savePreferencesMutation.mutate()}
              disabled={savePreferencesMutation.isPending}
              size="lg"
              className="shadow-lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {savePreferencesMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}