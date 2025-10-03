import { storage } from "./storage";
import { getOpenAIClient } from "./openai-client";

export interface DrillStep {
  stepNumber: number;
  instruction: string;
  duration: number; // seconds
  visualCue: string;
  keyPoints: string[];
  commonMistakes: string[];
  successCriteria: string[];
}

export interface TacticalDrill {
  id: string;
  name: string;
  category:
    | "offensive"
    | "defensive"
    | "counter-attack"
    | "conditioning"
    | "technique";
  difficulty: "beginner" | "intermediate" | "advanced" | "elite";
  duration: number; // total minutes
  objectives: string[];
  targetWeaknesses: string[];
  equipment: string[];
  steps: DrillStep[];
  variations: string[];
  progressionTips: string[];
}

export interface TrainingSession {
  sessionId: string;
  athleteId: number;
  startTime: Date;
  plannedDuration: number;
  currentDrill: TacticalDrill | null;
  currentStepIndex: number;
  completedDrills: string[];
  performance: {
    drillId: string;
    completionTime: number;
    accuracy: number;
    notes: string;
  }[];
  adaptiveAdjustments: string[];
}

export interface AICoachingFeedback {
  encouragement: string;
  technicalTips: string[];
  nextFocusArea: string;
  intensityAdjustment: "increase" | "maintain" | "decrease";
  estimatedProgress: number; // 0-100%
}

export class TacticalTrainingEngine {
  private activeSessions: Map<number, TrainingSession> = new Map();

  async generateCustomDrills(
    athleteId: number,
    focusAreas: string[],
    availableTime: number,
    difficulty: string,
  ): Promise<TacticalDrill[]> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI features are unavailable.",
      );
    }

    try {
      const [athlete, weaknesses, strengths, kpis] = await Promise.all([
        storage.getAthlete(athleteId),
        storage.getWeaknessesByAthleteId(athleteId),
        storage.getStrengthsByAthleteId(athleteId),
        storage.getKpiMetricsByAthleteId(athleteId),
      ]);

      if (!athlete) {
        throw new Error("Athlete not found");
      }

      const drillPrompt = `
Design custom Taekwondo training drills for this elite athlete:

ATHLETE: ${athlete.name} (World Rank #${athlete.worldRank})
FOCUS AREAS: ${focusAreas.join(", ")}
AVAILABLE TIME: ${availableTime} minutes
DIFFICULTY LEVEL: ${difficulty}

CURRENT WEAKNESSES:
${weaknesses.map((w) => `${w.name}: ${w.score}/100 - ${w.description}`).join("\n")}

CURRENT STRENGTHS:
${strengths.map((s) => `${s.name}: ${s.score}/100`).join("\n")}

PERFORMANCE METRICS:
${kpis.map((kpi) => `${kpi.metricName}: ${kpi.value}%`).join("\n")}

Generate 3-5 tactical drills in JSON format:
{
  "drills": [
    {
      "id": "unique_drill_id",
      "name": "drill name",
      "category": "offensive" | "defensive" | "counter-attack" | "conditioning" | "technique",
      "difficulty": "beginner" | "intermediate" | "advanced" | "elite",
      "duration": total_minutes,
      "objectives": ["specific learning objectives"],
      "targetWeaknesses": ["weaknesses this drill addresses"],
      "equipment": ["required equipment"],
      "steps": [
        {
          "stepNumber": 1,
          "instruction": "clear step-by-step instruction",
          "duration": seconds_for_this_step,
          "visualCue": "description of proper form/movement",
          "keyPoints": ["critical technique points"],
          "commonMistakes": ["what to avoid"],
          "successCriteria": ["how to know it's done correctly"]
        }
      ],
      "variations": ["drill modifications for progression"],
      "progressionTips": ["how to advance difficulty"]
    }
  ]
}

Focus on Taekwondo-specific techniques like kicks, footwork, distance management, and combat scenarios.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a world-class Taekwondo coach and tactical training specialist. Design evidence-based drills that address specific athlete weaknesses while building on their strengths.",
          },
          {
            role: "user",
            content: drillPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
      });

      const drillData = JSON.parse(response.choices[0].message.content || "{}");
      return drillData.drills || [];
    } catch (error) {
      console.error("Error generating custom drills:", error);
      throw new Error("Failed to generate custom drills");
    }
  }

  async startTrainingSession(
    athleteId: number,
    drills: TacticalDrill[],
    plannedDuration: number,
  ): Promise<string> {
    const sessionId = `session_${athleteId}_${Date.now()}`;

    const session: TrainingSession = {
      sessionId,
      athleteId,
      startTime: new Date(),
      plannedDuration,
      currentDrill: drills.length > 0 ? drills[0] : null,
      currentStepIndex: 0,
      completedDrills: [],
      performance: [],
      adaptiveAdjustments: [],
    };

    this.activeSessions.set(athleteId, session);
    return sessionId;
  }

  async getSessionProgress(athleteId: number): Promise<TrainingSession | null> {
    return this.activeSessions.get(athleteId) || null;
  }

  async completeCurrentStep(
    athleteId: number,
    performance: { accuracy: number; notes: string },
  ): Promise<{
    nextStep?: DrillStep;
    sessionComplete?: boolean;
    feedback: AICoachingFeedback;
  }> {
    const session = this.activeSessions.get(athleteId);
    if (!session || !session.currentDrill) {
      throw new Error("No active training session found");
    }

    // Record performance for current step
    if (session.currentDrill.steps[session.currentStepIndex]) {
      session.performance.push({
        drillId: session.currentDrill.id,
        completionTime: Date.now() - session.startTime.getTime(),
        accuracy: performance.accuracy,
        notes: performance.notes,
      });
    }

    // Generate AI coaching feedback
    const feedback = await this.generateCoachingFeedback(session, performance);

    // Move to next step or drill
    session.currentStepIndex++;

    if (session.currentStepIndex >= session.currentDrill.steps.length) {
      // Current drill complete
      session.completedDrills.push(session.currentDrill.id);
      session.currentDrill = null;
      session.currentStepIndex = 0;

      return {
        sessionComplete: true,
        feedback,
      };
    }

    return {
      nextStep: session.currentDrill.steps[session.currentStepIndex],
      feedback,
    };
  }

  private async generateCoachingFeedback(
    session: TrainingSession,
    performance: { accuracy: number; notes: string },
  ): Promise<AICoachingFeedback> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI features are unavailable.",
      );
    }

    try {
      const athlete = await storage.getAthlete(session.athleteId);
      if (!athlete) throw new Error("Athlete not found");

      const feedbackPrompt = `
Provide real-time coaching feedback for this Taekwondo training session:

ATHLETE: ${athlete.name}
CURRENT DRILL: ${session.currentDrill?.name}
STEP: ${session.currentStepIndex + 1}/${session.currentDrill?.steps.length}
PERFORMANCE ACCURACY: ${performance.accuracy}%
NOTES: ${performance.notes}

SESSION PERFORMANCE HISTORY:
${session.performance.map((p) => `Drill: ${p.drillId}, Accuracy: ${p.accuracy}%, Time: ${p.completionTime}ms`).join("\n")}

Provide coaching feedback in JSON format:
{
  "encouragement": "motivational message based on performance",
  "technicalTips": ["specific technique improvements"],
  "nextFocusArea": "what to focus on next",
  "intensityAdjustment": "increase" | "maintain" | "decrease",
  "estimatedProgress": percentage_0_to_100
}

Be supportive but constructive, like a world-class coach.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an encouraging yet technically precise Taekwondo coach providing real-time feedback during training sessions.",
          },
          {
            role: "user",
            content: feedbackPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
      });

      const feedback = JSON.parse(response.choices[0].message.content || "{}");
      return {
        encouragement: feedback.encouragement || "Keep pushing forward!",
        technicalTips: feedback.technicalTips || [],
        nextFocusArea:
          feedback.nextFocusArea || "Continue with current technique",
        intensityAdjustment: feedback.intensityAdjustment || "maintain",
        estimatedProgress: Math.max(
          0,
          Math.min(100, feedback.estimatedProgress || 50),
        ),
      };
    } catch (error) {
      console.error("Error generating coaching feedback:", error);
      return {
        encouragement: "Great effort! Keep focusing on your technique.",
        technicalTips: ["Maintain proper form", "Focus on breathing"],
        nextFocusArea: "Technical precision",
        intensityAdjustment: "maintain",
        estimatedProgress: 50,
      };
    }
  }

  async endTrainingSession(athleteId: number): Promise<{
    summary: string;
    improvements: string[];
    nextSessionRecommendations: string[];
    overallRating: number;
  }> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI API key not configured. AI features are unavailable.",
      );
    }

    const session = this.activeSessions.get(athleteId);
    if (!session) {
      throw new Error("No active session found");
    }

    try {
      const athlete = await storage.getAthlete(athleteId);
      if (!athlete) throw new Error("Athlete not found");

      const summaryPrompt = `
Analyze this completed Taekwondo training session:

ATHLETE: ${athlete.name}
SESSION DURATION: ${(Date.now() - session.startTime.getTime()) / 1000 / 60} minutes
COMPLETED DRILLS: ${session.completedDrills.length}
PERFORMANCE DATA:
${session.performance.map((p) => `Accuracy: ${p.accuracy}%, Time: ${p.completionTime}ms, Notes: ${p.notes}`).join("\n")}

Provide session summary in JSON format:
{
  "summary": "comprehensive session overview",
  "improvements": ["areas of improvement observed"],
  "nextSessionRecommendations": ["what to focus on next time"],
  "overallRating": rating_1_to_10
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a performance analyst providing detailed training session summaries for elite Taekwondo athletes.",
          },
          {
            role: "user",
            content: summaryPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
      });

      const summary = JSON.parse(response.choices[0].message.content || "{}");

      // Clean up session
      this.activeSessions.delete(athleteId);

      return {
        summary: summary.summary || "Training session completed successfully.",
        improvements: summary.improvements || [],
        nextSessionRecommendations: summary.nextSessionRecommendations || [],
        overallRating: Math.max(1, Math.min(10, summary.overallRating || 7)),
      };
    } catch (error) {
      console.error("Error generating session summary:", error);
      this.activeSessions.delete(athleteId);

      return {
        summary: "Training session completed with mixed results.",
        improvements: ["Continue working on technique consistency"],
        nextSessionRecommendations: ["Focus on identified weak areas"],
        overallRating: 6,
      };
    }
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  async getQuickStartDrills(
    athleteId: number,
    category: string,
  ): Promise<TacticalDrill[]> {
    // Pre-defined quick-start drills for immediate training
    const quickDrills: Record<string, TacticalDrill[]> = {
      offensive: [
        {
          id: "quick_offensive_1",
          name: "Lightning Kick Combinations",
          category: "offensive",
          difficulty: "intermediate",
          duration: 10,
          objectives: ["Improve kick speed", "Practice combination flow"],
          targetWeaknesses: ["Kick Speed", "Combination Timing"],
          equipment: ["Heavy bag", "Timer"],
          steps: [
            {
              stepNumber: 1,
              instruction: "Execute rapid fire front kicks for 30 seconds",
              duration: 30,
              visualCue: "Quick, snapping motion with immediate chamber return",
              keyPoints: ["Keep guard up", "Maintain balance", "Quick chamber"],
              commonMistakes: [
                "Dropping hands",
                "Loss of balance",
                "Slow recovery",
              ],
              successCriteria: [
                "Minimum 20 kicks",
                "Consistent form",
                "No balance loss",
              ],
            },
            {
              stepNumber: 2,
              instruction: "Switch to roundhouse-front kick combination",
              duration: 45,
              visualCue: "Smooth transition between different kick angles",
              keyPoints: ["Hip rotation", "Distance management", "Timing"],
              commonMistakes: [
                "Telegraphing",
                "Wide stance",
                "Slow transitions",
              ],
              successCriteria: [
                "Fluid combinations",
                "Proper distance",
                "Speed maintenance",
              ],
            },
          ],
          variations: ["Add jumping kicks", "Include spinning techniques"],
          progressionTips: ["Increase speed gradually", "Add multiple targets"],
        },
      ],
      defensive: [
        {
          id: "quick_defensive_1",
          name: "Counter-Strike Defense",
          category: "defensive",
          difficulty: "intermediate",
          duration: 8,
          objectives: [
            "Improve defensive reflexes",
            "Practice counter-attacks",
          ],
          targetWeaknesses: ["Defense Rating", "Counter-Attack Timing"],
          equipment: ["Partner or focus mitts"],
          steps: [
            {
              stepNumber: 1,
              instruction: "Practice blocking and immediate counter-strike",
              duration: 40,
              visualCue: "Block high, strike low in one fluid motion",
              keyPoints: [
                "Quick block recovery",
                "Immediate counter",
                "Target accuracy",
              ],
              commonMistakes: [
                "Slow recovery",
                "Telegraph counter",
                "Poor timing",
              ],
              successCriteria: [
                "Fast transitions",
                "Accurate counters",
                "Maintained guard",
              ],
            },
          ],
          variations: ["Vary attack angles", "Multiple attackers"],
          progressionTips: [
            "Increase attack speed",
            "Add combination counters",
          ],
        },
      ],
    };

    return quickDrills[category] || [];
  }
}

export const tacticalTrainingEngine = new TacticalTrainingEngine();
