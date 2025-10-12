import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Competition, Athlete, CompetitionParticipant } from "@shared/schema";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Trophy,
  Search,
  Filter,
  Eye,
  Weight,
  Download
} from "lucide-react";
import { DrawSheet } from "../components/draw-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CompetitionWithParticipants extends Competition {
  participantCount: number;
  participants?: (CompetitionParticipant & { athlete: Athlete })[];
}

interface ParticipantData {
  weightCategory: string;
  athleteCount: number;
  athletes: {
    name: string;
    license: string;
    country: string;
    club: string;
    avatar: string;
    organization: string;
  }[];
}

export default function CompetitionDraws() {
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionWithParticipants | null>(null);
  const [drawSheetOpen, setDrawSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("upcoming");
  const [divisionsSearchTerm, setDivisionsSearchTerm] = useState("");

  // Fetch all competitions with participant counts
  const { data: allCompetitions, isLoading } = useQuery<CompetitionWithParticipants[]>({
    queryKey: ['/api/competitions-with-participants'],
  });

  // Show all competitions (no filtering by status or preferences)
  const competitions = allCompetitions || [];

  // Fetch competition participants from local database when a competition is selected
  const { data: localParticipants, isLoading: localParticipantsLoading } = useQuery<(CompetitionParticipant & { athlete: Athlete })[]>({
    queryKey: [`/api/competitions/${selectedCompetition?.id}/participants`],
    enabled: !!selectedCompetition?.id,
  });

  // Fetch participants from SimplyCompete API when a competition is selected
  const { data: liveParticipants, isLoading: liveParticipantsLoading, error: liveParticipantsError } = useQuery<ParticipantData[]>({
    queryKey: [`/api/competitions/${selectedCompetition?.id}/participants-live`],
    enabled: !!selectedCompetition?.id && drawSheetOpen,
  });

  const filteredCompetitions = competitions?.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comp.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comp.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || comp.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleViewDrawSheet = (competition: CompetitionWithParticipants) => {
    setSelectedCompetition(competition);
    setDrawSheetOpen(true);
  };

  // Filter participants based on search term
  const filteredParticipants = liveParticipants?.filter(participant =>
    participant.weightCategory?.toLowerCase().includes(divisionsSearchTerm.toLowerCase())
  ) || [];

  const handleExportCSV = () => {
    if (!liveParticipants || !selectedCompetition) return;

    const csvContent = [
      ["Weight Category", "Athlete Name", "License", "Country", "Club"],
      ...filteredParticipants.flatMap(participant => 
        participant.athletes.map(athlete => [
          participant.weightCategory,
          athlete.name,
          athlete.license,
          athlete.country,
          athlete.club || ''
        ])
      )
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCompetition.name}_participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ongoing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Drawsheet" 
          description="View upcoming competitions and generate tournament draw sheets"
        />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Drawsheet" 
        description="View upcoming competitions and generate tournament draw sheets"
      />
      <div className="p-6 space-y-6">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search competitions by name, country, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-competitions"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="select-status-filter"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Competition Grid */}
        {filteredCompetitions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No upcoming competitions found
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "upcoming" 
                  ? "Try adjusting your search criteria"
                  : "No upcoming competitions from your preferences are available. Visit Competition Preferences to select competitions."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompetitions.map((competition) => (
              <Card 
                key={competition.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                data-testid={`competition-card-${competition.id}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold line-clamp-2">
                      {competition.name}
                    </CardTitle>
                    <Badge className={getStatusColor(competition.status || 'upcoming')}>
                      {competition.status || 'upcoming'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="w-4 h-4 mr-2" />
                    {competition.city ? `${competition.city}, ${competition.country}` : competition.country}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-2" />
                    {competition.startDate}
                    {competition.endDate && competition.endDate !== competition.startDate && 
                      ` - ${competition.endDate}`
                    }
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4 mr-2" />
                      {competition.participantCount} participants
                    </div>
                    
                    {competition.gradeLevel && (
                      <Badge variant="outline" className="text-xs">
                        {competition.gradeLevel}
                      </Badge>
                    )}
                  </div>

                  {competition.category && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Category: {competition.category}
                    </div>
                  )}

                  <Button
                    onClick={() => handleViewDrawSheet(competition)}
                    className="w-full mt-4"
                    data-testid={`button-view-draw-${competition.id}`}
                  >
                    <Weight className="w-4 h-4 mr-2" />
                    View Weight Categories
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Competition Divisions Dialog */}
        <Dialog open={drawSheetOpen} onOpenChange={setDrawSheetOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="divisions-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Weight className="h-5 w-5" />
                Senior Division Weight Categories - {selectedCompetition?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCompetition && (
              <div className="space-y-4">
                {/* Competition Details */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {selectedCompetition.city}, {selectedCompetition.country}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {selectedCompetition.startDate}
                  </div>
                  {selectedCompetition.gradeLevel && (
                    <Badge variant="outline" className="text-xs">
                      {selectedCompetition.gradeLevel}
                    </Badge>
                  )}
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Input
                      placeholder="Filter by weight category..."
                      value={divisionsSearchTerm}
                      onChange={(e) => setDivisionsSearchTerm(e.target.value)}
                      className="w-full sm:w-64"
                      data-testid="input-search-divisions"
                    />
                  </div>
                  
                  {liveParticipants && (
                    <Button 
                      onClick={handleExportCSV} 
                      variant="outline"
                      data-testid="button-export"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                </div>

                {/* Loading State */}
                {liveParticipantsLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500">Loading participants from SimplyCompete...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {liveParticipantsError && (
                  <div className="text-center py-8">
                    <p className="text-red-500" data-testid="error-message">
                      Failed to load participants. Please try again.
                    </p>
                  </div>
                )}

                {/* Participants Display */}
                {liveParticipants && !liveParticipantsLoading && (
                  <>
                    {filteredParticipants.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500" data-testid="no-participants">
                          {divisionsSearchTerm 
                            ? "No weight categories match your search." 
                            : "No participants found for this competition."
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <Badge variant="secondary" className="px-3">
                            <Users className="h-3 w-3 mr-1" />
                            {filteredParticipants.reduce((sum, cat) => sum + cat.athleteCount, 0)} total athletes
                          </Badge>
                          <Badge variant="secondary" className="px-3">
                            {filteredParticipants.length} weight categories
                          </Badge>
                        </div>

                        <div className="space-y-6" data-testid="participants-list">
                          {filteredParticipants.map((category, categoryIndex) => (
                            <div key={categoryIndex} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {category.weightCategory}
                                </h3>
                                <Badge variant="outline" className="ml-2">
                                  {category.athleteCount} athletes
                                </Badge>
                              </div>
                              
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {category.athletes.map((athlete, athleteIndex) => (
                                  <div 
                                    key={athleteIndex} 
                                    className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border"
                                    data-testid={`athlete-${categoryIndex}-${athleteIndex}`}
                                  >
                                    {athlete.avatar && (
                                      <img 
                                        src={athlete.avatar} 
                                        alt={athlete.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900 dark:text-white truncate">
                                        {athlete.name}
                                      </div>
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {athlete.country} • {athlete.license}
                                      </div>
                                      {athlete.club && (
                                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                          {athlete.club}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}