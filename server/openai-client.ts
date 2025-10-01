import OpenAI from "openai";

let openaiClient: OpenAI | null = null;
let initialized = false;

export function getOpenAIClient(): OpenAI | null {
  if (initialized) {
    return openaiClient;
  }
  
  initialized = true;
  
  if (process.env.OPENAI_API_KEY) {
    try {
      openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log("OpenAI client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize OpenAI client:", error);
      openaiClient = null;
    }
  } else {
    console.log("OPENAI_API_KEY not configured - AI features will be unavailable");
    openaiClient = null;
  }
  
  return openaiClient;
}

export function isOpenAIAvailable(): boolean {
  return getOpenAIClient() !== null;
}
