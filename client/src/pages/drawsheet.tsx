import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

interface BracketParticipant {
  seed: number;
  name: string;
  country: string;
  athleteId?: number;
}

// Helper function to get country flag emoji
function getCountryFlag(countryCode: string): string {
  if (!countryCode) return "";
  
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
  let twoLetterCode = countryMap[upperCode];
  
  if (!twoLetterCode && upperCode.length === 2) {
    twoLetterCode = upperCode;
  }
  
  if (!twoLetterCode && upperCode.length === 3) {
    twoLetterCode = upperCode.slice(0, 2);
  }
  
  if (!twoLetterCode) return "";
  
  try {
    const codePoints = twoLetterCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "";
  }
}

export default function DrawsheetPage() {
  const [, params] = useRoute("/competition/:competitionId/drawsheet/:weightCategory");
  const competitionId = params?.competitionId;
  const weightCategory = decodeURIComponent(params?.weightCategory || "");

  // Fetch competition details
  const { data: competition } = useQuery<any>({
    queryKey: [`/api/competitions/${competitionId}`],
    enabled: !!competitionId,
  });

  // Fetch ALL participants for this weight category
  const { data: participants, isLoading } = useQuery<any[]>({
    queryKey: [`/api/competitions/${competitionId}/participants`, 'drawsheet', weightCategory],
    queryFn: async () => {
      if (!competitionId || !weightCategory) return [];
      
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
        weightCategory: weightCategory,
      });
      
      const response = await fetch(`/api/competitions/${competitionId}/participants?${params}`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      const data = await response.json();
      return data.participants || [];
    },
    enabled: !!competitionId && !!weightCategory,
  });

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
      athleteId: p.athlete.id,
    }));

    // Calculate bracket size - minimum 64, max 128
    let bracketSize = Math.max(64, Math.pow(2, Math.ceil(Math.log2(seededParticipants.length))));
    bracketSize = Math.min(bracketSize, 128);
    
    // Pad with byes if needed
    while (seededParticipants.length < bracketSize) {
      seededParticipants.push({
        seed: 0,
        name: "BYE",
        country: "",
      });
    }

    // Split into two halves
    const halfSize = bracketSize / 2;
    const leftPool = seededParticipants.slice(0, halfSize);
    const rightPool = seededParticipants.slice(halfSize);

    // Generate rounds
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

  const matchHeight = 70;
  const matchGap = 15;
  const roundWidth = 200;
  const connectorWidth = 40;

  const getMatchCenterY = (roundIndex: number, matchIndex: number): number => {
    const spacing = Math.pow(2, roundIndex);
    const topMargin = (matchHeight + matchGap) * (spacing - 1) / 2;
    const gap = (matchHeight + matchGap) * spacing - matchGap;
    return topMargin + matchHeight / 2 + matchIndex * (matchHeight + gap);
  };

  const MatchBox = ({ match }: { match: BracketParticipant[] }) => (
    <div className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800" style={{ height: `${matchHeight}px` }}>
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" style={{ height: '50%' }}>
        <div className="flex items-center gap-2 text-sm h-full">
          <span className="text-gray-500 dark:text-gray-400 text-xs w-5 flex-shrink-0">
            {match[0].seed > 0 ? match[0].seed : ''}
          </span>
          {match[0].country && (
            <span className="text-base flex-shrink-0" title={match[0].country}>
              {getCountryFlag(match[0].country)}
            </span>
          )}
          {match[0].athleteId ? (
            <Link 
              href={`/athlete360?athlete=${match[0].athleteId}`}
              className="font-medium truncate flex-1 hover:text-primary hover:underline"
              title={match[0].name}
              data-testid={`link-athlete-${match[0].athleteId}`}
            >
              {match[0].name.length > 14 ? match[0].name.substring(0, 14) + '...' : match[0].name}
            </Link>
          ) : (
            <span className="font-medium truncate flex-1 text-gray-400" title={match[0].name}>
              {match[0].name}
            </span>
          )}
        </div>
      </div>
      
      {match[1] && (
        <div className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" style={{ height: '50%' }}>
          <div className="flex items-center gap-2 text-sm h-full">
            <span className="text-gray-500 dark:text-gray-400 text-xs w-5 flex-shrink-0">
              {match[1].seed > 0 ? match[1].seed : ''}
            </span>
            {match[1].country && (
              <span className="text-base flex-shrink-0" title={match[1].country}>
                {getCountryFlag(match[1].country)}
              </span>
            )}
            {match[1].athleteId ? (
              <Link 
                href={`/athlete360?athlete=${match[1].athleteId}`}
                className="font-medium truncate flex-1 hover:text-primary hover:underline"
                title={match[1].name}
                data-testid={`link-athlete-${match[1].athleteId}`}
              >
                {match[1].name.length > 14 ? match[1].name.substring(0, 14) + '...' : match[1].name}
              </Link>
            ) : (
              <span className="font-medium truncate flex-1 text-gray-400" title={match[1].name}>
                {match[1].name}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!bracket) {
    return (
      <div className="container mx-auto p-6">
        <Link href={`/competition/${competitionId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Competition
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Participants</h3>
            <p className="text-gray-500 dark:text-gray-400">
              No participants found for this weight category.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { leftRounds, rightRounds, bracketSize } = bracket;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/competition/${competitionId}`}>
            <Button variant="ghost" className="mb-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Competition
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            {competition?.name || 'Competition'} - Drawsheet
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {weightCategory}
          </p>
        </div>
      </div>

      {/* Bracket Display */}
      <Card className="overflow-x-auto">
        <CardContent className="p-6">
          <div className="min-w-max">
            {/* Headers */}
            <div className="flex justify-center mb-6">
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
              
              <div
                className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300"
                style={{ width: `${roundWidth}px` }}
              >
                Final
              </div>
              
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
                  const gap = (matchHeight + matchGap) * spacing - matchGap;
                  const columnHeight = topMargin * 2 + round.length * matchHeight + (round.length - 1) * gap;
                  
                  return (
                    <div key={`left-round-${roundIndex}`} className="flex items-start">
                      <div
                        className="flex flex-col"
                        style={{ 
                          width: `${roundWidth}px`,
                          gap: `${gap}px`,
                          marginTop: `${topMargin}px`
                        }}
                      >
                        {round.map((match, matchIndex) => (
                          <div key={matchIndex}>
                            <MatchBox match={match} />
                          </div>
                        ))}
                      </div>
                      
                      {roundIndex < leftRounds.length - 1 && (
                        <svg 
                          width={connectorWidth} 
                          height={columnHeight}
                          style={{ flexShrink: 0 }}
                        >
                          {round.map((_, matchIndex) => {
                            if (matchIndex % 2 === 0 && matchIndex + 1 < round.length) {
                              const y1 = getMatchCenterY(roundIndex, matchIndex);
                              const y2 = getMatchCenterY(roundIndex, matchIndex + 1);
                              const nextMatchIndex = Math.floor(matchIndex / 2);
                              const yNext = getMatchCenterY(roundIndex + 1, nextMatchIndex);
                              
                              return (
                                <g key={matchIndex}>
                                  <line x1="0" y1={y1} x2={connectorWidth / 2} y2={y1} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                  <line x1="0" y1={y2} x2={connectorWidth / 2} y2={y2} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                  <line x1={connectorWidth / 2} y1={y1} x2={connectorWidth / 2} y2={y2} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                  <line x1={connectorWidth / 2} y1={yNext} x2={connectorWidth} y2={yNext} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
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
              <div className="flex flex-col justify-center" style={{ width: `${roundWidth}px` }}>
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
                  const gap = (matchHeight + matchGap) * spacing - matchGap;
                  const columnHeight = topMargin * 2 + round.length * matchHeight + (round.length - 1) * gap;
                  
                  return (
                    <div key={`right-round-${roundIndex}`} className="flex items-start">
                      {roundIndex > 0 && (
                        <svg 
                          width={connectorWidth} 
                          height={columnHeight}
                          style={{ flexShrink: 0 }}
                        >
                          {round.map((_, matchIndex) => {
                            if (matchIndex % 2 === 0 && matchIndex + 1 < round.length) {
                              const y1 = getMatchCenterY(actualRoundIndex, matchIndex);
                              const y2 = getMatchCenterY(actualRoundIndex, matchIndex + 1);
                              const nextMatchIndex = Math.floor(matchIndex / 2);
                              const yNext = getMatchCenterY(actualRoundIndex + 1, nextMatchIndex);
                              
                              return (
                                <g key={matchIndex}>
                                  <line x1={connectorWidth} y1={y1} x2={connectorWidth / 2} y2={y1} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                  <line x1={connectorWidth} y1={y2} x2={connectorWidth / 2} y2={y2} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                  <line x1={connectorWidth / 2} y1={y1} x2={connectorWidth / 2} y2={y2} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
                                  <line x1={connectorWidth / 2} y1={yNext} x2="0" y2={yNext} stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500" />
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
                          gap: `${gap}px`,
                          marginTop: `${topMargin}px`
                        }}
                      >
                        {round.map((match, matchIndex) => (
                          <div key={matchIndex}>
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

          {/* Stats */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {participants?.length || 0} participants • {bracketSize}-person bracket
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
