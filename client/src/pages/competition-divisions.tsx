import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Competition } from "@shared/schema";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Trophy,
  Download,
  Weight,
  Filter
} from "lucide-react";

interface DivisionData {
  eventName: string;
  weightCategory: string;
  athleteCount: number;
  athletes: string[];
}

export default function CompetitionDivisions() {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all competitions
  const { data: competitions, isLoading: competitionsLoading } = useQuery<Competition[]>({
    queryKey: ['/api/competitions'],
  });

  // Fetch divisions for selected competition
  const { data: divisions, isLoading: divisionsLoading, error } = useQuery<DivisionData[]>({
    queryKey: [`/api/competitions/${selectedCompetitionId}/divisions`],
    enabled: !!selectedCompetitionId,
  });

  // Filter upcoming competitions
  const upcomingCompetitions = competitions?.filter(comp => comp.status === "upcoming") || [];

  // Filter divisions based on search term
  const filteredDivisions = divisions?.filter(division =>
    division.weightCategory.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const selectedCompetition = competitions?.find(comp => comp.id.toString() === selectedCompetitionId);

  const handleExportCSV = () => {
    if (!divisions || !selectedCompetition) return;

    const csvContent = [
      ["Weight Category", "Athlete Count"],
      ...filteredDivisions.map(division => [
        division.weightCategory,
        division.athleteCount.toString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCompetition.name}_divisions.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Header
        title="Competition Divisions"
        description="View athlete counts by weight category in Senior Division"
      />

      {/* Competition Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Select Competition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="competition-select">Competition</Label>
              <Select 
                value={selectedCompetitionId} 
                onValueChange={setSelectedCompetitionId}
                data-testid="select-competition"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a competition..." />
                </SelectTrigger>
                <SelectContent>
                  {upcomingCompetitions.map((competition) => (
                    <SelectItem key={competition.id} value={competition.id.toString()}>
                      {competition.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCompetition && (
              <div className="space-y-2">
                <Label>Competition Details</Label>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {selectedCompetition.city}, {selectedCompetition.country}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {selectedCompetition.startDate}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedCompetition.gradeLevel}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Division Results */}
      {selectedCompetitionId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Weight className="h-5 w-5" />
                Senior Division - Weight Categories
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Input
                    placeholder="Filter by weight category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64"
                    data-testid="input-search"
                  />
                </div>
                
                {divisions && (
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
            </div>
          </CardHeader>
          
          <CardContent>
            {divisionsLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500">Loading divisions...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-red-500" data-testid="error-message">
                  Failed to load divisions. Please try again.
                </p>
              </div>
            )}

            {divisions && !divisionsLoading && (
              <>
                {filteredDivisions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500" data-testid="no-divisions">
                      {searchTerm 
                        ? "No weight categories match your search." 
                        : "No divisions found for this competition."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <Badge variant="secondary" className="px-3">
                        <Users className="h-3 w-3 mr-1" />
                        {filteredDivisions.reduce((sum, div) => sum + div.athleteCount, 0)} total athletes
                      </Badge>
                      <Badge variant="secondary" className="px-3">
                        {filteredDivisions.length} weight categories
                      </Badge>
                    </div>

                    <Table data-testid="table-divisions">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Weight Category</TableHead>
                          <TableHead className="text-right">Athlete Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDivisions.map((division, index) => (
                          <TableRow key={index} data-testid={`row-division-${index}`}>
                            <TableCell className="font-medium">
                              {division.weightCategory}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" data-testid={`count-${index}`}>
                                {division.athleteCount}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedCompetitionId && (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500" data-testid="no-competition-selected">
              Select a competition above to view its divisions and athlete counts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}