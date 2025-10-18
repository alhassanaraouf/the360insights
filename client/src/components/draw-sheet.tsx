import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { Competition, Athlete, CompetitionParticipant } from "@shared/schema";
import { Users } from "lucide-react";

interface DrawSheetProps {
  competition: Competition;
  participants: (CompetitionParticipant & { athlete: Athlete })[];
  isLoading: boolean;
}

interface BracketParticipant {
  seed: number;
  name: string;
  country: string;
  participant: CompetitionParticipant & { athlete: Athlete };
}

// Helper function to get country flag emoji
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 3) return "🏳️";
  
  // Map 3-letter codes to 2-letter codes for flag emojis
  const countryMap: Record<string, string> = {
    'USA': 'US', 'GBR': 'GB', 'KOR': 'KR', 'JPN': 'JP', 'CHN': 'CN',
    'FRA': 'FR', 'DEU': 'DE', 'ITA': 'IT', 'ESP': 'ES', 'BRA': 'BR',
    'CAN': 'CA', 'AUS': 'AU', 'MEX': 'MX', 'RUS': 'RU', 'IND': 'IN',
    'NLD': 'NL', 'SWE': 'SE', 'NOR': 'NO', 'DNK': 'DK', 'FIN': 'FI',
    'POL': 'PL', 'TUR': 'TR', 'GRC': 'GR', 'PRT': 'PT', 'BEL': 'BE',
    'AUT': 'AT', 'CHE': 'CH', 'IRL': 'IE', 'NZL': 'NZ', 'ZAF': 'ZA',
    'ARG': 'AR', 'CHL': 'CL', 'COL': 'CO', 'PER': 'PE', 'VEN': 'VE',
    'THA': 'TH', 'VNM': 'VN', 'IDN': 'ID', 'MYS': 'MY', 'SGP': 'SG',
    'PHL': 'PH', 'EGY': 'EG', 'MAR': 'MA', 'NGA': 'NG', 'KEN': 'KE',
    'ISR': 'IL', 'SAU': 'SA', 'ARE': 'AE', 'QAT': 'QA', 'KWT': 'KW',
    'CZE': 'CZ', 'HUN': 'HU', 'ROU': 'RO', 'BGR': 'BG', 'HRV': 'HR',
    'SRB': 'RS', 'SVK': 'SK', 'SVN': 'SI', 'UKR': 'UA', 'BLR': 'BY',
    'PAK': 'PK', 'BGD': 'BD', 'LKA': 'LK', 'NPL': 'NP', 'IRN': 'IR',
    'IRQ': 'IQ', 'JOR': 'JO', 'LBN': 'LB', 'SYR': 'SY', 'YEM': 'YE',
  };

  const twoLetterCode = countryMap[countryCode.toUpperCase()] || countryCode.slice(0, 2);
  
  try {
    // Convert country code to flag emoji
    const codePoints = twoLetterCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "🏳️";
  }
}

export function DrawSheet({ competition, participants, isLoading }: DrawSheetProps) {
  const bracket = useMemo(() => {
    if (!participants || participants.length === 0) {
      return null;
    }

    // Shuffle and assign seed numbers randomly
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const seededParticipants: BracketParticipant[] = shuffled.map((p, idx) => ({
      seed: idx + 1,
      name: p.athlete.name,
      country: p.athlete.nationality,
      participant: p,
    }));

    // Calculate bracket size (next power of 2, max 128)
    let bracketSize = Math.pow(2, Math.ceil(Math.log2(seededParticipants.length)));
    bracketSize = Math.min(bracketSize, 128); // Cap at 128
    
    // Pad with byes if needed
    while (seededParticipants.length < bracketSize) {
      seededParticipants.push({
        seed: 0,
        name: "BYE",
        country: "",
        participant: null as any,
      });
    }

    // Calculate number of rounds
    const totalRounds = Math.log2(bracketSize);
    
    // Generate rounds structure
    const rounds: BracketParticipant[][][] = [];
    let currentMatches = seededParticipants;
    
    for (let round = 0; round < totalRounds; round++) {
      const matchPairs: BracketParticipant[][] = [];
      for (let i = 0; i < currentMatches.length; i += 2) {
        matchPairs.push([currentMatches[i], currentMatches[i + 1]]);
      }
      rounds.push(matchPairs);
      // For next round, take winner slots (we'll just take first of each pair for display)
      currentMatches = matchPairs.map(pair => pair[0]);
    }

    return { rounds, bracketSize, totalRounds };
  }, [participants]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="p-6 text-center">
        <Users className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Participants Registered
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          This competition doesn't have any registered participants yet.
        </p>
      </div>
    );
  }

  if (!bracket) return null;

  const { rounds, bracketSize } = bracket;
  
  // Round labels based on bracket size
  const getRoundLabel = (roundIndex: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - roundIndex;
    
    if (roundsFromEnd === 1) return "Final";
    if (roundsFromEnd === 2) return "Semi Finals";
    if (roundsFromEnd === 3) return "Quarter Finals";
    if (roundsFromEnd === 4) return "Round of 16";
    if (roundsFromEnd === 5) return "Round of 32";
    if (roundsFromEnd === 6) return "Round of 64";
    if (roundsFromEnd === 7) return "Round of 128";
    
    return `Round ${roundIndex + 1}`;
  };

  const matchHeight = 60;
  const matchGap = 20;

  return (
    <div className="space-y-6">
      {/* Bracket Display */}
      <Card className="p-6 overflow-x-auto">
        <div className="min-w-max">
          {/* Round Headers */}
          <div className="flex gap-8 mb-6">
            {rounds.map((round, roundIndex) => (
              <div
                key={roundIndex}
                className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300"
                style={{ minWidth: '200px' }}
              >
                {getRoundLabel(roundIndex, rounds.length)}
              </div>
            ))}
          </div>

          {/* Bracket Structure */}
          <div className="flex gap-8">
            {rounds.map((round, roundIndex) => {
              const spacing = Math.pow(2, roundIndex);
              const topMargin = (matchHeight + matchGap) * (spacing - 1) / 2;
              
              return (
                <div
                  key={roundIndex}
                  className="flex flex-col relative"
                  style={{ 
                    minWidth: '200px',
                    gap: `${(matchHeight + matchGap) * spacing - matchGap}px`,
                    marginTop: `${topMargin}px`
                  }}
                >
                  {round.map((match, matchIndex) => (
                    <div
                      key={matchIndex}
                      className="relative"
                      style={{ height: `${matchHeight}px` }}
                    >
                      {/* Match Container */}
                      <div className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800">
                        {/* Athlete 1 */}
                        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 dark:text-gray-400 text-xs">
                              {match[0].seed > 0 ? match[0].seed : ''}
                            </span>
                            <span className="font-medium truncate" title={match[0].name}>
                              {match[0].name.length > 18 ? match[0].name.substring(0, 18) + '...' : match[0].name}
                            </span>
                            {match[0].country && (
                              <span className="text-lg ml-auto">
                                {getCountryFlag(match[0].country)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Athlete 2 */}
                        {match[1] && (
                          <div className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {match[1].seed > 0 ? match[1].seed : ''}
                              </span>
                              <span className="font-medium truncate" title={match[1].name}>
                                {match[1].name.length > 18 ? match[1].name.substring(0, 18) + '...' : match[1].name}
                              </span>
                              {match[1].country && (
                                <span className="text-lg ml-auto">
                                  {getCountryFlag(match[1].country)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Connector line to next round */}
                      {roundIndex < rounds.length - 1 && (
                        <div
                          className="absolute top-1/2 -right-8 w-8 h-0.5 bg-gray-300 dark:bg-gray-600"
                          style={{ transform: 'translateY(-50%)' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Participant Count */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {participants.length} participants • {bracketSize}-person bracket
      </div>
    </div>
  );
}
