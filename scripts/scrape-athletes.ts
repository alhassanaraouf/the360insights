#!/usr/bin/env tsx

import { scrapeCountryAthletes, scrapeWorldRankings, commonCountryCodes } from '../server/taekwondo-scraper';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Taekwondo Data Scraper

Usage:
  npm run scrape:country <countryCode>  - Scrape athletes from specific country
  npm run scrape:rankings              - Scrape world rankings
  npm run scrape:help                  - Show this help

Examples:
  npm run scrape:country EGY           - Scrape Egyptian athletes
  npm run scrape:country USA           - Scrape US athletes
  npm run scrape:country KOR           - Scrape South Korean athletes

Available country codes:
${Object.entries(commonCountryCodes).map(([country, code]) => `  ${code} - ${country}`).join('\n')}
    `);
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'country':
        if (!args[1]) {
          console.error('Error: Country code required');
          console.log('Usage: npm run scrape:country <countryCode>');
          process.exit(1);
        }
        
        const countryCode = args[1].toUpperCase();
        console.log(`🚀 Starting scrape for country: ${countryCode}`);
        
        const countryResult = await scrapeCountryAthletes(countryCode);
        
        console.log(`\n✅ Scraping completed for ${countryCode}:`);
        console.log(`   📊 Total athletes found: ${countryResult.athletes.length}`);
        console.log(`   💾 Successfully saved: ${countryResult.saved}`);
        console.log(`   ❌ Errors: ${countryResult.errors}`);
        
        if (countryResult.athletes.length > 0) {
          console.log('\n📋 Sample athletes:');
          countryResult.athletes.slice(0, 5).forEach((athlete, index) => {
            console.log(`   ${index + 1}. ${athlete.name} (${athlete.category || 'N/A'})`);
          });
        }
        break;

      case 'rankings':
        console.log('🚀 Starting world rankings scrape');
        
        const rankingsResult = await scrapeWorldRankings();
        
        console.log('\n✅ World rankings scraping completed:');
        console.log(`   📊 Total ranked athletes: ${rankingsResult.athletes.length}`);
        console.log(`   💾 Successfully saved: ${rankingsResult.saved}`);
        console.log(`   ❌ Errors: ${rankingsResult.errors}`);
        
        if (rankingsResult.athletes.length > 0) {
          console.log('\n🏆 Top 10 ranked athletes:');
          rankingsResult.athletes.slice(0, 10).forEach((athlete, index) => {
            console.log(`   ${athlete.worldRank || index + 1}. ${athlete.name} (${athlete.nationality})`);
          });
        }
        break;

      case 'help':
        console.log(`
Taekwondo Data Scraper

Commands:
  country <code>  - Scrape athletes from specific country using 3-letter ISO code
  rankings        - Scrape current world rankings
  help           - Show this help message

Country Codes:
${Object.entries(commonCountryCodes).map(([country, code]) => `  ${code} - ${country}`).join('\n')}

Examples:
  npm run scrape:country EGY
  npm run scrape:rankings
        `);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use "npm run scrape:help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  }
}

main();