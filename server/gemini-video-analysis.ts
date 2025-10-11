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

      // First, get match analysis to extract consistent player names
      onProgress("Analyzing match dynamics...", 30);
      let matchAnalysisText = '';
      let playerNames = ["Player 1", "Player 2"];
      let matchAnalysisError: string | null = null;
      
      try {
        const matchPrompt = `Write me a match analysis of what happened in ${roundText} in technical terms. Include the story of the ${roundText === 'entire match' ? 'match' : 'round'}.

Write your response in English.

IMPORTANT: Start by clearly stating both player names in the format "Player 1 Name vs Player 2 Name" on the first line.

Focus on:
- Opening strategy and tactics
- Key moments and turning points
- Technical execution quality
- Tactical adjustments
- Momentum shifts
- Critical decisions
- Overall performance assessment

Listen to commentator insights and incorporate them into your analysis. Watch the scoreboard for accurate score tracking.

Provide a detailed narrative that captures the essence of the competition.`;

        const matchResult = await genAI.models.generateContent({
          model: "gemini-2.0-flash-exp",
          config: {
            temperature: 0,
            maxOutputTokens: 8192,
          },
          contents: createUserContent([
            createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
            matchPrompt
          ])
        });

        matchAnalysisText = matchResult.text || '';
        playerNames = extractPlayerNames(matchAnalysisText);
        console.log(`Extracted player names: ${playerNames[0]} vs ${playerNames[1]}`);
      } catch (error: any) {
        console.error('Match analysis error:', error.message);
        matchAnalysisError = error.message;
      }

      // Run all other analyses in parallel with consistent player names
      onProgress("Running comprehensive analysis...", 40);

      const analysisPromises = [

        // Score Analysis (JSON)
        (async () => {
          try {
            onProgress("Identifying scoring patterns...", 50);
            const prompt = `IMPORTANT: Return ONLY the JSON object below, with no explanatory text before or after.

Watch ${roundText} only. Identify when a player scored using the scoreboard. Focus on scoreboard changes for accuracy. Listen to commentators - they help reference which player scored how many points.

The two players are: "${playerNames[0]}" and "${playerNames[1]}"

Return this EXACT JSON format using these exact player names:
{
  "players": [
    {
      "name": "${playerNames[0]}",
      "total": total_score_number,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Point description",
          "value": points_scored
        }
      ]
    },
    {
      "name": "${playerNames[1]}",
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
- Use the EXACT player names provided above
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

The two players are: "${playerNames[0]}" and "${playerNames[1]}"

Return this EXACT JSON format using these exact player names:
{
  "players": [
    {
      "name": "${playerNames[0]}",
      "total": total_punches_count,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Punch type/target",
          "value": 1
        }
      ]
    },
    {
      "name": "${playerNames[1]}",
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

CRITICAL: Use MM:SS timestamp format (Minutes:Seconds) - NOT HH:MM:SS and use the EXACT player names provided above`;

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

The two players are: "${playerNames[0]}" and "${playerNames[1]}"

Return this EXACT JSON format using these exact player names:
{
  "players": [
    {
      "name": "${playerNames[0]}",
      "total": total_kicks_count,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Kick type (e.g., roundhouse, spinning hook, head kick, body kick)",
          "value": 1
        }
      ]
    },
    {
      "name": "${playerNames[1]}",
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

CRITICAL: Use MM:SS timestamp format (Minutes:Seconds) - NOT HH:MM:SS and use the EXACT player names provided above`;

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

The two players are: "${playerNames[0]}" and "${playerNames[1]}"

Return this EXACT JSON format using these exact player names:
{
  "players": [
    {
      "name": "${playerNames[0]}",
      "total": total_violations_count,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Type of violation (e.g., yellow card, warning, penalty)",
          "value": 1
        }
      ]
    },
    {
      "name": "${playerNames[1]}",
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

CRITICAL: Use MM:SS timestamp format (Minutes:Seconds) - NOT HH:MM:SS and use the EXACT player names provided above`;

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
            const prompt = `IMPORTANT: Return ONLY valid JSON with no text before or after. Do not include any commentary.

Analyze ${roundText} and provide coaching advice for each player.

The two players are: "${playerNames[0]}" and "${playerNames[1]}"

Return EXACTLY this JSON structure with actual data using these exact player names:
{
  "players": [
    {
      "name": "${playerNames[0]}",
      "tactical_advice": {
        "issues": ["tactical issue 1", "tactical issue 2", "tactical issue 3"],
        "improvements": ["tactical improvement 1", "tactical improvement 2", "tactical improvement 3"]
      },
      "technical_advice": {
        "issues": ["technical issue 1", "technical issue 2", "technical issue 3"],
        "improvements": ["technical improvement 1", "technical improvement 2", "technical improvement 3"]
      },
      "mental_advice": {
        "issues": ["mental issue 1", "mental issue 2"],
        "improvements": ["mental improvement 1", "mental improvement 2", "mental improvement 3"]
      }
    },
    {
      "name": "${playerNames[1]}",
      "tactical_advice": {
        "issues": ["tactical issue 1", "tactical issue 2", "tactical issue 3"],
        "improvements": ["tactical improvement 1", "tactical improvement 2", "tactical improvement 3"]
      },
      "technical_advice": {
        "issues": ["technical issue 1", "technical issue 2", "technical issue 3"],
        "improvements": ["technical improvement 1", "technical improvement 2", "technical improvement 3"]
      },
      "mental_advice": {
        "issues": ["mental issue 1", "mental issue 2"],
        "improvements": ["mental improvement 1", "mental improvement 2", "mental improvement 3"]
      }
    }
  ]
}

Rules:
- Include both players
- Each category (tactical, technical, mental) must have at least 2-3 items in issues and improvements arrays
- Use actual player names from the match
- Return ONLY the JSON object`;

            const result = await genAI.models.generateContent({
              model: "gemini-2.0-flash-exp",
              config: {
                temperature: 0,
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
              },
              contents: createUserContent([
                createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                prompt
              ])
            });

            // Extract text from Gemini response
            const responseText = result.text || '';
            if (!responseText) {
              console.error('[ADVICE] Empty response from Gemini');
              console.error('[ADVICE] Result object keys:', Object.keys(result));
              throw new Error('Empty response from Gemini');
            }
            
            console.log('[ADVICE] Raw response length:', responseText.length);
            console.log('[ADVICE] First 300 chars:', responseText.substring(0, 300));
            console.log('[ADVICE] Last 200 chars:', responseText.substring(Math.max(0, responseText.length - 200)));
            
            // Since we're using responseMimeType: "application/json", the response should be valid JSON
            // Just trim whitespace and parse directly
            let parsed;
            try {
              const trimmed = responseText.trim();
              parsed = JSON.parse(trimmed);
              console.log('[ADVICE] Successfully parsed JSON directly');
            } catch (e: any) {
              console.log('[ADVICE] Direct parse failed:', e.message);
              console.log('[ADVICE] Trying to extract JSON from text...');
              
              // More aggressive: extract JSON from any surrounding text
              let cleaned = responseText.trim();
              const firstBrace = cleaned.indexOf('{');
              const lastBrace = cleaned.lastIndexOf('}');
              
              if (firstBrace !== -1 && lastBrace !== -1) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
                console.log('[ADVICE] Extracted JSON length:', cleaned.length);
                console.log('[ADVICE] Extracted first 200:', cleaned.substring(0, 200));
                try {
                  parsed = JSON.parse(cleaned);
                  console.log('[ADVICE] Successfully parsed after extraction');
                } catch (e2: any) {
                  console.error('[ADVICE] Parse failed even after extraction:', e2.message);
                  console.error('[ADVICE] Extracted text:', cleaned.substring(0, 500));
                  throw new Error('Cannot parse advice JSON: ' + e2.message);
                }
              } else {
                console.error('[ADVICE] No JSON braces found in response');
                throw new Error('No JSON braces found in response');
              }
            }
            
            // Validate that we have proper data
            if (!parsed.players || parsed.players.length === 0) {
              console.error('Parsed data:', JSON.stringify(parsed).substring(0, 500));
              throw new Error('Invalid advice structure - missing or empty players array');
            }
            
            console.log('Successfully validated advice for', parsed.players.length, 'players');
            return { data: parsed, error: null };
          } catch (error: any) {
            console.error('Advice analysis error:', error.message);
            console.error('Full error:', error);
            return { data: getFallbackAdviceStructure(), error: error.message };
          }
        })()
      ];

      const results = await Promise.allSettled(analysisPromises);

      onProgress("Finalizing analysis...", 95);

      // Extract results (5 promises: score, punch, kick, violation, advice)
      // Note: matchAnalysisText was generated separately before these promises
      const [scoreResult, punchResult, kickResult, violationResult, adviceResult] = results;

      const processingTime = Date.now() - startTime;
      
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
          match: matchAnalysisError,
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
