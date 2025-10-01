import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Competition, Athlete, CompetitionParticipant } from "@shared/schema";
import { 
  Trophy,
  Medal,
  Users,
  Shuffle,
  Flag,
  Weight
} from "lucide-react";

interface DrawSheetProps {
  competition: Competition;
  participants: (CompetitionParticipant & { athlete: Athlete })[];
  isLoading: boolean;
}

interface BracketMatch {
  id: string;
  round: number;
  position: number;
  participant1?: CompetitionParticipant & { athlete: Athlete };
  participant2?: CompetitionParticipant & { athlete: Athlete };
  winner?: CompetitionParticipant & { athlete: Athlete };
}

export function DrawSheet({ competition, participants, isLoading }: DrawSheetProps) {
  // Generate tournament bracket structure
  const bracket = useMemo(() => {
    if (!participants || participants.length === 0) return { matches: [], rounds: 0 };

    // Sort participants by seed number (if available) or randomly
    const sortedParticipants = [...participants].sort((a, b) => {
      if (a.seedNumber && b.seedNumber) {
        return a.seedNumber - b.seedNumber;
      }
      return Math.random() - 0.5; // Random if no seeds
    });

    // Calculate number of rounds needed (power of 2)
    const participantCount = sortedParticipants.length;
    const roundCount = Math.ceil(Math.log2(participantCount));
    const totalSlots = Math.pow(2, roundCount);

    const matches: BracketMatch[] = [];
    let matchId = 1;

    // First round - pair up all participants
    for (let i = 0; i < totalSlots; i += 2) {
      matches.push({
        id: `match-${matchId++}`,
        round: 1,
        position: i / 2,
        participant1: sortedParticipants[i] || undefined,
        participant2: sortedParticipants[i + 1] || undefined,
      });
    }

    // Generate subsequent rounds
    let currentRoundMatches = matches;
    for (let round = 2; round <= roundCount; round++) {
      const nextRoundMatches: BracketMatch[] = [];
      for (let i = 0; i < currentRoundMatches.length; i += 2) {
        nextRoundMatches.push({
          id: `match-${matchId++}`,
          round,
          position: i / 2,
          // Winners would be determined in a real tournament system
        });
      }
      matches.push(...nextRoundMatches);
      currentRoundMatches = nextRoundMatches;
    }

    return { matches, rounds: roundCount };
  }, [participants]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="p-6 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Participants Registered
        </h3>
        <p className="text-gray-500">
          This competition doesn't have any registered participants yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competition Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {competition.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center">
                <Flag className="w-4 h-4 mr-1" />
                {competition.city ? `${competition.city}, ${competition.country}` : competition.country}
              </div>
              {competition.category && (
                <div className="flex items-center">
                  <Weight className="w-4 h-4 mr-1" />
                  {competition.category}
                </div>
              )}
              {competition.gradeLevel && (
                <Badge variant="outline">
                  {competition.gradeLevel}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {participants.length}
            </div>
            <div className="text-sm text-gray-500">Participants</div>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Registered Athletes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {participants.map((participant) => (
              <div 
                key={participant.id}
                className="flex items-center space-x-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-800"
                data-testid={`participant-${participant.id}`}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={participant.athlete.profileImage || undefined} 
                    alt={participant.athlete.name}
                  />
                  <AvatarFallback>
                    {participant.athlete.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {participant.athlete.name}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{participant.athlete.nationality}</span>
                    {participant.seedNumber && (
                      <Badge variant="outline" className="text-xs">
                        Seed #{participant.seedNumber}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tournament Bracket */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bracket.rounds > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-max space-y-8">
                {Array.from({ length: bracket.rounds }, (_, roundIndex) => {
                  const roundNumber = roundIndex + 1;
                  const roundMatches = bracket.matches.filter(m => m.round === roundNumber);
                  
                  const getRoundName = (round: number, totalRounds: number) => {
                    if (round === totalRounds) return "Final";
                    if (round === totalRounds - 1) return "Semi-Final";
                    if (round === totalRounds - 2) return "Quarter-Final";
                    if (round === 1) return "First Round";
                    return `Round ${round}`;
                  };

                  return (
                    <div key={roundNumber} className="space-y-4">
                      <h3 className="font-semibold text-lg text-center">
                        {getRoundName(roundNumber, bracket.rounds)}
                      </h3>
                      <div className={`grid gap-4 ${
                        roundNumber === bracket.rounds ? 'grid-cols-1 max-w-md mx-auto' : 
                        roundNumber === bracket.rounds - 1 ? 'grid-cols-2 max-w-2xl mx-auto' :
                        'grid-cols-4'
                      }`}>
                        {roundMatches.map((match) => (
                          <div 
                            key={match.id}
                            className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
                            data-testid={`match-${match.id}`}
                          >
                            <div className="text-center text-xs text-gray-500 mb-2">
                              Match {match.position + 1}
                            </div>
                            <div className="space-y-2">
                              {/* Participant 1 */}
                              <div className={`flex items-center space-x-2 p-2 rounded ${
                                match.participant1 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                                {match.participant1 ? (
                                  <>
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage 
                                        src={match.participant1.athlete.profileImage || undefined} 
                                        alt={match.participant1.athlete.name}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {match.participant1.athlete.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">
                                        {match.participant1.athlete.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {match.participant1.athlete.nationality}
                                      </div>
                                    </div>
                                    {match.participant1.seedNumber && (
                                      <div className="text-xs text-gray-500">
                                        #{match.participant1.seedNumber}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="flex-1 text-center text-sm text-gray-500">
                                    BYE
                                  </div>
                                )}
                              </div>

                              <div className="text-center text-xs text-gray-400">vs</div>

                              {/* Participant 2 */}
                              <div className={`flex items-center space-x-2 p-2 rounded ${
                                match.participant2 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                                {match.participant2 ? (
                                  <>
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage 
                                        src={match.participant2.athlete.profileImage || undefined} 
                                        alt={match.participant2.athlete.name}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {match.participant2.athlete.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">
                                        {match.participant2.athlete.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {match.participant2.athlete.nationality}
                                      </div>
                                    </div>
                                    {match.participant2.seedNumber && (
                                      <div className="text-xs text-gray-500">
                                        #{match.participant2.seedNumber}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="flex-1 text-center text-sm text-gray-500">
                                    BYE
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shuffle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Tournament bracket will be generated once participants are registered.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}