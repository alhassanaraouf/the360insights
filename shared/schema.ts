import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

// Session storage table for authentication
// This table is required for Replit Auth session management
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"), // User bio/description
  passwordHash: varchar("password_hash"), // For local authentication
  role: varchar("role", { length: 50 }).notNull().default("athlete"), // athlete, org_admin, sponsor, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coaches table
export const coaches = pgTable("coaches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"), // e.g., "Head Coach", "Assistant Coach"
  createdAt: timestamp("created_at").defaultNow(),
});

export const athletes = pgTable("athletes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull(),
  nationality: text("nationality").notNull(),
  gender: varchar("gender", { length: 10 }),
  profileImage: text("profile_image"),
  worldCategory: text("world_category"), // Weight division like "M-54 kg"
  worldPoints: decimal("world_points", { precision: 10, scale: 2 }), // World ranking points
  olympicPoints: decimal("olympic_points", { precision: 10, scale: 2 }), // Olympic ranking points
  playingStyle: text("playing_style"), // AI-generated playing style description
  coachId: integer("coach_id").references(() => coaches.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  worldCategoryIdx: index("athletes_world_category_idx").on(table.worldCategory),
  nationalityIdx: index("athletes_nationality_idx").on(table.nationality),
  nameIdx: index("athletes_name_idx").on(table.name)
}));

export const kpiMetrics = pgTable("kpi_metrics", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").references(() => athletes.id),
  metricName: text("metric_name").notNull(),
  value: decimal("value", { precision: 5, scale: 2 }).notNull(),
  trend: decimal("trend", { precision: 5, scale: 2 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => ({
  athleteIdIdx: index("kpi_metrics_athlete_id_idx").on(table.athleteId),
}));

export const strengths = pgTable("strengths", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").references(() => athletes.id),
  name: text("name").notNull(),
  description: text("description"),
  score: integer("score").notNull(),
}, (table) => ({
  athleteIdIdx: index("strengths_athlete_id_idx").on(table.athleteId),
}));

export const weaknesses = pgTable("weaknesses", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").references(() => athletes.id),
  name: text("name").notNull(),
  description: text("description"),
  score: integer("score").notNull(),
}, (table) => ({
  athleteIdIdx: index("weaknesses_athlete_id_idx").on(table.athleteId),
}));

// Removed opponents table - opponents are now treated as regular athletes

export const athleteRanks = pgTable("athlete_ranks", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  rankingType: varchar("ranking_type", { length: 50 }).notNull(), // 'world' or 'olympic'
  category: text("category").notNull(),
  ranking: integer("ranking").notNull(),
  previousRanking: integer("previous_ranking"),
  rankChange: integer("rank_change"),
  points: decimal("points", { precision: 10, scale: 2 }),
  rankingDate: text("ranking_date")
}, (table) => ({
  athleteIdIdx: index("athlete_ranks_athlete_id_idx").on(table.athleteId),
  rankingTypeIdx: index("athlete_ranks_ranking_type_idx").on(table.rankingType),
  categoryIdx: index("athlete_ranks_category_idx").on(table.category),
  rankingIdx: index("athlete_ranks_ranking_idx").on(table.ranking)
}));

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Competition name (e.g., "Albania Open G2")
  country: text("country").notNull(), // Country/Location
  city: text("city"), // City/Region
  startDate: text("start_date").notNull(), // Competition start date
  endDate: text("end_date"), // Competition end date (optional)
  category: text("category"), // Weight category (e.g., "M-54 kg", "All")
  gradeLevel: text("grade_level"), // G1, G2, etc.
  pointsAvailable: decimal("points_available", { precision: 10, scale: 2 }).notNull(), // Maximum points offered
  competitionType: varchar("competition_type", { length: 50 }).notNull(), // 'world', 'continental', 'national', etc.
  registrationDeadline: text("registration_deadline"), // Registration deadline
  status: varchar("status", { length: 20 }).default("upcoming"), // 'upcoming', 'ongoing', 'completed', 'cancelled'
  simplyCompeteEventId: varchar("simply_compete_event_id", { length: 255 }), // External SimplyCompete event ID
  sourceUrl: text("source_url"), // Full URL to SimplyCompete event page
  logo: text("logo"), // Competition logo URL (stored in Replit Object Storage)
  metadata: jsonb("metadata"), // Full JSON data from SimplyCompete API
  lastSyncedAt: timestamp("last_synced_at"), // Last time this competition was synced from external source
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("simplycompete_id_idx").on(table.simplyCompeteEventId), // Index for faster lookups
]);

export const competitionParticipants = pgTable("competition_participants", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").references(() => competitions.id),
  athleteId: integer("athlete_id").references(() => athletes.id),
  seedNumber: integer("seed_number"), // Tournament seeding position
  weightCategory: varchar("weight_category", { length: 50 }), // e.g., "-68kg", "-57kg"
  registrationDate: timestamp("registration_date").defaultNow(),
  status: varchar("status", { length: 20 }).default("registered"), // 'registered', 'confirmed', 'withdrawn'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  competitionIdIdx: index("competition_participants_competition_id_idx").on(table.competitionId),
  athleteIdIdx: index("competition_participants_athlete_id_idx").on(table.athleteId),
  competitionAthleteUnique: unique().on(table.competitionId, table.athleteId), // Each athlete can only participate once per competition
}));

export const trainingRecommendations = pgTable("training_recommendations", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").references(() => athletes.id),
  drillName: text("drill_name").notNull(),
  description: text("description"),
  expectedUplift: decimal("expected_uplift", { precision: 5, scale: 2 }),
  priority: integer("priority"),
}, (table) => ({
  athleteIdIdx: index("training_recommendations_athlete_id_idx").on(table.athleteId),
}));

export const careerEvents = pgTable("career_events", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").references(() => athletes.id),
  eventType: text("event_type").notNull(), // 'match', 'injury', 'achievement', 'competition'
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  location: text("location"),
  status: text("status"), // 'upcoming', 'completed', 'cancelled'
  competitionLevel: text("competition_level"), // 'national', 'international', 'olympic', 'world_championship'
  eventResult: text("event_result"), // Competition finishing place/result
  metadata: jsonb("metadata"),
}, (table) => ({
  athleteIdIdx: index("career_events_athlete_id_idx").on(table.athleteId),
  dateIdx: index("career_events_date_idx").on(table.date),
}));

export const aiQueries = pgTable("ai_queries", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").references(() => athletes.id),
  query: text("query").notNull(),
  response: text("response").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  athleteIdIdx: index("ai_queries_athlete_id_idx").on(table.athleteId),
  timestampIdx: index("ai_queries_timestamp_idx").on(table.timestamp),
}));

export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").references(() => athletes.id),
  planName: text("plan_name").notNull(),
  startDate: text("start_date").notNull(),
  duration: integer("duration").notNull(), // weeks
  planType: varchar("plan_type", { length: 50 }).notNull(), // 'general', 'competition-prep', etc.
  targetCompetition: text("target_competition"),
  targetWeight: text("target_weight"),
  currentWeight: text("current_weight"),
  microCycles: jsonb("micro_cycles").notNull(), // Array of micro-cycle objects
  overallObjectives: jsonb("overall_objectives"), // Array of objectives
  progressionStrategy: text("progression_strategy"),
  adaptationProtocol: text("adaptation_protocol"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  athleteIdIdx: index("training_plans_athlete_id_idx").on(table.athleteId),
}));

export const userCompetitionPreferences = pgTable("user_competition_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  competitionId: integer("competition_id").notNull(),
  competitionName: varchar("competition_name", { length: 255 }).notNull(),
  competitionType: varchar("competition_type", { length: 100 }),
  location: varchar("location", { length: 255 }),
  dateRange: varchar("date_range", { length: 100 }),
  isSelected: boolean("is_selected").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userCompetitionUnique: unique().on(table.userId, table.competitionId),
}));


// Sponsorship bids table
export const sponsorshipBids = pgTable("sponsorship_bids", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  sponsorUserId: varchar("sponsor_user_id", { length: 255 }).notNull().references(() => users.id),
  fullName: text("full_name").notNull(), // Sponsor's full name
  position: text("position").notNull(), // Sponsor's position/title
  organizationName: text("organization_name").notNull(), // Organization/sponsor name
  contactInfo: text("contact_info").notNull(), // Contact information
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Sponsorship amount
  duration: integer("duration").notNull(), // Duration in months
  visibilityRights: text("visibility_rights").notNull(), // What visibility sponsor gets
  message: text("message"), // Optional message from sponsor
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING, ACCEPTED, REJECTED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  athleteIdIdx: index("sponsorship_bids_athlete_id_idx").on(table.athleteId),
  sponsorUserIdIdx: index("sponsorship_bids_sponsor_user_id_idx").on(table.sponsorUserId),
}));

// Bid settings table for controlling bid acceptance
export const bidSettings = pgTable("bid_settings", {
  id: serial("id").primaryKey(),
  bidsAccepted: boolean("bids_accepted").notNull().default(true), // Whether bids are currently accepted
  rejectionMessage: text("rejection_message"), // Optional message to display when bids are disabled
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rank-up calculation cache table
export const rankUpCalculationCache = pgTable("rank_up_calculation_cache", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  targetRank: integer("target_rank").notNull(),
  rankingType: varchar("ranking_type", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  targetDate: varchar("target_date", { length: 50 }), // Target date for achieving the rank
  currentRank: integer("current_rank").notNull(),
  currentPoints: decimal("current_points", { precision: 10, scale: 2 }).notNull(),
  targetPoints: decimal("target_points", { precision: 10, scale: 2 }).notNull(),
  pointsNeeded: decimal("points_needed", { precision: 10, scale: 2 }).notNull(),
  suggestedCompetitions: jsonb("suggested_competitions").notNull(),
  aiRecommendations: jsonb("ai_recommendations").notNull(),
  aiPrompt: text("ai_prompt"), // Store the AI prompt to show the model's thinking
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate calculations for same parameters
  cacheUnique: unique().on(table.athleteId, table.targetRank, table.rankingType, table.category),
  // Index for faster cache lookups
  athleteRankingIdx: index("athlete_ranking_idx").on(table.athleteId, table.rankingType, table.category),
  expiresAtIdx: index("expires_at_idx").on(table.expiresAt),
}));

// Performance analysis cache table
export const performanceAnalysisCache = pgTable("performance_analysis_cache", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  trend: varchar("trend", { length: 20 }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  keyMetrics: jsonb("key_metrics").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  riskFactors: jsonb("risk_factors").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  athleteUnique: unique().on(table.athleteId),
}));

// Opponent analysis cache table
export const opponentAnalysisCache = pgTable("opponent_analysis_cache", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  opponentId: integer("opponent_id").notNull().references(() => athletes.id),
  weaknessExploitation: jsonb("weakness_exploitation").notNull(),
  tacticalRecommendations: jsonb("tactical_recommendations").notNull(),
  winProbability: integer("win_probability").notNull(),
  keyStrategyPoints: jsonb("key_strategy_points").notNull(),
  mentalPreparation: jsonb("mental_preparation").notNull(),
  technicalFocus: jsonb("technical_focus").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  analysisUnique: unique().on(table.athleteId, table.opponentId),
}));

// Insert schemas
export const insertCoachSchema = createInsertSchema(coaches).omit({
  id: true,
  createdAt: true,
});

export const insertAthleteSchema = createInsertSchema(athletes).omit({
  id: true,
  createdAt: true,
});

export const insertKpiMetricSchema = createInsertSchema(kpiMetrics).omit({
  id: true,
  lastUpdated: true,
});

export const insertStrengthSchema = createInsertSchema(strengths).omit({
  id: true,
});

export const insertWeaknessSchema = createInsertSchema(weaknesses).omit({
  id: true,
});

// Opponent schema removed - opponents are now treated as regular athletes

export const insertAthleteRankSchema = createInsertSchema(athleteRanks).omit({
  id: true,
});

export const insertTrainingRecommendationSchema = createInsertSchema(trainingRecommendations).omit({
  id: true,
});

export const insertCareerEventSchema = createInsertSchema(careerEvents).omit({
  id: true,
});

export const insertAiQuerySchema = createInsertSchema(aiQueries).omit({
  id: true,
  timestamp: true,
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  createdAt: true,
});



export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserCompetitionPreferenceSchema = createInsertSchema(userCompetitionPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompetitionParticipantSchema = createInsertSchema(competitionParticipants).omit({
  id: true,
  registrationDate: true,
  createdAt: true,
});

export const insertRankUpCalculationCacheSchema = createInsertSchema(rankUpCalculationCache).omit({
  id: true,
  createdAt: true,
});

export const insertPerformanceAnalysisCacheSchema = createInsertSchema(performanceAnalysisCache).omit({
  id: true,
  createdAt: true,
});

export const insertOpponentAnalysisCacheSchema = createInsertSchema(opponentAnalysisCache).omit({
  id: true,
  createdAt: true,
});

export const insertSponsorshipBidSchema = createInsertSchema(sponsorshipBids).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBidSettingsSchema = createInsertSchema(bidSettings).omit({
  id: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users);

// Video analysis table for Taekwondo match and clip analysis
export const videoAnalysis = pgTable("video_analysis", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  analysisType: varchar("analysis_type", { length: 20 }).notNull(), // 'match' or 'clip'
  sport: varchar("sport", { length: 50 }).default("Taekwondo"),
  language: varchar("language", { length: 20 }).default("english"),
  
  // Match analysis specific fields
  roundAnalyzed: integer("round_analyzed"), // null for entire match or 'no-rounds'
  matchAnalysis: text("match_analysis"), // Narrative text
  scoreAnalysis: jsonb("score_analysis"), // Score events JSON
  punchAnalysis: jsonb("punch_analysis"), // Punch events JSON
  kickCountAnalysis: jsonb("kick_count_analysis"), // Kick count JSON
  yellowCardAnalysis: jsonb("yellow_card_analysis"), // Violations JSON
  adviceAnalysis: jsonb("advice_analysis"), // Player advice JSON
  
  // Clip analysis specific fields
  userRequest: text("user_request"), // What user wants analyzed
  clipAnalysis: text("clip_analysis"), // Coaching advice text
  
  // Error tracking
  errors: jsonb("errors"), // Track which components had errors
  
  // Metadata
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  videoPath: text("video_path"), // Path to stored video file for playback
  processingTimeMs: integer("processing_time_ms"),
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("video_analysis_user_id_idx").on(table.userId),
  analysisTypeIdx: index("video_analysis_type_idx").on(table.analysisType),
}));

export const insertVideoAnalysisSchema = createInsertSchema(videoAnalysis).omit({
  id: true,
  processedAt: true,
  createdAt: true,
});

// Types
export type Coach = typeof coaches.$inferSelect;
export type InsertCoach = z.infer<typeof insertCoachSchema>;

export type Athlete = typeof athletes.$inferSelect;
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type KpiMetric = typeof kpiMetrics.$inferSelect;
export type InsertKpiMetric = z.infer<typeof insertKpiMetricSchema>;
export type Strength = typeof strengths.$inferSelect;
export type InsertStrength = z.infer<typeof insertStrengthSchema>;
export type Weakness = typeof weaknesses.$inferSelect;
export type InsertWeakness = z.infer<typeof insertWeaknessSchema>;
// Opponent types removed - opponents are now treated as regular athletes
export type AthleteRank = typeof athleteRanks.$inferSelect;
export type InsertAthleteRank = z.infer<typeof insertAthleteRankSchema>;
export type TrainingRecommendation = typeof trainingRecommendations.$inferSelect;
export type InsertTrainingRecommendation = z.infer<typeof insertTrainingRecommendationSchema>;
export type CareerEvent = typeof careerEvents.$inferSelect;
export type InsertCareerEvent = z.infer<typeof insertCareerEventSchema>;
export type AiQuery = typeof aiQueries.$inferSelect;
export type InsertAiQuery = z.infer<typeof insertAiQuerySchema>;
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;

export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertTrainingPlan = z.infer<typeof insertTrainingPlanSchema>;
export type UserCompetitionPreference = typeof userCompetitionPreferences.$inferSelect;
export type InsertUserCompetitionPreference = z.infer<typeof insertUserCompetitionPreferenceSchema>;

export type CompetitionParticipant = typeof competitionParticipants.$inferSelect;
export type InsertCompetitionParticipant = z.infer<typeof insertCompetitionParticipantSchema>;

export type RankUpCalculationCache = typeof rankUpCalculationCache.$inferSelect;
export type InsertRankUpCalculationCache = z.infer<typeof insertRankUpCalculationCacheSchema>;

export type PerformanceAnalysisCache = typeof performanceAnalysisCache.$inferSelect;
export type InsertPerformanceAnalysisCache = z.infer<typeof insertPerformanceAnalysisCacheSchema>;

export type OpponentAnalysisCache = typeof opponentAnalysisCache.$inferSelect;
export type InsertOpponentAnalysisCache = z.infer<typeof insertOpponentAnalysisCacheSchema>;

export type SponsorshipBid = typeof sponsorshipBids.$inferSelect;
export type InsertSponsorshipBid = z.infer<typeof insertSponsorshipBidSchema>;

export type BidSettings = typeof bidSettings.$inferSelect;
export type InsertBidSettings = z.infer<typeof insertBidSettingsSchema>;

export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type VideoAnalysis = typeof videoAnalysis.$inferSelect;
export type InsertVideoAnalysis = z.infer<typeof insertVideoAnalysisSchema>;