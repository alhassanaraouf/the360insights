
#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
import * as schema from '../shared/schema';
import { writeFileSync } from 'fs';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

async function backupProductionDatabase() {
  const prodDatabaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!prodDatabaseUrl) {
    console.error('❌ PROD_DATABASE_URL or DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('💾 Creating production database backup...');

  try {
    // Create connection pool
    const pool = new Pool({ connectionString: prodDatabaseUrl });
    const db = drizzle({ client: pool, schema });

    // Export all data
    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        users: await db.select().from(schema.users),
        coaches: await db.select().from(schema.coaches),
        athletes: await db.select().from(schema.athletes),
        kpiMetrics: await db.select().from(schema.kpiMetrics),
        strengths: await db.select().from(schema.strengths),
        weaknesses: await db.select().from(schema.weaknesses),
        athleteRanks: await db.select().from(schema.athleteRanks),
        trainingRecommendations: await db.select().from(schema.trainingRecommendations),
        careerEvents: await db.select().from(schema.careerEvents),
        aiQueries: await db.select().from(schema.aiQueries)
      }
    };

    // Save backup to file
    const filename = `backup_production_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    writeFileSync(filename, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Production database backup created: ${filename}`);
    console.log(`📊 Records backed up:`);
    Object.entries(backup.data).forEach(([table, records]) => {
      console.log(`   ${table}: ${records.length} records`);
    });
    
    // Close connection
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error creating database backup:', error);
    process.exit(1);
  }
}

backupProductionDatabase();
