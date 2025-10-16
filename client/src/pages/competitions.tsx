import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { 
  Search,
  Calendar,
  MapPin,
  Trophy,
  Award,
  RefreshCw,
  Check,
  ChevronsUpDown,
  User as UserIcon,
  Globe,
} from "lucide-react";
import { format } from "date-fns";
import { getCountryFlag } from "@/lib/country-flags";

interface Competition {
  id: number;
  name: string;
  location: string;
  country: string;
  city?: string;
  startDate: string;
  endDate: string;
  status: string;
  category?: string;
  gradeLevel?: string;
  pointsAvailable?: string;
  competitionType?: string;
  registrationDeadline?: string;
  participants?: number;
  logo?: string;
  description?: string;
  organizer?: string;
  sourceUrl?: string;
  simplyCompeteEventId?: string;
  lastSyncedAt?: string;
  metadata?: any;
}

export default function Competitions() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { user } = useAuth() as { user: User | null };
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterAthlete, setFilterAthlete] = useState("all");
  const [athleteSearchOpen, setAthleteSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [syncingCompetitionId, setSyncingCompetitionId] = useState<number | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterLocation, filterAthlete, sortBy]);

  // Fetch all competitions
  const { data: allCompetitions, isLoading } = useQuery<Competition[]>({
    queryKey: ['/api/competitions'],
  });

  // Fetch athletes for filter (lightweight - no rankings)
  const { data: athletes, isLoading: isLoadingAthletes } = useQuery<any[]>({
    queryKey: ['/api/athletes/simple'],
  });

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Sync participants mutation
  const syncParticipantsMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      setSyncingCompetitionId(competitionId);
      const result = await apiRequest('POST', `/api/competitions/${competitionId}/sync-participants`, {});
      return result as any;
    },
    onSuccess: (data: any) => {
      console.log('Sync response:', data);
      
      // Handle response structure
      const stats = data?.stats || data;
      const synced = stats?.synced ?? 0;
      const updated = stats?.updated ?? 0;
      const created = stats?.created ?? 0;
      const total = stats?.total ?? 0;
      const errors = stats?.errors ?? 0;

      // Build a clear message about what happened
      const changes = [];
      if (synced > 0) changes.push(`${synced} new`);
      if (updated > 0) changes.push(`${updated} updated`);
      
      const changeText = changes.length > 0 ? changes.join(', ') : 'No changes';

      toast({
        title: "Participants Synced Successfully! 🎉",
        description: `Competition now has ${total} participant${total !== 1 ? 's' : ''} • ${changeText}${errors > 0 ? ` • ${errors} error${errors !== 1 ? 's' : ''}` : ''}`,
      });
    },
    onError: (error: any) => {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync participants",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Reset syncing state and refresh competitions list to show updated data
      setSyncingCompetitionId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
    },
  });


  // Get unique locations for filter
  const locations = useMemo(() => {
    if (!allCompetitions) return [];
    const uniqueLocations = Array.from(new Set(allCompetitions.map(c => c.location))).filter(Boolean);
    return uniqueLocations.sort();
  }, [allCompetitions]);

  // Fetch athlete's competitions when athlete filter is selected
  const { data: athleteCompetitions } = useQuery<number[]>({
    queryKey: [`/api/athletes/${filterAthlete}/competitions`],
    enabled: filterAthlete !== "all",
  });

  // Filter and sort competitions
  const filteredCompetitions = useMemo(() => {
    if (!allCompetitions) return [];

    let filtered = allCompetitions.filter(comp => {
      const matchesSearch = searchTerm === "" || 
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || comp.status === filterStatus;
      const matchesLocation = filterLocation === "all" || comp.location === filterLocation;
      const matchesAthlete = filterAthlete === "all" || 
        (athleteCompetitions && athleteCompetitions.includes(comp.id));

      return matchesSearch && matchesStatus && matchesLocation && matchesAthlete;
    });

    // Sort competitions with context-aware ordering
    // Upcoming/Ongoing: ascending (earliest first), All/Completed: descending (most recent first)
    const sortOrder = (filterStatus === "completed" || filterStatus === "all") ? "desc" : "asc";
    
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "location":
          comparison = (a.location || "").localeCompare(b.location || "");
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [allCompetitions, searchTerm, filterStatus, filterLocation, filterAthlete, athleteCompetitions, sortBy]);

  // Paginate
  const totalPages = Math.ceil(filteredCompetitions.length / itemsPerPage);
  const paginatedCompetitions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredCompetitions.slice(start, end);
  }, [filteredCompetitions, currentPage, itemsPerPage]);

  // Get status counts
  const statusCounts = useMemo(() => {
    if (!allCompetitions) return { all: 0, upcoming: 0, ongoing: 0, completed: 0 };
    
    return {
      all: allCompetitions.length,
      upcoming: allCompetitions.filter(c => c.status === "upcoming").length,
      ongoing: allCompetitions.filter(c => c.status === "ongoing").length,
      completed: allCompetitions.filter(c => c.status === "completed").length,
    };
  }, [allCompetitions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "ongoing":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Competitions Directory" 
          description="Browse and discover Taekwondo competitions"
        />
        <div className="mobile-padding">
          <div className="animate-pulse mobile-space-y">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
        title="Competitions Directory" 
        description={`Browse ${filteredCompetitions.length} Taekwondo competitions`}
      />
      
      <div className="mobile-padding mobile-space-y">
        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
              {/* Active Filters Indicator */}
              {(filterStatus !== "all" || filterLocation !== "all" || filterAthlete !== "all") && (
                <div className="md:col-span-2 lg:col-span-5 flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Active filters:</span>
                  {filterStatus !== "all" && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs capitalize">
                      {filterStatus}
                    </span>
                  )}
                  {filterLocation !== "all" && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      {filterLocation}
                    </span>
                  )}
                  {filterAthlete !== "all" && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      {athletes?.find(a => a.id === parseInt(filterAthlete))?.name || 'Athlete'}
                    </span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterLocation("all");
                      setFilterAthlete("all");
                    }}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    data-testid="button-clear-all-filters"
                  >
                    Clear all
                  </Button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search competitions or location..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-competitions"
                />
              </div>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort-by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter by Status */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter by Location */}
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger data-testid="select-filter-location">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter by Athlete */}
              <Popover open={athleteSearchOpen} onOpenChange={setAthleteSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={athleteSearchOpen}
                    className="w-full justify-between"
                    data-testid="select-filter-athlete"
                  >
                    {filterAthlete === "all" ? (
                      <span className="text-muted-foreground">All athletes</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage 
                            src={`/api/athletes/${filterAthlete}/image`} 
                            alt={athletes?.find(a => a.id === parseInt(filterAthlete))?.name}
                          />
                          <AvatarFallback className="text-xs">
                            <UserIcon className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{athletes?.find(a => a.id === parseInt(filterAthlete))?.name}</span>
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name, nationality..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingAthletes ? "Loading athletes..." : "No athlete found."}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setFilterAthlete("all");
                            setAthleteSearchOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              filterAthlete === "all" ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          All Athletes
                        </CommandItem>
                        {athletes && athletes.map((athlete) => (
                          <CommandItem
                            key={athlete.id}
                            value={`${athlete.name} ${athlete.nationality || ''}`}
                            onSelect={() => {
                              setFilterAthlete(athlete.id.toString());
                              setAthleteSearchOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filterAthlete === athlete.id.toString() ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage 
                                src={`/api/athletes/${athlete.id}/image`} 
                                alt={athlete.name}
                              />
                              <AvatarFallback className="text-xs">
                                <UserIcon className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{athlete.name}</span>
                              {athlete.nationality && (
                                <span className="text-xs text-muted-foreground">{athlete.nationality}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all ${filterStatus === "upcoming" ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}
            onClick={() => setFilterStatus(filterStatus === "upcoming" ? "all" : "upcoming")}
            data-testid="card-filter-upcoming"
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statusCounts.upcoming}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Upcoming</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all ${filterStatus === "ongoing" ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : ''}`}
            onClick={() => setFilterStatus(filterStatus === "ongoing" ? "all" : "ongoing")}
            data-testid="card-filter-ongoing"
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{statusCounts.ongoing}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Ongoing</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all ${filterStatus === "completed" ? 'ring-2 ring-gray-500 bg-gray-50 dark:bg-gray-950' : ''}`}
            onClick={() => setFilterStatus(filterStatus === "completed" ? "all" : "completed")}
            data-testid="card-filter-completed"
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{statusCounts.completed}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Completed</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all ${filterStatus === "all" ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10' : ''}`}
            onClick={() => setFilterStatus("all")}
            data-testid="card-filter-total"
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{statusCounts.all}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Competitions Grid */}
        {paginatedCompetitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCompetitions.map((competition) => (
              <Card 
                key={competition.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => navigate(`/competition/${competition.id}`)}
                data-testid={`card-competition-${competition.id}`}
              >
                {/* Logo Header - Bigger and more prominent */}
                <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-b overflow-hidden">
                  {competition.logo ? (
                    <img 
                      src={competition.logo} 
                      alt={competition.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=200&h=200&fit=crop";
                      }}
                    />
                  ) : (
                    <Trophy className="w-16 h-16 text-primary/40" />
                  )}
                  <Badge className={`absolute top-3 right-3 ${getStatusColor(competition.status)} capitalize`}>
                    {competition.status}
                  </Badge>
                </div>
                
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2">{competition.name}</CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Location */}
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{competition.location || "Location TBD"}</span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>
                      {competition.startDate && format(new Date(competition.startDate), "MMM d, yyyy")}
                      {competition.endDate && competition.endDate !== competition.startDate && 
                        ` - ${format(new Date(competition.endDate), "MMM d, yyyy")}`}
                    </span>
                  </div>

                  {/* Category */}
                  {competition.category && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Award className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="truncate">{competition.category}</span>
                    </div>
                  )}

                  {/* Admin Sync Button */}
                  {isAdmin && competition.simplyCompeteEventId && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        syncParticipantsMutation.mutate(competition.id);
                      }}
                      disabled={syncingCompetitionId === competition.id}
                      data-testid={`button-sync-${competition.id}`}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncingCompetitionId === competition.id ? 'animate-spin' : ''}`} />
                      {syncingCompetitionId === competition.id ? 'Syncing...' : 'Sync Participants'}
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/competition/${competition.id}`);
                    }}
                    data-testid={`button-view-details-${competition.id}`}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No Competitions Found</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Try adjusting your filters or search term
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
