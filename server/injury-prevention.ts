import { storage } from "./storage";
import { getOpenAIClient } from "./openai-client";

export interface InjuryRiskFactor {
  factor: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
  likelihood: number; // percentage
  bodyPart: "knee" | "ankle" | "shoulder" | "back" | "hip" | "wrist" | "foot";
  preventionMeasures: string[];
}

export interface RecoveryRecommendation {
  type: "rest" | "therapy" | "exercise" | "nutrition" | "medical";
  priority: number;
  title: string;
  description: string;
  duration: string;
  frequency: string;
  expectedOutcome: string;
  contraindications?: string[];
}

export interface PredictiveInjuryInsight {
  predictedInjuryProbability: number; // 0-100
  timeFrame: "1-week" | "1-month" | "3-months" | "6-months";
  mostLikelyInjuryType: string;
  contributingFactors: string[];
  earlyWarningSignals: string[];
  interventionWindow: number; // days before predicted injury
}

export interface RecoveryPlan {
  id: string;
  injuryType: string;
  severity: "mild" | "moderate" | "severe";
  estimatedRecoveryTime: string;
  phases: RecoveryPhase[];
  progressMetrics: string[];
  returnToPlayCriteria: string[];
  preventionForFuture: string[];
}

export interface RecoveryPhase {
  name: string;
  duration: string;
  objectives: string[];
  exercises: Exercise[];
  restrictions: string[];
  progressIndicators: string[];
}

export interface Exercise {
  name: string;
  type:
    | "strength"
    | "flexibility"
    | "stability"
    | "endurance"
    | "proprioception";
  description: string;
  sets: number;
  reps: string;
  duration: string;
  intensity: "low" | "moderate" | "high";
  frequency: string;
  progressionNotes: string[];
}

export interface InjuryPreventionInsight {
  overallRiskScore: number; // 0-100
  riskAssessment: "low" | "moderate" | "high" | "critical";
  primaryRiskFactors: InjuryRiskFactor[];
  recoveryRecommendations: RecoveryRecommendation[];
  biomechanicalConcerns: string[];
  trainingLoadRecommendations: {
    currentLoad: string;
    recommendedAdjustment: string;
    reasoning: string;
  };
  preventiveStrategies: string[];
  monitoringMetrics: string[];
  timeToNextAssessment: number; // days
  predictiveInsights: PredictiveInjuryInsight[];
  personalizedRecoveryPlans: RecoveryPlan[];
  adaptiveRecommendations: {
    immediatePriority: string[];
    weeklyAdjustments: string[];
    monthlyReview: string[];
  };
}

export interface BiomechanicalData {
  movementQuality: number;
  asymmetryIndex: number;
  fatigueLevel: number;
  flexibilityScore: number;
  strengthImbalances: string[];
  recentInjuries: string[];
  trainingVolume: number; // hours per week
  competitionFrequency: number; // per month
}

export class InjuryPreventionEngine {
  async analyzeInjuryRisk(
    athleteId: number,
    biomechanicalData?: BiomechanicalData,
  ): Promise<InjuryPreventionInsight> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI features are unavailable.",
      );
    }

    try {
      const [athlete, kpis, performanceData, weaknesses, careerEvents] =
        await Promise.all([
          storage.getAthlete(athleteId),
          storage.getKpiMetricsByAthleteId(athleteId),
          storage.getPerformanceDataByAthleteId(athleteId),
          storage.getWeaknessesByAthleteId(athleteId),
          storage.getCareerEventsByAthleteId(athleteId),
        ]);

      if (!athlete) {
        throw new Error("Athlete not found");
      }

      // Filter injury history from career events
      const injuryHistory = careerEvents.filter(
        (event) => event.eventType === "injury",
      );

      const analysisPrompt = `
Analyze injury risk for this elite Taekwondo athlete and provide comprehensive prevention insights:

ATHLETE PROFILE:
- Name: ${athlete.name}
- Sport: Taekwondo (-80kg division)
- World Rank: #${athlete.worldRank}
- Current Win Rate: ${athlete.winRate}%

PERFORMANCE METRICS:
${kpis.map((kpi) => `${kpi.metricName}: ${kpi.value}% (trend: ${kpi.trend || "0"}%)`).join("\n")}

CURRENT WEAKNESSES:
${weaknesses.map((w) => `${w.name}: ${w.score}/100 - ${w.description}`).join("\n")}

INJURY HISTORY:
${injuryHistory.length > 0 ? injuryHistory.map((injury) => `${injury.date}: ${injury.title} - ${injury.description}`).join("\n") : "No previous injuries recorded"}

PERFORMANCE TREND:
${performanceData.map((p) => `${p.month}: Score ${p.performanceScore}%, Rank #${p.ranking}`).join("\n")}

${
  biomechanicalData
    ? `
BIOMECHANICAL DATA:
- Movement Quality: ${biomechanicalData.movementQuality}/100
- Asymmetry Index: ${biomechanicalData.asymmetryIndex}%
- Fatigue Level: ${biomechanicalData.fatigueLevel}/100
- Flexibility Score: ${biomechanicalData.flexibilityScore}/100
- Strength Imbalances: ${biomechanicalData.strengthImbalances.join(", ")}
- Training Volume: ${biomechanicalData.trainingVolume} hours/week
- Competition Frequency: ${biomechanicalData.competitionFrequency} events/month
`
    : ""
}

Provide comprehensive injury prevention analysis in JSON format:
{
  "overallRiskScore": number_0_to_100,
  "riskAssessment": "low" | "moderate" | "high" | "critical",
  "primaryRiskFactors": [
    {
      "factor": "specific risk factor",
      "riskLevel": "low" | "medium" | "high" | "critical",
      "description": "detailed explanation",
      "likelihood": percentage,
      "bodyPart": "knee" | "ankle" | "shoulder" | "back" | "hip" | "wrist" | "foot",
      "preventionMeasures": ["specific prevention strategies"]
    }
  ],
  "recoveryRecommendations": [
    {
      "type": "rest" | "therapy" | "exercise" | "nutrition" | "medical",
      "priority": number_1_to_5,
      "title": "recommendation title",
      "description": "detailed description",
      "duration": "time period",
      "frequency": "how often",
      "expectedOutcome": "expected benefit",
      "contraindications": ["if any"]
    }
  ],
  "biomechanicalConcerns": ["specific movement concerns"],
  "trainingLoadRecommendations": {
    "currentLoad": "assessment of current training",
    "recommendedAdjustment": "suggested changes",
    "reasoning": "explanation for recommendations"
  },
  "preventiveStrategies": ["comprehensive prevention approaches"],
  "monitoringMetrics": ["key metrics to track"],
  "timeToNextAssessment": number_of_days
}

Focus on Taekwondo-specific injury patterns, common risks like knee ligament stress, ankle injuries from pivoting, and shoulder strain from high kicks.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are a world-renowned sports medicine physician and biomechanics expert specializing in Taekwondo injury prevention. Provide evidence-based injury risk assessments and recovery protocols based on current sports science research.",
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
        overallRiskScore: Math.max(
          0,
          Math.min(100, insight.overallRiskScore || 25),
        ),
        riskAssessment: insight.riskAssessment || "low",
        primaryRiskFactors: insight.primaryRiskFactors || [],
        recoveryRecommendations: insight.recoveryRecommendations || [],
        biomechanicalConcerns: insight.biomechanicalConcerns || [],
        trainingLoadRecommendations: insight.trainingLoadRecommendations || {
          currentLoad: "Normal training intensity",
          recommendedAdjustment: "Continue current program",
          reasoning: "Current metrics within acceptable ranges",
        },
        preventiveStrategies: insight.preventiveStrategies || [],
        monitoringMetrics: insight.monitoringMetrics || [],
        timeToNextAssessment: insight.timeToNextAssessment || 14,
        predictiveInsights: insight.predictiveInsights || [
          {
            predictedInjuryProbability: 15,
            timeFrame: "1-month",
            mostLikelyInjuryType: "Knee strain",
            contributingFactors: ["Training intensity", "Previous history"],
            earlyWarningSignals: ["Joint stiffness", "Fatigue"],
            interventionWindow: 7,
          },
        ],
        personalizedRecoveryPlans: insight.personalizedRecoveryPlans || [
          {
            id: `plan-${athleteId}-${Date.now()}`,
            injuryType: "General prevention",
            severity: "mild",
            estimatedRecoveryTime: "1-2 weeks",
            phases: [
              {
                name: "Active Recovery",
                duration: "1 week",
                objectives: ["Maintain mobility", "Reduce inflammation"],
                exercises: [
                  {
                    name: "Light stretching",
                    type: "flexibility",
                    description: "Gentle dynamic stretches",
                    sets: 2,
                    reps: "10-15",
                    duration: "15 minutes",
                    intensity: "low",
                    frequency: "Daily",
                    progressionNotes: ["Increase range gradually"],
                  },
                ],
                restrictions: ["No high-impact activities"],
                progressIndicators: ["Pain reduction", "Improved mobility"],
              },
            ],
            progressMetrics: ["Pain level", "Range of motion"],
            returnToPlayCriteria: ["Pain-free movement", "Full strength"],
            preventionForFuture: ["Proper warm-up", "Strength training"],
          },
        ],
        adaptiveRecommendations: insight.adaptiveRecommendations || {
          immediatePriority: ["Focus on recovery", "Monitor symptoms"],
          weeklyAdjustments: [
            "Adjust training intensity",
            "Add recovery sessions",
          ],
          monthlyReview: ["Performance assessment", "Update training plan"],
        },
      };
    } catch (error) {
      console.error("Error analyzing injury risk:", error);
      throw new Error("Failed to analyze injury risk");
    }
  }

  async generateRecoveryProtocol(
    athleteId: number,
    injuryType: string,
    severity: "mild" | "moderate" | "severe",
  ): Promise<RecoveryRecommendation[]> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI features are unavailable.",
      );
    }

    try {
      const athlete = await storage.getAthlete(athleteId);
      if (!athlete) {
        throw new Error("Athlete not found");
      }

      const recoveryPrompt = `
Design a comprehensive recovery protocol for a Taekwondo athlete:

ATHLETE: ${athlete.name} (World Rank #${athlete.worldRank})
INJURY TYPE: ${injuryType}
SEVERITY: ${severity}

Create a phased recovery plan with specific recommendations in JSON format:
{
  "recoveryRecommendations": [
    {
      "type": "rest" | "therapy" | "exercise" | "nutrition" | "medical",
      "priority": 1-5,
      "title": "phase/intervention name",
      "description": "detailed protocol",
      "duration": "time frame",
      "frequency": "how often to perform",
      "expectedOutcome": "recovery milestone",
      "contraindications": ["what to avoid"]
    }
  ]
}

Focus on evidence-based rehabilitation specific to Taekwondo biomechanics and return-to-sport protocols.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a leading sports rehabilitation specialist with expertise in martial arts injury recovery and return-to-sport protocols.",
          },
          {
            role: "user",
            content: recoveryPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
      });

      const protocol = JSON.parse(response.choices[0].message.content || "{}");
      return protocol.recoveryRecommendations || [];
    } catch (error) {
      console.error("Error generating recovery protocol:", error);
      throw new Error("Failed to generate recovery protocol");
    }
  }

  async predictInjuryFromPatterns(
    athleteId: number,
    recentMetrics: any[],
  ): Promise<{
    predictions: Array<{
      injuryType: string;
      probability: number;
      timeframe: string;
      warningSignsDetected: string[];
      preventiveActions: string[];
    }>;
    confidenceLevel: number;
  }> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI features are unavailable.",
      );
    }

    try {
      const [athlete, performanceData, weaknesses] = await Promise.all([
        storage.getAthlete(athleteId),
        storage.getPerformanceDataByAthleteId(athleteId),
        storage.getWeaknessesByAthleteId(athleteId),
      ]);

      if (!athlete) {
        throw new Error("Athlete not found");
      }

      const predictionPrompt = `
Analyze patterns to predict potential injuries for this Taekwondo athlete:

ATHLETE: ${athlete.name}
PERFORMANCE TREND: ${performanceData.map((p) => `${p.month}: ${p.performanceScore}%`).join(", ")}
CURRENT WEAKNESSES: ${weaknesses.map((w) => `${w.name}: ${w.score}/100`).join(", ")}
RECENT METRICS: ${JSON.stringify(recentMetrics)}

Provide predictive analysis in JSON format:
{
  "predictions": [
    {
      "injuryType": "specific injury prediction",
      "probability": percentage,
      "timeframe": "when it might occur",
      "warningSignsDetected": ["current indicators"],
      "preventiveActions": ["immediate actions to take"]
    }
  ],
  "confidenceLevel": percentage
}

Base predictions on Taekwondo-specific injury patterns and biomechanical stress factors.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a predictive analytics expert in sports medicine, specializing in injury pattern recognition and early warning systems for martial arts athletes.",
          },
          {
            role: "user",
            content: predictionPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
      });

      const predictions = JSON.parse(
        response.choices[0].message.content || "{}",
      );
      return {
        predictions: predictions.predictions || [],
        confidenceLevel: Math.max(
          0,
          Math.min(100, predictions.confidenceLevel || 75),
        ),
      };
    } catch (error) {
      console.error("Error predicting injuries:", error);
      throw new Error("Failed to predict injury patterns");
    }
  }
}

export const injuryPreventionEngine = new InjuryPreventionEngine();
