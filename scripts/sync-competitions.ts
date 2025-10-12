#!/usr/bin/env tsx

import { db } from '../server/db';
import { competitions } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { bucketStorage } from '../server/bucket-storage';

interface SimplyCompeteEvent {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  location: {
    country?: string;
    city?: string;
  };
  logo?: string; // Competition logo URL from API
  [key: string]: any;
}

interface SyncResult {
  total: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: number;
  logosUploaded: number;
  logosFailed: number;
}

const BASE_URL = 'https://worldtkd.simplycompete.com/events/eventList';
const ITEMS_PER_PAGE = 50;

async function fetchCompetitionsFromAPI(pageNumber: number = 1): Promise<SimplyCompeteEvent[]> {
  const params = new URLSearchParams({
    da: 'true',
    eventType: 'All',
    invitationStatus: 'all',
    isArchived: 'false',
    itemsPerPage: ITEMS_PER_PAGE.toString(),
    pageNumber: pageNumber.toString(),
  });

  const url = `${BASE_URL}?${params.toString()}`;
  console.log(`📡 Fetching page ${pageNumber} from: ${url}`);

  // Get authentication credentials from environment variables if available
  const apiKey = process.env.SIMPLYCOMPETE_API_KEY;
  const authToken = process.env.SIMPLYCOMPETE_AUTH_TOKEN;
  const cookie = process.env.SIMPLYCOMPETE_COOKIE;

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://worldtkd.simplycompete.com/',
      'Origin': 'https://worldtkd.simplycompete.com',
    };

    // Add authentication if available
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          'Authentication required. The SimplyCompete API requires authentication credentials.\n' +
          'Please set one of the following environment variables:\n' +
          '  - SIMPLYCOMPETE_API_KEY\n' +
          '  - SIMPLYCOMPETE_AUTH_TOKEN\n' +
          'Or contact SimplyCompete for API access credentials.'
        );
      }
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract events array from response (adjust based on actual API structure)
    const events = Array.isArray(data) ? data : data.events || data.data || [];
    
    console.log(`✅ Fetched ${events.length} events from page ${pageNumber}`);
    return events;
  } catch (error) {
    if (pageNumber === 1) {
      console.error(`\n❌ Error fetching data from SimplyCompete API:`);
      console.error(error instanceof Error ? error.message : error);
      console.error(`\n💡 Troubleshooting tips:`);
      console.error(`   1. Verify the API endpoint is accessible: ${BASE_URL}`);
      console.error(`   2. Check if authentication credentials are required`);
      console.error(`   3. Contact SimplyCompete support for API access\n`);
    }
    return [];
  }
}

async function fetchAllCompetitions(): Promise<SimplyCompeteEvent[]> {
  const allEvents: SimplyCompeteEvent[] = [];
  let pageNumber = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const events = await fetchCompetitionsFromAPI(pageNumber);
    
    // Fail fast if first page returns no events (likely auth/API error)
    if (pageNumber === 1 && events.length === 0) {
      throw new Error(
        'Failed to fetch any events from the first page. This typically indicates:\n' +
        '  - Authentication failure (403 Forbidden)\n' +
        '  - API endpoint unavailable\n' +
        '  - Network connectivity issues\n' +
        'Please check the error messages above and resolve before continuing.'
      );
    }
    
    if (events.length === 0) {
      hasMorePages = false;
      console.log(`📄 No more pages. Total pages fetched: ${pageNumber - 1}`);
    } else {
      allEvents.push(...events);
      pageNumber++;
      
      // Safety limit to prevent infinite loops
      if (pageNumber > 100) {
        console.log('⚠️  Reached safety limit of 100 pages');
        hasMorePages = false;
      }
    }
  }

  return allEvents;
}

function normalizeDate(dateStr: string): string {
  // Normalize date to YYYY-MM-DD format
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

function normalizeName(name: string): string {
  // Normalize competition names for more reliable matching
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Collapse multiple spaces to single space
}

async function syncCompetitions(): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    matched: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    logosUploaded: 0,
    logosFailed: 0,
  };

  console.log('🚀 Starting competition sync from SimplyCompete API...\n');

  // Fetch all competitions from API
  const apiEvents = await fetchAllCompetitions();
  result.total = apiEvents.length;

  console.log(`\n📊 Total events fetched: ${result.total}`);
  console.log('🔍 Matching with local database...\n');

  // Get all existing competitions from database
  const existingCompetitions = await db.select().from(competitions);
  console.log(`💾 Found ${existingCompetitions.length} existing competitions in database\n`);

  // Process competitions in parallel batches (similar to athlete imports)
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < apiEvents.length; i += BATCH_SIZE) {
    const batchEvents = apiEvents.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batchEvents.map(async (apiEvent) => {
      try {
        const eventName = apiEvent.name?.trim();
        const eventStartDate = normalizeDate(apiEvent.startDate);

        if (!eventName || !eventStartDate) {
          console.log(`⏭️  Skipping event with missing name or date`);
          result.skipped++;
          return;
        }

        // Try to match with existing competition by normalized name and exact date
        const normalizedEventName = normalizeName(eventName);
        const matchedCompetition = existingCompetitions.find((comp) => {
          const normalizedCompName = normalizeName(comp.name);
          
          // Exact match after normalization
          const exactMatch = normalizedCompName === normalizedEventName;
          
          // Substring match as fallback (more conservative than before)
          const substringMatch = normalizedCompName.includes(normalizedEventName) ||
                                 normalizedEventName.includes(normalizedCompName);
          
          const dateMatch = normalizeDate(comp.startDate) === eventStartDate;
          
          // Require exact name match OR substring with date match
          return dateMatch && (exactMatch || substringMatch);
        });

        if (matchedCompetition) {
          // Update existing competition with SimplyCompete data
          const sourceUrl = `https://worldtkd.simplycompete.com/events/${apiEvent.id}`;
          
          // Prepare update data
          const updateData: any = {
            simplyCompeteEventId: apiEvent.id,
            sourceUrl: sourceUrl,
            metadata: apiEvent as any,
            lastSyncedAt: new Date(),
          };

          // Handle logo upload if available
          if (apiEvent.logo) {
            try {
              console.log(`📷 Uploading logo for competition "${matchedCompetition.name}"`);
              const logoResult = await bucketStorage.uploadCompetitionLogoFromUrl(
                matchedCompetition.id,
                apiEvent.logo
              );
              updateData.logo = logoResult.url;
              result.logosUploaded++;
              console.log(`✅ Logo uploaded for competition ${matchedCompetition.id}`);
            } catch (logoError) {
              result.logosFailed++;
              console.error(`❌ Failed to upload logo for competition ${matchedCompetition.id}:`, logoError);
              // Continue with update even if logo upload fails
            }
          }
          
          await db
            .update(competitions)
            .set(updateData)
            .where(eq(competitions.id, matchedCompetition.id));

          console.log(`✅ Updated: "${matchedCompetition.name}" → SimplyCompete ID: ${apiEvent.id}`);
          result.matched++;
          result.updated++;
        } else {
          console.log(`⏭️  No match found for: "${eventName}" (${eventStartDate})`);
          result.skipped++;
        }
      } catch (error) {
        console.error(`❌ Error processing event "${apiEvent.name}":`, error);
        result.errors++;
      }
    }));
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
SimplyCompete Competition Sync Tool

Usage:
  tsx scripts/sync-competitions.ts          - Sync all competitions from SimplyCompete API
  tsx scripts/sync-competitions.ts --help   - Show this help message

Description:
  Fetches competitions from the SimplyCompete API and matches them with existing
  competitions in the local database. For each match found, updates the local
  competition record with:
    - SimplyCompete event ID
    - Source URL
    - Full event metadata (JSON)
    - Last sync timestamp

  Matching is done by comparing competition names and start dates.

Authentication:
  The SimplyCompete API requires authentication. Set one of these environment variables:
    SIMPLYCOMPETE_API_KEY      - Your SimplyCompete API key
    SIMPLYCOMPETE_AUTH_TOKEN   - Your authentication token
    SIMPLYCOMPETE_COOKIE       - Session cookie if API requires it

  Example:
    SIMPLYCOMPETE_API_KEY=your_key_here tsx scripts/sync-competitions.ts

  To get API credentials, contact SimplyCompete support or check their developer documentation.

API Endpoint:
  ${BASE_URL}
    `);
    process.exit(0);
  }

  try {
    const result = await syncCompetitions();

    console.log('\n' + '='.repeat(60));
    console.log('📈 Sync Results:');
    console.log('='.repeat(60));
    console.log(`📊 Total API Events:      ${result.total}`);
    console.log(`✅ Matched & Updated:     ${result.updated}`);
    console.log(`📷 Logos Uploaded:        ${result.logosUploaded}`);
    console.log(`❌ Logo Upload Failed:    ${result.logosFailed}`);
    console.log(`⏭️  Skipped (no match):    ${result.skipped}`);
    console.log(`❌ Errors:                ${result.errors}`);
    console.log('='.repeat(60) + '\n');

    if (result.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Fatal error during sync:', error);
    process.exit(1);
  }
}

main();
