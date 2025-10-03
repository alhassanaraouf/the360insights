import { storage } from "./storage";
import { getOpenAIClient } from "./openai-client";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

export interface OpponentAnalysis {
  weaknessExploitation: string[];
  tacticalRecommendations: string[];
  winProbability: number;
  keyStrategyPoints: string[];
  mentalPreparation: string[];
  technicalFocus: string[];
}

export interface PerformanceInsight {
  trend: "improving" | "declining" | "stable";
  confidence: number;
  keyMetrics: string[];
  recommendations: string[];
  riskFactors: string[];
}

export interface AthleteStrengthsWeaknesses {
  strengths: Array<{ name: string; description: string }>;
  weaknesses: Array<{ name: string; description: string }>;
}

export class AIAnalysisEngine {
  async analyzeOpponent(
    athleteId: number,
    opponentId: number,
  ): Promise<OpponentAnalysis> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI analysis is unavailable.",
      );
    }

    try {
      const [
        athlete,
        opponent,
        athleteStrengths,
        athleteWeaknesses,
        opponentStrengths,
        opponentWeaknesses,
      ] = await Promise.all([
        storage.getAthlete(athleteId),
        storage.getAthlete(opponentId), // Now using regular athlete data
        storage.getStrengthsByAthleteId(athleteId),
        storage.getWeaknessesByAthleteId(athleteId),
        storage.getStrengthsByAthleteId(opponentId),
        storage.getWeaknessesByAthleteId(opponentId),
      ]);

      if (!athlete || !opponent) {
        throw new Error("Athlete or opponent data not found");
      }

      const analysisPrompt = `
Analyze this Taekwondo matchup and provide tactical recommendations:

ATHLETE PROFILE:
- Name: ${athlete.name}
- Nationality: ${athlete.nationality}
- Gender: ${athlete.gender || "Unknown"}
- Strengths: ${athleteStrengths.map((s: any) => `${s.name} (${s.score}/100): ${s.description}`).join(", ") || "No strength data available"}
- Weaknesses: ${athleteWeaknesses.map((w: any) => `${w.name} (${w.score}/100): ${w.description}`).join(", ") || "No weakness data available"}

OPPONENT PROFILE:
- Name: ${opponent.name}
- Nationality: ${opponent.nationality}
- Gender: ${opponent.gender || "Unknown"}
- Strengths: ${opponentStrengths.map((s: any) => `${s.name} (${s.score}/100): ${s.description}`).join(", ") || "No strength data available"}
- Weaknesses: ${opponentWeaknesses.map((w: any) => `${w.name} (${w.score}/100): ${w.description}`).join(", ") || "No weakness data available"}

Provide a comprehensive tactical analysis in JSON format:
{
  "weaknessExploitation": ["specific tactics to exploit opponent weaknesses"],
  "tacticalRecommendations": ["detailed fighting strategies"],
  "winProbability": number_between_0_and_100,
  "keyStrategyPoints": ["most important tactical elements"],
  "mentalPreparation": ["psychological preparation advice"],
  "technicalFocus": ["specific techniques to practice"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are an elite Taekwondo tactical analyst with decades of experience analyzing fights and developing winning strategies. Provide detailed, actionable tactical advice based on fighter profiles and historical data.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      return {
        weaknessExploitation: analysis.weaknessExploitation || [],
        tacticalRecommendations: analysis.tacticalRecommendations || [],
        winProbability: Math.max(
          0,
          Math.min(100, analysis.winProbability || 50),
        ),
        keyStrategyPoints: analysis.keyStrategyPoints || [],
        mentalPreparation: analysis.mentalPreparation || [],
        technicalFocus: analysis.technicalFocus || [],
      };
    } catch (error) {
      console.error("Error in opponent analysis:", error);
      throw new Error("Failed to analyze opponent");
    }
  }

  async analyzePerformanceTrend(
    athleteId: number,
  ): Promise<PerformanceInsight> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI analysis is unavailable.",
      );
    }

    try {
      const [athlete, kpis, strengths, weaknesses] = await Promise.all([
        storage.getAthlete(athleteId),
        storage.getKpiMetricsByAthleteId(athleteId),
        storage.getStrengthsByAthleteId(athleteId),
        storage.getWeaknessesByAthleteId(athleteId),
      ]);

      if (!athlete) {
        throw new Error("Athlete not found");
      }

      const analysisPrompt = `
Analyze the performance trend for this Taekwondo athlete:

ATHLETE: ${athlete.name}
Nationality: ${athlete.nationality}
Gender: ${athlete.gender || "Unknown"}

KPI METRICS:
${kpis.map((kpi: any) => `${kpi.metricName}: ${kpi.value}% (trend: ${parseFloat(kpi.trend || "0") > 0 ? "+" : ""}${kpi.trend || "0"}%)`).join("\n")}

CURRENT STRENGTHS:
${strengths.map((s: any) => `${s.name}: ${s.score}/100 - ${s.description}`).join("\n")}

CURRENT WEAKNESSES:
${weaknesses.map((w: any) => `${w.name}: ${w.score}/100 - ${w.description}`).join("\n")}

Analyze the performance trend and provide insights in JSON format:
{
  "trend": "improving" | "declining" | "stable",
  "confidence": number_between_0_and_100,
  "keyMetrics": ["most important performance indicators"],
  "recommendations": ["specific improvement strategies"],
  "riskFactors": ["potential concerns or threats to performance"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are an expert sports performance analyst specializing in Taekwondo. Analyze athlete data trends and provide actionable insights for performance optimization.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
      });

      const insight = JSON.parse(response.choices[0].message.content || "{}");
      return {
        trend: insight.trend || "stable",
        confidence: Math.max(0, Math.min(100, insight.confidence || 75)),
        keyMetrics: insight.keyMetrics || [],
        recommendations: insight.recommendations || [],
        riskFactors: insight.riskFactors || [],
      };
    } catch (error) {
      console.error("Error in performance analysis:", error);
      throw new Error("Failed to analyze performance trend");
    }
  }

  async generateTrainingRecommendations(athleteId: number): Promise<string[]> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI analysis is unavailable.",
      );
    }

    try {
      const [athlete, weaknesses, kpis] = await Promise.all([
        storage.getAthlete(athleteId),
        storage.getWeaknessesByAthleteId(athleteId),
        storage.getKpiMetricsByAthleteId(athleteId),
      ]);

      if (!athlete) {
        throw new Error("Athlete not found");
      }

      const prompt = `
Generate personalized training recommendations for this Taekwondo athlete:

ATHLETE: ${athlete.name}
Nationality: ${athlete.nationality}
Gender: ${athlete.gender || "Unknown"}

AREAS FOR IMPROVEMENT:
${weaknesses.map((w: any) => `${w.name}: ${w.score}/100 - ${w.description}`).join("\n")}

PERFORMANCE METRICS:
${kpis.map((kpi: any) => `${kpi.metricName}: ${kpi.value}% (trend: ${kpi.trend}%)`).join("\n")}

Provide 5-7 specific, actionable training recommendations that address the identified weaknesses and optimize performance. Focus on drills, techniques, and training methodologies specific to Taekwondo.

Return as a JSON array of strings: ["recommendation 1", "recommendation 2", ...]`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are a world-class Taekwondo coach with expertise in developing elite athletes. Provide specific, technical training recommendations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.recommendations || [];
    } catch (error) {
      console.error("Error generating training recommendations:", error);
      throw new Error("Failed to generate training recommendations");
    }
  }

  async processNaturalLanguageQuery(
    query: string,
    athleteId: number,
  ): Promise<{ response: string; confidence: number }> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI analysis is unavailable.",
      );
    }

    try {
      console.log(`Processing query: "${query}" for athlete ${athleteId}`);

      // Get comprehensive athlete data
      const [
        athlete,
        kpis,
        strengths,
        weaknesses,
        careerEvents,
        trainingRecommendations,
      ] = await Promise.all([
        storage.getAthlete(athleteId),
        storage.getKpiMetricsByAthleteId(athleteId),
        storage.getStrengthsByAthleteId(athleteId),
        storage.getWeaknessesByAthleteId(athleteId),
        storage.getCareerEventsByAthleteId(athleteId),
        storage.getTrainingRecommendationsByAthleteId(athleteId),
      ]);

      console.log(
        `Athlete data loaded: ${athlete?.name}, ${strengths.length} strengths, ${weaknesses.length} weaknesses`,
      );

      if (!athlete) {
        return {
          response: "Athlete not found. Please select a valid athlete.",
          confidence: 0,
        };
      }

      // For greeting queries, provide personalized welcome (only for simple greetings)
      const simpleGreetings = [
        "hello",
        "hi",
        "hey",
        "good morning",
        "good afternoon",
      ];
      const isSimpleGreeting = simpleGreetings.some(
        (greeting) =>
          query.toLowerCase().trim() === greeting ||
          query.toLowerCase().trim() === greeting + "!",
      );

      if (isSimpleGreeting) {
        return {
          response: `Hello! I'm your AI analyst for ${athlete.name}, a professional Taekwondo athlete from ${athlete.nationality}. I have comprehensive data on their performance metrics, ${strengths.length} key strengths, ${weaknesses.length} areas for improvement, ${careerEvents.length} career milestones, and ${trainingRecommendations.length} training recommendations. Ask me anything about performance trends, tactical analysis, training recommendations, or competition strategy!`,
          confidence: 95,
        };
      }

      // Build comprehensive context for OpenAI
      const contextPrompt = `
You are an elite Taekwondo performance analyst providing detailed insights for ${athlete.name}.

ATHLETE PROFILE:
- Name: ${athlete.name}
- Sport: ${athlete.sport}
- Nationality: ${athlete.nationality}
- Current World Rank: Not available
- Gender: ${athlete.gender || "Not specified"}
- World Category: Not specified

PERFORMANCE METRICS (KPIs):
${
  kpis.length > 0
    ? kpis
        .map(
          (kpi) =>
            `• ${kpi.metricName}: ${kpi.value}% ${kpi.trend ? `(trend: ${parseFloat(kpi.trend) > 0 ? "+" : ""}${kpi.trend}%)` : ""}`,
        )
        .join("\n")
    : "• No KPI data available"
}

KEY STRENGTHS:
${
  strengths.length > 0
    ? strengths
        .map(
          (s) =>
            `• ${s.name} (${s.score}/100): ${s.description || "Elite level performance"}`,
        )
        .join("\n")
    : "• No strengths data available"
}

AREAS FOR IMPROVEMENT:
${
  weaknesses.length > 0
    ? weaknesses
        .map(
          (w) =>
            `• ${w.name} (${w.score}/100): ${w.description || "Needs development"}`,
        )
        .join("\n")
    : "• No weaknesses data available"
}

CAREER HIGHLIGHTS:
${
  careerEvents.length > 0
    ? careerEvents
        .slice(-5)
        .map(
          (event) =>
            `• ${event.date}: ${event.title} - ${event.description || event.eventType}`,
        )
        .join("\n")
    : "• No career events recorded"
}

CURRENT TRAINING FOCUS:
${
  trainingRecommendations.length > 0
    ? trainingRecommendations
        .slice(-3)
        .map(
          (rec: any) =>
            `• ${rec.drillName}: ${rec.description} (Priority: ${rec.priority})`,
        )
        .join("\n")
    : "• No current training recommendations"
}

USER QUERY: "${query}"

Provide a comprehensive, data-driven analysis based on ${athlete.name}'s specific profile. Reference actual metrics, trends, and performance data. Be analytical, specific, and actionable in your response.`;

      // Use GPT-4o with optimized context
      try {
        // For complex queries, use full context. For simple queries, use condensed context.
        const isComplexQuery =
          query.length > 50 ||
          query.toLowerCase().includes("analyze") ||
          query.toLowerCase().includes("strategy") ||
          query.toLowerCase().includes("recommend");

        const promptToUse = isComplexQuery
          ? contextPrompt
          : `
You are analyzing ${athlete.name} (${athlete.nationality}).

KEY DATA:
- Strengths: ${strengths
              .slice(0, 3)
              .map((s: any) => `${s.name} (${s.score}/100)`)
              .join(", ")}
- Focus Areas: ${weaknesses
              .slice(0, 3)
              .map((w: any) => `${w.name} (${w.score}/100)`)
              .join(", ")}

User Query: "${query}"

Provide specific, actionable insights based on this data.`;

        const response = (await Promise.race([
          openai.chat.completions.create({
            model: "gpt-5",
            messages: [
              {
                role: "system",
                content:
                  "You are an elite Taekwondo performance analyst. Provide data-driven insights that reference specific metrics and offer actionable recommendations.",
              },
              {
                role: "user",
                content: promptToUse,
              },
            ],
            max_tokens: isComplexQuery ? 600 : 300,
            temperature: 1,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("OpenAI timeout")), 10000),
          ),
        ])) as any;

        const analysisResponse = response.choices[0]?.message?.content;

        if (analysisResponse) {
          // Calculate confidence based on data richness
          const dataScore = Math.min(
            100,
            kpis.length * 15 +
              strengths.length * 10 +
              weaknesses.length * 10 +
              careerEvents.length * 5 +
              careerEvents.length * 5 +
              trainingRecommendations.length * 5,
          );
          const confidence = Math.max(85, Math.min(98, dataScore));

          return {
            response: analysisResponse,
            confidence: confidence,
          };
        }
      } catch (openaiError) {
        console.error("OpenAI error:", openaiError);
        throw new Error("Failed to process natural language query");
      }

      throw new Error("No valid response received from OpenAI");
    } catch (error) {
      console.error("Error processing natural language query:", error);
      throw new Error("Failed to process natural language query");
    }
  }

  async analyzeAthleteStrengthsWeaknesses(
    athleteId: number,
  ): Promise<AthleteStrengthsWeaknesses> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI analysis is unavailable.",
      );
    }

    try {
      // Fetch athlete data from database
      const [athlete] = await Promise.all([storage.getAthlete(athleteId)]);

      if (!athlete) {
        throw new Error("Athlete not found");
      }

      // Build comprehensive athlete profile for AI analysis
      const analysisPrompt = `
Analyze this Taekwondo athlete and identify their key strengths and weaknesses.

ATHLETE PROFILE:
- Name: ${athlete.name}
- Nationality: ${athlete.nationality}
- Gender: ${athlete.gender || "Unknown"}
- Sport: ${athlete.sport}

Provide a JSON response with exactly this structure:
{
  "strengths": [
    {"name": "strength1", "description": "detailed description of this strength"},
    {"name": "strength2", "description": "detailed description of this strength"},
    {"name": "strength3", "description": "detailed description of this strength"},
    {"name": "strength4", "description": "detailed description of this strength"},
    {"name": "strength5", "description": "detailed description of this strength"}
  ],
  "weaknesses": [
    {"name": "weakness1", "description": "detailed description of this weakness"},
    {"name": "weakness2", "description": "detailed description of this weakness"},
    {"name": "weakness3", "description": "detailed description of this weakness"},
    {"name": "weakness4", "description": "detailed description of this weakness"},
    {"name": "weakness5", "description": "detailed description of this weakness"}
  ]
}

Each name should be 2-4 words, and each description should be 1-2 sentences explaining how this affects Taekwondo performance.`;

      // Use OpenAI's most advanced available model for analysis
      console.log("Attempting to call OpenAI with model: gpt-5");
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are an elite Taekwondo performance analyst with decades of experience in athlete assessment. Always respond with valid JSON format.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1000, // Increased to allow for detailed descriptions
      });
      console.log(
        "OpenAI response received:",
        JSON.stringify(response, null, 2),
      );

      const analysisResult = response.choices[0]?.message?.content;
      console.log("OpenAI O3 response:", analysisResult);

      if (analysisResult) {
        try {
          // Check if response was truncated
          if (response.choices[0].finish_reason === "length") {
            console.log("Response was truncated due to length limit");
            throw new Error(
              "Response was truncated - increase max_completion_tokens",
            );
          }

          const parsedResult = JSON.parse(
            analysisResult,
          ) as AthleteStrengthsWeaknesses;

          // Validate the response structure
          if (
            parsedResult.strengths &&
            Array.isArray(parsedResult.strengths) &&
            parsedResult.weaknesses &&
            Array.isArray(parsedResult.weaknesses)
          ) {
            // Check if items are objects with name and description, or just strings
            const validStructure =
              parsedResult.strengths.every(
                (item) =>
                  typeof item === "string" ||
                  (item &&
                    typeof item.name === "string" &&
                    typeof item.description === "string"),
              ) &&
              parsedResult.weaknesses.every(
                (item) =>
                  typeof item === "string" ||
                  (item &&
                    typeof item.name === "string" &&
                    typeof item.description === "string"),
              );

            if (validStructure) {
              console.log("Valid analysis result:", parsedResult);
              return parsedResult;
            }
          }
          console.log("Invalid structure in response:", parsedResult);
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", parseError);
          console.log("Raw response was:", analysisResult);
          console.log(
            "Response finish reason:",
            response.choices[0].finish_reason,
          );
          console.log("Response length:", analysisResult.length);
        }
      } else {
        console.error("No content in OpenAI O3 response");
      }

      throw new Error("Failed to get valid response from OpenAI O3 analysis");
    } catch (error) {
      console.error("Error analyzing athlete strengths and weaknesses:", error);
      throw new Error("Failed to analyze athlete strengths and weaknesses");
    }
  }
}

export const aiEngine = new AIAnalysisEngine();
