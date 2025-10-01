import OpenAI from "openai";
import type { Competition } from "@shared/schema";
import { getRealisticPointsProjection, parseCompetitionType, getAvailableGRankingLevels } from "./g-ranking-calculator";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CompetitionRecommendation {
  strategy: string;
  priorityCompetitions: {
    competitionId: number;
    name: string;
    points: number;
    reasoning: string;
    rank_needed: string;
    startDate: string;
    endDate: string;
  }[];
  totalPointsFromRecommendations: number;
  timelineToTarget: string;
  riskAssessment: string;
  alternativeStrategies: string[];
}

export async function getCompetitionRecommendations(
  upcomingCompetitions: Competition[],
  pointsNeeded: number,
  currentRank: number,
  targetRank: number,
  category: string,
  rankingType: string,
  targetDate?: string,
): Promise<CompetitionRecommendation> {
  try {
    // Check if athlete is already at top rank and wants to maintain it
    const isTopRank = currentRank === 1;
    const isMaintaining =
      isTopRank && (targetRank === 1 || targetRank === currentRank);

    const prompt = `
You are a sports performance strategist specializing in competitive ranking optimization. Analyze the following data and provide strategic recommendations for an athlete.

ATHLETE CONTEXT:
- Current Rank: ${currentRank}
- Target Rank: ${targetRank} 
- Category: ${category}
- Ranking Type: ${rankingType}
- Points Needed: ${pointsNeeded}${
      targetDate
        ? `
- Target Achievement Date: ${targetDate}`
        : ""
    }

UPCOMING COMPETITIONS:
${upcomingCompetitions
  .map(
    (comp) => {
      const { isGrandPrixChallenge, isGrandPrixFinal } = parseCompetitionType(comp.name);
      const gradeLevel = comp.gradeLevel || 'Unknown';
      const pointsProjection = gradeLevel !== 'Unknown' ? 
        getRealisticPointsProjection(gradeLevel, currentRank, 'moderate', isGrandPrixChallenge, isGrandPrixFinal) :
        { optimistic: 0, realistic: 0, conservative: 0 };
      
      return `
- Competition: ${comp.name}
- Location: ${comp.city}, ${comp.country}
- Start Date: ${comp.startDate}
- End Date: ${comp.endDate || comp.startDate}
- G-Ranking Level: ${gradeLevel}${isGrandPrixChallenge ? ' (Grand Prix Challenge)' : ''}${isGrandPrixFinal ? ' (Grand Prix Final)' : ''}
- Competition Level: ${comp.competitionType}
- Realistic Points Projection: Optimistic ${pointsProjection.optimistic}, Realistic ${pointsProjection.realistic}, Conservative ${pointsProjection.conservative}
- Registration Deadline: ${comp.registrationDeadline}
`;
    }
  )
  .join("\n")}

SCORING SYSTEM (G-RANKING SYSTEM):
Points are awarded based on the competition's G-ranking level and athlete placement. The system includes:

G-RANKING LEVELS AND 1ST PLACE POINTS:
- G1: 10.00 points (Regional/smaller international)
- G2: 20.00 points (Standard international)
- G2*: 20.00 points (Grand Prix Challenge only)
- G3: 30.00 points (Major international)
- G4: 40.00 points (Continental level)
- G6: 50.00 points (Major continental)
- G10**: 100.00 points (Grand Prix Final only)
- G14: 140.00 points (World Championships, Olympics)

POINTS BY PLACEMENT (example for G14):
- 1st place: 140.00 points (100%)
- 2nd place: 84.00 points (~60%)
- 3rd place: 50.40 points (~36%)
- 5th place: 30.24 points (~22%)
- 9th place: 21.17 points (~15%)
- 17th place: 14.82 points (~11%)
- 33rd place: 10.37 points (~7%)
- 65th place: 7.26 points (~5%)

Lower G-ranking competitions have proportionally lower points for each placement.

IMPORTANT: Each competition has been analyzed for realistic point projections based on the athlete's current ranking. Use these projections rather than maximum points when making recommendations.

TASK:
${
  isMaintaining
    ? `This athlete is currently RANK #1 and wants to MAINTAIN their top position. Analyze these competitions and create an optimal defensive strategy to protect and strengthen their #1 ranking${targetDate ? ` within the target timeline ending ${targetDate}` : ""}. Focus on:
1. Strategic competition selection to maintain dominance and visibility
2. Building a significant point buffer against rising competitors
3. Maintaining competitive momentum without overexposure
4. Managing competition schedule for peak performance timing
5. Risk management to protect current ranking from unexpected challengers
6. Travel efficiency - group competitions by geographic regions to minimize travel fatigue and costs
7. Timeline optimization to maintain peak form${targetDate ? ` leading up to ${targetDate}` : ""}`
    : `Analyze these competitions and create an optimal strategy for the athlete to collect the needed ${pointsNeeded} points to reach rank ${targetRank}${targetDate ? ` by the target date of ${targetDate}` : ""}. Consider:
1. ${targetDate ? `TIME CONSTRAINT: All recommended competitions must occur BEFORE ${targetDate} to meet the deadline` : "Competition timing and scheduling flexibility"}
2. Point efficiency analysis - calculate points per competition ratio
3. Competition difficulty assessment and realistic medal placement expectations
4. Registration deadlines and administrative requirements
5. TRAVEL OPTIMIZATION (Critical Priority):
   - Group competitions by continent/region (e.g., all European competitions in one trip)
   - Minimize intercontinental travel - prefer regional circuits
   - Consider travel time, jet lag recovery periods (minimum 3-5 days between distant competitions)
   - Account for visa requirements and processing times for international competitions
   - Prioritize competitions accessible within 2-3 connected trips rather than scattered individual events
6. Cost-benefit analysis including travel expenses vs. point potential
7. Recovery time between competitions (minimum 1-2 weeks for optimal performance)
8. Peak performance timing - schedule most important competitions when athlete will be in best form`
}

Provide your response in JSON format with the following structure:
{
  "strategy": "${
    isMaintaining
      ? "Overall defensive strategy to maintain #1 ranking"
      : "Overall strategic approach description"
  }",
  "priorityCompetitions": [
    {
      "competitionId": number,
      "name": "competition name",
      "points": number,
      "reasoning": "${
        isMaintaining
          ? "why this competition helps maintain #1 position"
          : "why this competition is recommended"
      }",
      "rank_needed": "estimated rank needed to earn these points",
      "startDate": "YYYY-MM-DD format",
      "endDate": "YYYY-MM-DD format"
    }
  ],
  "totalPointsFromRecommendations": number,
  "timelineToTarget": "${
    isMaintaining
      ? "timeline for maintaining dominance"
      : "realistic timeline to achieve target rank"
  }",
  "riskAssessment": "${
    isMaintaining
      ? "risks to current #1 position and mitigation strategies"
      : "potential risks and challenges"
  }",
  "alternativeStrategies": ["${
    isMaintaining
      ? "backup strategies to protect ranking if competitors advance"
      : "backup strategies if primary plan fails"
  }"]
}
`;

    console.log("=== SENDING PROMPT TO OPENAI ===");
    console.log("Target Date:", targetDate || "None specified");
    console.log("Full Prompt:");
    console.log(prompt);
    console.log("=== END PROMPT ===");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert sports strategist. Provide detailed, actionable recommendations in the exact JSON format requested. Be specific about competition rankings and point calculations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      // GPT-5 only supports the default temperature value of 1
    });

    // Validate response structure
    if (!response.choices || response.choices.length === 0) {
      throw new Error("No response received from OpenAI");
    }

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(content);

    return {
      strategy: result.strategy || "No strategy provided",
      priorityCompetitions: Array.isArray(result.priorityCompetitions)
        ? result.priorityCompetitions
        : [],
      totalPointsFromRecommendations:
        Number(result.totalPointsFromRecommendations) || 0,
      timelineToTarget: result.timelineToTarget || "Timeline not specified",
      riskAssessment: result.riskAssessment || "No risk assessment provided",
      alternativeStrategies: Array.isArray(result.alternativeStrategies)
        ? result.alternativeStrategies
        : [],
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(
      "Failed to get AI recommendations: " + (error as Error).message,
    );
  }
}
