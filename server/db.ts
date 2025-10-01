import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure Neon HTTP client for better connection handling
neonConfig.fetchConnectionCache = true;

// Create the connection using HTTP (more stable for serverless)
const sql = neon(process.env.DATABASE_URL);

// Create database instance with retry logic
export const db = drizzle(sql, { schema });

// Utility function to retry database operations
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a retryable error
      const isRetryable = 
        error.message?.includes('terminating connection due to administrator command') ||
        error.message?.includes('ECONNRESET') ||
        error.code === '57P01' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED';
        
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = 100 * Math.pow(2, attempt - 1);
      console.log(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}