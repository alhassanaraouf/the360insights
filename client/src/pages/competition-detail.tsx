import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRoute, Link } from "wouter";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MapPin, 
  Calendar, 
  Trophy, 
  Award,
  Clock,
  Users,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

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

export default function CompetitionDetail() {
  const { t } = useLanguage();
  const [, params] = useRoute("/competition/:id");
  const competitionId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  // Fetch competition details
  const { data: competition, isLoading } = useQuery<Competition>({
    queryKey: [`/api/competitions/${competitionId}`],
    enabled: !!competitionId,
  });

  // Fetch participants
  const { data: participants, isLoading: participantsLoading } = useQuery<any[]>({
    queryKey: [`/api/competitions/${competitionId}/participants`],
    enabled: !!competitionId,
  });

  // Sync participants mutation
  const syncParticipantsMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest('POST', `/api/competitions/${competitionId}/sync-participants`, {});
      return result as any;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Participants Synced",
        description: `Successfully synced ${data.stats.synced} participants (${data.stats.matched} matched, ${data.stats.created} created)`,
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/competitions/${competitionId}/participants`] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync participants",
        variant: "destructive",
      });
    },
  });

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
          title="Competition Details" 
          description="Loading competition information..."
        />
        <div className="mobile-padding">
          <div className="animate-pulse mobile-space-y">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </>
    );
  }

  if (!competition) {
    return (
      <>
        <Header 
          title="Competition Not Found" 
          description="The requested competition could not be found"
        />
        <div className="mobile-padding">
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400">Competition not found</p>
              <Link href="/competitions">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Competitions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title={competition.name} 
        description="Competition 360° - Complete Competition Overview"
      />
      
      <div className="mobile-padding mobile-space-y">
        {/* Back Button */}
        <Link href="/competitions">
          <Button variant="ghost" size="sm" data-testid="button-back-to-competitions">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Competitions
          </Button>
        </Link>

        {/* Competition Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Logo */}
              <div className="w-32 h-32 flex-shrink-0">
                {competition.logo ? (
                  <img 
                    src={competition.logo} 
                    alt={competition.name}
                    className="w-full h-full object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                    <Trophy className="w-16 h-16 text-primary" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3">{competition.name}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${getStatusColor(competition.status)} capitalize`} data-testid="badge-status">
                    {competition.status}
                  </Badge>
                  {competition.gradeLevel && (
                    <Badge variant="outline" className="capitalize">
                      {competition.gradeLevel}
                    </Badge>
                  )}
                  {competition.competitionType && (
                    <Badge variant="outline" className="capitalize">
                      {competition.competitionType}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">
                {competition.city && competition.country 
                  ? `${competition.city}, ${competition.country}`
                  : competition.location || competition.country || "TBD"}
              </p>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Event Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">
                {competition.startDate && format(new Date(competition.startDate), "MMM d, yyyy")}
                {competition.endDate && competition.endDate !== competition.startDate && 
                  ` - ${format(new Date(competition.endDate), "MMM d, yyyy")}`}
              </p>
            </CardContent>
          </Card>

          {/* Category */}
          {competition.category && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Weight Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{competition.category}</p>
              </CardContent>
            </Card>
          )}

          {/* Points Available */}
          {competition.pointsAvailable && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Ranking Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-primary">
                  {parseFloat(competition.pointsAvailable).toLocaleString()} pts
                </p>
              </CardContent>
            </Card>
          )}

          {/* Registration Deadline */}
          {competition.registrationDeadline && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Registration Deadline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  {format(new Date(competition.registrationDeadline), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Organizer */}
          {competition.organizer && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Organizer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{competition.organizer}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Competition Type & Grade Info */}
        {(competition.competitionType || competition.gradeLevel) && (
          <Card>
            <CardHeader>
              <CardTitle>Competition Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {competition.competitionType && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Type</div>
                    <div className="font-medium capitalize">{competition.competitionType}</div>
                  </div>
                )}
                {competition.gradeLevel && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Grade Level</div>
                    <div className="font-medium capitalize">{competition.gradeLevel}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Metadata */}
        {competition.lastSyncedAt && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last synced: {format(new Date(competition.lastSyncedAt), "PPpp")}
                {competition.simplyCompeteEventId && (
                  <span className="block mt-1">
                    Event ID: {competition.simplyCompeteEventId}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants Section */}
        <Card>
          <Collapsible open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Participants {participants && participants.length > 0 ? `(${participants.length})` : ''}
                  </CardTitle>
                  {isParticipantsOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* Sync Button */}
                {competition.simplyCompeteEventId && (
                  <Button
                    onClick={() => syncParticipantsMutation.mutate()}
                    disabled={syncParticipantsMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid="button-sync-participants"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncParticipantsMutation.isPending ? 'animate-spin' : ''}`} />
                    {syncParticipantsMutation.isPending ? 'Syncing...' : 'Sync Participants from SimplyCompete'}
                  </Button>
                )}

                {/* Participants List */}
                {participantsLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading participants...</div>
                ) : participants && participants.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {participants.map((participant: any) => (
                      <div 
                        key={participant.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        data-testid={`participant-${participant.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {participant.athlete.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{participant.athlete.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {participant.athlete.nationality} • {participant.athlete.worldCategory}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No participants yet</p>
                    {competition.simplyCompeteEventId && (
                      <p className="text-sm mt-1">Click "Sync Participants" to fetch data from SimplyCompete</p>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              {competition.sourceUrl && (
                <Button
                  variant="default"
                  className="flex-1"
                  asChild
                >
                  <a 
                    href={competition.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                    data-testid="button-view-on-simplycompete"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on SimplyCompete
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
