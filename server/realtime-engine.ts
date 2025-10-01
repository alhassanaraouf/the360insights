import OpenAI from "openai";
import { storage } from "./storage";
import { aiEngine } from "./ai-engine";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MatchEvent {
  timestamp: number;
  type: 'score' | 'technique' | 'warning' | 'timeout' | 'round_end';
  athlete: 'self' | 'opponent';
  points?: number;
  technique?: string;
  zone?: 'head' | 'body' | 'leg';
  notes?: string;
}

export interface LiveMatchAnalysis {
  currentScore: { self: number; opponent: number };
  round: number;
  timeRemaining: number;
  momentum: 'gaining' | 'losing' | 'neutral';
  tacticalSuggestion: string;
  urgency: 'low' | 'medium' | 'high';
  keyObservations: string[];
  nextRecommendation: string;
  confidence: number;
}

export interface AdaptiveSuggestion {
  type: 'tactical' | 'technical' | 'mental' | 'defensive';
  priority: number;
  message: string;
  expectedImpact: string;
  timeWindow: number; // seconds to execute
}

export class RealTimeAnalysisEngine {
  private matchEvents: MatchEvent[] = [];
  private currentMatch: {
    athleteId: number;
    opponentId: number;
    startTime: number;
    isActive: boolean;
  } | null = null;

  async startMatchAnalysis(athleteId: number, opponentId: number): Promise<void> {
    this.currentMatch = {
      athleteId,
      opponentId,
      startTime: Date.now(),
      isActive: true
    };
    this.matchEvents = [];
  }

  async addMatchEvent(event: MatchEvent): Promise<void> {
    if (!this.currentMatch?.isActive) {
      throw new Error("No active match session");
    }
    
    this.matchEvents.push({
      ...event,
      timestamp: Date.now()
    });
  }

  async getLiveAnalysis(): Promise<LiveMatchAnalysis> {
    if (!this.currentMatch?.isActive) {
      throw new Error("No active match session");
    }

    const recentEvents = this.matchEvents.slice(-10); // Last 10 events
    const currentScore = this.calculateCurrentScore();
    const matchDuration = Date.now() - this.currentMatch.startTime;
    
    // Get athlete and opponent data for context
    const [athlete, opponents] = await Promise.all([
      storage.getAthlete(this.currentMatch.athleteId),
      storage.getAllOpponents()
    ]);
    
    const opponent = opponents.find(o => o.id === this.currentMatch.opponentId);
    
    if (!athlete || !opponent) {
      throw new Error("Athlete or opponent data not found");
    }

    const analysisPrompt = `
Analyze this live Taekwondo match situation and provide tactical guidance:

MATCH CONTEXT:
- Athlete: ${athlete.name} (Rank #${athlete.worldRank})
- Opponent: ${opponent.name} (Rank #${opponent.worldRank})
- Current Score: ${currentScore.self} - ${currentScore.opponent}
- Match Duration: ${Math.floor(matchDuration / 60000)} minutes
- Round: ${this.getCurrentRound()}

RECENT MATCH EVENTS:
${recentEvents.map(e => `${new Date(e.timestamp).toLocaleTimeString()}: ${e.type} by ${e.athlete}${e.points ? ` (${e.points} points)` : ''}${e.technique ? ` - ${e.technique}` : ''}`).join('\n')}

SCORING PATTERN ANALYSIS:
- Self total points: ${currentScore.self}
- Opponent total points: ${currentScore.opponent}
- Recent momentum: ${this.calculateMomentum(recentEvents)}

Provide real-time tactical analysis in JSON format:
{
  "momentum": "gaining" | "losing" | "neutral",
  "tacticalSuggestion": "immediate specific tactical advice",
  "urgency": "low" | "medium" | "high",
  "keyObservations": ["specific observations about opponent patterns"],
  "nextRecommendation": "next immediate action to take",
  "confidence": number_between_60_and_95
}

Focus on immediate actionable advice based on the current match state and recent events.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a world-class Taekwondo coach providing real-time tactical guidance during a live match. Your advice must be immediate, specific, and actionable. Analyze patterns and momentum shifts to give strategic advantages."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4 // Lower temperature for more consistent tactical advice
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        currentScore,
        round: this.getCurrentRound(),
        timeRemaining: this.calculateTimeRemaining(),
        momentum: analysis.momentum || 'neutral',
        tacticalSuggestion: analysis.tacticalSuggestion || 'Continue current strategy',
        urgency: analysis.urgency || 'medium',
        keyObservations: analysis.keyObservations || [],
        nextRecommendation: analysis.nextRecommendation || 'Stay focused and execute planned techniques',
        confidence: Math.max(60, Math.min(95, analysis.confidence || 75))
      };
    } catch (error) {
      console.error("Error in live match analysis:", error);
      throw new Error("Failed to generate live analysis");
    }
  }

  async generateAdaptiveSuggestions(): Promise<AdaptiveSuggestion[]> {
    if (!this.currentMatch?.isActive) {
      throw new Error("No active match session");
    }

    const recentEvents = this.matchEvents.slice(-15);
    const currentScore = this.calculateCurrentScore();
    const scoreDifference = currentScore.self - currentScore.opponent;
    
    const suggestionPrompt = `
Generate adaptive tactical suggestions for this live Taekwondo match:

CURRENT SITUATION:
- Score: ${currentScore.self} - ${currentScore.opponent} (difference: ${scoreDifference})
- Match phase: ${this.getMatchPhase()}
- Recent events: ${recentEvents.length} recorded actions

RECENT PATTERNS:
${recentEvents.map(e => `${e.type}: ${e.athlete}${e.technique ? ` (${e.technique})` : ''}`).join(', ')}

STRATEGIC CONTEXT:
- Time pressure: ${this.calculateTimeRemaining() < 60 ? 'HIGH' : 'MODERATE'}
- Score pressure: ${Math.abs(scoreDifference) > 3 ? 'HIGH' : 'NORMAL'}
- Momentum: ${this.calculateMomentum(recentEvents)}

Generate 3-4 prioritized adaptive suggestions in JSON format:
{
  "suggestions": [
    {
      "type": "tactical" | "technical" | "mental" | "defensive",
      "priority": 1-5,
      "message": "specific actionable suggestion",
      "expectedImpact": "expected outcome",
      "timeWindow": seconds_to_execute
    }
  ]
}

Prioritize suggestions based on current score situation and match dynamics.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an elite Taekwondo tactical AI providing real-time adaptive suggestions during live matches. Generate prioritized, actionable advice that adapts to the current match situation."
          },
          {
            role: "user",
            content: suggestionPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.suggestions || [];
    } catch (error) {
      console.error("Error generating adaptive suggestions:", error);
      throw new Error("Failed to generate adaptive suggestions");
    }
  }

  private calculateCurrentScore(): { self: number; opponent: number } {
    const scoreEvents = this.matchEvents.filter(e => e.type === 'score');
    
    const selfScore = scoreEvents
      .filter(e => e.athlete === 'self')
      .reduce((sum, e) => sum + (e.points || 0), 0);
      
    const opponentScore = scoreEvents
      .filter(e => e.athlete === 'opponent')
      .reduce((sum, e) => sum + (e.points || 0), 0);

    return { self: selfScore, opponent: opponentScore };
  }

  private getCurrentRound(): number {
    const roundEndEvents = this.matchEvents.filter(e => e.type === 'round_end');
    return roundEndEvents.length + 1;
  }

  private calculateTimeRemaining(): number {
    // Standard Taekwondo round is 2 minutes (120 seconds)
    const roundDuration = 120;
    const currentRoundStart = this.matchEvents
      .filter(e => e.type === 'round_end')
      .slice(-1)[0]?.timestamp || this.currentMatch?.startTime || Date.now();
    
    const elapsedInRound = (Date.now() - currentRoundStart) / 1000;
    return Math.max(0, roundDuration - elapsedInRound);
  }

  private calculateMomentum(events: MatchEvent[]): string {
    const recentScoringEvents = events
      .filter(e => e.type === 'score')
      .slice(-5); // Last 5 scoring events

    if (recentScoringEvents.length === 0) return 'neutral';

    const selfPoints = recentScoringEvents
      .filter(e => e.athlete === 'self')
      .reduce((sum, e) => sum + (e.points || 0), 0);
    
    const opponentPoints = recentScoringEvents
      .filter(e => e.athlete === 'opponent')
      .reduce((sum, e) => sum + (e.points || 0), 0);

    const difference = selfPoints - opponentPoints;
    
    if (difference > 2) return 'gaining';
    if (difference < -2) return 'losing';
    return 'neutral';
  }

  private getMatchPhase(): string {
    const matchDuration = Date.now() - (this.currentMatch?.startTime || Date.now());
    const minutes = matchDuration / 60000;
    
    if (minutes < 2) return 'early';
    if (minutes < 4) return 'middle';
    return 'late';
  }

  async endMatch(): Promise<void> {
    if (this.currentMatch) {
      this.currentMatch.isActive = false;
    }
  }

  getMatchEvents(): MatchEvent[] {
    return [...this.matchEvents];
  }

  isMatchActive(): boolean {
    return this.currentMatch?.isActive || false;
  }
}

export const realTimeEngine = new RealTimeAnalysisEngine();