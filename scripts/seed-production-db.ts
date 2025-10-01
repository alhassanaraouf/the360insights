
#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

async function seedProductionDatabase() {
  const prodDatabaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!prodDatabaseUrl) {
    console.error('❌ PROD_DATABASE_URL or DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🌱 Seeding production database...');

  try {
    // Create connection pool
    const pool = new Pool({ connectionString: prodDatabaseUrl });
    const db = drizzle({ client: pool, schema });

    // Check if data already exists
    const existingCoaches = await db.select().from(schema.coaches).limit(1);
    
    if (existingCoaches.length > 0) {
      console.log('⚠️  Production database already contains data. Skipping seed.');
      await pool.end();
      return;
    }

    // Insert sample coaches
    console.log('👨‍🏫 Creating sample coaches...');
    const sampleCoaches = await db.insert(schema.coaches).values([
      {
        name: "Sarah Johnson",
        title: "Head Coach"
      },
      {
        name: "Michael Chen",
        title: "Technical Director"
      },
      {
        name: "Maria Rodriguez",
        title: "Performance Coach"
      }
    ]).returning();

    // Insert sample athletes
    console.log('🥋 Creating sample athletes...');
    await db.insert(schema.athletes).values([
      {
        name: "Alex Thompson",
        sport: "Taekwondo",
        nationality: "USA",
        gender: "M",
        worldCategory: "M-68kg",
        coachId: sampleCoaches[0].id,
        profileImage: "https://via.placeholder.com/150"
      },
      {
        name: "Sofia Patel",
        sport: "Taekwondo", 
        nationality: "GBR",
        gender: "F",
        worldCategory: "F-57kg",
        coachId: sampleCoaches[1].id,
        profileImage: "https://via.placeholder.com/150"
      }
    ]);

    console.log('✅ Production database seeded successfully!');
    
    // Close connection
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    process.exit(1);
  }
}

seedProductionDatabase();
