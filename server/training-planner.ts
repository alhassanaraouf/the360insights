import { storage } from "./storage";
import { getOpenAIClient } from "./openai-client";

export interface TrainingDay {
  day: number;
  date: string;
  phase: 'preparation' | 'development' | 'competition' | 'recovery';
  intensity: 'low' | 'medium' | 'high' | 'peak';
  focus: string[];
  sessions: TrainingSession[];
  duration: number; // minutes
  targetZones: string[];
}

export interface TrainingSession {
  type: 'technical' | 'tactical' | 'physical' | 'mental' | 'recovery';
  name: string;
  duration: number;
  intensity: number; // 1-10 scale
  exercises: Exercise[];
  objectives: string[];
  notes?: string;
}

export interface Exercise {
  name: string;
  description: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restPeriod?: number;
  progressionNotes?: string;
  targetMetric?: string;
}

export interface MicroCycle {
  weekNumber: number;
  startDate: string;
  endDate: string;
  theme: string;
  objectives: string[];
  trainingDays: TrainingDay[];
  loadDistribution: {
    technical: number;
    tactical: number;
    physical: number;
    mental: number;
    recovery: number;
  };
  expectedOutcomes: string[];
}

export interface TrainingPlan {
  athleteId: number;
  planName: string;
  startDate: string;
  duration: number; // weeks
  planType: 'competition-prep' | 'off-season' | 'skill-development' | 'injury-recovery';
  microCycles: MicroCycle[];
  overallObjectives: string[];
  progressionStrategy: string;
  adaptationProtocol: string;
}

export class TrainingPlanGenerator {
  async generateComprehensivePlan(
    athleteId: number,
    planType: string,
    duration: number,
    targetCompetition?: string,
    customNotes?: string
  ): Promise<TrainingPlan> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error("OpenAI API key not configured. AI features are unavailable.");
    }

    try {
      const [athlete, strengths, weaknesses, kpis, careerEvents] = await Promise.all([
        storage.getAthlete(athleteId),
        storage.getStrengthsByAthleteId(athleteId),
        storage.getWeaknessesByAthleteId(athleteId),
        storage.getKpiMetricsByAthleteId(athleteId),
        storage.getCareerEventsByAthleteId(athleteId)
      ]);

      if (!athlete) {
        throw new Error("Athlete not found");
      }

      // Get athlete ranking data
      const athleteRanks = await storage.getAthleteRanksByAthleteId(athleteId);
      const worldRank = athleteRanks.find(rank => rank.rankingType === 'world')?.ranking || 'Unranked';

      const planningPrompt = `
Create a comprehensive ${duration}-week training plan for this elite Taekwondo athlete:

ATHLETE PROFILE:
- Name: ${athlete.name}
- Nationality: ${athlete.nationality}
- World Rank: #${worldRank}
- Category: ${athlete.worldCategory || 'General'}

PERFORMANCE ANALYSIS:
Strengths: ${strengths.map(s => `${s.name} (${s.score}/100): ${s.description}`).join(', ')}
Weaknesses: ${weaknesses.map(w => `${w.name} (${w.score}/100): ${w.description}`).join(', ')}

CURRENT METRICS:
${kpis.map(kpi => `${kpi.metricName}: ${kpi.value}% (trend: ${kpi.trend || '0'}%)`).join('\n')}

RECENT CAREER EVENTS:
${careerEvents?.slice(0, 5).map(event => `${event.date}: ${event.title} - ${event.description || 'No description'}`).join('\n') || 'No recent events recorded'}

PLAN REQUIREMENTS:
- Duration: ${duration} weeks
- Plan Type: ${planType}
- Target Competition: ${targetCompetition || 'General performance improvement'}
- Sport: Taekwondo (focus on Olympic-style competition)
${customNotes ? `

CUSTOM TRAINING CONSIDERATIONS:
${customNotes}

Please incorporate these specific requirements and preferences into the training plan.
` : ''}

Generate a detailed training plan with micro-cycle periodization in JSON format:
{
  "planName": "descriptive plan name",
  "overallObjectives": ["primary training goals"],
  "progressionStrategy": "periodization approach",
  "adaptationProtocol": "how to adjust based on progress",
  "microCycles": [
    {
      "weekNumber": 1,
      "theme": "week focus theme",
      "objectives": ["week-specific goals"],
      "loadDistribution": {
        "technical": percentage,
        "tactical": percentage,
        "physical": percentage,
        "mental": percentage,
        "recovery": percentage
      },
      "expectedOutcomes": ["measurable results"]
    }
  ]
}

Focus on evidence-based training methodologies specific to Taekwondo, addressing identified weaknesses while maintaining strengths.`;

      let planStructure;
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a world-class Taekwondo coach and sports scientist specializing in periodized training plans. Create evidence-based, progressive training programs that optimize athletic performance through systematic micro-cycle planning."
            },
            {
              role: "user",
              content: planningPrompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        });
        planStructure = JSON.parse(response.choices[0].message.content || "{}");
      } catch (aiError) {
        console.log("OpenAI API not available, using template plan:", aiError);
        // Fallback to a template plan structure for testing
        planStructure = this.createTemplatePlan(athlete.name, duration, planType, targetCompetition);
      }
      
      // Generate detailed daily training sessions for each micro-cycle
      const detailedMicroCycles = await Promise.all(
        planStructure.microCycles.map(async (cycle: any, index: number) => {
          const detailedCycle = await this.generateMicroCycleDetails(
            athleteId,
            cycle,
            index + 1,
            planType,
            strengths,
            weaknesses
          );
          return detailedCycle;
        })
      );

      return {
        athleteId,
        planName: planStructure.planName || `${duration}-Week ${planType} Plan`,
        startDate: new Date().toISOString().split('T')[0],
        duration,
        planType: planType as any,
        microCycles: detailedMicroCycles,
        overallObjectives: planStructure.overallObjectives || [],
        progressionStrategy: planStructure.progressionStrategy || '',
        adaptationProtocol: planStructure.adaptationProtocol || ''
      };
    } catch (error) {
      console.error("Error generating training plan:", error);
      throw new Error("Failed to generate comprehensive training plan");
    }
  }

  private async generateMicroCycleDetails(
    athleteId: number,
    cycleStructure: any,
    weekNumber: number,
    planType: string,
    strengths: any[],
    weaknesses: any[]
  ): Promise<MicroCycle> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error("OpenAI API key not configured. AI features are unavailable.");
    }

    const startDate = this.getWeekStartDate(weekNumber);
    const endDate = this.getWeekEndDate(weekNumber);

    const sessionPrompt = `
Generate detailed daily training sessions for Week ${weekNumber} of a Taekwondo training plan:

WEEK OVERVIEW:
- Theme: ${cycleStructure.theme}
- Objectives: ${cycleStructure.objectives?.join(', ')}
- Load Distribution: ${JSON.stringify(cycleStructure.loadDistribution)}

ATHLETE CONTEXT:
- Primary Strengths: ${strengths.slice(0, 2).map(s => s.name).join(', ')}
- Key Weaknesses: ${weaknesses.slice(0, 2).map(w => w.name).join(', ')}
- Plan Type: ${planType}

Create 7 daily training sessions (Monday-Sunday) in JSON format:
{
  "trainingDays": [
    {
      "day": 1,
      "phase": "preparation|development|competition|recovery",
      "intensity": "low|medium|high|peak",
      "focus": ["primary training focuses"],
      "sessions": [
        {
          "type": "technical|tactical|physical|mental|recovery",
          "name": "session name",
          "duration": minutes,
          "intensity": 1-10,
          "exercises": [
            {
              "name": "exercise name",
              "description": "detailed description",
              "sets": number,
              "reps": number,
              "duration": minutes,
              "restPeriod": seconds,
              "progressionNotes": "how to progress",
              "targetMetric": "what to measure"
            }
          ],
          "objectives": ["session goals"]
        }
      ],
      "duration": total_minutes,
      "targetZones": ["skill areas to target"]
    }
  ]
}

Ensure progression throughout the week and include specific Taekwondo techniques, combinations, and conditioning exercises.`;

    try {
      let dailySessions;
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert Taekwondo coach creating detailed daily training sessions. Focus on progressive skill development, proper recovery, and sport-specific conditioning."
            },
            {
              role: "user",
              content: sessionPrompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.8
        });
        dailySessions = JSON.parse(response.choices[0].message.content || "{}");
      } catch (aiError) {
        console.log("OpenAI API not available for micro-cycle details, using template:", aiError);
        // Fallback to template daily sessions
        dailySessions = this.createTemplateDailySessions(weekNumber, cycleStructure.theme);
      }
      
      return {
        weekNumber,
        startDate,
        endDate,
        theme: cycleStructure.theme || `Week ${weekNumber} Development`,
        objectives: cycleStructure.objectives || [],
        trainingDays: dailySessions.trainingDays?.map((day: any) => ({
          ...day,
          date: this.getDayDate(weekNumber, day.day)
        })) || [],
        loadDistribution: cycleStructure.loadDistribution || {
          technical: 30,
          tactical: 25,
          physical: 25,
          mental: 10,
          recovery: 10
        },
        expectedOutcomes: cycleStructure.expectedOutcomes || []
      };
    } catch (error) {
      console.error("Error generating micro-cycle details:", error);
      throw new Error("Failed to generate detailed training sessions");
    }
  }

  async generateAdaptiveAdjustments(
    planId: string,
    athleteId: number,
    weekNumber: number,
    performanceData: any
  ): Promise<{ adjustments: string[]; modifiedSessions: TrainingSession[] }> {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error("OpenAI API key not configured. AI features are unavailable.");
    }

    try {
      const adjustmentPrompt = `
Analyze performance data and suggest training plan adjustments:

CURRENT WEEK: ${weekNumber}
PERFORMANCE DATA: ${JSON.stringify(performanceData)}

Based on the athlete's recent performance, suggest specific adjustments to the training plan:
- Intensity modifications
- Exercise substitutions
- Additional focus areas
- Recovery adjustments

Provide response in JSON format:
{
  "adjustments": ["specific adjustment recommendations"],
  "modifiedSessions": [detailed session modifications if needed]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an adaptive training specialist who modifies training plans based on real-time performance feedback."
          },
          {
            role: "user",
            content: adjustmentPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      const adjustments = JSON.parse(response.choices[0].message.content || "{}");
      return {
        adjustments: adjustments.adjustments || [],
        modifiedSessions: adjustments.modifiedSessions || []
      };
    } catch (error) {
      console.error("Error generating adaptive adjustments:", error);
      throw new Error("Failed to generate training adjustments");
    }
  }

  private getWeekStartDate(weekNumber: number): string {
    const today = new Date();
    const daysToAdd = (weekNumber - 1) * 7;
    const weekStart = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return weekStart.toISOString().split('T')[0];
  }

  private getWeekEndDate(weekNumber: number): string {
    const today = new Date();
    const daysToAdd = (weekNumber - 1) * 7 + 6;
    const weekEnd = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return weekEnd.toISOString().split('T')[0];
  }

  private getDayDate(weekNumber: number, dayNumber: number): string {
    const today = new Date();
    const daysToAdd = (weekNumber - 1) * 7 + (dayNumber - 1);
    const dayDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return dayDate.toISOString().split('T')[0];
  }

  private createTemplatePlan(athleteName: string, duration: number, planType: string, targetCompetition?: string) {
    const microCycles = [];
    
    for (let week = 1; week <= duration; week++) {
      const weekThemes = [
        "Foundation Building",
        "Technical Development", 
        "Tactical Integration",
        "Peak Performance"
      ];
      
      microCycles.push({
        weekNumber: week,
        theme: weekThemes[(week - 1) % weekThemes.length],
        objectives: [
          `Week ${week} primary objective`,
          `Build on previous week's progress`,
          `Prepare for next phase`
        ],
        loadDistribution: {
          technical: 30,
          tactical: 25,
          physical: 25,
          mental: 15,
          recovery: 5
        },
        expectedOutcomes: [
          `Improved skill execution`,
          `Enhanced tactical awareness`,
          `Increased physical capacity`
        ]
      });
    }

    return {
      planName: `${duration}-Week ${planType} Plan for ${athleteName}`,
      overallObjectives: [
        "Improve technical execution",
        "Enhance competitive performance",
        "Optimize physical conditioning",
        targetCompetition ? `Prepare for ${targetCompetition}` : "General performance improvement"
      ],
      progressionStrategy: "Progressive overload with periodic recovery phases",
      adaptationProtocol: "Weekly assessment and adjustment based on performance indicators",
      microCycles
    };
  }

  private createTemplateDailySessions(weekNumber: number, theme: string) {
    const trainingDays = [];
    
    for (let day = 1; day <= 7; day++) {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const isRestDay = day === 7; // Sunday rest
      
      if (isRestDay) {
        trainingDays.push({
          day,
          phase: 'recovery',
          intensity: 'low',
          focus: ['Active Recovery', 'Mobility'],
          sessions: [{
            type: 'recovery',
            name: 'Active Recovery Session',
            duration: 45,
            intensity: 2,
            exercises: [
              {
                name: 'Light Stretching',
                description: 'Full body stretching routine',
                duration: 20,
                sets: 1,
                reps: 1
              },
              {
                name: 'Walking',
                description: 'Light aerobic activity',
                duration: 25,
                sets: 1,
                reps: 1
              }
            ],
            objectives: ['Recovery', 'Mobility maintenance']
          }],
          duration: 45,
          targetZones: ['Recovery', 'Flexibility']
        });
      } else {
        trainingDays.push({
          day,
          phase: 'development',
          intensity: day <= 2 ? 'medium' : day <= 4 ? 'high' : 'medium',
          focus: ['Technical Skills', 'Physical Conditioning'],
          sessions: [{
            type: 'technical',
            name: `${dayNames[day-1]} Training Session`,
            duration: 90,
            intensity: day <= 2 ? 6 : day <= 4 ? 8 : 6,
            exercises: [
              {
                name: 'Warm-up',
                description: 'Dynamic stretching and movement preparation',
                duration: 15,
                sets: 1,
                reps: 1
              },
              {
                name: 'Technique Practice',
                description: 'Basic kicks and combinations',
                duration: 45,
                sets: 3,
                reps: 10
              },
              {
                name: 'Conditioning',
                description: 'Sport-specific fitness exercises',
                duration: 20,
                sets: 3,
                reps: 15
              },
              {
                name: 'Cool-down',
                description: 'Static stretching and relaxation',
                duration: 10,
                sets: 1,
                reps: 1
              }
            ],
            objectives: ['Improve technique', 'Build conditioning']
          }],
          duration: 90,
          targetZones: ['Kicks', 'Footwork', 'Flexibility']
        });
      }
    }

    return { trainingDays };
  }
}

export const trainingPlanner = new TrainingPlanGenerator();