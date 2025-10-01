
#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import ws from 'ws';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

async function setupProductionDatabase() {
  const prodDatabaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!prodDatabaseUrl) {
    console.error('❌ PROD_DATABASE_URL or DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Setting up production database...');

  try {
    // Create connection pool
    const pool = new Pool({ connectionString: prodDatabaseUrl });
    const db = drizzle({ client: pool });

    // Run migrations
    console.log('📦 Running database migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('✅ Production database setup completed successfully!');
    console.log('📊 Database URL:', prodDatabaseUrl.replace(/\/\/.*@/, '//***:***@'));
    
    // Close connection
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error setting up production database:', error);
    process.exit(1);
  }
}

setupProductionDatabase();
