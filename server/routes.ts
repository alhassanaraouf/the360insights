import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertAiQuerySchema, insertSponsorshipBidSchema } from "@shared/schema";
import { aiEngine } from "./ai-engine";
import { z } from "zod";
import { realTimeEngine } from "./realtime-engine";
import { trainingPlanner } from "./training-planner";
import { injuryPreventionEngine } from "./injury-prevention";
import { tacticalTrainingEngine } from "./tactical-training";
import { pdfGenerator } from "./pdf-generator";
import { bucketStorage } from "./bucket-storage";
import { athleteVerificationEngine } from "./athlete-verification";
import { authenticAthleteSeeder } from "./authentic-athlete-seeder";
import { dataCleanupService } from "./data-cleanup";
import { authenticDataPopulator } from "./authentic-data-populator";
import { populateAuthenticAthleteData } from "./populate-authentic-data";
import { scrapeCountryAthletes, scrapeWorldRankings, commonCountryCodes, importJsonAthletes, importJsonCompetitions } from "./taekwondo-scraper";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from './db';
import * as schema from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import multer from 'multer';

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);



  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      let userId;
      if (req.user.claims) {
        // Replit auth user
        userId = req.user.claims.sub;
      } else {
        // Other auth providers
        userId = req.user.id;
      }
      
      const user = await storage.getUser(userId);
      if (!user && req.user.claims) {
        // For Replit users, create user record if it doesn't exist
        const newUser = await storage.upsertUser({
          id: req.user.claims.sub,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
        });
        return res.json(newUser);
      }
      
      res.json(user || req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // Athletes dashboard statistics endpoint (optimized for dashboard)
  app.get("/api/athletes/stats", async (req, res) => {
    try {
      const sportFilter = req.query.sport as string;
      const egyptOnly = req.query.egyptOnly === 'true';
      
      const stats = await storage.getAthleteStats(sportFilter, egyptOnly);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching athlete stats:", error);
      res.status(500).json({ error: "Failed to fetch athlete statistics" });
    }
  });

  // Athletes endpoint with pagination and filtering
  app.get("/api/athletes", async (req, res) => {
    try {
      const searchTerm = req.query.search as string;
      const sportFilter = req.query.sport as string;
      const nationalityFilter = req.query.nationality as string;
      const genderFilter = req.query.gender as string;
      const topRankedOnly = req.query.topRankedOnly === 'true';
      const sortBy = req.query.sortBy as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const result = await storage.getAthletesPaginated({
        searchTerm,
        sportFilter,
        nationalityFilter,
        genderFilter,
        topRankedOnly,
        sortBy,
        limit,
        offset
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching athletes:", error);
      res.status(500).json({ error: "Failed to fetch athletes" });
    }
  });

  // Get unique nationalities for filter dropdown
  app.get("/api/athletes/nationalities", async (req, res) => {
    try {
      const sportFilter = req.query.sport as string;
      const nationalities = await storage.getAthleteNationalities(sportFilter);
      res.json(nationalities);
    } catch (error) {
      console.error("Error fetching nationalities:", error);
      res.status(500).json({ error: "Failed to fetch nationalities" });
    }
  });

  // Get opponents filtered by weight class for a specific athlete
  app.get("/api/athletes/:id/opponents", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;
      
      const { opponents, total } = await storage.getOpponentsByWeightClass(athleteId, limit, offset, search);
      
      res.json({
        opponents,
        total,
        page,
        limit,
        hasMore: offset + limit < total
      });
    } catch (error) {
      console.error("Error fetching opponents by weight class:", error);
      res.status(500).json({ error: "Failed to fetch opponents" });
    }
  });

  // Get all opponents in the same weight class without rank restrictions
  app.get("/api/athletes/:id/opponents/all-weight-class", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;
      
      const { opponents, total } = await storage.getAllOpponentsByWeightClass(athleteId, limit, offset, search);
      
      res.json({
        opponents,
        total,
        page,
        limit,
        hasMore: offset + limit < total
      });
    } catch (error) {
      console.error("Error fetching all opponents by weight class:", error);
      res.status(500).json({ error: "Failed to fetch all opponents" });
    }
  });

  app.get("/api/athletes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate athlete ID - check for NaN or null
      if (isNaN(id) || !id || req.params.id === 'null' || req.params.id === 'undefined') {
        return res.status(400).json({ error: "Invalid athlete ID provided" });
      }
      
      const athlete = await storage.getAthlete(id);
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      
      // Get rankings for this athlete
      const rankings = await storage.getAthleteRankings(id);
      const athleteWithRankings = {
        ...athlete,
        worldRank: rankings.worldRank,
        olympicRank: rankings.olympicRank
      };
      
      res.json(athleteWithRankings);
    } catch (error) {
      console.error("Error fetching athlete:", error);
      res.status(500).json({ error: "Failed to fetch athlete" });
    }
  });

  app.patch("/api/athletes/:id", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const updateData = req.body;
      
      if (!athleteId) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }

      // Check if athlete exists
      const existingAthlete = await storage.getAthlete(athleteId);
      if (!existingAthlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }

      const updatedAthlete = await storage.updateAthlete(athleteId, updateData);
      res.json(updatedAthlete);
    } catch (error) {
      console.error("Error updating athlete:", error);
      res.status(500).json({ error: "Failed to update athlete" });
    }
  });

  app.delete("/api/athletes/:id", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      
      if (!athleteId) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }

      // Check if athlete exists
      const existingAthlete = await storage.getAthlete(athleteId);
      if (!existingAthlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }

      await storage.deleteAthlete(athleteId);
      res.json({ message: "Athlete deleted successfully" });
    } catch (error) {
      console.error("Error deleting athlete:", error);
      res.status(500).json({ error: "Failed to delete athlete" });
    }
  });

  // Get all ranks for an athlete
  app.get("/api/athletes/:id/ranks", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      
      if (!athleteId) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }

      const ranks = await storage.getAthleteRanksByAthleteId(athleteId);
      res.json(ranks);
    } catch (error) {
      console.error("Error fetching athlete ranks:", error);
      res.status(500).json({ error: "Failed to fetch athlete ranks" });
    }
  });

  // Serve athlete images from object storage
  app.get("/api/athletes/:id/image", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      
      if (!athleteId) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }

      // Get the image buffer from object storage
      const imageBuffer = await bucketStorage.getAthleteImageBuffer(athleteId);
      
      if (!imageBuffer) {
        return res.status(404).json({ error: "Image not found" });
      }

      // Set appropriate content type
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving athlete image:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  });

  // KPI Metrics
  app.get("/api/athletes/:id/kpis", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const kpis = await storage.getKpiMetricsByAthleteId(athleteId);
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KPI metrics" });
    }
  });

  // Strengths & Weaknesses
  app.get("/api/athletes/:id/strengths", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const strengths = await storage.getStrengthsByAthleteId(athleteId);
      res.json(strengths);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strengths" });
    }
  });

  app.get("/api/athletes/:id/weaknesses", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const weaknesses = await storage.getWeaknessesByAthleteId(athleteId);
      res.json(weaknesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weaknesses" });
    }
  });

  // Athlete Rankings
  app.get("/api/athletes/:id/ranks", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const ranks = await storage.getAthleteRanksByAthleteId(athleteId);
      res.json(ranks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch athlete ranks" });
    }
  });

  // Sponsorship Bids
  app.get("/api/athletes/:id/bids", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const bids = await storage.getSponsorshipBidsByAthleteId(athleteId);
      res.json(bids);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sponsorship bids" });
    }
  });

  app.post("/api/athletes/:id/bids", isAuthenticated, async (req: any, res) => {
    try {
      // Check if bids are currently accepted
      const bidSettings = await storage.getBidSettings();
      
      if (!bidSettings.bidsAccepted) {
        return res.status(403).json({ 
          error: "Bids are not currently being accepted",
          message: bidSettings.rejectionMessage || "We are not accepting new sponsorship bids at this time. Please check back later."
        });
      }

      const athleteId = parseInt(req.params.id);
      let sponsorUserId;
      
      if (req.user.claims) {
        sponsorUserId = req.user.claims.sub;
      } else {
        sponsorUserId = req.user.id;
      }

      const validatedData = insertSponsorshipBidSchema.parse({
        ...req.body,
        athleteId,
        sponsorUserId,
      });

      const newBid = await storage.createSponsorshipBid(validatedData);
      res.json(newBid);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create sponsorship bid" });
      }
    }
  });

  app.patch("/api/bids/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const bidId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["PENDING", "ACCEPTED", "REJECTED"].includes(status)) {
        return res.status(400).json({ error: "Invalid bid status" });
      }

      const updatedBid = await storage.updateSponsorshipBidStatus(bidId, status);
      res.json(updatedBid);
    } catch (error) {
      res.status(500).json({ error: "Failed to update bid status" });
    }
  });

  app.get("/api/bids", async (req, res) => {
    try {
      const bids = await storage.getAllSponsorshipBids();
      res.json(bids);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all bids" });
    }
  });

  app.get("/api/athletes-with-bids", async (req, res) => {
    try {
      const athletes = await storage.getAthletesWithBids();
      res.json(athletes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch athletes with bids" });
    }
  });

  // Bid Settings
  app.get("/api/bid-settings", async (req, res) => {
    try {
      const settings = await storage.getBidSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bid settings" });
    }
  });

  app.patch("/api/bid-settings", isAuthenticated, async (req: any, res) => {
    try {
      const { bidsAccepted, rejectionMessage } = req.body;
      const updates: any = {};
      
      if (typeof bidsAccepted === 'boolean') {
        updates.bidsAccepted = bidsAccepted;
      }
      
      if (rejectionMessage !== undefined) {
        updates.rejectionMessage = rejectionMessage;
      }

      const updatedSettings = await storage.updateBidSettings(updates);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update bid settings" });
    }
  });

  // Opponents are now treated as regular athletes - no separate endpoints needed

  // Opponent functionality removed - athletes can analyze against other athletes directly

  // Performance Data
  app.get("/api/athletes/:id/performance", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const performanceData = await storage.getPerformanceDataByAthleteId(athleteId);
      res.json(performanceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });

  // Training Recommendations
  app.get("/api/athletes/:id/training", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const recommendations = await storage.getTrainingRecommendationsByAthleteId(athleteId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training recommendations" });
    }
  });

  // Career Events (for competition calendar)
  app.get("/api/athletes/:id/career-events", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const careerEvents = await storage.getCareerEventsByAthleteId(athleteId);
      res.json(careerEvents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch career events" });
    }
  });

  // Global competitions for sport-wide dashboard
  app.get("/api/competitions", async (req, res) => {
    try {
      const category = req.query.category as string;
      const competitionType = req.query.competitionType as string;
      const sport = req.query.sport as string;
      
      const competitions = await storage.getCompetitionsByCategory(category, competitionType);
      
      // Filter competitions by sport if specified
      let filteredCompetitions = competitions;
      if (sport) {
        const sportName = sport === 'taekwondo' ? 'Taekwondo' : 
                         sport === 'karate' ? 'Karate' : sport;
        filteredCompetitions = competitions.filter((comp: any) => 
          comp.name?.includes(sportName) || comp.sport === sportName
        );
      }
      
      res.json(filteredCompetitions);
    } catch (error) {
      console.error("Error fetching competitions:", error);
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  // Competition CRUD operations
  app.post("/api/competitions", async (req, res) => {
    try {
      const competition = await storage.createCompetition(req.body);
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to create competition" });
    }
  });

  app.get("/api/competitions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const competition = await storage.getCompetition(id);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competition" });
    }
  });

  app.patch("/api/competitions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const competition = await storage.updateCompetition(id, req.body);
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to update competition" });
    }
  });

  app.delete("/api/competitions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCompetition(id);
      res.json({ message: "Competition deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete competition" });
    }
  });

  // Fetch and store ALL upcoming competitions from SimplyCompete API with full authentication
  // Endpoint to manually import event IDs extracted from SimplyCompete
  app.post("/api/competitions/import-event-ids", async (req, res) => {
    try {
      const { eventIds } = req.body;
      
      if (!eventIds || !Array.isArray(eventIds)) {
        return res.status(400).json({ error: "eventIds array is required" });
      }

      console.log(`🎯 Importing ${eventIds.length} event IDs manually...`);
      
      const storedCompetitions = [];
      const eventList = [];
      
      for (const eventData of eventIds) {
        const { id, name, country, city, startDate, endDate, gradeLevel } = eventData;
        
        if (!id || !name) {
          console.log(`⚠️ Skipping invalid event: ${JSON.stringify(eventData)}`);
          continue;
        }
        
        const competitionData = {
          name: name,
          country: country || 'Unknown',
          city: city || '',
          startDate: startDate || '',
          endDate: endDate || '',
          category: 'All',
          gradeLevel: gradeLevel || null,
          pointsAvailable: "0",
          competitionType: 'international',
          registrationDeadline: null,
          status: 'upcoming',
          simplyCompeteEventId: id
        };

        try {
          const stored = await storage.createCompetition(competitionData);
          storedCompetitions.push(stored);
          
          const eventInfo = {
            name: name,
            eventId: id,
            verified: true,
            date: startDate || '',
            location: country || ''
          };
          
          eventList.push(eventInfo);
          console.log(`✅ Stored: ${name} (Event ID: ${id})`);
        } catch (error) {
          console.error(`❌ Failed to store competition ${name}:`, error);
        }
      }

      console.log(`📊 Successfully imported ${storedCompetitions.length} competitions`);

      res.json({
        message: `Successfully imported ${storedCompetitions.length} competitions`,
        totalImported: storedCompetitions.length,
        eventList: eventList
      });

    } catch (error) {
      console.error("❌ Error importing event IDs:", error);
      res.status(500).json({ 
        error: "Failed to import event IDs", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/competitions/fetch-upcoming", async (req, res) => {
    try {
      console.log("🚀 Scraping ALL upcoming competitions from SimplyCompete API...");
      
      // Check if cookie is available
      const fullCookie = process.env.SIMPLYCOMPETE_FULL_COOKIE;
      if (!fullCookie) {
        console.error("❌ SIMPLYCOMPETE_FULL_COOKIE secret not found in environment");
        return res.status(400).json({
          error: "SIMPLYCOMPETE_FULL_COOKIE secret not found. Please add it to Replit Secrets."
        });
      }
      
      console.log("✅ Cookie found in environment (length:", fullCookie.length, "chars)");
      
      const allCompetitions: any[] = [];
      const verifiedEvents: any[] = [];
      let hasMorePages = true;

      // Fetch all pages using the new eventList endpoint (starts from pageNumber=1)
      let pageNumber = 1;
      while (hasMorePages) {
        console.log(`📄 Fetching page ${pageNumber}...`);
        
        const requestHeaders = {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Cookie': fullCookie,
          'Priority': 'u=1, i',
          'Pragma': 'no-cache',
          'Referer': 'https://worldtkd.simplycompete.com/events',
          'Sec-Ch-Ua': '"Not.A/Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        };
        
        console.log("📤 Request headers set with cookie length:", requestHeaders.Cookie.length);
        
        const response = await fetch(`https://worldtkd.simplycompete.com/events/eventList?da=true&eventType=All&invitationStatus=all&isArchived=false&itemsPerPage=12&pageNumber=${pageNumber}`, {
          headers: requestHeaders
        });

        if (!response.ok) {
          if (response.status === 403) {
            console.error("🔒 Cookie expired. Please refresh SIMPLYCOMPETE_FULL_COOKIE in Secrets.");
            return res.status(403).json({
              error: "Cookie expired. Please refresh SIMPLYCOMPETE_FULL_COOKIE in Secrets."
            });
          }
          console.error(`❌ HTTP error! status: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log(`📄 Page ${pageNumber}: Response structure:`, Object.keys(responseData));
        
        // Extract events from the response (format may be different)
        const events = responseData.events || responseData.data || responseData.content || responseData;
        const eventsArray = Array.isArray(events) ? events : [];
        
        console.log(`📄 Page ${pageNumber}: Found ${eventsArray.length} competitions`);

        if (eventsArray.length === 0) {
          hasMorePages = false;
          console.log("✅ No more competitions found, stopping pagination");
        } else {
          allCompetitions.push(...eventsArray);
          pageNumber++;
          
          // Add small delay to be respectful to the API
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`🏆 Total competitions scraped: ${allCompetitions.length}`);

      // Save raw events to file
      const fs = require('fs');
      fs.writeFileSync('events_raw.json', JSON.stringify(allCompetitions, null, 2));
      console.log("💾 Saved events_raw.json");

      // Verify each eventId and store in database
      const storedCompetitions: any[] = [];
      const eventList: {name: string, eventId: string, verified: boolean}[] = [];

      for (const event of allCompetitions) {
        const eventId = event.id || event.eventId;
        const eventName = event.name || 'Unknown Event';
        
        // Verify eventId by testing participant endpoint
        let verified = false;
        if (eventId) {
          try {
            console.log(`🔍 Verifying eventId ${eventId} for ${eventName}...`);
            
            const verifyHeaders = {
              'Accept': 'application/json, text/plain, */*',
              'Accept-Encoding': 'gzip, deflate, br',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cookie': fullCookie,
              'Referer': 'https://worldtkd.simplycompete.com/',
              'Sec-Ch-Ua': '"Not.A/Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'X-Requested-With': 'XMLHttpRequest'
            };

            const verifyResponse = await fetch(
              `https://worldtkd.simplycompete.com/events/getEventParticipant?eventId=${eventId}&isHideUnpaidEntries=false&pageNo=0`,
              {
                headers: verifyHeaders
              }
            );

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              verified = verifyData.participantList && Array.isArray(verifyData.participantList);
              console.log(`${verified ? '✅' : '❌'} Event ${eventName}: ${verified ? 'VERIFIED' : 'NOT VERIFIED'}`);
            } else if (verifyResponse.status === 403) {
              console.error("🔒 Cookie expired. Please refresh SIMPLYCOMPETE_FULL_COOKIE in Secrets.");
              return res.status(403).json({
                error: "Cookie expired. Please refresh SIMPLYCOMPETE_FULL_COOKIE in Secrets."
              });
            } else {
              console.log(`⚠️ Verification failed for ${eventName}: HTTP ${verifyResponse.status}`);
            }
          } catch (verifyError) {
            console.log(`⚠️ Verification failed for ${eventName}: ${verifyError}`);
          }
          
          // Small delay between verification requests
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Sanitize event name for database key
        const sanitizedName = eventName.replace(/[\/\\:*?"<>|]/g, '_').trim();
        
        // Store in database
        const competitionData = {
          name: eventName,
          country: event.location?.country || 'Unknown',
          city: event.location?.city || '',
          startDate: event.startDate || event.date || '',
          endDate: event.endDate || '',
          category: 'All',
          gradeLevel: event.gradeLevel || null,
          pointsAvailable: event.pointsAvailable || 0,
          competitionType: 'international',
          registrationDeadline: event.registrationDeadline || null,
          status: 'upcoming',
          simplyCompeteEventId: eventId
        };

        try {
          const stored = await storage.createCompetition(competitionData);
          storedCompetitions.push(stored);
          
          const eventData = {
            name: eventName,
            eventId: eventId || 'unknown',
            verified: verified,
            date: event.startDate || event.date || '',
            location: event.location?.country || ''
          };
          
          eventList.push(eventData);
          verifiedEvents.push(eventData);
          
          console.log(`✅ Stored: ${eventName} (Event ID: ${eventId}, Verified: ${verified})`);
        } catch (error) {
          console.error(`❌ Failed to store competition ${eventName}:`, error);
        }
      }

      // Save summary file
      const summaryData = {
        totalEvents: allCompetitions.length,
        totalVerified: verifiedEvents.filter(e => e.verified).length,
        events: verifiedEvents
      };
      fs.writeFileSync('events_summary.json', JSON.stringify(summaryData, null, 2));
      console.log("💾 Saved events_summary.json");

      // Print summary (without cookies)
      console.log("\n🎯 === UPCOMING COMPETITIONS SUMMARY ===");
      console.log(`📊 Total events found: ${summaryData.totalEvents}`);
      console.log(`✅ Total verified: ${summaryData.totalVerified}`);
      console.log("\n📋 Sample events (up to 10):");
      
      eventList.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} -> ${item.eventId} (${item.verified ? 'verified' : 'not verified'})`);
      });

      res.json({
        message: `Successfully scraped and stored ${storedCompetitions.length} upcoming competitions from ${pageNumber - 1} pages`,
        totalEvents: summaryData.totalEvents,
        totalVerified: summaryData.totalVerified,
        eventList: eventList,
        pagesFetched: pageNumber - 1
      });

    } catch (error) {
      console.error("❌ Error scraping upcoming competitions:", error);
      res.status(500).json({ 
        error: "Failed to scrape upcoming competitions", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint with sample upcoming competitions data
  app.post("/api/competitions/fetch-upcoming-test", async (req, res) => {
    try {
      console.log("Creating test upcoming competitions...");
      
      // Sample upcoming competitions data (structure similar to SimplyCompete API)
      const sampleApiData = [
        {
          id: "test-event-001",
          name: "2025 Paris Open Taekwondo Championships",
          location: { country: "France", city: "Paris" },
          startDate: "2025-03-15",
          endDate: "2025-03-17",
          gradeLevel: "G-2",
          pointsAvailable: 20,
          registrationDeadline: "2025-02-28"
        },
        {
          id: "test-event-002", 
          name: "European Taekwondo Championships 2025",
          location: { country: "Germany", city: "Berlin" },
          startDate: "2025-04-10",
          endDate: "2025-04-14",
          gradeLevel: "G-4",
          pointsAvailable: 40,
          registrationDeadline: "2025-03-20"
        },
        {
          id: "test-event-003",
          name: "World Taekwondo Grand Prix 2025",
          location: { country: "South Korea", city: "Seoul" },
          startDate: "2025-05-20",
          endDate: "2025-05-25",
          gradeLevel: "G-6",
          pointsAvailable: 60,
          registrationDeadline: "2025-04-30"
        },
        {
          id: "test-event-004",
          name: "Asian Taekwondo Championships 2025",
          location: { country: "Japan", city: "Tokyo" },
          startDate: "2025-06-05",
          endDate: "2025-06-09",
          gradeLevel: "G-4",
          pointsAvailable: 40,
          registrationDeadline: "2025-05-15"
        },
        {
          id: "test-event-005",
          name: "Mediterranean Games Taekwondo 2025",
          location: { country: "Italy", city: "Rome" },
          startDate: "2025-07-12",
          endDate: "2025-07-16",
          gradeLevel: "G-3",
          pointsAvailable: 30,
          registrationDeadline: "2025-06-20"
        }
      ];

      const storedCompetitions: any[] = [];
      const eventList: {name: string, eventId: string}[] = [];

      // Store each competition in the database
      for (const event of sampleApiData) {
        const competitionData = {
          name: event.name,
          country: event.location.country,
          city: event.location.city,
          startDate: event.startDate,
          endDate: event.endDate,
          category: 'All',
          gradeLevel: event.gradeLevel,
          pointsAvailable: event.pointsAvailable.toString(),
          competitionType: 'international',
          registrationDeadline: event.registrationDeadline,
          status: 'upcoming',
          simplyCompeteEventId: event.id
        };

        try {
          const stored = await storage.createCompetition(competitionData);
          storedCompetitions.push(stored);
          
          eventList.push({
            name: event.name,
            eventId: event.id
          });
          
          console.log(`Stored test competition: ${event.name} (ID: ${event.id})`);
        } catch (error) {
          console.error(`Failed to store test competition ${event.name}:`, error);
        }
      }

      console.log("\n=== TEST UPCOMING COMPETITIONS SUMMARY ===");
      eventList.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - Event ID: ${item.eventId}`);
      });
      console.log(`\nTotal: ${eventList.length} test competitions created and stored`);

      res.json({
        message: `Successfully created and stored ${storedCompetitions.length} test upcoming competitions`,
        competitions: storedCompetitions,
        eventList: eventList,
        total: storedCompetitions.length
      });

    } catch (error) {
      console.error("Error creating test competitions:", error);
      res.status(500).json({ 
        error: "Failed to create test competitions", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // List all stored upcoming competitions with their event IDs
  app.get("/api/competitions/upcoming-list", async (req, res) => {
    try {
      const competitions = await storage.getCompetitionsByCategory(undefined, undefined);
      const upcomingCompetitions = competitions.filter((comp: any) => comp.status === 'upcoming');
      
      const eventList = upcomingCompetitions.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        eventId: comp.simplyCompeteEventId,
        country: comp.country,
        city: comp.city,
        startDate: comp.startDate,
        endDate: comp.endDate,
        gradeLevel: comp.gradeLevel,
        pointsAvailable: comp.pointsAvailable
      }));

      console.log("\n=== STORED UPCOMING COMPETITIONS ===");
      eventList.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - Event ID: ${item.eventId}`);
      });
      console.log(`\nTotal: ${eventList.length} upcoming competitions in database`);

      res.json({
        competitions: eventList,
        total: eventList.length
      });

    } catch (error) {
      console.error("Error fetching upcoming competitions list:", error);
      res.status(500).json({ 
        error: "Failed to fetch upcoming competitions list"
      });
    }
  });

  // Update existing competitions with SimplyCompete event IDs
  app.post("/api/competitions/update-event-ids", async (req, res) => {
    try {
      console.log("🔥 DEBUG: Update event IDs endpoint hit!");
      console.log("🔄 Starting process to update existing competitions with SimplyCompete event IDs...");
      
      // First, get competitions from Python Flask app (with real SimplyCompete event IDs)
      let simplyCompeteCompetitions = [];
      try {
        console.log("📡 Fetching competitions from Python Flask app...");
        const flaskResponse = await fetch('http://localhost:5001/competitions');
        if (flaskResponse.ok) {
          const flaskData = await flaskResponse.json();
          simplyCompeteCompetitions = flaskData.competitions || [];
          console.log(`✅ Found ${simplyCompeteCompetitions.length} competitions from Python Flask app`);
        } else {
          console.log("⚠️ Python Flask app not available, using fallback matching");
        }
      } catch (error) {
        console.log("⚠️ Could not connect to Python Flask app:", error);
      }
      
      // Get existing competitions from PostgreSQL database
      const existingCompetitions = await storage.getCompetitionsByCategory(undefined, undefined);
      const competitionsNeedingUpdate = existingCompetitions.filter((comp: any) => !comp.simplyCompeteEventId);
      
      console.log(`📊 Found ${competitionsNeedingUpdate.length} competitions needing SimplyCompete event IDs`);
      
      const updates = [];
      const matched = [];
      const unmatched = [];
      
      for (const existingComp of competitionsNeedingUpdate) {
        console.log(`🔍 Looking for match for: "${existingComp.name}"`);
        
        // Try to find matching SimplyCompete competition by name similarity
        let matchedEvent = null;
        
        if (simplyCompeteCompetitions.length > 0) {
          // Method 1: Exact name match
          matchedEvent = simplyCompeteCompetitions.find((sc: any) => 
            sc.name && existingComp.name && sc.name.toLowerCase() === existingComp.name.toLowerCase()
          );
          
          // Method 2: Partial name match if no exact match
          if (!matchedEvent) {
            matchedEvent = simplyCompeteCompetitions.find((sc: any) => {
              if (!sc.name || !existingComp.name) return false;
              const scName = sc.name.toLowerCase();
              const existingName = existingComp.name.toLowerCase();
              return scName.includes(existingName.split(' ')[0]) || existingName.includes(scName.split(' ')[0]);
            });
          }
        }
        
        if (matchedEvent) {
          // Update the competition with SimplyCompete event ID
          try {
            const updatedComp = await storage.updateCompetition(existingComp.id, {
              simplyCompeteEventId: matchedEvent.id
            });
            
            updates.push({
              databaseId: existingComp.id,
              name: existingComp.name,
              simplyCompeteEventId: matchedEvent.id,
              matchedName: matchedEvent.name
            });
            
            matched.push(existingComp.name);
            console.log(`✅ Updated "${existingComp.name}" with event ID: ${matchedEvent.id}`);
            
          } catch (error) {
            console.error(`❌ Failed to update competition ${existingComp.name}:`, error);
          }
        } else {
          unmatched.push({
            databaseId: existingComp.id,
            name: existingComp.name
          });
          console.log(`❌ No match found for: "${existingComp.name}"`);
        }
      }
      
      console.log(`\n📊 Update Results:`);
      console.log(`✅ Matched and updated: ${matched.length}`);
      console.log(`❌ Unmatched: ${unmatched.length}`);
      
      res.json({
        message: `Updated ${updates.length} competitions with SimplyCompete event IDs`,
        totalProcessed: competitionsNeedingUpdate.length,
        successful: updates.length,
        failed: unmatched.length,
        updates: updates,
        unmatched: unmatched
      });
      
    } catch (error) {
      console.error("❌ Error updating competition event IDs:", error);
      res.status(500).json({ 
        error: "Failed to update competition event IDs", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // SimplyCompete API integration - fetch divisions
  app.get("/api/competitions/:eventId/divisions", async (req, res) => {
    try {
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ error: "Event ID is required" });
      }

      // Fetch divisions from SimplyCompete API
      const response = await fetch(`https://worldtkd.simplycompete.com/matchResults/getEventDivisions?eventId=${eventId}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch divisions from SimplyCompete API" });
      }

      const data = await response.json();
      
      // Filter data according to requirements
      const filteredDivisions = data.filter((division: any) => 
        division.subEventName === "Senior Division" && 
        division.eventRole === "Athlete"
      );

      // Group by weight category and aggregate athlete counts
      const groupedByWeight = filteredDivisions.reduce((acc: any, division: any) => {
        const weightCategory = division.divisionName;
        
        if (!acc[weightCategory]) {
          acc[weightCategory] = {
            eventName: division.eventName,
            weightCategory: weightCategory,
            athleteCount: 0,
            athletes: []
          };
        }
        
        acc[weightCategory].athleteCount += division.athleteCount || 0;
        
        return acc;
      }, {});

      // Convert to array format
      const result = Object.values(groupedByWeight);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching divisions:", error);
      res.status(500).json({ error: "Failed to fetch divisions" });
    }
  });

  // Function to fetch all participants from SimplyCompete API with pagination
  async function fetchAllSimplyCompeteParticipants(eventId: string, nodeId?: string) {
    const allParticipants: any[] = [];
    let pageNo = 0;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        let url = `https://worldtkd.simplycompete.com/events/getEventParticipant?eventId=${eventId}&isHideUnpaidEntries=false&pageNo=${pageNo}`;
        if (nodeId) {
          url += `&nodeId=${nodeId}&nodeLevel=EventRole`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch page ${pageNo}:`, response.status, response.statusText);
          break;
        }

        const data = await response.json();
        
        if (data.data?.data?.participantList && Array.isArray(data.data.data.participantList)) {
          const participants = data.data.data.participantList;
          
          if (participants.length === 0) {
            hasMorePages = false;
          } else {
            allParticipants.push(...participants);
            pageNo++;
            
            // Safety check to prevent infinite loops
            if (pageNo > 100) {
              console.warn("Reached maximum page limit (100)");
              break;
            }
          }
        } else {
          hasMorePages = false;
        }
      } catch (error) {
        console.error(`Error fetching page ${pageNo}:`, error);
        hasMorePages = false;
      }
    }

    return allParticipants;
  }

  // Helper function to group participants by weight category
  function groupParticipants(participantList: any[]) {
    // Filter for Senior Division athletes only
    const seniorAthletes = participantList.filter(participant => 
      !participant.subeventName || participant.subeventName === "Senior Division"
    );

    // Group by weight category
    const groupedByWeight = seniorAthletes.reduce((acc: any, participant: any) => {
      const weightCategory = participant.divisionName || "No Weight Category";
      
      if (!acc[weightCategory]) {
        acc[weightCategory] = {
          weightCategory: weightCategory,
          athleteCount: 0,
          athletes: []
        };
      }
      
      const athleteData = {
        name: `${participant.preferredFirstName || ""} ${participant.preferredLastName || ""}`.trim(),
        license: participant.wtfLicenseId || '',
        country: participant.country || '',
        club: participant.clubName || participant.customClubName || '',
        avatar: participant.avatar || '',
        organization: participant.teamOrganizationName || '',
        division: participant.subeventName || '',
        team: participant.teamName || ''
      };
      
      acc[weightCategory].athletes.push(athleteData);
      acc[weightCategory].athleteCount = acc[weightCategory].athletes.length;
      
      return acc;
    }, {});

    // Convert to array format and sort by weight category
    return Object.values(groupedByWeight).sort((a: any, b: any) => 
      a.weightCategory.localeCompare(b.weightCategory)
    );
  }

  // SimplyCompete API integration - fetch participants
  app.get("/api/competitions/:eventId/participants-live", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.eventId);
      
      if (isNaN(competitionId)) {
        return res.status(400).json({ error: "Invalid competition ID" });
      }

      // First, get the competition from the database to find its SimplyCompete event ID
      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      // Special case for Albania Open 2025 - use real SimplyCompete API data
      if (competitionId === 428 && competition.name === "Albania Open 2025") {
        const eventId = "11f0475f-66b5-53f3-95c6-0225d1e4088f";
        const nodeId = "11f0475f-66c7-f1a3-95c6-0225d1e4088f";
        
        console.log(`Fetching participants for Albania Open 2025 from SimplyCompete API...`);
        
        const allParticipants = await fetchAllSimplyCompeteParticipants(eventId, nodeId);
        
        console.log(`Retrieved ${allParticipants.length} total participants`);
        
        const result = groupParticipants(allParticipants);
        console.log(`Processed participants into ${result.length} weight categories`);
        return res.json(result);
      }

      // Check if competition has a SimplyCompete event ID for general case
      const simplyCompeteEventId = (competition as any).simplyCompeteEventId;
      if (simplyCompeteEventId) {
        console.log(`Fetching participants for ${competition.name} from SimplyCompete API...`);
        const participants = await fetchAllSimplyCompeteParticipants(simplyCompeteEventId);
        return res.json(groupParticipants(participants));
      }

      // Fallback to mock data for competitions without SimplyCompete integration
      const mockParticipants = [
        {
          "preferredFirstName": "Marco",
          "preferredLastName": "Rossi",
          "wtfLicenseId": "ITA-3456",
          "country": "Italy",
          "clubName": "Roma TKD Club",
          "avatar": "",
          "subeventName": "Senior Division",
          "divisionName": "M-74 kg",
          "teamOrganizationName": "ITALY - Italian Taekwondo Federation"
        },
        {
          "preferredFirstName": "Sara",
          "preferredLastName": "Johnson",
          "wtfLicenseId": "USA-7890",
          "country": "United States",
          "clubName": "Team USA Elite",
          "avatar": "",
          "subeventName": "Senior Division",
          "divisionName": "F-62 kg",
          "teamOrganizationName": "USA - USA Taekwondo"
        },
        {
          "preferredFirstName": "Jin",
          "preferredLastName": "Kim",
          "wtfLicenseId": "KOR-1111",
          "country": "South Korea",
          "clubName": "Seoul Tigers",
          "avatar": "",
          "subeventName": "Senior Division",
          "divisionName": "M-80 kg",
          "teamOrganizationName": "KOREA - Korea Taekwondo Association"
        }
      ];

      return res.json(groupParticipants(mockParticipants));
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  // Competition Draws Routes
  app.get("/api/competitions-with-participants", async (req, res) => {
    try {
      const competitions = await storage.getCompetitionsWithParticipantCount();
      res.json(competitions);
    } catch (error) {
      console.error("Error fetching competitions with participants:", error);
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  app.get("/api/competitions/:id/participants", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      if (isNaN(competitionId)) {
        return res.status(400).json({ error: "Invalid competition ID" });
      }
      
      const participants = await storage.getCompetitionParticipants(competitionId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching competition participants:", error);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  app.post("/api/competitions/:id/participants", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      if (isNaN(competitionId)) {
        return res.status(400).json({ error: "Invalid competition ID" });
      }

      const { athleteId, seedNumber, weightCategory } = req.body;
      
      const participant = await storage.addCompetitionParticipant({
        competitionId,
        athleteId,
        seedNumber,
        weightCategory,
        status: 'registered'
      });
      
      res.json(participant);
    } catch (error) {
      console.error("Error adding competition participant:", error);
      res.status(500).json({ error: "Failed to add participant" });
    }
  });

  app.delete("/api/competitions/:id/participants/:athleteId", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const athleteId = parseInt(req.params.athleteId);
      
      if (isNaN(competitionId) || isNaN(athleteId)) {
        return res.status(400).json({ error: "Invalid competition or athlete ID" });
      }

      await storage.removeCompetitionParticipant(competitionId, athleteId);
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Error removing competition participant:", error);
      res.status(500).json({ error: "Failed to remove participant" });
    }
  });

  // Rank Up functionality
  app.post("/api/rank-up/calculate", async (req, res) => {
    try {
      const { athleteId, targetRank, rankingType, category, targetDate } = req.body;
      
      if (!athleteId || !targetRank || !rankingType || !category) {
        return res.status(400).json({ 
          error: "Missing required fields: athleteId, targetRank, rankingType, category" 
        });
      }

      const requirements = await storage.calculateRankUpRequirements(
        athleteId, 
        targetRank, 
        rankingType, 
        category,
        targetDate
      );
      
      res.json(requirements);
    } catch (error) {
      console.error("Rank up calculation error:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("No ranking found for athlete")) {
          return res.status(404).json({ 
            error: "Athlete ranking not found",
            details: "This athlete doesn't have a ranking in the specified category and ranking type."
          });
        }
      }
      
      res.status(500).json({ 
        error: "Failed to calculate rank up requirements",
        details: "An unexpected error occurred while calculating ranking requirements."
      });

    }
  });

  // Get saved rank up analyses for an athlete
  app.get("/api/athletes/:id/rank-up-analyses", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      
      if (!athleteId) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }

      const analyses = await storage.getSavedRankUpAnalyses(athleteId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching saved rank up analyses:", error);
      res.status(500).json({ error: "Failed to fetch saved analyses" });
    }
  });

  // Competition Preferences Routes
  app.get("/api/competition-preferences/:userId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const preferences = await db.select().from(schema.userCompetitionPreferences)
        .where(eq(schema.userCompetitionPreferences.userId, userId));
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching competition preferences:", error);
      res.status(500).json({ error: "Failed to fetch competition preferences" });
    }
  });

  app.post("/api/competition-preferences", isAuthenticated, async (req, res) => {
    try {
      const preferences = req.body;
      
      // Batch insert/update preferences
      const savedPreferences = [];
      for (const pref of preferences) {
        const [saved] = await db.insert(schema.userCompetitionPreferences)
          .values(pref)
          .onConflictDoUpdate({
            target: [schema.userCompetitionPreferences.userId, schema.userCompetitionPreferences.competitionId],
            set: {
              isSelected: pref.isSelected,
              updatedAt: new Date(),
            },
          })
          .returning();
        savedPreferences.push(saved);
      }
      
      res.json(savedPreferences);
    } catch (error) {
      console.error("Error saving competition preferences:", error);
      res.status(500).json({ error: "Failed to save competition preferences" });
    }
  });

  app.put("/api/competition-preferences/:id", isAuthenticated, async (req, res) => {
    try {
      const preferenceId = parseInt(req.params.id);
      const updateData = req.body;
      
      const [updated] = await db.update(schema.userCompetitionPreferences)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(schema.userCompetitionPreferences.id, preferenceId))
        .returning();
        
      if (!updated) {
        return res.status(404).json({ error: "Competition preference not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating competition preference:", error);
      res.status(500).json({ error: "Failed to update competition preference" });
    }
  });

  app.delete("/api/competition-preferences/:id", isAuthenticated, async (req, res) => {
    try {
      const preferenceId = parseInt(req.params.id);
      
      await db.delete(schema.userCompetitionPreferences)
        .where(eq(schema.userCompetitionPreferences.id, preferenceId));
        
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting competition preference:", error);
      res.status(500).json({ error: "Failed to delete competition preference" });
    }
  });

  // Sport-wide statistics
  app.get("/api/sport-statistics", async (req, res) => {
    try {
      const stats = {
        totalAthletes: await db.select({ count: sql<number>`count(*)` }).from(schema.athletes),
        totalCompetitions: await db.select({ count: sql<number>`count(*)` }).from(schema.careerEvents)
          .where(eq(schema.careerEvents.eventType, 'competition')),
        performanceTrends: [] // Placeholder for now
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sport statistics" });
    }
  });

  // Career Events
  app.get("/api/athletes/:id/career", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const events = await storage.getCareerEventsByAthleteId(athleteId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch career events" });
    }
  });

  // AI Queries
  app.get("/api/athletes/:id/queries", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.id);
      const queries = await storage.getAiQueriesByAthleteId(athleteId);
      res.json(queries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI queries" });
    }
  });

  app.delete("/api/ai/query/:id", async (req, res) => {
    try {
      const queryId = parseInt(req.params.id);
      const deleted = await storage.deleteAiQuery(queryId);
      if (!deleted) {
        return res.status(404).json({ error: "Query not found" });
      }
      res.json({ success: true, message: "Query deleted successfully" });
    } catch (error) {
      console.error("Delete AI query error:", error);
      res.status(500).json({ error: "Failed to delete query" });
    }
  });

  // Schema for AI query API request (different from database insert schema)
  const aiQueryRequestSchema = z.object({
    query: z.string().min(1, "Query cannot be empty"),
    athleteId: z.number().int().positive("Athlete ID must be a positive integer")
  });

  app.post("/api/ai/query", async (req, res) => {
    try {
      const validation = aiQueryRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const { query, athleteId } = validation.data;
      
      // Use AI engine for advanced analysis
      const aiResponse = await aiEngine.processNaturalLanguageQuery(query, athleteId);
      
      if (!aiResponse.response) {
        return res.status(500).json({ error: "AI generated empty response" });
      }
      
      const aiQuery = await storage.createAiQuery({
        athleteId,
        query,
        response: aiResponse.response,
        confidence: aiResponse.confidence.toString(),
      });

      res.json(aiQuery);
    } catch (error) {
      console.error("AI query error:", error);
      res.status(500).json({ error: "Failed to process AI query" });
    }
  });

  // Dashboard summary endpoint
  app.get("/api/dashboard/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      const [
        athlete,
        kpis,
        strengths,
        weaknesses,
        trainingRecommendations
      ] = await Promise.all([
        storage.getAthlete(athleteId),
        storage.getKpiMetricsByAthleteId(athleteId),
        storage.getStrengthsByAthleteId(athleteId),
        storage.getWeaknessesByAthleteId(athleteId),
        storage.getTrainingRecommendationsByAthleteId(athleteId)
      ]);

      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }

      res.json({
        athlete,
        kpis,
        strengths,
        weaknesses,
        trainingRecommendations
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Advanced AI/ML Opponent Analysis Endpoints
  app.post("/api/ai/opponent-analysis/:athleteId/:opponentId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      const opponentId = parseInt(req.params.opponentId);
      
      const analysis = await aiEngine.analyzeOpponent(athleteId, opponentId);
      res.json(analysis);
    } catch (error) {
      console.error("Opponent analysis error:", error);
      res.status(500).json({ error: "Failed to analyze opponent" });
    }
  });

  app.get("/api/ai/performance-insight/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      if (!athleteId || isNaN(athleteId)) {
        return res.status(400).json({ error: "Valid athlete ID is required" });
      }
      
      const cachedAnalysis = await storage.getPerformanceAnalysisCache(athleteId);
      if (cachedAnalysis) {
        console.log(`[PerformanceAnalysis] Using cached analysis for athlete ${athleteId}`);
        return res.json({
          trend: cachedAnalysis.trend,
          confidence: parseFloat(cachedAnalysis.confidence),
          keyMetrics: cachedAnalysis.keyMetrics,
          recommendations: cachedAnalysis.recommendations,
          riskFactors: cachedAnalysis.riskFactors,
        });
      }
      
      console.log(`[PerformanceAnalysis] Generating new analysis for athlete ${athleteId}`);
      const insight = await aiEngine.analyzePerformanceTrend(athleteId);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      await storage.savePerformanceAnalysisCache({
        athleteId,
        trend: insight.trend,
        confidence: insight.confidence.toString(),
        keyMetrics: insight.keyMetrics,
        recommendations: insight.recommendations,
        riskFactors: insight.riskFactors,
        expiresAt,
      });
      
      res.json(insight);
    } catch (error) {
      console.error("Performance analysis error:", error);
      res.status(500).json({ error: "Failed to analyze performance trend" });
    }
  });

  app.get("/api/ai/training-recommendations/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      const recommendations = await aiEngine.generateTrainingRecommendations(athleteId);
      res.json({ recommendations });
    } catch (error) {
      console.error("Training recommendations error:", error);
      res.status(500).json({ error: "Failed to generate training recommendations" });
    }
  });

  // Generate strengths and weaknesses analysis using OpenAI O3
  app.post("/api/ai/analyze-strengths-weaknesses/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      if (!athleteId || isNaN(athleteId)) {
        return res.status(400).json({ error: "Valid athlete ID is required" });
      }
      
      const analysis = await aiEngine.analyzeAthleteStrengthsWeaknesses(athleteId);
      res.json(analysis);
    } catch (error) {
      console.error("Strengths/weaknesses analysis error:", error);
      res.status(500).json({ error: "Failed to analyze athlete strengths and weaknesses" });
    }
  });

  // Generate playing style for an athlete
  app.post("/api/ai/generate-playing-style/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      if (!athleteId || isNaN(athleteId)) {
        return res.status(400).json({ error: "Valid athlete ID is required" });
      }
      
      const playingStyle = await aiEngine.generatePlayingStyle(athleteId);
      
      res.json({ 
        success: true,
        playingStyle,
        message: `Generated playing style: ${playingStyle}`
      });
    } catch (error) {
      console.error("Generate playing style error:", error);
      res.status(500).json({ error: "Failed to generate playing style" });
    }
  });

  // Generate playing styles for all athletes
  app.post("/api/ai/generate-all-playing-styles", async (req, res) => {
    try {
      console.log("Starting batch playing style generation for all athletes...");
      
      const allAthletes = await storage.getAllAthletes();
      console.log(`Found ${allAthletes.length} athletes to process`);
      
      const results = {
        total: allAthletes.length,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // Process athletes in parallel batches of 5 to optimize speed while avoiding rate limits
      const batchSize = 5;
      for (let i = 0; i < allAthletes.length; i += batchSize) {
        const batch = allAthletes.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allAthletes.length / batchSize)}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (athlete) => {
          try {
            const playingStyle = await aiEngine.generatePlayingStyle(athlete.id);
            results.successful++;
            console.log(`✅ Generated playing style for ${athlete.name}: ${playingStyle}`);
            return { success: true, athlete: athlete.name };
          } catch (error) {
            results.failed++;
            const errorMsg = `Failed to generate playing style for ${athlete.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
            return { success: false, athlete: athlete.name, error: errorMsg };
          }
        });
        
        // Wait for all promises in the batch to complete
        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < allAthletes.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`Batch generation complete: ${results.successful} successful, ${results.failed} failed`);
      
      res.json({
        success: true,
        message: `Playing style generation complete`,
        results
      });
    } catch (error) {
      console.error("Batch playing style generation error:", error);
      res.status(500).json({ error: "Failed to generate playing styles for all athletes" });
    }
  });

  // Generate playing styles for all athletes with optional country filter
  app.post("/api/generate/playing-styles", async (req, res) => {
    try {
      const { country } = req.body;
      console.log("Starting playing style generation...");
      if (country) {
        console.log(`Filtering by country: ${country}`);
      }
      
      // Get all athletes or filter by country
      const allAthletes = country 
        ? await storage.getAthletesByCountry(country)
        : await storage.getAllAthletes();
      
      console.log(`Found ${allAthletes.length} athletes to process`);
      
      const results = {
        total: allAthletes.length,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // Process athletes in parallel batches of 5 to optimize speed while avoiding rate limits
      const batchSize = 5;
      for (let i = 0; i < allAthletes.length; i += batchSize) {
        const batch = allAthletes.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allAthletes.length / batchSize)}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (athlete) => {
          try {
            const playingStyle = await aiEngine.generatePlayingStyle(athlete.id);
            results.successful++;
            console.log(`✅ Generated playing style for ${athlete.name}: ${playingStyle}`);
            return { success: true, athlete: athlete.name, playingStyle };
          } catch (error) {
            results.failed++;
            const errorMsg = `Failed to generate playing style for ${athlete.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
            return { success: false, athlete: athlete.name, error: errorMsg };
          }
        });
        
        // Wait for all promises in the batch to complete
        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < allAthletes.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`Batch generation complete: ${results.successful} successful, ${results.failed} failed`);
      
      res.json({
        success: true,
        message: country 
          ? `Playing style generation complete for ${country}`
          : `Playing style generation complete`,
        results
      });
    } catch (error) {
      console.error("Playing style generation error:", error);
      res.status(500).json({ error: "Failed to generate playing styles" });
    }
  });

  // Generate playing style for a single athlete
  app.post("/api/generate/playing-style/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      if (!athleteId || isNaN(athleteId)) {
        return res.status(400).json({ error: "Valid athlete ID is required" });
      }
      
      console.log(`Generating playing style for athlete ID: ${athleteId}`);
      
      const playingStyle = await aiEngine.generatePlayingStyle(athleteId);
      
      res.json({
        success: true,
        playingStyle,
        athleteId
      });
    } catch (error) {
      console.error("Playing style generation error:", error);
      res.status(500).json({ error: "Failed to generate playing style" });
    }
  });

  // Generate strengths and weaknesses for all athletes with optional country filter
  app.post("/api/generate/strengths-weaknesses", async (req, res) => {
    try {
      const { country } = req.body;
      console.log("Starting strengths/weaknesses generation...");
      if (country) {
        console.log(`Filtering by country: ${country}`);
      }
      
      // Get all athletes or filter by country
      const allAthletes = country 
        ? await storage.getAthletesByCountry(country)
        : await storage.getAllAthletes();
      
      console.log(`Found ${allAthletes.length} athletes to process`);
      
      const results = {
        total: allAthletes.length,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // Process athletes in batches of 3 (slower than playing styles due to more complex AI analysis)
      const batchSize = 3;
      for (let i = 0; i < allAthletes.length; i += batchSize) {
        const batch = allAthletes.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allAthletes.length / batchSize)}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (athlete) => {
          try {
            // Generate AI analysis
            const analysis = await aiEngine.analyzeAthleteStrengthsWeaknesses(athlete.id);
            
            // Clear existing strengths and weaknesses
            await storage.clearStrengthsByAthleteId(athlete.id);
            await storage.clearWeaknessesByAthleteId(athlete.id);
            
            // Save new strengths
            for (let j = 0; j < analysis.strengths.length; j++) {
              const strengthItem = analysis.strengths[j];
              const strengthName = typeof strengthItem === 'string' ? strengthItem : (strengthItem as any).name || strengthItem;
              const strengthDescription = typeof strengthItem === 'string' ? `AI-identified strength in ${strengthName.toLowerCase()}` : (strengthItem as any).description || `AI-identified strength in ${strengthName.toLowerCase()}`;
              
              await storage.createStrength({
                athleteId: athlete.id,
                name: strengthName,
                score: 85 + Math.floor(Math.random() * 15),
                description: strengthDescription
              });
            }
            
            // Save new weaknesses
            for (let j = 0; j < analysis.weaknesses.length; j++) {
              const weaknessItem = analysis.weaknesses[j];
              const weaknessName = typeof weaknessItem === 'string' ? weaknessItem : (weaknessItem as any).name || weaknessItem;
              const weaknessDescription = typeof weaknessItem === 'string' ? `AI-identified area for improvement in ${weaknessName.toLowerCase()}` : (weaknessItem as any).description || `AI-identified area for improvement in ${weaknessName.toLowerCase()}`;
              
              await storage.createWeakness({
                athleteId: athlete.id,
                name: weaknessName,
                score: 40 + Math.floor(Math.random() * 30),
                description: weaknessDescription
              });
            }
            
            results.successful++;
            console.log(`✅ Generated strengths/weaknesses for ${athlete.name}: ${analysis.strengths.length} strengths, ${analysis.weaknesses.length} weaknesses`);
            return { success: true, athlete: athlete.name, strengthsCount: analysis.strengths.length, weaknessesCount: analysis.weaknesses.length };
          } catch (error) {
            results.failed++;
            const errorMsg = `Failed to generate strengths/weaknesses for ${athlete.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
            return { success: false, athlete: athlete.name, error: errorMsg };
          }
        });
        
        // Wait for all promises in the batch to complete
        await Promise.all(batchPromises);
        
        // Delay between batches to avoid rate limiting (longer delay due to more complex processing)
        if (i + batchSize < allAthletes.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`Batch generation complete: ${results.successful} successful, ${results.failed} failed`);
      
      res.json({
        success: true,
        message: country 
          ? `Strengths/weaknesses generation complete for ${country}`
          : `Strengths/weaknesses generation complete`,
        results
      });
    } catch (error) {
      console.error("Strengths/weaknesses generation error:", error);
      res.status(500).json({ error: "Failed to generate strengths and weaknesses" });
    }
  });

  // Generate and save strengths and weaknesses to database
  app.post("/api/ai/generate-and-save-strengths-weaknesses/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      if (!athleteId || isNaN(athleteId)) {
        return res.status(400).json({ error: "Valid athlete ID is required" });
      }
      
      // Generate AI analysis
      const analysis = await aiEngine.analyzeAthleteStrengthsWeaknesses(athleteId);
      
      // Clear existing strengths and weaknesses
      await storage.clearStrengthsByAthleteId(athleteId);
      await storage.clearWeaknessesByAthleteId(athleteId);
      
      // Save new strengths
      const savedStrengths = [];
      for (let i = 0; i < analysis.strengths.length; i++) {
        const strengthItem = analysis.strengths[i];
        const strengthName = typeof strengthItem === 'string' ? strengthItem : (strengthItem as any).name || strengthItem;
        const strengthDescription = typeof strengthItem === 'string' ? `AI-identified strength in ${strengthName.toLowerCase()}` : (strengthItem as any).description || `AI-identified strength in ${strengthName.toLowerCase()}`;
        
        const strength = await storage.createStrength({
          athleteId,
          name: strengthName,
          score: 85 + Math.floor(Math.random() * 15), // Random score between 85-99
          description: strengthDescription
        });
        savedStrengths.push(strength);
      }
      
      // Save new weaknesses
      const savedWeaknesses = [];
      for (let i = 0; i < analysis.weaknesses.length; i++) {
        const weaknessItem = analysis.weaknesses[i];
        const weaknessName = typeof weaknessItem === 'string' ? weaknessItem : (weaknessItem as any).name || weaknessItem;
        const weaknessDescription = typeof weaknessItem === 'string' ? `AI-identified area for improvement in ${weaknessName.toLowerCase()}` : (weaknessItem as any).description || `AI-identified area for improvement in ${weaknessName.toLowerCase()}`;
        
        const weakness = await storage.createWeakness({
          athleteId,
          name: weaknessName,
          score: 40 + Math.floor(Math.random() * 30), // Random score between 40-69
          description: weaknessDescription
        });
        savedWeaknesses.push(weakness);
      }
      
      res.json({
        strengths: savedStrengths,
        weaknesses: savedWeaknesses,
        message: `Generated and saved ${savedStrengths.length} strengths and ${savedWeaknesses.length} weaknesses`
      });
    } catch (error) {
      console.error("Generate and save strengths/weaknesses error:", error);
      res.status(500).json({ error: "Failed to generate and save athlete analysis" });
    }
  });

  // Athlete Verification Endpoints
  app.post("/api/athletes/verify", async (req, res) => {
    try {
      const { name, providedData } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Athlete name is required" });
      }

      const verificationResult = await athleteVerificationEngine.verifyAthleteData(name, providedData);
      res.json(verificationResult);
    } catch (error) {
      console.error("Athlete verification error:", error);
      res.status(500).json({ error: "Failed to verify athlete data" });
    }
  });

  app.post("/api/opponents/verify", async (req, res) => {
    try {
      const { opponentName, athleteId } = req.body;
      
      if (!opponentName || !athleteId) {
        return res.status(400).json({ error: "Opponent name and athlete ID are required" });
      }

      const verificationResult = await athleteVerificationEngine.verifyOpponentData(opponentName, athleteId);
      res.json(verificationResult);
    } catch (error) {
      console.error("Opponent verification error:", error);
      res.status(500).json({ error: "Failed to verify opponent data" });
    }
  });

  app.get("/api/data/validate-all", async (req, res) => {
    try {
      const validationReport = await athleteVerificationEngine.validateExistingData();
      res.json(validationReport);
    } catch (error) {
      console.error("Data validation error:", error);
      res.status(500).json({ error: "Failed to validate existing data" });
    }
  });

  app.post("/api/data/seed-authentic-athletes", async (req, res) => {
    try {
      const seedingResult = await authenticAthleteSeeder.seedAuthenticAthletes();
      res.json(seedingResult);
    } catch (error) {
      console.error("Authentic athlete seeding error:", error);
      res.status(500).json({ error: "Failed to seed authentic athletes" });
    }
  });



  app.get("/api/data/verify-current-athletes", async (req, res) => {
    try {
      const verificationResult = await authenticAthleteSeeder.verifyCurrentAthletes();
      res.json(verificationResult);
    } catch (error) {
      console.error("Current athlete verification error:", error);
      res.status(500).json({ error: "Failed to verify current athletes" });
    }
  });

  app.get("/api/data/analyze-duplicates", async (req, res) => {
    try {
      const analysis = await dataCleanupService.identifyDuplicatesAndInaccurate();
      res.json(analysis);
    } catch (error) {
      console.error("Data analysis error:", error);
      res.status(500).json({ error: "Failed to analyze athlete data" });
    }
  });

  app.post("/api/data/cleanup-database", async (req, res) => {
    try {
      const cleanupResult = await dataCleanupService.cleanupDatabase();
      res.json(cleanupResult);
    } catch (error) {
      console.error("Database cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup database" });
    }
  });

  // Dynamic PDF Export Endpoint
  // Rankings Overview Export (for dashboard)
  app.get("/api/export/rankings-overview", async (req, res) => {
    try {
      const egyptOnly = req.query.egyptOnly === 'true';
      const allAthletes = await storage.getAllAthletesWithRankings();
      
      // Filter athletes based on Egypt toggle
      let filteredAthletes = allAthletes;
      if (egyptOnly) {
        filteredAthletes = allAthletes.filter(athlete => athlete.nationality === "Egypt");
      }
      
      // Filter athletes to those with any rankings (world OR olympic)
      const rankedAthletes = filteredAthletes
        .filter(athlete => athlete.worldRank || athlete.olympicRank)
        .sort((a, b) => {
          // Prioritize Olympic rankings first, then World rankings
          if (a.olympicRank && !b.olympicRank) return -1;
          if (!a.olympicRank && b.olympicRank) return 1;
          if (a.olympicRank && b.olympicRank) return a.olympicRank - b.olympicRank;
          
          if (a.worldRank && !b.worldRank) return -1;
          if (!a.worldRank && b.worldRank) return 1;
          if (a.worldRank && b.worldRank) return a.worldRank - b.worldRank;
          
          return 0;
        });

      const pdfBuffer = await pdfGenerator.generateRankingsOverviewReport(rankedAthletes, egyptOnly);
      
      const filename = egyptOnly ? "Egypt_Rankings_Overview.pdf" : "Global_Rankings_Overview.pdf";
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating rankings overview PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF report" });
    }
  });

  app.get("/api/export/:reportType/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      const reportType = req.params.reportType;
      
      let pdfBuffer: Buffer;
      let filename: string;
      
      const athlete = await storage.getAthlete(athleteId);
      const baseName = athlete?.name.replace(/\s+/g, '_') || 'Athlete';
      const dateStr = new Date().toISOString().split('T')[0];
      
      switch (reportType) {
        case 'athlete-report':
          pdfBuffer = await pdfGenerator.generateAthleteReport(athleteId);
          filename = `${baseName}_Performance_Report_${dateStr}.pdf`;
          break;
        case 'opponent-analysis':
          pdfBuffer = await pdfGenerator.generateOpponentAnalysisReport(athleteId);
          filename = `${baseName}_Opponent_Analysis_${dateStr}.pdf`;
          break;
        case 'rankings-report':
          pdfBuffer = await pdfGenerator.generateRankingsReport(athleteId);
          filename = `${baseName}_Rankings_Report_${dateStr}.pdf`;
          break;
        case 'training-plan':
          // Get the most recent training plan for the athlete
          const trainingPlans = await storage.getTrainingPlansByAthleteId(athleteId);
          if (!trainingPlans || trainingPlans.length === 0) {
            throw new Error(`No training plans found for athlete ${athleteId}`);
          }
          // Use the most recent training plan (they're ordered by createdAt DESC)
          const latestPlan = trainingPlans[0];
          pdfBuffer = await pdfGenerator.generateTrainingPlanReport(latestPlan.id, latestPlan);
          filename = `${baseName}_Training_Plan_${dateStr}.pdf`;
          break;
        case 'injury-prevention':
          pdfBuffer = await pdfGenerator.generateInjuryPreventionReport(athleteId);
          filename = `${baseName}_Injury_Prevention_${dateStr}.pdf`;
          break;
        case 'career-journey':
          pdfBuffer = await pdfGenerator.generateCareerJourneyReport(athleteId);
          filename = `${baseName}_Career_Journey_${dateStr}.pdf`;
          break;
        case 'tactical-training':
          pdfBuffer = await pdfGenerator.generateTacticalTrainingReport(athleteId);
          filename = `${baseName}_Tactical_Training_${dateStr}.pdf`;
          break;
        default:
          pdfBuffer = await pdfGenerator.generateAthleteReport(athleteId);
          filename = `${baseName}_Performance_Report_${dateStr}.pdf`;
      }
      
      // Set proper headers for PDF content
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF report:", error);
      res.status(500).json({ error: "Failed to generate PDF report" });
    }
  });

  // Egyptian Athletes Search endpoint (sport-specific)
  app.get("/api/search/egyptian-athletes", async (req, res) => {
    try {
      const { q, sport } = req.query;
      const searchTerm = (q as string)?.toLowerCase() || '';
      const sportFilter = sport as string;
      
      // Get actual athletes from database
      const allAthletes = await storage.getAllAthletes();
      
      // Filter by sport if provided
      let filteredAthletes = allAthletes;
      if (sportFilter) {
        const sportName = sportFilter === 'taekwondo' ? 'Taekwondo' : 
                         sportFilter === 'karate' ? 'Karate' : sportFilter;
        filteredAthletes = filteredAthletes.filter(athlete => 
          athlete.sport === sportName
        );
      }
      
      // Filter to only Egyptian athletes
      const egyptianAthletes = filteredAthletes.filter(athlete => 
        athlete.nationality === "Egypt"
      );
      
      // Filter athletes based on search term (name only)
      const searchFilteredAthletes = egyptianAthletes.filter(athlete => {
        const name = athlete.name.toLowerCase();
        const term = searchTerm.toLowerCase();
        
        // Check if search term matches name or any word in name starts with the term
        return name.includes(term) || name.split(' ').some(word => word.startsWith(term));
      });

      // Get athlete ranks for accurate ranking data
      const athleteRanks = await Promise.all(
        searchFilteredAthletes.map(async (athlete) => {
          const allRanks = await storage.getAthleteRanksByAthleteId(athlete.id);
          // Find the best world ranking (lowest number = better rank)
          const worldRanks = allRanks.filter(rank => rank.rankingType === 'world');
          const bestWorldRank = worldRanks.length > 0 
            ? worldRanks.reduce((best, current) => current.ranking < best.ranking ? current : best)
            : null;
          return { athlete, ranks: bestWorldRank };
        })
      );

      // Map database athletes to search format with accurate data
      const searchResults = athleteRanks.map(({ athlete, ranks }) => {
        return {
          id: athlete.id,
          name: athlete.name,
          sport: athlete.sport,
          nationality: athlete.nationality,
          weight: ranks?.category || athlete.worldCategory || "Unknown",
          gender: athlete.gender || "Unknown", 
          worldRank: ranks?.ranking || 0,
          category: ranks?.category || athlete.worldCategory || "Unknown",
          achievements: [], // Safe default for frontend
          profileImage: `/api/athletes/${athlete.id}/image`
        };
      });

      res.json(searchResults);
    } catch (error) {
      console.error("Error searching Egyptian athletes:", error);
      res.status(500).json({ error: "Failed to search athletes" });
    }
  });

  // General Athletes Search endpoint - searches all athletes globally (sport-specific)
  app.get("/api/search/athletes", async (req, res) => {
    try {
      const { q, sport } = req.query;
      const searchTerm = (q as string)?.toLowerCase() || '';
      const sportFilter = sport as string;
      
      // Get all athletes from database
      const allAthletes = await storage.getAllAthletes();
      
      // Filter by sport if provided
      let sportFilteredAthletes = allAthletes;
      if (sportFilter) {
        const sportName = sportFilter === 'taekwondo' ? 'Taekwondo' : 
                         sportFilter === 'karate' ? 'Karate' : sportFilter;
        sportFilteredAthletes = sportFilteredAthletes.filter(athlete => 
          athlete.sport === sportName
        );
      }
      
      // Filter athletes based on search term (name only)
      const filteredAthletes = sportFilteredAthletes.filter(athlete => {
        const name = athlete.name.toLowerCase();
        const term = searchTerm.toLowerCase();
        
        // Check if search term matches name or any word in name starts with the term
        return name.includes(term) || name.split(' ').some(word => word.startsWith(term));
      });
      
      // Get athlete ranks for accurate ranking data
      const athleteRanks = await Promise.all(
        filteredAthletes.map(async (athlete) => {
          const allRanks = await storage.getAthleteRanksByAthleteId(athlete.id);
          // Find the best world ranking (lowest number = better rank)
          const worldRanks = allRanks.filter(rank => rank.rankingType === 'world');
          const bestWorldRank = worldRanks.length > 0 
            ? worldRanks.reduce((best, current) => current.ranking < best.ranking ? current : best)
            : null;
          return { athlete, ranks: bestWorldRank };
        })
      );
      
      // Map to consistent search result format with accurate data
      const searchResults = athleteRanks.map(({ athlete, ranks }) => ({
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
        nationality: athlete.nationality,
        weight: ranks?.category || athlete.worldCategory || "Unknown",
        gender: athlete.gender || "Unknown", 
        worldRank: ranks?.ranking || 0,
        category: ranks?.category || athlete.worldCategory || "Unknown",
        achievements: [], // Safe default for frontend
        profileImage: `/api/athletes/${athlete.id}/image`
      }));
      
      res.json(searchResults);
    } catch (error) {
      console.error("Error searching athletes:", error);
      res.status(500).json({ error: "Failed to search athletes" });
    }
  });

  // Taekwondo data scraping routes
  app.post("/api/scrape/country/:countryCode", isAuthenticated, async (req, res) => {
    try {
      const { countryCode } = req.params;
      
      if (!countryCode || countryCode.length !== 3) {
        return res.status(400).json({ 
          error: "Invalid country code. Use 3-letter ISO codes (e.g., EGY, USA, KOR)" 
        });
      }

      console.log(`Starting scrape for country: ${countryCode.toUpperCase()}`);
      const result = await scrapeCountryAthletes(countryCode);
      
      res.json({
        message: `Scraping completed for ${countryCode.toUpperCase()}`,
        athletesFound: result.athletesFound,
        athletesSaved: result.athletesSaved,
        duplicatesSkipped: result.duplicatesSkipped || 0,
        errors: result.errors
      });
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: "Failed to scrape athlete data" });
    }
  });

  app.post("/api/scrape/rankings", isAuthenticated, async (req, res) => {
    try {
      console.log("Starting world rankings scrape");
      const result = await scrapeWorldRankings();
      
      res.json({
        message: "World rankings scraping completed",
        totalAthletes: result.athletes.length,
        saved: result.saved,
        errors: result.errors,
        athletes: result.athletes.slice(0, 20) // Return top 20 as preview
      });
    } catch (error) {
      console.error("Rankings scraping error:", error);
      res.status(500).json({ error: "Failed to scrape rankings data" });
    }
  });

  app.get("/api/scrape/countries", (req, res) => {
    res.json({
      message: "Available country codes for scraping",
      countries: commonCountryCodes,
      usage: "POST /api/scrape/country/{countryCode} - Use 3-letter ISO codes"
    });
  });

  // JSON import route for athletes
  const upload = multer({ storage: multer.memoryStorage() });
  app.post("/api/import/json", isAuthenticated, upload.single('jsonFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const rankingType = req.body.rankingType || 'world';
      
      try {
        const jsonData = JSON.parse(req.file.buffer.toString('utf8'));
        
        // Handle both old format (direct array) and new format (wrapped with athletes property)
        let athletesArray;
        if (Array.isArray(jsonData)) {
          // Old format - direct array of athletes
          athletesArray = jsonData;
        } else if (jsonData.athletes && Array.isArray(jsonData.athletes)) {
          // New format - athletes wrapped in object with export_info
          athletesArray = jsonData.athletes;
        } else {
          return res.status(400).json({ 
            error: "JSON must be an array of athlete objects or an object with 'athletes' property containing an array" 
          });
        }
        
        const result = await importJsonAthletes(athletesArray, rankingType);
        
        res.json({
          message: `JSON import completed for ${rankingType} rankings`,
          totalAthletes: result.totalProcessed,
          saved: result.saved,
          updated: result.updated,
          errors: result.errors,
          competitionsImported: result.competitionsImported || 0,
          athletes: result.athletes.slice(0, 20) // Return first 20 as preview
        });
      } catch (parseError) {
        res.status(400).json({ error: "Invalid JSON format" });
      }
    } catch (error) {
      console.error("JSON import error:", error);
      res.status(500).json({ error: "Failed to import JSON data" });
    }
  });

  // JSON import route for competitions
  app.post("/api/import/competitions", isAuthenticated, upload.single('jsonFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      try {
        const jsonData = JSON.parse(req.file.buffer.toString('utf8'));
        
        // Handle both direct array and wrapped format
        let competitionsArray;
        if (Array.isArray(jsonData)) {
          // Direct array of competitions
          competitionsArray = jsonData;
        } else if (jsonData.competitions && Array.isArray(jsonData.competitions)) {
          // Wrapped format with competitions property
          competitionsArray = jsonData.competitions;
        } else {
          return res.status(400).json({ 
            error: "JSON must be an array of competition objects or an object with 'competitions' property containing an array" 
          });
        }
        
        const result = await importJsonCompetitions(competitionsArray);
        
        res.json({
          message: `Competition import completed`,
          totalCompetitions: result.totalProcessed,
          saved: result.saved,
          errors: result.errors,
          competitions: result.competitions.slice(0, 20) // Return first 20 as preview
        });
      } catch (parseError) {
        res.status(400).json({ error: "Invalid JSON format" });
      }
    } catch (error) {
      console.error("Competition import error:", error);
      res.status(500).json({ error: "Failed to import competition data" });
    }
  });

  // Sync competitions from SimplyCompete API
  app.post("/api/competitions/sync", isAuthenticated, async (req, res) => {
    try {
      console.log("🔄 Starting competition sync from SimplyCompete...");
      
      // Call the Python Flask service to get competitions
      const flaskResponse = await fetch('http://localhost:5001/competitions/sync');
      
      if (!flaskResponse.ok) {
        throw new Error(`Flask service returned ${flaskResponse.status}`);
      }
      
      const flaskData = await flaskResponse.json();
      
      if (!flaskData.success || !flaskData.competitions) {
        return res.status(400).json({ 
          error: "Failed to fetch competitions from SimplyCompete",
          details: flaskData
        });
      }
      
      const competitions = flaskData.competitions;
      console.log(`📊 Received ${competitions.length} competitions from SimplyCompete`);
      
      let saved = 0;
      let updated = 0;
      let errors: string[] = [];
      
      // Process each competition
      for (const comp of competitions) {
        try {
          // Map SimplyCompete data to our schema
          const competitionData = {
            name: comp.name || "Unnamed Competition",
            country: "International", // Default, update if available in data
            startDate: comp.startDate || comp.start_date || new Date().toISOString().split('T')[0],
            endDate: comp.endDate || comp.end_date || null,
            competitionType: "international",
            pointsAvailable: "0",
            status: "upcoming",
            simplyCompeteEventId: comp.id?.toString() || null, // Save the event ID here!
            lastSyncedAt: new Date(),
          };
          
          // Check if competition with this event ID already exists
          const existingCompetitions = await storage.getAllCompetitions();
          const existing = existingCompetitions.find(
            c => c.simplyCompeteEventId === competitionData.simplyCompeteEventId
          );
          
          if (existing) {
            // Update existing competition
            await storage.updateCompetition(existing.id, competitionData);
            updated++;
            console.log(`✅ Updated: ${competitionData.name} (Event ID: ${competitionData.simplyCompeteEventId})`);
          } else {
            // Create new competition
            await storage.createCompetition(competitionData);
            saved++;
            console.log(`✨ Created: ${competitionData.name} (Event ID: ${competitionData.simplyCompeteEventId})`);
          }
        } catch (error: any) {
          const errorMsg = `Failed to save ${comp.name}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
      res.json({
        success: true,
        message: `Competition sync completed`,
        totalReceived: competitions.length,
        saved,
        updated,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Competition sync error:", error);
      res.status(500).json({ 
        error: "Failed to sync competitions",
        details: error.message 
      });
    }
  });

  // Real-time Match Analysis Endpoints
  app.post("/api/match/start", async (req, res) => {
    try {
      const { athleteId, opponentId } = req.body;
      
      if (!athleteId || !opponentId) {
        return res.status(400).json({ error: "athleteId and opponentId are required" });
      }
      
      await realTimeEngine.startMatchAnalysis(athleteId, opponentId);
      res.json({ message: "Match analysis started", status: "active" });
    } catch (error) {
      console.error("Error starting match:", error);
      res.status(500).json({ error: "Failed to start match analysis" });
    }
  });

  app.post("/api/match/event", async (req, res) => {
    try {
      const event = req.body;
      
      if (!event.type || !event.athlete) {
        return res.status(400).json({ error: "Event type and athlete are required" });
      }
      
      await realTimeEngine.addMatchEvent(event);
      res.json({ message: "Event recorded" });
      
      // Broadcast event to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'match_event',
            data: event
          }));
        }
      });
    } catch (error) {
      console.error("Error recording match event:", error);
      res.status(500).json({ error: "Failed to record match event" });
    }
  });

  app.get("/api/match/analysis", async (req, res) => {
    try {
      if (!realTimeEngine.isMatchActive()) {
        return res.status(400).json({ error: "No active match" });
      }
      
      const analysis = await realTimeEngine.getLiveAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error("Error getting live analysis:", error);
      res.status(500).json({ error: "Failed to get live analysis" });
    }
  });

  app.get("/api/match/suggestions", async (req, res) => {
    try {
      if (!realTimeEngine.isMatchActive()) {
        return res.status(400).json({ error: "No active match" });
      }
      
      const suggestions = await realTimeEngine.generateAdaptiveSuggestions();
      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({ error: "Failed to generate adaptive suggestions" });
    }
  });

  app.post("/api/match/end", async (req, res) => {
    try {
      await realTimeEngine.endMatch();
      res.json({ message: "Match ended" });
    } catch (error) {
      console.error("Error ending match:", error);
      res.status(500).json({ error: "Failed to end match" });
    }
  });

  // Training Plan Generator Endpoints
  app.post("/api/training/generate-plan", async (req, res) => {
    try {
      const { athleteId, planType, duration, targetCompetition, targetWeight, currentWeight } = req.body;
      
      if (!athleteId || !planType || !duration) {
        return res.status(400).json({ error: "athleteId, planType, and duration are required" });
      }
      
      const trainingPlan = await trainingPlanner.generateComprehensivePlan(
        athleteId,
        planType,
        duration,
        targetCompetition
      );
      
      // Save the training plan to database
      const savedPlan = await storage.createTrainingPlan({
        athleteId: trainingPlan.athleteId,
        planName: trainingPlan.planName,
        startDate: trainingPlan.startDate,
        duration: trainingPlan.duration,
        planType: trainingPlan.planType,
        targetCompetition,
        targetWeight,
        currentWeight,
        microCycles: trainingPlan.microCycles,
        overallObjectives: trainingPlan.overallObjectives,
        progressionStrategy: trainingPlan.progressionStrategy,
        adaptationProtocol: trainingPlan.adaptationProtocol
      });
      
      res.json({ ...trainingPlan, id: savedPlan.id });
    } catch (error) {
      console.error("Error generating training plan:", error);
      res.status(500).json({ error: "Failed to generate training plan" });
    }
  });

  // Get training plans for an athlete
  app.get("/api/training/plans/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      if (!athleteId) {
        return res.status(400).json({ error: "Valid athleteId is required" });
      }
      
      const plans = await storage.getTrainingPlansByAthleteId(athleteId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching training plans:", error);
      res.status(500).json({ error: "Failed to fetch training plans" });
    }
  });

  // Get a specific training plan
  app.get("/api/training/plan/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!id) {
        return res.status(400).json({ error: "Valid plan ID is required" });
      }
      
      const plan = await storage.getTrainingPlan(id);
      if (!plan) {
        return res.status(404).json({ error: "Training plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error fetching training plan:", error);
      res.status(500).json({ error: "Failed to fetch training plan" });
    }
  });

  // Update a training plan
  app.patch("/api/training/plan/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "Valid plan ID is required" });
      }
      
      const updatedPlan = await storage.updateTrainingPlan(id, updates);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating training plan:", error);
      res.status(500).json({ error: "Failed to update training plan" });
    }
  });

  // Delete a training plan
  app.delete("/api/training/plan/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!id) {
        return res.status(400).json({ error: "Valid plan ID is required" });
      }
      
      await storage.deleteTrainingPlan(id);
      res.json({ message: "Training plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting training plan:", error);
      res.status(500).json({ error: "Failed to delete training plan" });
    }
  });

  // Export training plan as PDF
  app.get("/api/export/training-plan/:id", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      
      if (!planId) {
        return res.status(400).json({ error: "Valid plan ID is required" });
      }
      
      const planData = await storage.getTrainingPlan(planId);
      if (!planData) {
        return res.status(404).json({ error: "Training plan not found" });
      }
      
      const pdfBuffer = await pdfGenerator.generateTrainingPlanReport(planId, planData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="training-plan-${planId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error exporting training plan PDF:", error);
      res.status(500).json({ error: "Failed to export training plan PDF" });
    }
  });

  app.post("/api/training/adaptive-adjustments", async (req, res) => {
    try {
      const { planId, athleteId, weekNumber, performanceData } = req.body;
      
      if (!athleteId || !weekNumber) {
        return res.status(400).json({ error: "athleteId and weekNumber are required" });
      }
      
      const adjustments = await trainingPlanner.generateAdaptiveAdjustments(
        planId,
        athleteId,
        weekNumber,
        performanceData
      );
      
      res.json(adjustments);
    } catch (error) {
      console.error("Error generating adaptive adjustments:", error);
      res.status(500).json({ error: "Failed to generate training adjustments" });
    }
  });

  // Injury Prevention Endpoints
  app.get("/api/injury-prevention/risk-analysis/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      const biomechanicalData = req.query.biomechanical ? JSON.parse(req.query.biomechanical as string) : undefined;
      
      const riskAnalysis = await injuryPreventionEngine.analyzeInjuryRisk(athleteId, biomechanicalData);
      res.json(riskAnalysis);
    } catch (error) {
      console.error("Error analyzing injury risk:", error);
      res.status(500).json({ error: "Failed to analyze injury risk" });
    }
  });

  app.post("/api/injury-prevention/recovery-protocol", async (req, res) => {
    try {
      const { athleteId, injuryType, severity } = req.body;
      
      if (!athleteId || !injuryType || !severity) {
        return res.status(400).json({ error: "athleteId, injuryType, and severity are required" });
      }
      
      const protocol = await injuryPreventionEngine.generateRecoveryProtocol(athleteId, injuryType, severity);
      res.json(protocol);
    } catch (error) {
      console.error("Error generating recovery protocol:", error);
      res.status(500).json({ error: "Failed to generate recovery protocol" });
    }
  });

  app.post("/api/injury-prevention/predict-patterns", async (req, res) => {
    try {
      const { athleteId, recentMetrics } = req.body;
      
      if (!athleteId) {
        return res.status(400).json({ error: "athleteId is required" });
      }
      
      const predictions = await injuryPreventionEngine.predictInjuryFromPatterns(athleteId, recentMetrics || []);
      res.json(predictions);
    } catch (error) {
      console.error("Error predicting injury patterns:", error);
      res.status(500).json({ error: "Failed to predict injury patterns" });
    }
  });

  // Tactical Training Endpoints
  app.post("/api/tactical-training/generate-drills", async (req, res) => {
    try {
      const { athleteId, focusAreas, availableTime, difficulty } = req.body;
      
      if (!athleteId || !focusAreas || !availableTime) {
        return res.status(400).json({ error: "athleteId, focusAreas, and availableTime are required" });
      }
      
      const drills = await tacticalTrainingEngine.generateCustomDrills(
        athleteId,
        focusAreas,
        availableTime,
        difficulty || 'intermediate'
      );
      
      res.json({ drills });
    } catch (error) {
      console.error("Error generating tactical drills:", error);
      res.status(500).json({ error: "Failed to generate tactical drills" });
    }
  });

  app.get("/api/tactical-training/quick-start/:athleteId/:category", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      const category = req.params.category;
      
      const drills = await tacticalTrainingEngine.getQuickStartDrills(athleteId, category);
      res.json({ drills });
    } catch (error) {
      console.error("Error getting quick start drills:", error);
      res.status(500).json({ error: "Failed to get quick start drills" });
    }
  });

  app.post("/api/tactical-training/start-session", async (req, res) => {
    try {
      const { athleteId, drills, plannedDuration } = req.body;
      
      if (!athleteId || !drills || !plannedDuration) {
        return res.status(400).json({ error: "athleteId, drills, and plannedDuration are required" });
      }
      
      const sessionId = await tacticalTrainingEngine.startTrainingSession(athleteId, drills, plannedDuration);
      res.json({ sessionId });
    } catch (error) {
      console.error("Error starting training session:", error);
      res.status(500).json({ error: "Failed to start training session" });
    }
  });

  app.get("/api/tactical-training/session-progress/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      const session = await tacticalTrainingEngine.getSessionProgress(athleteId);
      res.json(session);
    } catch (error) {
      console.error("Error getting session progress:", error);
      res.status(500).json({ error: "Failed to get session progress" });
    }
  });

  app.post("/api/tactical-training/complete-step", async (req, res) => {
    try {
      const { athleteId, performance } = req.body;
      
      if (!athleteId || !performance) {
        return res.status(400).json({ error: "athleteId and performance are required" });
      }
      
      const result = await tacticalTrainingEngine.completeCurrentStep(athleteId, performance);
      res.json(result);
    } catch (error) {
      console.error("Error completing training step:", error);
      res.status(500).json({ error: "Failed to complete training step" });
    }
  });

  app.post("/api/tactical-training/end-session/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      
      const summary = await tacticalTrainingEngine.endTrainingSession(athleteId);
      res.json(summary);
    } catch (error) {
      console.error("Error ending training session:", error);
      res.status(500).json({ error: "Failed to end training session" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'get_live_analysis') {
          if (realTimeEngine.isMatchActive()) {
            const analysis = await realTimeEngine.getLiveAnalysis();
            ws.send(JSON.stringify({
              type: 'live_analysis',
              data: analysis
            }));
          }
        }
        
        if (data.type === 'get_suggestions') {
          if (realTimeEngine.isMatchActive()) {
            const suggestions = await realTimeEngine.generateAdaptiveSuggestions();
            ws.send(JSON.stringify({
              type: 'adaptive_suggestions',
              data: suggestions
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Data Population Endpoints - Using OpenAI o3 Model
  app.post("/api/data/populate-authentic", async (req, res) => {
    try {
      console.log("Starting authentic data population using OpenAI o3 model...");
      const result = await populateAuthenticAthleteData();
      
      res.json(result);
    } catch (error) {
      console.error("Error populating authentic data:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to populate authentic data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/data/populate-all-athletes", async (req, res) => {
    try {
      console.log("Starting authentic data population for all athletes...");
      const results = await authenticDataPopulator.populateAllAthleteData();
      
      res.json({
        success: results.success,
        message: `Successfully populated data for ${results.populatedAthletes} athletes`,
        populatedAthletes: results.populatedAthletes,
        errors: results.errors
      });
    } catch (error) {
      console.error("Error populating athlete data:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to populate athlete data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/data/populate-athlete/:athleteId", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      console.log(`Populating authentic data for athlete ID: ${athleteId}`);
      
      const profile = await authenticDataPopulator.populateSpecificAthlete(athleteId);
      
      if (profile) {
        res.json({
          success: true,
          message: `Successfully populated data for ${profile.athleteName}`,
          profile: profile
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Athlete not found or failed to populate data"
        });
      }
    } catch (error) {
      console.error("Error populating specific athlete data:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to populate athlete data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return httpServer;
}
