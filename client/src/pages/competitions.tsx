import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import { 
  Search,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Globe,
  Clock,
  Award,
  X,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

interface Competition {
  id: number;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
  category?: string;
  participants?: number;
  logo?: string;
  description?: string;
  organizer?: string;
  sourceUrl?: string;
  simplyCompeteEventId?: string;
}

export default function Competitions() {
  const { t } = useLanguage();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

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
  }, [searchTerm, filterStatus, filterLocation, sortBy]);

  // Fetch all competitions
  const { data: allCompetitions, isLoading } = useQuery<Competition[]>({
    queryKey: ['/api/competitions'],
  });

  // Get unique locations for filter
  const locations = useMemo(() => {
    if (!allCompetitions) return [];
    const uniqueLocations = Array.from(new Set(allCompetitions.map(c => c.location))).filter(Boolean);
    return uniqueLocations.sort();
  }, [allCompetitions]);

  // Filter and sort competitions
  const filteredCompetitions = useMemo(() => {
    if (!allCompetitions) return [];

    let filtered = allCompetitions.filter(comp => {
      const matchesSearch = searchTerm === "" || 
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || comp.status === filterStatus;
      const matchesLocation = filterLocation === "all" || comp.location === filterLocation;

      return matchesSearch && matchesStatus && matchesLocation;
    });

    // Sort competitions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "location":
          return (a.location || "").localeCompare(b.location || "");
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allCompetitions, searchTerm, filterStatus, filterLocation, sortBy]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              {/* Active Filters Indicator */}
              {(filterStatus !== "all" || filterLocation !== "all") && (
                <div className="md:col-span-2 lg:col-span-4 flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterLocation("all");
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
                  <SelectItem value="name">Name (A-Z)</SelectItem>
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
          <Card data-testid="card-filter-total">
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
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedCompetition(competition)}
                data-testid={`card-competition-${competition.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start space-x-4">
                    {/* Competition Logo */}
                    <div className="w-16 h-16 flex-shrink-0">
                      {competition.logo ? (
                        <img 
                          src={competition.logo} 
                          alt={competition.name}
                          className="w-full h-full object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=100&h=100&fit=crop";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                          <Trophy className="w-8 h-8 text-primary" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2">{competition.name}</CardTitle>
                      <Badge className={`mt-1 ${getStatusColor(competition.status)} capitalize`}>
                        {competition.status}
                      </Badge>
                    </div>
                  </div>
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

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCompetition(competition);
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

      {/* Competition Details Modal */}
      <Dialog open={!!selectedCompetition} onOpenChange={(open) => !open && setSelectedCompetition(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-competition-details">
          <DialogHeader>
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div className="w-20 h-20 flex-shrink-0">
                {selectedCompetition?.logo ? (
                  <img 
                    src={selectedCompetition.logo} 
                    alt={selectedCompetition.name}
                    className="w-full h-full object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-primary" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <DialogTitle className="text-2xl">{selectedCompetition?.name}</DialogTitle>
                <Badge className={`mt-2 ${getStatusColor(selectedCompetition?.status || "")} capitalize`}>
                  {selectedCompetition?.status}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Key Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</div>
                  <div className="text-base">{selectedCompetition?.location || "TBD"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Dates</div>
                  <div className="text-base">
                    {selectedCompetition?.startDate && format(new Date(selectedCompetition.startDate), "MMM d, yyyy")}
                    {selectedCompetition?.endDate && selectedCompetition.endDate !== selectedCompetition.startDate && 
                      ` - ${format(new Date(selectedCompetition.endDate), "MMM d, yyyy")}`}
                  </div>
                </div>
              </div>

              {selectedCompetition?.category && (
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</div>
                    <div className="text-base">{selectedCompetition.category}</div>
                  </div>
                </div>
              )}

              {selectedCompetition?.organizer && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Organizer</div>
                    <div className="text-base">{selectedCompetition.organizer}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedCompetition?.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h4>
                <p className="text-base text-gray-700 dark:text-gray-300">{selectedCompetition.description}</p>
              </div>
            )}

            {/* External Link */}
            {selectedCompetition?.sourceUrl && (
              <div>
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a 
                    href={selectedCompetition.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on SimplyCompete
                  </a>
                </Button>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setSelectedCompetition(null)}
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
