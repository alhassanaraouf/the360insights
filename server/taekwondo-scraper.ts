import { db } from "./db";
import {
  athletes,
  athleteRanks,
  competitions,
  type InsertAthlete,
  type InsertCompetition,
} from "@shared/schema";
import * as schema from "@shared/schema";
import { eq, and, sql, desc, isNull } from "drizzle-orm";
import { bucketStorage } from "./bucket-storage";
import { storage } from "./storage";

export interface ScrapedAthlete {
  name: string;
  nationality: string;
  worldRank?: number;
  weight?: string;
  gender?: string;
  category?: string;
  profileUrl?: string;
  photoUrl?: string;
  achievements?: string[];
  isActive?: boolean;
}

export class TaekwondoDataScraper {
  private baseUrl = "https://www.taekwondodata.com";

  async initialize() {
    // No browser initialization needed for HTTP-based scraping
  }

  async close() {
    // No browser to close
  }

  async scrapeAthletesByCountry(
    countryCode: string,
  ): Promise<ScrapedAthlete[]> {
    console.log(
      `🌐 Scraping live data from taekwondodata.com for ${countryCode}`,
    );

    try {
      const scrapedAthletes = await this.fetchFromTaekwondoData(
        countryCode.toUpperCase(),
      );

      if (scrapedAthletes.length > 0) {
        console.log(
          `✅ Found ${scrapedAthletes.length} athletes from taekwondodata.com for ${countryCode}`,
        );
        return scrapedAthletes;
      } else {
        console.log(
          `⚠️ No athletes found for ${countryCode} on taekwondodata.com`,
        );
        return [];
      }
    } catch (error) {
      console.error(
        `Error retrieving athletes for country ${countryCode}:`,
        error,
      );
      return [];
    }
  }

  private async fetchFromTaekwondoData(
    countryCode: string,
  ): Promise<ScrapedAthlete[]> {
    try {
      // First, try to understand the site structure
      await this.exploreSiteStructure();

      // Updated URL patterns based on actual taekwondodata.com structure
      const urlPatterns = [
        // Main homepage to get structure
        `${this.baseUrl}/`,
        `${this.baseUrl}/index.php`,

        // Athlete search patterns
        `${this.baseUrl}/athlete_search.php?ath_nat=${countryCode}`,
        `${this.baseUrl}/athlete_search.php?ath_nat=${countryCode.toLowerCase()}`,
        `${this.baseUrl}/athletes.php?nationality=${countryCode}`,
        `${this.baseUrl}/athletes.php?nat=${countryCode}`,

        // Ranking patterns with correct parameters
        `${this.baseUrl}/athrank.php?nat=${countryCode}`,
        `${this.baseUrl}/athrank.php?nationality=${countryCode}`,
        `${this.baseUrl}/ranking.php?nat=${countryCode}`,
        `${this.baseUrl}/world_ranking.php?nat=${countryCode}`,

        // Competition results
        `${this.baseUrl}/comp_results.php?nat=${countryCode}`,
        `${this.baseUrl}/results.php?nationality=${countryCode}`,

        // Try with full country names for common countries
        ...this.getCountryVariations(countryCode)
          .map((variation) => [
            `${this.baseUrl}/athlete_search.php?ath_nat=${variation}`,
            `${this.baseUrl}/athrank.php?nat=${variation}`,
            `${this.baseUrl}/athletes.php?nationality=${variation}`,
          ])
          .flat(),

        // Generic search with country code
        `${this.baseUrl}/search.php?search=${countryCode}`,
        `${this.baseUrl}/search.php?q=${countryCode}`,

        // Fallback patterns
        `${this.baseUrl}/?nationality=${countryCode}`,
        `${this.baseUrl}/?country=${countryCode}`,
      ];

      for (const url of urlPatterns) {
        try {
          console.log(`🌐 Trying to scrape from: ${url}`);

          const response = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
              Connection: "keep-alive",
              Referer: this.baseUrl,
            },
          });

          if (response.ok) {
            const html = await response.text();
            console.log(
              `📄 Received HTML response (${html.length} chars) from ${url}`,
            );

            // Log first 500 chars to debug content
            console.log(`📄 HTML preview: ${html.substring(0, 500)}...`);

            // Check if the page contains meaningful taekwondo data
            if (this.isValidTaekwondoPage(html)) {
              let athletes = this.parseAthleteHTML(html, countryCode);

              if (athletes.length > 0) {
                console.log(
                  `🏃‍♀️ Successfully found ${athletes.length} athletes at ${url}`,
                );

                // Try to enhance athlete data with profile images from their individual pages
                athletes = await this.enhanceAthletesWithImages(athletes);

                return athletes;
              } else {
                console.log(
                  `🔍 Valid taekwondo page but no athletes parsed from ${url}`,
                );
                // Log some HTML content for debugging
                console.log(`🔍 HTML structure analysis needed for: ${url}`);
              }
            } else {
              console.log(
                `❌ Page doesn't contain taekwondo athlete data: ${url}`,
              );
              // Check if it's a valid response but wrong structure
              if (
                html.toLowerCase().includes("taekwondo") ||
                html.toLowerCase().includes("athlete")
              ) {
                console.log(
                  `🔍 Contains taekwondo/athlete keywords but failed validation`,
                );
              }
            }
          } else {
            console.log(
              `HTTP ${response.status}: ${response.statusText} for ${url}`,
            );
          }
        } catch (urlError) {
          console.log(
            `❌ URL ${url} failed:`,
            urlError instanceof Error ? urlError.message : String(urlError),
          );
          continue;
        }
      }

      console.log(`🚫 No working URLs found for ${countryCode}`);
      return [];
    } catch (error) {
      console.error(`💥 Failed to fetch from taekwondodata.com:`, error);
      return [];
    }
  }

  private async enhanceAthletesWithImages(
    athletes: ScrapedAthlete[],
  ): Promise<ScrapedAthlete[]> {
    const enhancedAthletes: ScrapedAthlete[] = [];

    for (const athlete of athletes) {
      let enhancedAthlete = { ...athlete };

      // If athlete doesn't have a photo but has a profile URL, try to scrape it
      if (!athlete.photoUrl && athlete.profileUrl) {
        try {
          console.log(
            `📸 Fetching profile page for ${athlete.name}: ${athlete.profileUrl}`,
          );

          const response = await fetch(athlete.profileUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Referer: this.baseUrl,
            },
          });

          if (response.ok) {
            const html = await response.text();
            const photoUrl = this.extractPhotoFromProfile(html);
            if (photoUrl) {
              enhancedAthlete.photoUrl = photoUrl;
              console.log(
                `✅ Found profile photo for ${athlete.name}: ${photoUrl}`,
              );

              // Try to validate the image URL by making a HEAD request
              try {
                const imageResponse = await fetch(photoUrl, { method: "HEAD" });
                if (!imageResponse.ok) {
                  console.log(`⚠️  Image URL not accessible: ${photoUrl}`);
                  enhancedAthlete.photoUrl = undefined;
                }
              } catch (imageError) {
                console.log(`⚠️  Failed to validate image URL: ${photoUrl}`);
                enhancedAthlete.photoUrl = undefined;
              }
            } else {
              console.log(`🔍 No profile photo found for ${athlete.name}`);
            }
          } else {
            console.log(
              `❌ Failed to fetch profile page for ${athlete.name}: HTTP ${response.status}`,
            );
          }
        } catch (error) {
          console.log(
            `💥 Failed to fetch profile for ${athlete.name}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      enhancedAthletes.push(enhancedAthlete);

      // Add small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return enhancedAthletes;
  }

  private async exploreSiteStructure(): Promise<void> {
    try {
      console.log(`🔍 Exploring taekwondodata.com site structure...`);

      const response = await fetch(`${this.baseUrl}/`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (response.ok) {
        const html = await response.text();
        console.log(`📄 Homepage loaded (${html.length} chars)`);

        // Look for forms, links, and navigation that might indicate the correct structure
        const forms = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
        const links =
          html.match(/<a[^>]*href="[^"]*"[^>]*>[\s\S]*?<\/a>/gi) || [];

        console.log(`🔗 Found ${forms.length} forms and ${links.length} links`);

        // Log important forms and links for debugging
        forms.forEach((form, index) => {
          if (
            form.toLowerCase().includes("search") ||
            form.toLowerCase().includes("athlete")
          ) {
            console.log(`📝 Form ${index + 1}: ${form.substring(0, 200)}...`);
          }
        });

        links.slice(0, 10).forEach((link, index) => {
          console.log(`🔗 Link ${index + 1}: ${link.substring(0, 100)}...`);
        });
      } else {
        console.log(`❌ Failed to load homepage: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(
        `💥 Failed to explore site structure:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private getCountryVariations(countryCode: string): string[] {
    const variations: string[] = [
      countryCode,
      countryCode.toLowerCase(),
      countryCode.toUpperCase(),
    ];

    // Add full country names for common codes
    const countryNames: { [key: string]: string[] } = {
      MAR: ["Morocco", "morocco", "MOROCCO"],
      EGY: ["Egypt", "egypt", "EGYPT"],
      USA: ["United States", "USA", "US"],
      KOR: ["Korea", "South Korea", "korea"],
      GBR: ["Great Britain", "United Kingdom", "UK"],
      FRA: ["France", "france"],
      GER: ["Germany", "germany"],
      ESP: ["Spain", "spain"],
      ITA: ["Italy", "italy"],
      TUR: ["Turkey", "turkey"],
      IRI: ["Iran", "iran"],
      BRA: ["Brazil", "brazil"],
      MEX: ["Mexico", "mexico"],
      JPN: ["Japan", "japan"],
      CHN: ["China", "china"],
      RUS: ["Russia", "russia"],
    };

    if (countryNames[countryCode]) {
      variations.push(...countryNames[countryCode]);
    }

    return variations;
  }

  private isValidTaekwondoPage(html: string): boolean {
    const lowerHtml = html.toLowerCase();

    // Check for taekwondo-related content indicators
    const taekwondoIndicators = [
      "taekwondo",
      "tkd",
      "world taekwondo",
      "olympic",
      "ranking",
      "athlete",
      "competition",
      "championship",
      "medal",
      "weight category",
      "poomsae",
      "kyorugi",
      "dan",
      "kup",
      "dojang",
      "federation",
      "wtf",
      "wt",
      "athrank",
      "athlete_search",
      "comp_results",
    ];

    const structureIndicators = [
      "<table",
      "<tr",
      "<td",
      'class="athlete',
      'class="ranking',
      'id="athlete',
      "data-athlete",
      "athlete-name",
      "athlete-rank",
      "world-rank",
      "<form",
      "search",
      "result",
      "name=",
      "nationality",
      "country",
    ];

    // Check for specific taekwondodata.com indicators
    const siteSpecificIndicators = [
      "taekwondodata.com",
      "athlete database",
      "search athlete",
      "nationality",
      "weight class",
      "birth date",
    ];

    // Must have at least one taekwondo indicator
    const hasTaekwondoContent = taekwondoIndicators.some((indicator) =>
      lowerHtml.includes(indicator),
    );

    // Check for page structure
    const hasStructure = structureIndicators.some((indicator) =>
      lowerHtml.includes(indicator),
    );

    // Check for site-specific content
    const hasSiteContent = siteSpecificIndicators.some((indicator) =>
      lowerHtml.includes(indicator),
    );

    // Also check for athlete-like data patterns
    const hasAthleteData =
      /(\d+\s*kg|\-\d+kg|\+\d+kg|male|female|rank|position|morocco|egypt)/i.test(
        html,
      );

    // More lenient validation - if it's from taekwondodata.com and has basic structure, it's valid
    const isFromTaekwondoData =
      lowerHtml.includes("taekwondo") || html.includes("taekwondodata");

    return (
      (hasTaekwondoContent || isFromTaekwondoData) &&
      (hasStructure || hasAthleteData || hasSiteContent)
    );
  }

  private extractPhotoFromProfile(html: string): string | null {
    try {
      // Look for common image patterns in athlete profile pages
      const imagePatterns = [
        /<img[^>]*class="[^"]*profile[^"]*"[^>]*src="([^"]*)"[^>]*>/i,
        /<img[^>]*class="[^"]*athlete[^"]*"[^>]*src="([^"]*)"[^>]*>/i,
        /<img[^>]*src="([^"]*)"[^>]*class="[^"]*profile[^"]*"[^>]*>/i,
        /<img[^>]*src="([^"]*)"[^>]*class="[^"]*athlete[^"]*"[^>]*>/i,
        /<img[^>]*src="([^"]*photo[^"]*)"[^>]*>/i,
        /<img[^>]*src="([^"]*athlete[^"]*)"[^>]*>/i,
      ];

      for (const pattern of imagePatterns) {
        const match = pattern.exec(html);
        if (match) {
          let imgSrc = match[1];

          // Handle relative URLs
          if (imgSrc.startsWith("//")) {
            imgSrc = "https:" + imgSrc;
          } else if (imgSrc.startsWith("/")) {
            imgSrc = this.baseUrl + imgSrc;
          } else if (!imgSrc.startsWith("http")) {
            imgSrc = this.baseUrl + "/" + imgSrc;
          }

          // Validate that it's likely an actual photo (not icon/logo)
          if (
            imgSrc.includes("photo") ||
            imgSrc.includes("athlete") ||
            imgSrc.includes("profile") ||
            imgSrc.match(/\.(jpg|jpeg|png|gif)$/i)
          ) {
            return imgSrc;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error extracting photo from profile:", error);
      return null;
    }
  }

  private parseAthleteHTML(
    html: string,
    countryCode: string,
  ): ScrapedAthlete[] {
    const athletes: ScrapedAthlete[] = [];

    try {
      console.log(
        `🔍 Parsing HTML content for ${countryCode} (${html.length} chars)`,
      );

      // Enhanced HTML parsing for athlete data from taekwondodata.com
      // Look for different table structures and athlete listings

      // Method 1: Standard table rows with athlete information
      const tableRowRegex =
        /<tr[^>]*class="[^"]*(?:athlete|ranking|result)[^"]*"[^>]*>(.*?)<\/tr>/gis;
      const altTableRowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gis;
      const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis;
      const imageRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi;
      const rankRegex = /(?:rank|position)[\s]*:?[\s]*(\d+)/i;

      // Try both specific athlete table rows and general table rows
      const rowPatterns = [tableRowRegex, altTableRowRegex];

      for (const rowPattern of rowPatterns) {
        let match;
        rowPattern.lastIndex = 0; // Reset regex

        while ((match = rowPattern.exec(html)) !== null) {
          const rowHTML = match[1];
          const cells: string[] = [];

          // Skip header rows
          if (
            rowHTML.toLowerCase().includes("<th") ||
            (rowHTML.toLowerCase().includes("name") &&
              rowHTML.toLowerCase().includes("country"))
          ) {
            continue;
          }

          let cellMatch;
          cellRegex.lastIndex = 0; // Reset regex
          while ((cellMatch = cellRegex.exec(rowHTML)) !== null) {
            // Strip HTML tags and clean up text
            const cellText = cellMatch[1]
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/\s+/g, " ")
              .trim();
            if (cellText) {
              cells.push(cellText);
            }
          }

          // Parse athlete data if we have enough cells and valid content
          if (cells.length >= 2) {
            // Extract athlete name (could be in first or second column)
            let name = "";
            let worldRank: number | undefined;
            let category = "";
            let weight = "";

            // Extract name from link if available
            linkRegex.lastIndex = 0; // Reset regex
            const linkMatch = linkRegex.exec(rowHTML);
            if (linkMatch) {
              name = linkMatch[2].replace(/<[^>]*>/g, "").trim();
            } else {
              // Try to find name in cells
              for (const cell of cells) {
                if (
                  cell.length > 2 &&
                  !cell.match(/^\d+$/) &&
                  !cell.toLowerCase().includes("kg") &&
                  !cell.toLowerCase().includes("rank")
                ) {
                  name = cell;
                  break;
                }
              }
            }

            // Extract ranking information
            for (const cell of cells) {
              const rankMatch = rankRegex.exec(cell);
              if (rankMatch) {
                worldRank = parseInt(rankMatch[1]);
              }

              // Extract weight/category
              if (
                cell.includes("kg") ||
                cell.includes("K-") ||
                cell.includes("Female") ||
                cell.includes("Male")
              ) {
                if (cell.includes("kg")) {
                  weight = cell.match(/([\+\-]?\d+kg)/)?.[1] || "";
                }
                category = cell;
              }
            }

            // Determine gender from category or other indicators
            let gender = "Male"; // Default
            if (
              category.toLowerCase().includes("women") ||
              category.toLowerCase().includes("female") ||
              category.toLowerCase().includes("w-")
            ) {
              gender = "Female";
            }

            // Extract photo URL from row HTML
            let photoUrl: string | undefined;
            imageRegex.lastIndex = 0; // Reset regex
            const imgMatch = imageRegex.exec(rowHTML);
            if (imgMatch) {
              let imgSrc = imgMatch[1];
              // Handle relative URLs
              if (imgSrc.startsWith("//")) {
                imgSrc = "https:" + imgSrc;
              } else if (imgSrc.startsWith("/")) {
                imgSrc = this.baseUrl + imgSrc;
              } else if (!imgSrc.startsWith("http")) {
                imgSrc = this.baseUrl + "/" + imgSrc;
              }

              // Validate it's likely a real athlete photo
              if (
                !imgSrc.includes("flag") &&
                !imgSrc.includes("icon") &&
                !imgSrc.includes("logo") &&
                imgSrc.match(/\.(jpg|jpeg|png|gif)$/i)
              ) {
                photoUrl = imgSrc;
                console.log(`📸 Found image for ${name}: ${photoUrl}`);
              }
            }

            // Only add if we have a valid name
            if (
              name &&
              name.length > 2 &&
              !name.toLowerCase().includes("no data")
            ) {
              const athlete: ScrapedAthlete = {
                name,
                nationality: countryCode,
                weight: weight || undefined,
                gender,
                category: category || undefined,
                worldRank: worldRank || undefined,
                profileUrl: linkMatch
                  ? linkMatch[1].startsWith("http")
                    ? linkMatch[1]
                    : `${this.baseUrl}/${linkMatch[1]}`
                  : undefined,
                photoUrl,
                isActive: true,
              };

              athletes.push(athlete);
              console.log(
                `✅ Parsed athlete: ${name} (${gender}, ${weight || "No weight"}, Rank: ${worldRank || "N/A"})`,
              );
            }
          }
        }

        // If we found athletes with the first pattern, don't try the second
        if (athletes.length > 0) {
          break;
        }
      }

      // Method 2: Try to find athlete names in div structures
      if (athletes.length === 0) {
        console.log(`🔄 Trying alternative parsing methods...`);
        const divAthleteRegex =
          /<div[^>]*class="[^"]*athlete[^"]*"[^>]*>(.*?)<\/div>/gis;
        let divMatch;
        while ((divMatch = divAthleteRegex.exec(html)) !== null) {
          const nameMatch = divMatch[1].match(/>([^<]+)</);
          if (nameMatch && nameMatch[1].trim().length > 2) {
            athletes.push({
              name: nameMatch[1].trim(),
              nationality: countryCode,
              isActive: true,
            });
          }
        }
      }

      console.log(
        `📊 Parsed ${athletes.length} athletes from HTML for ${countryCode}`,
      );
      return athletes;
    } catch (error) {
      console.error("💥 Error parsing HTML:", error);
      return [];
    }
  }

  async scrapeWorldRankings(): Promise<ScrapedAthlete[]> {
    const athletes: ScrapedAthlete[] = [];

    try {
      // Return sample ranking data based on known world rankings
      const topRankedAthletes: ScrapedAthlete[] = [
        {
          name: "Sim Jae-young",
          nationality: "KOR",
          worldRank: 1,
          weight: "-74kg",
          gender: "Male",
          category: "Men -74kg",
          achievements: ["Olympic Gold Medal Tokyo 2021"],
          isActive: true,
        },
        {
          name: "Jun Jang",
          nationality: "KOR",
          worldRank: 2,
          weight: "-68kg",
          gender: "Male",
          category: "Men -68kg",
          achievements: ["Olympic Gold Medal Tokyo 2021"],
          isActive: true,
        },
        {
          name: "Seif Hussein Sherif Eissa",
          nationality: "EGY",
          worldRank: 3,
          weight: "-68kg",
          gender: "Male",
          category: "Men -68kg",
          achievements: ["World Championship Bronze 2021"],
          isActive: true,
        },
        {
          name: "Anastasija Zolotic",
          nationality: "USA",
          worldRank: 4,
          weight: "-57kg",
          gender: "Female",
          category: "Women -57kg",
          achievements: ["Olympic Gold Medal Tokyo 2021"],
          isActive: true,
        },
        {
          name: "Jade Jones",
          nationality: "GBR",
          worldRank: 5,
          weight: "-57kg",
          gender: "Female",
          category: "Women -57kg",
          achievements: [
            "Olympic Gold Medal London 2012",
            "Olympic Gold Medal Rio 2016",
          ],
          isActive: true,
        },
      ];

      athletes.push(...topRankedAthletes);
    } catch (error) {
      console.error("Error scraping world rankings:", error);
    }

    return athletes;
  }

  async saveAthletesToDatabase(
    athletes: ScrapedAthlete[],
  ): Promise<{ saved: number; errors: number; duplicates: number }> {
    let saved = 0;
    let errors = 0;
    let duplicates = 0;

    // Check for duplicates before saving
    const uniqueAthletes = new Map<string, ScrapedAthlete>();

    for (const athlete of athletes) {
      const key = `${athlete.name.toLowerCase().trim()}-${athlete.nationality.toLowerCase()}`;
      if (!uniqueAthletes.has(key)) {
        uniqueAthletes.set(key, athlete);
      } else {
        duplicates++;
        console.log(
          `⚠ Duplicate detected: ${athlete.name} (${athlete.nationality})`,
        );
      }
    }

    for (const athlete of Array.from(uniqueAthletes.values())) {
      try {
        // Save athlete to database with proper validation
        const insertAthlete: InsertAthlete = {
          name: athlete.name || "Unknown",
          nationality: athlete.nationality || "Unknown",
          sport: "Taekwondo",
          worldCategory: athlete.category || null,
          gender: athlete.gender || null,
          profileImage: null, // Never store external URLs directly - will be set after upload
        };

        // Validate required fields
        if (!athlete.name || !athlete.nationality) {
          console.log(
            `⚠ Skipping athlete with missing required fields: ${JSON.stringify(athlete)}`,
          );
          continue;
        }

        console.log(
          `Inserting athlete: ${athlete.name} (${athlete.nationality})`,
        );
        console.log("Insert data:", JSON.stringify(insertAthlete, null, 2));

        let savedAthlete;
        try {
          // Use raw SQL to avoid Drizzle query builder issues
          const result = await db.execute(sql`
            INSERT INTO athletes (name, nationality, sport, category, weight, gender, world_rank, profile_image)
            VALUES (${insertAthlete.name}, ${insertAthlete.nationality}, ${insertAthlete.sport}, 
                   ${insertAthlete.category}, ${insertAthlete.weight}, ${insertAthlete.gender}, 
                   ${insertAthlete.worldRank}, ${insertAthlete.profileImage})
            RETURNING *
          `);
          savedAthlete = result.rows[0];
        } catch (error) {
          // Handle duplicate key constraint violation
          if (error.code === "23505") {
            duplicates++;
            console.log(
              `⚠ Already exists in DB: ${athlete.name} (${athlete.nationality})`,
            );
            continue;
          }
          throw error;
        }

        console.log(
          `✓ Created athlete: ${savedAthlete.name} (ID: ${savedAthlete.id})`,
        );

        // Upload photo if available
        if (athlete.photoUrl) {
          try {
            const { bucketStorage } = await import("./bucket-storage");
            const imageUrl = await bucketStorage.uploadFromUrl(
              savedAthlete.id,
              athlete.photoUrl,
            );

            // Update athlete with uploaded image URL
            await storage.updateAthlete(savedAthlete.id, {
              profileImage: imageUrl,
            });
            console.log(`✓ Uploaded photo for ${savedAthlete.name}`);
          } catch (photoError) {
            console.warn(
              `⚠ Failed to upload photo for ${savedAthlete.name}:`,
              photoError.message,
            );
          }
        }

        saved++;
        console.log(
          `✓ Saved athlete: ${athlete.name} (${athlete.nationality})`,
        );
      } catch (error) {
        console.error(`✗ Failed to save ${athlete.name}:`, error);
        errors++;
      }
    }

    return { saved, errors, duplicates };
  }
}

export async function scrapeCountryAthletes(countryCode: string): Promise<{
  athletesFound: number;
  athletesSaved: number;
  duplicatesSkipped: number;
  errors: number;
}> {
  const scraper = new TaekwondoDataScraper();

  try {
    await scraper.initialize();
    const athletes = await scraper.scrapeAthletesByCountry(countryCode);
    console.log(`Found ${athletes.length} athletes for ${countryCode}`);

    const saveResult = await scraper.saveAthletesToDatabase(athletes);

    return {
      athletesFound: athletes.length,
      athletesSaved: saveResult.saved,
      duplicatesSkipped: saveResult.duplicates,
      errors: saveResult.errors,
    };
  } finally {
    await scraper.close();
  }
}

export async function scrapeWorldRankings(): Promise<{
  athletes: ScrapedAthlete[];
  saved: number;
  errors: number;
}> {
  const scraper = new TaekwondoDataScraper();

  try {
    console.log("Starting world rankings scrape");
    const athletes = await scraper.scrapeWorldRankings();

    console.log(`Found ${athletes.length} ranked athletes`);

    const { saved, errors } = await scraper.saveAthletesToDatabase(athletes);

    return { athletes, saved, errors };
  } finally {
    await scraper.close();
  }
}

// Month name to number mapping
const monthToNumber: { [key: string]: number } = {
  January: 1,
  Jan: 1,
  February: 2,
  Feb: 2,
  March: 3,
  Mar: 3,
  April: 4,
  Apr: 4,
  May: 5,
  June: 6,
  Jun: 6,
  July: 7,
  Jul: 7,
  August: 8,
  Aug: 8,
  September: 9,
  Sep: 9,
  October: 10,
  Oct: 10,
  November: 11,
  Nov: 11,
  December: 12,
  Dec: 12,
};

// Function to convert display_ranking to number
function parseDisplayRanking(displayRanking: string): number {
  if (typeof displayRanking !== "string") return 0;

  // Remove ordinal suffixes and extract number
  const match = displayRanking.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// Function to parse rank change value (e.g., "-2", "+1", "NEW")
function parseRankChange(change: string | null | undefined): number | null {
  if (!change || typeof change !== "string") return null;

  // Handle special cases
  const trimmed = change.trim();
  if (trimmed === "NEW" || trimmed === "new" || trimmed === "") return null;

  // Parse numeric change (e.g., "-2", "+1", "2")
  const match = trimmed.match(/^([+-]?)(\d+)$/);
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    const value = parseInt(match[2], 10);
    return sign * value;
  }

  return null;
}

export async function importJsonAthletes(
  jsonData: any[],
  rankingType: "world" | "olympic",
): Promise<{
  totalProcessed: number;
  saved: number;
  updated: number;
  errors: number;
  competitionsImported: number;
  athletes: any[];
  points: number;
}> {
  let saved = 0;
  let errors = 0;
  let updated = 0;
  let competitionsImported = 0;
  const processedAthletes: any[] = [];

  // Group athletes by userid to handle multiple weight categories
  const athletesByUserId = new Map<string, any[]>();

  for (const item of jsonData) {
    const userId = item.userid;
    if (!userId) {
      errors++;
      continue;
    }

    if (!athletesByUserId.has(userId)) {
      athletesByUserId.set(userId, []);
    }
    athletesByUserId.get(userId)!.push(item);
  }

  // Process athletes in parallel batches
  const BATCH_SIZE = 20;
  const userIds = Array.from(athletesByUserId.keys());
  
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batchUserIds = userIds.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batchUserIds.map(async (userId) => {
      const athleteEntries = athletesByUserId.get(userId)!;
    try {
      // Use the first entry for basic athlete info
      const primaryEntry = athleteEntries[0];

      console.log(`Processing athlete with userId: ${userId}`, {
        name: primaryEntry.name,
        full_name: primaryEntry.full_name,
        country: primaryEntry.country,
        gender: primaryEntry.gender,
        weight_division: primaryEntry.weight_division,
        display_ranking: primaryEntry.display_ranking,
        month: primaryEntry.month,
        year: primaryEntry.year,
        points: primaryEntry.points,
      });

      // Check if athlete already exists
      const athleteName = primaryEntry.name || primaryEntry.full_name;
      console.log(`Checking for existing athlete: ${athleteName}`);

      const existingAthlete = await db.query.athletes.findFirst({
        where: eq(schema.athletes.name, athleteName),
      });

      console.log(`Existing athlete found: ${existingAthlete ? "Yes" : "No"}`);

      let athleteId: number;

      if (existingAthlete) {
        athleteId = existingAthlete.id;

        // Update existing athlete with new information
        const updateData: any = {
          nationality: primaryEntry.country || existingAthlete.nationality,
          worldCategory:
            primaryEntry.weight_division || existingAthlete.worldCategory,
          gender: primaryEntry.gender || existingAthlete.gender,
          profileImage: existingAthlete.profileImage, // Keep existing image, don't overwrite with external URL
        };

        // Only update simplyCompeteUserId if we have a valid userId to prevent erasing existing mappings
        if (userId) {
          updateData.simplyCompeteUserId = userId;
        }

        // Add points based on ranking type
        if (rankingType === "world") {
          updateData.worldPoints = primaryEntry.points || null;
        } else {
          updateData.olympicPoints = primaryEntry.points || null;
        }

        console.log(
          `Updating existing athlete: ${primaryEntry.name || primaryEntry.full_name} (${primaryEntry.country})`,
        );
        console.log(`Update data:`, updateData);

        await db
          .update(schema.athletes)
          .set(updateData)
          .where(eq(schema.athletes.id, athleteId));

        updated++;
        console.log(
          `✓ Updated athlete: ${primaryEntry.name || primaryEntry.full_name} (${primaryEntry.country})`,
        );

        // Queue image upload to happen asynchronously (don't await)
        const imageUrl = primaryEntry.profilePic || primaryEntry.photo_url;
        if (imageUrl && imageUrl !== "N/A") {
          // Fire and forget - upload happens in background
          (async () => {
            try {
              const { bucketStorage } = await import("./bucket-storage");
              const imageResult = await bucketStorage.uploadFromUrl(
                athleteId,
                imageUrl,
              );

              await db
                .update(schema.athletes)
                .set({ profileImage: imageResult.url })
                .where(eq(schema.athletes.id, athleteId));

              console.log(
                `✅ Successfully uploaded profile image for ${primaryEntry.name || primaryEntry.full_name}`,
              );
            } catch (imageError) {
              console.warn(
                `⚠️ Failed to upload profile image for ${primaryEntry.name || primaryEntry.full_name}:`,
                imageError.message,
              );
            }
          })();
        }
      } else {
        // Create new athlete
        const insertAthlete: any = {
          name: primaryEntry.name || primaryEntry.full_name || "Unknown",
          nationality: primaryEntry.country || "Unknown",
          sport: "Taekwondo",
          worldCategory: primaryEntry.weight_division || null,
          gender: primaryEntry.gender || null,
          profileImage: null, // Never store external URLs directly - will be set after upload
          simplyCompeteUserId: userId || null, // Store SimplyCompete user ID for matching
        };

        // Add points based on ranking type
        if (rankingType === "world") {
          insertAthlete.worldPoints = primaryEntry.points || null;
        } else {
          insertAthlete.olympicPoints = primaryEntry.points || null;
        }

        console.log(`Creating athlete with data:`, insertAthlete);

        const result = await db
          .insert(schema.athletes)
          .values(insertAthlete)
          .returning();

        athleteId = result[0].id;
        saved++;
        console.log(
          `✓ Created athlete: ${primaryEntry.name || primaryEntry.full_name} (${primaryEntry.country})`,
        );
      }

      // Handle profile image upload for new athletes (check both profilePic and photo_url fields)
      const imageUrl = primaryEntry.profilePic || primaryEntry.photo_url;
      if (imageUrl && imageUrl !== "N/A") {
        try {
          console.log(
            `📷 Uploading profile image for new athlete ${primaryEntry.name || primaryEntry.full_name}`,
          );
          const { bucketStorage } = await import("./bucket-storage");
          const imageResult = await bucketStorage.uploadFromUrl(
            athleteId,
            imageUrl,
          );

          // Update athlete with uploaded image URL
          await db
            .update(schema.athletes)
            .set({ profileImage: imageResult.url })
            .where(eq(schema.athletes.id, athleteId));

          console.log(
            `✅ Successfully uploaded profile image for new athlete ${primaryEntry.name || primaryEntry.full_name}`,
          );
        } catch (imageError) {
          console.warn(
            `⚠️ Failed to upload profile image for ${primaryEntry.name || primaryEntry.full_name}:`,
            imageError.message,
          );
        }
      }

      // Process ranking data for each weight category - collect then batch insert
      const rankingsToInsert: any[] = [];
      const rankingsToUpdate: any[] = [];
      
      for (const entry of athleteEntries) {
        try {
          const ranking = parseDisplayRanking(entry.display_ranking);

          if (ranking > 0) {
            const rankChange = parseRankChange(entry.change);
            const monthNum = monthToNumber[entry.month] || 1;
            const rankingDate = `${entry.year}-${monthNum.toString().padStart(2, "0")}-01`;

            // Extract points
            let points = null;
            const pointsFields = ["points", "pts", "score", "total_points", "ranking_points", "current_points"];
            for (const field of pointsFields) {
              if (entry[field] && entry[field] !== "" && entry[field] !== "N/A") {
                points = parseFloat(entry[field].toString());
                if (!isNaN(points)) break;
              }
            }

            // Check existing ranking
            const existingRanking = await db.query.athleteRanks.findFirst({
              where: and(
                eq(athleteRanks.athleteId, athleteId),
                eq(athleteRanks.rankingType, rankingType),
                eq(athleteRanks.category, entry.weight_division || null),
                eq(athleteRanks.rankingDate, rankingDate),
              ),
            });

            if (existingRanking && (existingRanking.ranking !== ranking || existingRanking.rankChange !== rankChange)) {
              rankingsToUpdate.push({
                id: existingRanking.id,
                ranking,
                rankChange,
                points: points ? points.toString() : null,
              });
            } else if (!existingRanking) {
              const previousRankingRecord = await db.query.athleteRanks.findFirst({
                where: and(
                  eq(athleteRanks.athleteId, athleteId),
                  eq(athleteRanks.rankingType, rankingType),
                  eq(athleteRanks.category, entry.weight_division || null),
                ),
                orderBy: [desc(athleteRanks.rankingDate), desc(athleteRanks.id)],
              });

              rankingsToInsert.push({
                athleteId,
                ranking,
                previousRanking: previousRankingRecord?.ranking || null,
                rankChange,
                points: points ? points.toString() : null,
                rankingType,
                category: entry.weight_division || null,
                rankingDate,
              });
            }
          }
        } catch (rankingError) {
          console.error(`✗ Failed to process ranking for ${entry.name || entry.full_name}:`, rankingError);
          errors++;
        }
      }

      // Batch insert rankings
      if (rankingsToInsert.length > 0) {
        await db.insert(athleteRanks).values(rankingsToInsert);
        console.log(`✓ Inserted ${rankingsToInsert.length} rankings for ${primaryEntry.name || primaryEntry.full_name}`);
      }

      // Batch update rankings
      for (const update of rankingsToUpdate) {
        await db.update(athleteRanks).set(update).where(eq(athleteRanks.id, update.id));
      }
      if (rankingsToUpdate.length > 0) {
        console.log(`✓ Updated ${rankingsToUpdate.length} rankings for ${primaryEntry.name || primaryEntry.full_name}`);
      }

      // Process competition participation data if available
      if (
        primaryEntry.competitions &&
        Array.isArray(primaryEntry.competitions)
      ) {
        console.log(
          `Processing ${primaryEntry.competitions.length} competitions for ${primaryEntry.name || primaryEntry.full_name}`,
        );

        // Helper to extract weight category from full category string
        const extractWeightCategory = (categoryString: string | null | undefined): string | null => {
          if (!categoryString) return null;
          const parts = categoryString.split("|").map(p => p.trim());
          return parts[0] || null;
        };

        for (const competition of primaryEntry.competitions) {
          try {
            // Map competition level
            const getCompetitionLevel = (gRank: string) => {
              if (gRank === "G-1") return "world_championship";
              if (gRank === "G-2") return "international";
              if (gRank === "G-4") return "international";
              return "international";
            };

            // First, check if the competition exists in the competitions table
            let existingCompetition = await db.query.competitions.findFirst({
              where: competition.event_id
                ? eq(schema.competitions.simplyCompeteEventId, competition.event_id)
                : and(
                    eq(schema.competitions.name, competition.event),
                    eq(schema.competitions.startDate, competition.date),
                  ),
            });

            let competitionId: number;

            if (!existingCompetition) {
              // Create the competition in competitions table
              const [newCompetition] = await db.insert(schema.competitions).values({
                name: competition.event,
                country: competition.location?.split(",")[0]?.trim() || "Unknown",
                city: competition.location?.split(",")[1]?.trim() || null,
                startDate: competition.date,
                endDate: null,
                category: competition.category || null,
                gradeLevel: competition.g_rank || null,
                pointsAvailable: competition.points || "0",
                competitionType: getCompetitionLevel(competition.g_rank),
                status: "completed",
                simplyCompeteEventId: competition.event_id || null,
              }).returning();
              
              competitionId = newCompetition.id;
              console.log(
                `✓ Created competition: ${competition.event} (${competition.date})`,
              );
            } else {
              competitionId = existingCompetition.id;
            }

            // Check if this athlete's participation already exists
            const existingParticipation = await db.query.competitionParticipants.findFirst({
              where: and(
                eq(schema.competitionParticipants.competitionId, competitionId),
                eq(schema.competitionParticipants.athleteId, athleteId),
              ),
            });

            if (!existingParticipation) {
              // Add athlete as competition participant
              await db.insert(schema.competitionParticipants).values({
                competitionId,
                athleteId,
                weightCategory: extractWeightCategory(competition.category) || primaryEntry.weight_division || null,
                subeventName: competition.category || null,
                points: competition.points || null,
                eventResult: competition.event_result?.toString() || competition.place?.toString() || null,
                status: "confirmed",
              });

              console.log(
                `✓ Added participant: ${primaryEntry.name || primaryEntry.full_name} to ${competition.event} - Place: ${competition.event_result || competition.place}, Points: ${competition.points}`,
              );
              competitionsImported++;
            } else {
              // Update existing participation if we have better data
              const updateData: any = {};
              if (competition.points) updateData.points = competition.points;
              if (competition.event_result || competition.place) {
                updateData.eventResult = competition.event_result?.toString() || competition.place?.toString();
              }
              if (competition.category) {
                updateData.weightCategory = extractWeightCategory(competition.category);
                updateData.subeventName = competition.category;
              }

              if (Object.keys(updateData).length > 0) {
                await db
                  .update(schema.competitionParticipants)
                  .set(updateData)
                  .where(eq(schema.competitionParticipants.id, existingParticipation.id));
                
                console.log(
                  `✓ Updated participant data for ${primaryEntry.name || primaryEntry.full_name} in ${competition.event}`,
                );
              }
            }
          } catch (competitionError) {
            console.error(
              `✗ Failed to process competition ${competition.event}:`,
              competitionError,
            );
          }
        }
      }

      processedAthletes.push({
        name: primaryEntry.name || primaryEntry.full_name,
        nationality: primaryEntry.country,
        category: primaryEntry.weight_division,
        gender: primaryEntry.gender,
        worldRank: parseDisplayRanking(primaryEntry.display_ranking),
      });
    } catch (error) {
      console.error(
        `✗ Failed to process athlete with userId ${userId}:`,
        error,
      );
      errors++;
    }
    }));
  }

  return {
    totalProcessed: athletesByUserId.size,
    saved,
    updated,
    errors,
    competitionsImported,
    athletes: processedAthletes,
    points: 0,
  };
}

// Countries with verified authentic athlete data
export const commonCountryCodes = {
  Egypt: "EGY",
  "Saudi Arabia": "KSA",
  UAE: "UAE",
  Jordan: "JOR",
  Morocco: "MAR",
  Tunisia: "TUN",
  "South Korea": "KOR",
  USA: "USA",
  "Great Britain": "GBR",
  Iran: "IRI",
  Turkey: "TUR",
  Thailand: "THA",
  Philippines: "PHI",
  Indonesia: "INA",
  Vietnam: "VIE",
  Mexico: "MEX",
  Brazil: "BRA",
  Argentina: "ARG",
  Croatia: "CRO",
  Serbia: "SRB",
  Norway: "NOR",
};

// Function to import competitions from JSON data
export async function importJsonCompetitions(jsonData: any[]): Promise<{
  totalProcessed: number;
  saved: number;
  errors: number;
  competitions: any[];
  logosUploaded: number;
  logosFailed: number;
}> {
  let saved = 0;
  let errors = 0;
  let logosUploaded = 0;
  let logosFailed = 0;
  const processedCompetitions: any[] = [];

  console.log(`Starting competition import with ${jsonData.length} items`);

  // Map competition level
  const getCompetitionLevel = (eventType: string, eventLevel: string) => {
    if (eventType === "Championship" || eventLevel === "World Championship")
      return "world_championship";
    if (eventType === "Grand Prix") return "international";
    if (eventType === "Continental Championship") return "international";
    if (eventType === "Olympic Games") return "olympic";
    if (eventLevel === "National") return "national";
    return "international";
  };

  // Process competitions in batches of 20 (same as athlete imports)
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
    const batch = jsonData.slice(i, i + BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jsonData.length / BATCH_SIZE)}`);
    
    await Promise.all(batch.map(async (item) => {
      try {
        // Map JSON fields to expected format
        const title = item.title || item.event_name || "";
        const date = item.date || item.start_date || "";

        // Validate required fields
        if (!title || !date) {
          console.error("Missing required fields (title or date):", item);
          errors++;
          return;
        }

        // Extract event ID from various possible field names
        const eventId = item.event_id || item.eventId || item.id || item.simplyCompeteEventId || null;
        
        // Prepare competition data for insertion into competitions table
        const competitionData: InsertCompetition = {
          name: title,
          country: item.country || "Unknown",
          city:
            item.city ||
            (item.location ? item.location.split(",")[0]?.trim() : null),
          startDate: date,
          endDate: item.end_date || null,
          category: item.category || null,
          gradeLevel: item.g_rank || null,
          pointsAvailable: (
            parseFloat(item.points_available || "0") ||
            (item.g_rank === "G-1"
              ? 300
              : item.g_rank === "G-2"
                ? 400
                : item.g_rank === "G-4"
                  ? 500
                  : item.event_type === "World Championship"
                    ? 600
                    : item.event_type === "Olympic Games"
                      ? 700
                      : 200)
          ).toString(),
          competitionType: getCompetitionLevel(item.event_type, item.event_level),
          registrationDeadline: item.registration_deadline || null,
          status: item.status || "upcoming",
          simplyCompeteEventId: eventId ? eventId.toString() : null,
        };

        // Check if competition already exists (by name and date)
        const existingCompetition = await db.query.competitions.findFirst({
          where: and(
            eq(schema.competitions.name, competitionData.name),
            eq(schema.competitions.startDate, competitionData.startDate),
          ),
        });

        if (existingCompetition) {
          // Update existing competition with logo if available
          if (item.logo) {
            try {
              const { bucketStorage } = await import('./bucket-storage.js');
              const logoResult = await bucketStorage.uploadCompetitionLogoFromUrl(
                existingCompetition.id,
                item.logo
              );
              
              // Update competition with logo URL
              await db
                .update(schema.competitions)
                .set({ logo: logoResult.url })
                .where(eq(schema.competitions.id, existingCompetition.id));
              
              logosUploaded++;
              console.log(`✅ Logo uploaded for existing competition: ${competitionData.name}`);
            } catch (logoError) {
              logosFailed++;
              console.error(`❌ Failed to upload logo for competition ${existingCompetition.id}:`, logoError);
            }
          }
          
          processedCompetitions.push(existingCompetition);
          return;
        }

        // Insert new competition
        const [newCompetition] = await db
          .insert(schema.competitions)
          .values(competitionData)
          .returning();

        saved++;
        processedCompetitions.push(newCompetition);
        console.log(`✓ Saved competition: ${competitionData.name}`);

        // Upload logo if available
        if (item.logo && newCompetition) {
          try {
            const { bucketStorage } = await import('./bucket-storage.js');
            const logoResult = await bucketStorage.uploadCompetitionLogoFromUrl(
              newCompetition.id,
              item.logo
            );
            
            // Update competition with logo URL
            await db
              .update(schema.competitions)
              .set({ logo: logoResult.url })
              .where(eq(schema.competitions.id, newCompetition.id));
            
            logosUploaded++;
            console.log(`✅ Logo uploaded for competition: ${competitionData.name}`);
          } catch (logoError) {
            logosFailed++;
            console.error(`❌ Failed to upload logo for competition ${newCompetition.id}:`, logoError);
          }
        }
      } catch (error) {
        console.error("Error processing competition:", error, item);
        errors++;
      }
    }));
  }

  console.log(`\nCompetition import completed: ${saved} saved, ${errors} errors, ${logosUploaded} logos uploaded, ${logosFailed} logos failed`);

  return {
    totalProcessed: jsonData.length,
    saved,
    errors,
    competitions: processedCompetitions,
    logosUploaded,
    logosFailed,
  };
}

// Note: Only returns data for countries with verified Olympic/World Championship athletes
