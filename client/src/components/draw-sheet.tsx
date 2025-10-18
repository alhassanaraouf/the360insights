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

    // Calculate bracket size (next power of 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(seededParticipants.length)));
    
    // Pad with byes if needed
    while (seededParticipants.length < bracketSize) {
      seededParticipants.push({
        seed: 0,
        name: "BYE",
        country: "",
        participant: null as any,
      });
    }

    // Split into two pools
    const halfSize = bracketSize / 2;
    const poolA = seededParticipants.slice(0, halfSize);
    const poolB = seededParticipants.slice(halfSize);

    return { poolA, poolB, totalRounds: Math.log2(bracketSize) };
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

  const { poolA, poolB } = bracket;

  return (
    <div className="space-y-6">
      {/* Bracket Display */}
      <Card className="p-6 overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Pool Labels */}
          <div className="flex justify-between mb-6">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">Pool A</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">Pool B</div>
          </div>

          {/* Bracket Structure */}
          <div className="relative">
            <svg className="w-full" style={{ height: `${poolA.length * 40 + 100}px` }}>
              {/* Pool A - Left Side */}
              {poolA.map((p, idx) => {
                const y = idx * 40 + 20;
                return (
                  <g key={`poolA-${idx}`}>
                    {/* Athlete name */}
                    <text
                      x="10"
                      y={y}
                      className="text-sm fill-gray-900 dark:fill-white"
                      data-testid={`pool-a-athlete-${idx}`}
                    >
                      ({p.seed}) {p.name.length > 25 ? p.name.substring(0, 25) + '...' : p.name} {p.country}
                    </text>
                    
                    {/* First round bracket line */}
                    <line
                      x1="350"
                      y1={y - 5}
                      x2="380"
                      y2={y - 5}
                      className="stroke-gray-400 dark:stroke-gray-500"
                      strokeWidth="1"
                    />
                    
                    {/* Connect pairs for first round */}
                    {idx % 2 === 0 && idx + 1 < poolA.length && (
                      <>
                        <line
                          x1="380"
                          y1={y - 5}
                          x2="380"
                          y2={y + 35}
                          className="stroke-gray-400 dark:stroke-gray-500"
                          strokeWidth="1"
                        />
                        <line
                          x1="380"
                          y1={y + 15}
                          x2="420"
                          y2={y + 15}
                          className="stroke-gray-400 dark:stroke-gray-500"
                          strokeWidth="1"
                        />
                      </>
                    )}
                  </g>
                );
              })}

              {/* Second round connections - Pool A */}
              {Array.from({ length: poolA.length / 4 }).map((_, idx) => {
                const baseY = idx * 160 + 35;
                return (
                  <g key={`poolA-r2-${idx}`}>
                    <line
                      x1="420"
                      y1={baseY}
                      x2="420"
                      y2={baseY + 80}
                      className="stroke-gray-400 dark:stroke-gray-500"
                      strokeWidth="1"
                    />
                    <line
                      x1="420"
                      y1={baseY + 40}
                      x2="460"
                      y2={baseY + 40}
                      className="stroke-gray-400 dark:stroke-gray-500"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

              {/* Semi-finals - Pool A */}
              {poolA.length >= 8 && (
                <g>
                  <line
                    x1="460"
                    y1="75"
                    x2="460"
                    y2={poolA.length >= 16 ? "235" : "155"}
                    className="stroke-gray-400 dark:stroke-gray-500"
                    strokeWidth="1"
                  />
                  <line
                    x1="460"
                    y1={poolA.length >= 16 ? "155" : "115"}
                    x2="500"
                    y2={poolA.length >= 16 ? "155" : "115"}
                    className="stroke-gray-400 dark:stroke-gray-500"
                    strokeWidth="1"
                  />
                </g>
              )}

              {/* Pool B - Right Side */}
              {poolB.map((p, idx) => {
                const y = idx * 40 + 20;
                const svgWidth = 1200;
                return (
                  <g key={`poolB-${idx}`}>
                    {/* Athlete name */}
                    <text
                      x={svgWidth - 10}
                      y={y}
                      className="text-sm fill-gray-900 dark:fill-white"
                      textAnchor="end"
                      data-testid={`pool-b-athlete-${idx}`}
                    >
                      ({p.seed}) {p.name.length > 25 ? p.name.substring(0, 25) + '...' : p.name} {p.country}
                    </text>
                    
                    {/* First round bracket line */}
                    <line
                      x1={svgWidth - 350}
                      y1={y - 5}
                      x2={svgWidth - 380}
                      y2={y - 5}
                      className="stroke-gray-400 dark:stroke-gray-500"
                      strokeWidth="1"
                    />
                    
                    {/* Connect pairs for first round */}
                    {idx % 2 === 0 && idx + 1 < poolB.length && (
                      <>
                        <line
                          x1={svgWidth - 380}
                          y1={y - 5}
                          x2={svgWidth - 380}
                          y2={y + 35}
                          className="stroke-gray-400 dark:stroke-gray-500"
                          strokeWidth="1"
                        />
                        <line
                          x1={svgWidth - 380}
                          y1={y + 15}
                          x2={svgWidth - 420}
                          y2={y + 15}
                          className="stroke-gray-400 dark:stroke-gray-500"
                          strokeWidth="1"
                        />
                      </>
                    )}
                  </g>
                );
              })}

              {/* Second round connections - Pool B */}
              {Array.from({ length: poolB.length / 4 }).map((_, idx) => {
                const baseY = idx * 160 + 35;
                const svgWidth = 1200;
                return (
                  <g key={`poolB-r2-${idx}`}>
                    <line
                      x1={svgWidth - 420}
                      y1={baseY}
                      x2={svgWidth - 420}
                      y2={baseY + 80}
                      className="stroke-gray-400 dark:stroke-gray-500"
                      strokeWidth="1"
                    />
                    <line
                      x1={svgWidth - 420}
                      y1={baseY + 40}
                      x2={svgWidth - 460}
                      y2={baseY + 40}
                      className="stroke-gray-400 dark:stroke-gray-500"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

              {/* Semi-finals - Pool B */}
              {poolB.length >= 8 && (
                <g>
                  <line
                    x1="740"
                    y1="75"
                    x2="740"
                    y2={poolB.length >= 16 ? "235" : "155"}
                    className="stroke-gray-400 dark:stroke-gray-500"
                    strokeWidth="1"
                  />
                  <line
                    x1="740"
                    y1={poolB.length >= 16 ? "155" : "115"}
                    x2="700"
                    y2={poolB.length >= 16 ? "155" : "115"}
                    className="stroke-gray-400 dark:stroke-gray-500"
                    strokeWidth="1"
                  />
                </g>
              )}

              {/* Finals connection in the middle */}
              <g>
                <line
                  x1="500"
                  y1={poolA.length >= 16 ? "155" : "115"}
                  x2="550"
                  y2={poolA.length >= 16 ? "155" : "115"}
                  className="stroke-gray-400 dark:stroke-gray-500"
                  strokeWidth="2"
                />
                <line
                  x1="650"
                  y1={poolB.length >= 16 ? "155" : "115"}
                  x2="700"
                  y2={poolB.length >= 16 ? "155" : "115"}
                  className="stroke-gray-400 dark:stroke-gray-500"
                  strokeWidth="2"
                />
                <circle
                  cx="600"
                  cy={poolA.length >= 16 ? "155" : "115"}
                  r="8"
                  className="fill-yellow-400 stroke-yellow-600"
                  strokeWidth="2"
                />
                <text
                  x="600"
                  y={poolA.length >= 16 ? "100" : "60"}
                  className="text-sm font-semibold fill-gray-900 dark:fill-white"
                  textAnchor="middle"
                >
                  FINAL
                </text>
              </g>
            </svg>
          </div>
        </div>
      </Card>

      {/* Participant Count */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {participants.length} participants in this weight category
      </div>
    </div>
  );
}
