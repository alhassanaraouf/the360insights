import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport } from "@/lib/sport-context";
import { apiRequest } from "@/lib/queryClient";
import { getCountryFlagWithFallback } from "@/lib/country-flags";
import { 
  User, 
  Search,
  Filter,
  Trophy,
  MapPin,
  TrendingUp,
  Users,
  Eye,
  BarChart3,
  Medal,
  Globe,
  Activity,
  Edit,
  Trash2,
  Target
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import RankChangeIndicator from "@/components/ui/rank-change-indicator";

interface Athlete {
  id: number;
  name: string;
  nationality: string;
  sport: string;
  worldRank?: number;
  olympicRank?: number;
  worldCategory?: string;
  olympicCategory?: string;
  worldPreviousRank?: number;
  olympicPreviousRank?: number;
  winRate?: number;
  category?: string;
  weight?: string;
  gender?: string;
  profileImage?: string;
  status?: string;
}

export default function Athletes() {
  const { t } = useLanguage();
  const { showEgyptianOnly } = useEgyptFilter();
  const { selectedSport } = useSport();
  const [, navigate] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rank");
  const [filterNationality, setFilterNationality] = useState(showEgyptianOnly ? "Egypt" : "all");
  const [filterGender, setFilterGender] = useState("all");
  const [showTopRankedOnly, setShowTopRankedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [editingAthlete, setEditingAthlete] = useState<any>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<number[]>([]);
  const [editForm, setEditForm] = useState({
    name: "",
    nationality: "",
    sport: "",
    worldRank: "",
    olympicRank: "",
    gender: ""
  });
  
  // Update nationality filter when Egypt toggle changes
  useEffect(() => {
    if (showEgyptianOnly && filterNationality === "all") {
      setFilterNationality("Egypt");
    } else if (!showEgyptianOnly && filterNationality === "Egypt") {
      setFilterNationality("all");
    }
  }, [showEgyptianOnly, filterNationality]);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterNationality, filterGender, showTopRankedOnly, sortBy]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch athletes with pagination and all filters
  const { data: athletesData, isLoading } = useQuery({
    queryKey: ["/api/athletes", selectedSport, currentPage, searchTerm, filterNationality, filterGender, showTopRankedOnly, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        sport: selectedSport,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortBy
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (filterNationality !== 'all') {
        params.append('nationality', filterNationality);
      }
      
      if (filterGender !== 'all') {
        params.append('gender', filterGender);
      }
      
      if (showTopRankedOnly) {
        params.append('topRankedOnly', 'true');
      }
      
      const response = await fetch(`/api/athletes?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch athletes');
      return response.json();
    }
  });

  const athletes = athletesData?.athletes || [];
  const totalAthletes = athletesData?.total || 0;
  const totalPages = athletesData?.totalPages || 0;

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (athleteIds: number[]) => {
      await Promise.all(athleteIds.map(id => apiRequest('DELETE', `/api/athletes/${id}`)));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedAthletes.length} athletes deleted successfully`,
      });
      setSelectedAthletes([]);
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to delete some athletes",
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
      worldRank: athlete.worldRank?.toString() || "",
      olympicRank: athlete.olympicRank?.toString() || "",
      gender: athlete.gender || ""
    });
  };

  const handleUpdateAthlete = () => {
    if (!editingAthlete) return;
    
    const updateData = {
      ...editForm,
      worldRank: editForm.worldRank ? parseInt(editForm.worldRank) : null,
      olympicRank: editForm.olympicRank ? parseInt(editForm.olympicRank) : null,
    };
    
    updateAthleteMutation.mutate({
      id: editingAthlete.id,
      data: updateData
    });
  };

  const handleDeleteAthlete = (athleteId: number) => {
    deleteAthleteMutation.mutate(athleteId);
  };

  const handleSelectAthlete = (athleteId: number, checked: boolean) => {
    if (checked) {
      setSelectedAthletes(prev => [...prev, athleteId]);
    } else {
      setSelectedAthletes(prev => prev.filter(id => id !== athleteId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAthletes(athletes.map((athlete: Athlete) => athlete.id));
    } else {
      setSelectedAthletes([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedAthletes.length > 0) {
      bulkDeleteMutation.mutate(selectedAthletes);
    }
  };

  // Get unique nationalities for filter - now we need to fetch this separately since we only have current page data
  const { data: nationalitiesData } = useQuery({
    queryKey: ["/api/athletes/nationalities", selectedSport],
    queryFn: async () => {
      const response = await fetch(`/api/athletes/nationalities?sport=${selectedSport}`);
      if (!response.ok) throw new Error('Failed to fetch nationalities');
      return response.json();
    }
  });
  
  const nationalities = nationalitiesData || [];

  if (isLoading) {
    return (
      <>
        <Header 
          title="Athletes Directory" 
          description="Browse and discover talented athletes"
        />
        <div className="mobile-padding">
          <div className="animate-pulse mobile-space-y">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="mobile-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Athletes Directory" 
        description={`Browse and discover ${(athletes as Athlete[])?.length || 0} talented athletes`}
      />
      
      <div className="mobile-padding mobile-space-y">
        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">

              {/* Active Filters Indicator */}
              {(showTopRankedOnly || filterNationality !== "all" || filterGender !== "all") && (
                <div className="md:col-span-2 lg:col-span-4 flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Active filters:</span>
                  {showTopRankedOnly && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      Top 10 Ranked
                    </span>
                  )}
                  {filterNationality !== "all" && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      {filterNationality}
                    </span>
                  )}
                  {filterGender !== "all" && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      {filterGender}
                    </span>
                  )}
                  {/* Only show Clear all button if there are other filters besides Egypt nationality when in Egypt mode */}
                  {!(showEgyptianOnly && !showTopRankedOnly && filterGender === "all" && filterNationality === "Egypt") && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setShowTopRankedOnly(false);
                        setFilterNationality("all");
                        setFilterGender("all");
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              )}
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search athletes or nationality..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rank">World Rank</SelectItem>
                  <SelectItem value="olympicRank">Olympic Rank</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="winRate">Win Rate</SelectItem>
                  <SelectItem value="nationality">Nationality</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter by Nationality */}
              <Select value={filterNationality} onValueChange={setFilterNationality} disabled={showEgyptianOnly}>
                <SelectTrigger className={showEgyptianOnly ? "opacity-50 cursor-not-allowed" : ""}>
                  <SelectValue placeholder="All nationalities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nationalities</SelectItem>
                  {nationalities.map((nationality) => (
                    <SelectItem key={nationality} value={nationality}>
                      {nationality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter by Gender */}
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger>
                  <SelectValue placeholder="All genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedAthletes.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border">
                <span className="text-sm font-medium">
                  {selectedAthletes.length} athlete{selectedAthletes.length > 1 ? 's' : ''} selected
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={bulkDeleteMutation.isPending}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Athletes</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedAthletes.length} athlete{selectedAthletes.length > 1 ? 's' : ''}? 
                        This action cannot be undone and will remove all associated data including KPIs, strengths, weaknesses, and performance history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {bulkDeleteMutation.isPending ? "Deleting..." : "Delete All"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{(athletes as Athlete[])?.length || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Athletes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{nationalities.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Countries</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all ${showTopRankedOnly ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}
            onClick={() => setShowTopRankedOnly(!showTopRankedOnly)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(athletes as Athlete[])?.filter((a: Athlete) => {
                  const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      (a.nationality && a.nationality.toLowerCase().includes(searchTerm.toLowerCase()));
                  const matchesNationality = filterNationality === "all" || a.nationality === filterNationality;
                  const matchesGender = filterGender === "all" || (a.gender && a.gender === filterGender);
                  const isTopRanked = a.worldRank && a.worldRank <= 10;
                  
                  return matchesSearch && matchesNationality && matchesGender && isTopRanked;
                }).length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Top 10 Ranked {showTopRankedOnly && '(Active)'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{totalAthletes}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Filtered Results</div>
            </CardContent>
          </Card>
        </div>

        {/* Athletes Grid */}
        {athletes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.map((athlete: Athlete) => (
              <Card key={athlete.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={athlete.profileImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"} 
                      alt={athlete.name} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{athlete.name}</CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin className="w-3 h-3" />
                        <span>{getCountryFlagWithFallback(athlete.nationality)} {athlete.nationality}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Key Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <Trophy className="w-4 h-4 text-primary mr-1" />
                        <span className="text-lg font-bold text-primary">#{athlete.worldRank || 'N/R'}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">World Rank</div>
                      {athlete.worldRank && (
                        <div className="mt-1">
                          <RankChangeIndicator 
                            currentRank={athlete.worldRank} 
                            previousRank={athlete.worldPreviousRank}
                            size="sm"
                          />
                        </div>
                      )}
                      {athlete.worldCategory && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{athlete.worldCategory}</div>
                      )}
                    </div>
                    
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <Medal className="w-4 h-4 text-orange-600 mr-1" />
                        <span className="text-lg font-bold text-orange-600">#{athlete.olympicRank || 'N/R'}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">Olympic Rank</div>
                      {athlete.olympicRank && (
                        <div className="mt-1">
                          <RankChangeIndicator 
                            currentRank={athlete.olympicRank} 
                            previousRank={athlete.olympicPreviousRank}
                            size="sm"
                          />
                        </div>
                      )}
                      {(athlete.olympicCategory || athlete.worldCategory) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{athlete.olympicCategory || athlete.worldCategory}</div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Sport:</span>
                      <Badge variant="secondary">{athlete.sport}</Badge>
                    </div>
                    
                    {athlete.category && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Category:</span>
                        <Badge variant="outline">{athlete.category}</Badge>
                      </div>
                    )}
                    
                    {athlete.weight && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Weight:</span>
                        <span className="text-sm font-medium">{athlete.weight}</span>
                      </div>
                    )}
                    
                    {athlete.status && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
                        <Badge variant={athlete.status === 'active' ? 'default' : 'secondary'}>
                          {athlete.status}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => navigate(`/athlete360?athlete=${athlete.id}`)}
                      className="flex-1 flex items-center"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      View 360° Analysis
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
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
                            <Label htmlFor="name" className="text-right">
                              Name
                            </Label>
                            <Input
                              id="name"
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nationality" className="text-right">
                              Country
                            </Label>
                            <Input
                              id="nationality"
                              value={editForm.nationality}
                              onChange={(e) => setEditForm(prev => ({ ...prev, nationality: e.target.value }))}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sport" className="text-right">
                              Sport
                            </Label>
                            <Input
                              id="sport"
                              value={editForm.sport}
                              onChange={(e) => setEditForm(prev => ({ ...prev, sport: e.target.value }))}
                              className="col-span-3"
                            />
                          </div>

                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="worldRank" className="text-right">
                              World Rank
                            </Label>
                            <Input
                              id="worldRank"
                              type="number"
                              value={editForm.worldRank}
                              onChange={(e) => setEditForm(prev => ({ ...prev, worldRank: e.target.value }))}
                              className="col-span-3"
                              placeholder="Current world ranking"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="olympicRank" className="text-right">
                              Olympic Rank
                            </Label>
                            <Input
                              id="olympicRank"
                              type="number"
                              value={editForm.olympicRank}
                              onChange={(e) => setEditForm(prev => ({ ...prev, olympicRank: e.target.value }))}
                              className="col-span-3"
                              placeholder="Olympic ranking"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="gender" className="text-right">
                              Gender
                            </Label>
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
                        <Button variant="destructive" size="sm">
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

                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Athletes Found</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No athletes match your current search and filter criteria.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterNationality("all");
                  setFilterGender("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination Controls */}
        {athletes.length > 0 && (
          <div className="flex items-center justify-between px-2 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalAthletes)} of {totalAthletes} athletes
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                data-testid="button-previous-page"
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}