import OpenAI from "openai";
import { storage } from "./storage";
import type { InsertAthlete, Athlete } from "@shared/schema";

// Using OpenAI o3-mini model for enhanced verification accuracy
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VerifiedAthleteData {
  name: string;
  nationality: string;
  worldRank: number | null;
  weight: string;
  gender: string;
  category: string;
  achievements: string[];
  isVerified: boolean;
  verificationSource: string;
  lastUpdated: string;
}

export interface VerificationResult {
  isValid: boolean;
  verifiedData: VerifiedAthleteData | null;
  errors: string[];
  confidence: number;
}

export class AthleteVerificationEngine {
  async verifyAthleteData(athleteName: string, providedData?: Partial<InsertAthlete>): Promise<VerificationResult> {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return {
          isValid: false,
          verifiedData: null,
          errors: ['OpenAI API key not configured. Please provide your OpenAI API key to enable data verification.'],
          confidence: 0
        };
      }
      const prompt = `
You are a precise data verification expert for World Taekwondo athlete information.

Athlete to verify: "${athleteName}"

Task: Search for this athlete in official World Taekwondo rankings and competition records. Check:
- Current World Taekwondo official rankings (if any)
- Olympic participation records
- World Championships participation
- Competition history in major tournaments
- Official athlete profiles from World Taekwondo

CRITICAL REQUIREMENTS:
1. Only provide information you can verify from authentic World Taekwondo sources
2. If you cannot find verified data for this athlete, return isValid: false
3. Egyptian Taekwondo athletes should be verifiable through World Taekwondo rankings
4. Include specific achievements with years and tournament names
5. Use authentic weight categories (e.g., -68kg, -80kg, +87kg)

Respond in JSON format:
{
  "isValid": boolean (true only if athlete exists in official records),
  "verifiedData": {
    "name": "exact name as in official records",
    "nationality": "3-letter country code (e.g., EGY, USA)",
    "worldRank": number or null,
    "weight": "official weight category",
    "gender": "Male or Female",
    "category": "Senior/Junior/Cadet",
    "achievements": ["specific tournament results with years"],
    "isVerified": true,
    "verificationSource": "World Taekwondo Official Rankings",
    "lastUpdated": "${new Date().toISOString().split('T')[0]}"
  },
  "confidence": number (0-100, based on data availability),
  "errors": ["specific reasons if verification fails"]
}

Example of verified athlete data format:
{
  "isValid": true,
  "verifiedData": {
    "name": "Ahmed Khalil",
    "nationality": "EGY",
    "worldRank": 15,
    "weight": "-68kg",
    "gender": "Male",
    "category": "Senior",
    "achievements": ["2023 World Championships Bronze", "2022 African Championships Gold"],
    "isVerified": true,
    "verificationSource": "World Taekwondo Official Rankings",
    "lastUpdated": "${new Date().toISOString().split('T')[0]}"
  },
  "confidence": 95,
  "errors": []
}
`;

      const response = await openai.chat.completions.create({
        model: "o3",
        messages: [
          {
            role: "system",
            content: "You are a precise sports data verification expert. Only provide information from authentic World Taekwondo sources. Never use placeholder or mock data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        isValid: result.isValid || false,
        verifiedData: result.verifiedData || null,
        errors: result.errors || [],
        confidence: result.confidence || 0
      };

    } catch (error) {
      console.error('Athlete verification error:', error);
      return {
        isValid: false,
        verifiedData: null,
        errors: ['Unable to connect to verification service. Please check your OpenAI API key configuration.'],
        confidence: 0
      };
    }
  }

  async verifyOpponentData(opponentName: string, athleteId: number): Promise<VerificationResult> {
    try {
      const athlete = await storage.getAthlete(athleteId);
      if (!athlete) {
        return {
          isValid: false,
          verifiedData: null,
          errors: ['Main athlete not found'],
          confidence: 0
        };
      }

      const prompt = `
Verify this potential opponent for ${athlete.name}:

Opponent: ${opponentName}
Main Athlete: ${athlete.name} (${athlete.nationality})

Please verify:
1. Does this opponent exist in World Taekwondo rankings?
2. Are they in the same or compatible weight category?
3. What is their current world ranking?
4. Recent competition history against similar opponents
5. Threat level based on rankings and recent performance

Provide accurate, verifiable information only.

Respond with JSON format:
{
  "isValid": boolean,
  "verifiedData": {
    "name": "string",
    "nationality": "string",
    "worldRank": number or null,
    "weight": "string",
    "gender": "string",
    "category": "string", 
    "achievements": ["verified achievements"],
    "isVerified": true,
    "verificationSource": "World Taekwondo Official Rankings",
    "lastUpdated": "current date"
  },
  "confidence": number,
  "errors": ["any issues"]
}
`;

      const response = await openai.chat.completions.create({
        model: "o3",
        messages: [
          {
            role: "system", 
            content: "You are a precise sports data verification expert. Only provide authentic World Taekwondo data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        isValid: result.isValid || false,
        verifiedData: result.verifiedData || null,
        errors: result.errors || [],
        confidence: result.confidence || 0
      };

    } catch (error) {
      console.error('Opponent verification error:', error);
      return {
        isValid: false,
        verifiedData: null,
        errors: ['Verification service unavailable'],
        confidence: 0
      };
    }
  }

  async bulkVerifyAthletes(athleteNames: string[]): Promise<Map<string, VerificationResult>> {
    const results = new Map<string, VerificationResult>();
    
    // Process in batches to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < athleteNames.length; i += batchSize) {
      const batch = athleteNames.slice(i, i + batchSize);
      const batchPromises = batch.map(name => this.verifyAthleteData(name));
      const batchResults = await Promise.all(batchPromises);
      
      batch.forEach((name, index) => {
        results.set(name, batchResults[index]);
      });
      
      // Small delay between batches
      if (i + batchSize < athleteNames.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  async validateExistingData(): Promise<{
    totalChecked: number;
    validAthletes: number;
    invalidAthletes: string[];
    verificationReport: string;
  }> {
    try {
      const allAthletes = await storage.getAllAthletes();
      const athleteNames = allAthletes.map(athlete => athlete.name);
      
      const verificationResults = await this.bulkVerifyAthletes(athleteNames);
      
      let validCount = 0;
      const invalidAthletes: string[] = [];
      
      verificationResults.forEach((result, name) => {
        if (result.isValid && result.confidence >= 70) {
          validCount++;
        } else {
          invalidAthletes.push(name);
        }
      });
      
      const report = `
Data Verification Report
========================
Total Athletes Checked: ${allAthletes.length}
Valid Athletes: ${validCount}
Invalid/Unverified Athletes: ${invalidAthletes.length}
Verification Success Rate: ${((validCount / allAthletes.length) * 100).toFixed(1)}%

Invalid Athletes:
${invalidAthletes.map(name => `- ${name}`).join('\n')}
`;

      return {
        totalChecked: allAthletes.length,
        validAthletes: validCount,
        invalidAthletes,
        verificationReport: report
      };
      
    } catch (error) {
      console.error('Data validation error:', error);
      throw new Error('Failed to validate existing data');
    }
  }
}

export const athleteVerificationEngine = new AthleteVerificationEngine();