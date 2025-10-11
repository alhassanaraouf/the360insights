import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GEMINI_API_KEY || "";

if (!API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Video analysis will not work.");
}

const genAI = new GoogleGenAI({ apiKey: API_KEY });

// JSON cleaning function
function cleanJsonResponse(responseText: string): string {
  let cleanedText = responseText.trim();
  
  // Remove code block markers
  cleanedText = cleanedText.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
  cleanedText = cleanedText.replace(/^```\s*/m, '').replace(/\s*```$/m, '');
  
  // Extract JSON object from text (handle responses like "Okay, here's the JSON: {...}")
  const firstBrace = cleanedText.indexOf('{');
  const lastBrace = cleanedText.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
  }
  
  // Parse and reformat
  try {
    const parsed = JSON.parse(cleanedText);
    return JSON.stringify(parsed);
  } catch (error) {
    // Additional cleanup attempts
    cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    cleanedText = cleanedText.replace(/,\s*([}\]])/g, '$1');
    
    try {
      const parsed = JSON.parse(cleanedText);
      return JSON.stringify(parsed);
    } catch (e) {
      console.error("Failed to parse JSON:", cleanedText);
      throw new Error('Failed to parse JSON response');
    }
  }
}

// Extract player names from match analysis text
function extractPlayerNames(matchAnalysis: string): string[] {
  // Try to find player names in patterns like "Name (COUNTRY)" or just "Name"
  const pattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+\([A-Z]{2,3}\))?)/g;
  const matches = matchAnalysis.match(pattern);
  
  if (matches && matches.length >= 2) {
    // Return first two unique names
    const uniqueNames = Array.from(new Set(matches));
    return uniqueNames.slice(0, 2);
  }
  
  return ["Player 1", "Player 2"];
}

// Fallback JSON structure for errors
function getFallbackPlayerStructure(matchAnalysis?: string) {
  const names = matchAnalysis ? extractPlayerNames(matchAnalysis) : ["Player 1", "Player 2"];
  return {
    players: [
      {
        name: names[0],
        total: 0,
        events: []
      },
      {
        name: names[1],
        total: 0,
        events: []
      }
    ]
  };
}

function getFallbackAdviceStructure(matchAnalysis?: string) {
  const names = matchAnalysis ? extractPlayerNames(matchAnalysis) : ["Player 1", "Player 2"];
  return {
    players: [
      {
        name: names[0],
        tactical_advice: { issues: [], improvements: [] },
        technical_advice: { issues: [], improvements: [] },
        mental_advice: { issues: [], improvements: [] }
      },
      {
        name: names[1],
        tactical_advice: { issues: [], improvements: [] },
        technical_advice: { issues: [], improvements: [] },
        mental_advice: { issues: [], improvements: [] }
      }
    ]
  };
}

interface AnalysisProgress {
  stage: string;
  progress: number;
  onProgress: (stage: string, progress: number) => void;
}

export class GeminiVideoAnalysis {
  async uploadAndProcessVideo(
    videoPath: string,
    onProgress: (stage: string, progress: number) => void
  ): Promise<any> {
    onProgress("Uploading video file...", 10);

    const uploadedFile = await genAI.files.upload({
      file: videoPath,
      config: { 
        mimeType: 'video/mp4',
        displayName: `taekwondo_analysis_${Date.now()}`
      }
    });

    onProgress("Processing video...", 20);

    // Wait for video to be processed
    const fileName = uploadedFile.name || '';
    let file = await genAI.files.get({ name: fileName });
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();

    while (file.state === 'PROCESSING') {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Video processing timeout (10 minutes)');
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
      file = await genAI.files.get({ name: fileName });
    }

    if (file.state === 'FAILED') {
      throw new Error('Video processing failed');
    }

    return file;
  }

  async analyzeMatch(
    videoPath: string,
    round: number | 'no-rounds' | null,
    onProgress: (stage: string, progress: number) => void
  ) {
    const startTime = Date.now();
    let uploadedFile: any = null;

    try {
      // Upload and process video
      uploadedFile = await this.uploadAndProcessVideo(videoPath, onProgress);

      const roundText = round === 'no-rounds' 
        ? 'entire match' 
        : round 
        ? `round ${round}` 
        : 'entire match';

      // Run all analyses in parallel
      onProgress("Running comprehensive analysis...", 30);

      const analysisPromises = [
        // Match Analysis (Text)
        (async () => {
          try {
            onProgress("Analyzing match dynamics...", 40);
            const prompt = `Write me a match analysis of what happened in ${roundText} in technical terms. Include the story of the ${roundText === 'entire match' ? 'match' : 'round'}.

Write your response in English.

Focus on:
- Opening strategy and tactics
- Key moments and turning points
- Technical execution quality
- Tactical adjustments
- Momentum shifts
- Critical decisions
- Overall performance assessment

Listen to commentator insights and incorporate them into your analysis. Watch the scoreboard for accurate score tracking.

Start with the first player, then analyze the second player. Use actual player names from the video.

Provide a detailed narrative that captures the essence of the competition.`;

            const result = await genAI.models.generateContent({
              model: "gemini-2.0-flash-exp",
              config: {
                temperature: 0,
                maxOutputTokens: 8192,
              },
              contents: createUserContent([
                createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                prompt
              ])
            });

            return { data: result.text || '', error: null };
          } catch (error: any) {
            return { data: null, error: error.message };
          }
        })(),

        // Score Analysis (JSON)
        (async () => {
          try {
            onProgress("Identifying scoring patterns...", 50);
            const prompt = `IMPORTANT: Return ONLY the JSON object below, with no explanatory text before or after.

Watch ${roundText} only. Identify when a player scored using the scoreboard. Focus on scoreboard changes for accuracy. Listen to commentators - they help reference which player scored how many points.

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "total": total_score_number,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Point description",
          "value": points_scored
        }
      ]
    }
  ]
}

CRITICAL:
- Use MM:SS timestamp format (Minutes:Seconds) - NOT HH:MM:SS
- Use actual player names from video
- Track cumulative score changes
- List scoring events chronologically`;

            const result = await genAI.models.generateContent({
              model: "gemini-2.0-flash-exp",
              config: {
                temperature: 0,
                maxOutputTokens: 8192,
              },
              contents: createUserContent([
                createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                prompt
              ])
            });

            const cleaned = cleanJsonResponse(result.text || '');
            return { data: JSON.parse(cleaned), error: null };
          } catch (error: any) {
            return { data: getFallbackPlayerStructure(), error: error.message };
          }
        })(),

        // Punch Analysis (JSON)
        (async () => {
          try {
            onProgress("Analyzing techniques...", 60);
            const prompt = `IMPORTANT: Return ONLY the JSON object below, with no explanatory text before or after.

Track all punches thrown in ${roundText}. Count every attempt (successful or blocked).

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "total": total_punches_count,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Punch type/target",
          "value": 1
        }
      ]
    }
  ]
}

CRITICAL: Use MM:SS timestamp format (Minutes:Seconds) - NOT HH:MM:SS`;

            const result = await genAI.models.generateContent({
              model: "gemini-2.0-flash-exp",
              config: {
                temperature: 0,
                maxOutputTokens: 8192,
              },
              contents: createUserContent([
                createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                prompt
              ])
            });

            const cleaned = cleanJsonResponse(result.text || '');
            return { data: JSON.parse(cleaned), error: null };
          } catch (error: any) {
            return { data: getFallbackPlayerStructure(), error: error.message };
          }
        })(),

        // Kick Count Analysis (JSON)
        (async () => {
          try {
            onProgress("Counting kicks and punches...", 70);
            const prompt = `IMPORTANT: Return ONLY the JSON object below, with no explanatory text before or after.

Track all kicks executed in ${roundText}. Count every kick attempt regardless of success.

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "total": total_kicks_count,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Kick type (e.g., roundhouse, spinning hook, head kick, body kick)",
          "value": 1
        }
      ]
    }
  ]
}

CRITICAL: Use MM:SS timestamp format (Minutes:Seconds) - NOT HH:MM:SS`;

            const result = await genAI.models.generateContent({
              model: "gemini-2.0-flash-exp",
              config: {
                temperature: 0,
                maxOutputTokens: 8192,
              },
              contents: createUserContent([
                createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                prompt
              ])
            });

            const cleaned = cleanJsonResponse(result.text || '');
            return { data: JSON.parse(cleaned), error: null };
          } catch (error: any) {
            return { data: getFallbackPlayerStructure(), error: error.message };
          }
        })(),

        // Yellow Card/Violations Analysis (JSON)
        (async () => {
          try {
            onProgress("Reviewing violations...", 80);
            const prompt = `IMPORTANT: Return ONLY the JSON object below, with no explanatory text before or after.

Watch the scoreboard for referee signals indicating yellow cards, warnings, or penalties in ${roundText}.

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "total": total_violations_count,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Type of violation (e.g., yellow card, warning, penalty)",
          "value": 1
        }
      ]
    }
  ]
}

CRITICAL: Use MM:SS timestamp format (Minutes:Seconds) - NOT HH:MM:SS`;

            const result = await genAI.models.generateContent({
              model: "gemini-2.0-flash-exp",
              config: {
                temperature: 0,
                maxOutputTokens: 8192,
              },
              contents: createUserContent([
                createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                prompt
              ])
            });

            const cleaned = cleanJsonResponse(result.text || '');
            return { data: JSON.parse(cleaned), error: null };
          } catch (error: any) {
            return { data: getFallbackPlayerStructure(), error: error.message };
          }
        })(),

        // Player Advice (JSON)
        (async () => {
          try {
            onProgress("Generating player advice...", 90);
            const prompt = `IMPORTANT: Return ONLY the JSON object below, with no explanatory text before or after.

Analyze ${roundText} and provide coaching advice for each player.

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "tactical_advice": {
        "issues": ["List of tactical mistakes"],
        "improvements": ["Specific tactical recommendations"]
      },
      "technical_advice": {
        "issues": ["Technical mistakes observed"],
        "improvements": ["Skills to work on"]
      },
      "mental_advice": {
        "issues": ["Mental/psychological issues"],
        "improvements": ["Mental training recommendations"]
      }
    }
  ]
}`;

            const result = await genAI.models.generateContent({
              model: "gemini-2.0-flash-exp",
              config: {
                temperature: 0,
                maxOutputTokens: 8192,
              },
              contents: createUserContent([
                createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                prompt
              ])
            });

            const cleaned = cleanJsonResponse(result.text || '');
            return { data: JSON.parse(cleaned), error: null };
          } catch (error: any) {
            return { data: getFallbackAdviceStructure(), error: error.message };
          }
        })()
      ];

      const results = await Promise.allSettled(analysisPromises);

      onProgress("Finalizing analysis...", 95);

      // Extract results
      const [matchResult, scoreResult, punchResult, kickResult, violationResult, adviceResult] = results;

      const processingTime = Date.now() - startTime;

      const matchAnalysisText = matchResult.status === 'fulfilled' ? matchResult.value.data : null;
      
      return {
        match_analysis: matchAnalysisText,
        score_analysis: scoreResult.status === 'fulfilled' ? scoreResult.value.data : getFallbackPlayerStructure(matchAnalysisText),
        punch_analysis: punchResult.status === 'fulfilled' ? punchResult.value.data : getFallbackPlayerStructure(matchAnalysisText),
        kick_count_analysis: kickResult.status === 'fulfilled' ? kickResult.value.data : getFallbackPlayerStructure(matchAnalysisText),
        yellow_card_analysis: violationResult.status === 'fulfilled' ? violationResult.value.data : getFallbackPlayerStructure(matchAnalysisText),
        advice_analysis: adviceResult.status === 'fulfilled' ? adviceResult.value.data : getFallbackAdviceStructure(matchAnalysisText),
        sport: "Taekwondo",
        roundAnalyzed: round,
        processedAt: new Date().toISOString(),
        processingTimeMs: processingTime,
        errors: {
          match: matchResult.status === 'fulfilled' ? matchResult.value.error : (matchResult as PromiseRejectedResult).reason,
          score: scoreResult.status === 'fulfilled' ? scoreResult.value.error : (scoreResult as PromiseRejectedResult).reason,
          punch: punchResult.status === 'fulfilled' ? punchResult.value.error : (punchResult as PromiseRejectedResult).reason,
          kick: kickResult.status === 'fulfilled' ? kickResult.value.error : (kickResult as PromiseRejectedResult).reason,
          violation: violationResult.status === 'fulfilled' ? violationResult.value.error : (violationResult as PromiseRejectedResult).reason,
          advice: adviceResult.status === 'fulfilled' ? adviceResult.value.error : (adviceResult as PromiseRejectedResult).reason,
        }
      };

    } finally {
      // Cleanup uploaded file
      if (uploadedFile && uploadedFile.name) {
        try {
          await genAI.files.delete({ name: uploadedFile.name });
          console.log('Uploaded file cleaned up successfully');
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file:', cleanupError);
        }
      }
    }
  }

  async analyzeClip(
    videoPath: string,
    whatToAnalyze: string,
    onProgress: (stage: string, progress: number) => void
  ) {
    const startTime = Date.now();
    let uploadedFile: any = null;

    try {
      // Upload and process video
      uploadedFile = await this.uploadAndProcessVideo(videoPath, onProgress);

      onProgress("Understanding your request...", 30);
      onProgress("Analyzing techniques...", 50);

      const prompt = `You are an expert Taekwondo coach and performance analyst with extensive experience in professional training and technique optimization.

Analyze this video clip based on the user's specific request and provide detailed, actionable coaching advice.

User's Request: ${whatToAnalyze}

Sport: Taekwondo
Key Technical Elements: kicks, punches, head kicks, body kicks, spinning kicks

IMPORTANT: Skip all introductory sentences. Do not start with phrases like "Of course", "As a coach", etc. Start directly with the analysis content.

Please provide a comprehensive coaching analysis that:
1. Directly addresses the user's specific question
2. Identifies what each person is doing correctly
3. Points out specific technical areas needing improvement
4. Provides actionable steps and drills
5. Compares technique to professional standards
6. Includes safety considerations
7. Suggests specific exercises and training methods
8. If analyzing multiple people, provide individual feedback

Please provide the analysis in English.
Be specific, detailed, and constructive. Focus on practical coaching advice.`;

      onProgress("Comparing to professional standards...", 70);

      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash-exp",
        config: {
          temperature: 0,
          maxOutputTokens: 8192,
        },
        contents: createUserContent([
          createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
          prompt
        ])
      });

      onProgress("Generating coaching advice...", 90);

      const processingTime = Date.now() - startTime;

      onProgress("Finalizing recommendations...", 100);

      return {
        analysisType: 'clip',
        userRequest: whatToAnalyze,
        sport: "Taekwondo",
        language: "english",
        analysis: result.text || '',
        processedAt: new Date().toISOString(),
        processingTimeMs: processingTime
      };

    } finally {
      // Cleanup uploaded file
      if (uploadedFile && uploadedFile.name) {
        try {
          await genAI.files.delete({ name: uploadedFile.name });
          console.log('Uploaded file cleaned up successfully');
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file:', cleanupError);
        }
      }
    }
  }
}

export const geminiVideoAnalysis = new GeminiVideoAnalysis();
