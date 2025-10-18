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

    // Split into two halves
    const halfSize = bracketSize / 2;
    const leftPool = seededParticipants.slice(0, halfSize);
    const rightPool = seededParticipants.slice(halfSize);

    // Generate rounds for left pool (goes left to right)
    const generateRounds = (pool: BracketParticipant[]) => {
      const rounds: BracketParticipant[][][] = [];
      let currentMatches = pool;
      
      while (currentMatches.length > 1) {
        const matchPairs: BracketParticipant[][] = [];
        for (let i = 0; i < currentMatches.length; i += 2) {
          matchPairs.push([currentMatches[i], currentMatches[i + 1] || currentMatches[i]]);
        }
        rounds.push(matchPairs);
        currentMatches = matchPairs.map(pair => pair[0]);
      }
      
      return rounds;
    };

    const leftRounds = generateRounds(leftPool);
    const rightRounds = generateRounds(rightPool);

    return { leftRounds, rightRounds, bracketSize };
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

  const { leftRounds, rightRounds, bracketSize } = bracket;
  
  // Round labels based on bracket size
  const getRoundLabel = (roundIndex: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - roundIndex;
    
    if (roundsFromEnd === 1) return "Final";
    if (roundsFromEnd === 2) return "Semifinals";
    if (roundsFromEnd === 3) return "Quarterfinals";
    if (roundsFromEnd === 4) return "Round of 16";
    if (roundsFromEnd === 5) return "Round of 32";
    if (roundsFromEnd === 6) return "Round of 64";
    if (roundsFromEnd === 7) return "Round of 128";
    
    return `Round ${roundIndex + 1}`;
  };

  const matchHeight = 60;
  const matchGap = 20;
  const roundWidth = 200;
  const connectorWidth = 40;

  // Render a match box
  const MatchBox = ({ match }: { match: BracketParticipant[] }) => (
    <div className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-full">
      {/* Athlete 1 */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400 text-xs w-5 flex-shrink-0">
            {match[0].seed > 0 ? match[0].seed : ''}
          </span>
          <span className="font-medium truncate flex-1" title={match[0].name}>
            {match[0].name.length > 14 ? match[0].name.substring(0, 14) + '...' : match[0].name}
          </span>
          {match[0].country && (
            <span className="text-base flex-shrink-0" title={match[0].country}>
              {getCountryFlag(match[0].country)}
            </span>
          )}
        </div>
      </div>
      
      {/* Athlete 2 */}
      {match[1] && (
        <div className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400 text-xs w-5 flex-shrink-0">
              {match[1].seed > 0 ? match[1].seed : ''}
            </span>
            <span className="font-medium truncate flex-1" title={match[1].name}>
              {match[1].name.length > 14 ? match[1].name.substring(0, 14) + '...' : match[1].name}
            </span>
            {match[1].country && (
              <span className="text-base flex-shrink-0" title={match[1].country}>
                {getCountryFlag(match[1].country)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Bracket Display */}
      <Card className="p-6 overflow-x-auto">
        <div className="min-w-max">
          {/* Headers */}
          <div className="flex justify-center mb-6">
            {/* Left side headers */}
            <div className="flex">
              {leftRounds.map((round, roundIndex) => (
                <div
                  key={`left-header-${roundIndex}`}
                  className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300"
                  style={{ width: `${roundWidth + connectorWidth}px` }}
                >
                  {getRoundLabel(roundIndex, leftRounds.length + 1)}
                </div>
              ))}
            </div>
            
            {/* Finals header in the middle */}
            <div
              className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300"
              style={{ width: `${roundWidth}px` }}
            >
              Final
            </div>
            
            {/* Right side headers (reversed) */}
            <div className="flex">
              {rightRounds.slice().reverse().map((round, roundIndex) => (
                <div
                  key={`right-header-${roundIndex}`}
                  className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300"
                  style={{ width: `${connectorWidth + roundWidth}px` }}
                >
                  {getRoundLabel(rightRounds.length - 1 - roundIndex, rightRounds.length + 1)}
                </div>
              ))}
            </div>
          </div>

          {/* Bracket */}
          <div className="flex items-center justify-center">
            {/* Left Side */}
            <div className="flex">
              {leftRounds.map((round, roundIndex) => {
                const spacing = Math.pow(2, roundIndex);
                const topMargin = (matchHeight + matchGap) * (spacing - 1) / 2;
                
                return (
                  <div key={`left-round-${roundIndex}`} className="flex items-start">
                    <div
                      className="flex flex-col"
                      style={{ 
                        width: `${roundWidth}px`,
                        gap: `${(matchHeight + matchGap) * spacing - matchGap}px`,
                        marginTop: `${topMargin}px`
                      }}
                    >
                      {round.map((match, matchIndex) => (
                        <div
                          key={matchIndex}
                          style={{ height: `${matchHeight}px` }}
                        >
                          <MatchBox match={match} />
                        </div>
                      ))}
                    </div>
                    
                    {/* Connectors */}
                    {roundIndex < leftRounds.length - 1 && (
                      <svg 
                        width={connectorWidth} 
                        height={(matchHeight + matchGap) * Math.pow(2, roundIndex) * round.length}
                        style={{ marginTop: `${topMargin}px` }}
                      >
                        {round.map((_, matchIndex) => {
                          if (matchIndex % 2 === 0) {
                            const y1 = matchIndex * ((matchHeight + matchGap) * spacing) + matchHeight / 2;
                            const y2 = (matchIndex + 1) * ((matchHeight + matchGap) * spacing) + matchHeight / 2;
                            const yMid = (y1 + y2) / 2;
                            
                            return (
                              <g key={matchIndex}>
                                <line x1="0" y1={y1} x2={connectorWidth / 2} y2={y1} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                <line x1="0" y1={y2} x2={connectorWidth / 2} y2={y2} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                <line x1={connectorWidth / 2} y1={y1} x2={connectorWidth / 2} y2={y2} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                <line x1={connectorWidth / 2} y1={yMid} x2={connectorWidth} y2={yMid} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                              </g>
                            );
                          }
                          return null;
                        })}
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Finals */}
            <div
              className="flex flex-col justify-center"
              style={{ 
                width: `${roundWidth}px`,
                minHeight: `${matchHeight}px`
              }}
            >
              <div style={{ height: `${matchHeight}px` }}>
                <div className="border-2 border-yellow-500 dark:border-yellow-400 rounded bg-yellow-50 dark:bg-yellow-900/20 h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">FINAL</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex">
              {rightRounds.slice().reverse().map((round, roundIndex) => {
                const actualRoundIndex = rightRounds.length - 1 - roundIndex;
                const spacing = Math.pow(2, actualRoundIndex);
                const topMargin = (matchHeight + matchGap) * (spacing - 1) / 2;
                
                return (
                  <div key={`right-round-${roundIndex}`} className="flex items-start">
                    {/* Connectors */}
                    {roundIndex > 0 && (
                      <svg 
                        width={connectorWidth} 
                        height={(matchHeight + matchGap) * Math.pow(2, actualRoundIndex) * round.length}
                        style={{ marginTop: `${topMargin}px` }}
                      >
                        {round.map((_, matchIndex) => {
                          if (matchIndex % 2 === 0) {
                            const y1 = matchIndex * ((matchHeight + matchGap) * spacing) + matchHeight / 2;
                            const y2 = (matchIndex + 1) * ((matchHeight + matchGap) * spacing) + matchHeight / 2;
                            const yMid = (y1 + y2) / 2;
                            
                            return (
                              <g key={matchIndex}>
                                <line x1={connectorWidth} y1={y1} x2={connectorWidth / 2} y2={y1} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                <line x1={connectorWidth} y1={y2} x2={connectorWidth / 2} y2={y2} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                <line x1={connectorWidth / 2} y1={y1} x2={connectorWidth / 2} y2={y2} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                <line x1={connectorWidth / 2} y1={yMid} x2="0" y2={yMid} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                              </g>
                            );
                          }
                          return null;
                        })}
                      </svg>
                    )}
                    
                    <div
                      className="flex flex-col"
                      style={{ 
                        width: `${roundWidth}px`,
                        gap: `${(matchHeight + matchGap) * spacing - matchGap}px`,
                        marginTop: `${topMargin}px`
                      }}
                    >
                      {round.map((match, matchIndex) => (
                        <div
                          key={matchIndex}
                          style={{ height: `${matchHeight}px` }}
                        >
                          <MatchBox match={match} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
