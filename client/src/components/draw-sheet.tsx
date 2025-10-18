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
  if (!countryCode) return "";
  
  // Map 3-letter codes to 2-letter codes for flag emojis
  const countryMap: Record<string, string> = {
    'USA': 'US', 'GBR': 'GB', 'KOR': 'KR', 'JPN': 'JP', 'CHN': 'CN',
    'FRA': 'FR', 'DEU': 'DE', 'GER': 'DE', 'ITA': 'IT', 'ESP': 'ES', 'BRA': 'BR',
    'CAN': 'CA', 'AUS': 'AU', 'MEX': 'MX', 'RUS': 'RU', 'IND': 'IN',
    'NLD': 'NL', 'SWE': 'SE', 'NOR': 'NO', 'DNK': 'DK', 'FIN': 'FI',
    'POL': 'PL', 'TUR': 'TR', 'GRC': 'GR', 'PRT': 'PT', 'BEL': 'BE',
    'AUT': 'AT', 'CHE': 'CH', 'SUI': 'CH', 'IRL': 'IE', 'NZL': 'NZ', 'ZAF': 'ZA',
    'ARG': 'AR', 'CHL': 'CL', 'COL': 'CO', 'PER': 'PE', 'VEN': 'VE',
    'THA': 'TH', 'VNM': 'VN', 'IDN': 'ID', 'MYS': 'MY', 'SGP': 'SG',
    'PHL': 'PH', 'EGY': 'EG', 'MAR': 'MA', 'NGA': 'NG', 'KEN': 'KE',
    'ISR': 'IL', 'SAU': 'SA', 'ARE': 'AE', 'QAT': 'QA', 'KWT': 'KW',
    'CZE': 'CZ', 'HUN': 'HU', 'ROU': 'RO', 'BGR': 'BG', 'HRV': 'HR',
    'SRB': 'RS', 'SVK': 'SK', 'SVN': 'SI', 'UKR': 'UA', 'BLR': 'BY',
    'PAK': 'PK', 'BGD': 'BD', 'LKA': 'LK', 'NPL': 'NP', 'IRN': 'IR',
    'IRQ': 'IQ', 'JOR': 'JO', 'LBN': 'LB', 'SYR': 'SY', 'YEM': 'YE',
    'UZB': 'UZ', 'KAZ': 'KZ', 'TKM': 'TM', 'AFG': 'AF', 'MNG': 'MN',
  };

  const upperCode = countryCode.toUpperCase().trim();
  
  // Try to get 2-letter code
  let twoLetterCode = countryMap[upperCode];
  
  // If not in map and it's already 2 letters, use it
  if (!twoLetterCode && upperCode.length === 2) {
    twoLetterCode = upperCode;
  }
  
  // If not in map and it's 3 letters, try first 2
  if (!twoLetterCode && upperCode.length === 3) {
    twoLetterCode = upperCode.slice(0, 2);
  }
  
  if (!twoLetterCode) return "";
  
  try {
    // Convert country code to flag emoji using regional indicator symbols
    const codePoints = twoLetterCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "";
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
  const roundWidth = 220;
  const connectorWidth = 40;

  return (
    <div className="space-y-6">
      {/* Bracket Display */}
      <Card className="p-6 overflow-x-auto">
        <div className="min-w-max relative">
          {/* Round Headers */}
          <div className="flex mb-6">
            {rounds.map((round, roundIndex) => (
              <div
                key={roundIndex}
                className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300"
                style={{ width: `${roundWidth + connectorWidth}px` }}
              >
                {getRoundLabel(roundIndex, rounds.length)}
              </div>
            ))}
          </div>

          {/* SVG for connector lines */}
          <svg 
            className="absolute top-16 left-0 pointer-events-none"
            style={{ 
              width: '100%', 
              height: `${Math.max(...rounds.map((r, idx) => {
                const spacing = Math.pow(2, idx);
                const topMargin = (matchHeight + matchGap) * (spacing - 1) / 2;
                return topMargin + r.length * ((matchHeight + matchGap) * spacing);
              }))}px`,
              zIndex: 0
            }}
          >
            {rounds.map((round, roundIndex) => {
              if (roundIndex === rounds.length - 1) return null; // No connectors after final
              
              const spacing = Math.pow(2, roundIndex);
              const topMargin = (matchHeight + matchGap) * (spacing - 1) / 2;
              const x1 = roundIndex * (roundWidth + connectorWidth) + roundWidth;
              const x2 = x1 + connectorWidth;
              
              return round.map((match, matchIndex) => {
                const y1 = topMargin + matchIndex * ((matchHeight + matchGap) * spacing) + matchHeight / 2;
                const y2 = topMargin + Math.floor(matchIndex / 2) * ((matchHeight + matchGap) * spacing * 2) + matchHeight / 2 + (matchHeight + matchGap) * spacing / 2;
                
                // Every pair of matches connects to one match in next round
                if (matchIndex % 2 === 0) {
                  const y1Next = topMargin + (matchIndex + 1) * ((matchHeight + matchGap) * spacing) + matchHeight / 2;
                  
                  return (
                    <g key={`connector-${roundIndex}-${matchIndex}`}>
                      {/* Horizontal line from match 1 */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x1 + connectorWidth / 2}
                        y2={y1}
                        className="stroke-gray-400 dark:stroke-gray-500"
                        strokeWidth="2"
                      />
                      {/* Horizontal line from match 2 */}
                      <line
                        x1={x1}
                        y1={y1Next}
                        x2={x1 + connectorWidth / 2}
                        y2={y1Next}
                        className="stroke-gray-400 dark:stroke-gray-500"
                        strokeWidth="2"
                      />
                      {/* Vertical line connecting them */}
                      <line
                        x1={x1 + connectorWidth / 2}
                        y1={y1}
                        x2={x1 + connectorWidth / 2}
                        y2={y1Next}
                        className="stroke-gray-400 dark:stroke-gray-500"
                        strokeWidth="2"
                      />
                      {/* Horizontal line to next round */}
                      <line
                        x1={x1 + connectorWidth / 2}
                        y1={y2}
                        x2={x2}
                        y2={y2}
                        className="stroke-gray-400 dark:stroke-gray-500"
                        strokeWidth="2"
                      />
                    </g>
                  );
                }
                return null;
              });
            })}
          </svg>

          {/* Bracket Structure */}
          <div className="flex relative" style={{ zIndex: 1 }}>
            {rounds.map((round, roundIndex) => {
              const spacing = Math.pow(2, roundIndex);
              const topMargin = (matchHeight + matchGap) * (spacing - 1) / 2;
              
              return (
                <div
                  key={roundIndex}
                  className="flex flex-col"
                  style={{ 
                    width: `${roundWidth + connectorWidth}px`,
                    gap: `${(matchHeight + matchGap) * spacing - matchGap}px`,
                    marginTop: `${topMargin}px`
                  }}
                >
                  {round.map((match, matchIndex) => (
                    <div
                      key={matchIndex}
                      className="relative"
                      style={{ height: `${matchHeight}px`, width: `${roundWidth}px` }}
                    >
                      {/* Match Container */}
                      <div className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-full">
                        {/* Athlete 1 */}
                        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 dark:text-gray-400 text-xs w-4">
                              {match[0].seed > 0 ? match[0].seed : ''}
                            </span>
                            <span className="font-medium truncate flex-1" title={match[0].name}>
                              {match[0].name.length > 15 ? match[0].name.substring(0, 15) + '...' : match[0].name}
                            </span>
                            {match[0].country && (
                              <span className="text-base" title={match[0].country}>
                                {getCountryFlag(match[0].country)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Athlete 2 */}
                        {match[1] && (
                          <div className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500 dark:text-gray-400 text-xs w-4">
                                {match[1].seed > 0 ? match[1].seed : ''}
                              </span>
                              <span className="font-medium truncate flex-1" title={match[1].name}>
                                {match[1].name.length > 15 ? match[1].name.substring(0, 15) + '...' : match[1].name}
                              </span>
                              {match[1].country && (
                                <span className="text-base" title={match[1].country}>
                                  {getCountryFlag(match[1].country)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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
