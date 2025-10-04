import {

  athletes,
  coaches,
  kpiMetrics,
  strengths,
  weaknesses,
  athleteRanks,
  trainingRecommendations,
  careerEvents,
  aiQueries,
  users,
  type Athlete,
  type InsertAthlete,
  type Coach,
  type InsertCoach,
  type KpiMetric,
  type InsertKpiMetric,
  type Strength,
  type InsertStrength,
  type Weakness,
  type InsertWeakness,
  type AthleteRank,
  type InsertAthleteRank,
  type TrainingRecommendation,
  type InsertTrainingRecommendation,
  type CareerEvent,
  type InsertCareerEvent,
  type AiQuery,
  type InsertAiQuery,
  type TrainingPlan,
  type InsertTrainingPlan,
  type User,
  type Competition,
  type InsertCompetition,
  type UpsertUser,
  type RankUpCalculationCache,
  type InsertRankUpCalculationCache,
  sponsorshipBids,
  type SponsorshipBid,
  type InsertSponsorshipBid,
  competitionParticipants,
  type CompetitionParticipant,
  type InsertCompetitionParticipant,

  competitions,
  trainingPlans,
  rankUpCalculationCache
} from "@shared/schema";
import { eq, and, desc, asc, sql, isNotNull, ne, gte, lte, or, ilike } from "drizzle-orm";
import { db, withRetry } from "./db";
import { getCompetitionRecommendations, type CompetitionRecommendation } from "./openai-service";
// Removed hardcoded data population imports

// Helper function to calculate threat level (example implementation)
function calculateThreatLevel(athleteRank: number | undefined, opponentRank: number | undefined): string {
  if (!athleteRank || !opponentRank) return 'Unknown';
  const rankDiff = Math.abs(athleteRank - opponentRank);
  if (rankDiff <= 3) return 'High';
  if (rankDiff <= 7) return 'Medium';
  if (rankDiff <= 10) return 'Low';
  return 'Unknown';
}

export interface IStorage {
  // User operations (required for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;

  // Athletes
  getAthlete(id: number): Promise<Athlete | undefined>;
  getAllAthletes(): Promise<Athlete[]>;
  getAthletesByCountry(country: string): Promise<Athlete[]>;
  getAthleteStats(sportFilter?: string, egyptOnly?: boolean): Promise<{
    totalAthletes: number;
    worldRankedAthletes: number;
    olympicQualified: number;
  }>;
  getAthletesPaginated(params: {
    searchTerm?: string;
    sportFilter?: string;
    nationalityFilter?: string;
    genderFilter?: string;
    topRankedOnly?: boolean;
    sortBy?: string;
    limit: number;
    offset: number;
  }): Promise<{
    athletes: (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      worldPreviousRank?: number;
      olympicPreviousRank?: number;
      worldRankChange?: number;
      olympicRankChange?: number;
    })[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getAthleteNationalities(sportFilter?: string): Promise<string[]>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;
  updateAthlete(id: number, updates: Partial<InsertAthlete>): Promise<Athlete>;
  deleteAthlete(id: number): Promise<void>;

  // KPI Metrics
  getKpiMetricsByAthleteId(athleteId: number): Promise<KpiMetric[]>;
  createKpiMetric(metric: InsertKpiMetric): Promise<KpiMetric>;

  // Strengths & Weaknesses
  getStrengthsByAthleteId(athleteId: number): Promise<Strength[]>;
  getWeaknessesByAthleteId(athleteId: number): Promise<Weakness[]>;
  createStrength(strength: InsertStrength): Promise<Strength>;
  createWeakness(weakness: InsertWeakness): Promise<Weakness>;
  clearStrengthsByAthleteId(athleteId: number): Promise<void>;
  clearWeaknessesByAthleteId(athleteId: number): Promise<void>;

  // Rankings (now stored in athlete_ranks)

  getAthleteRankings(athleteId: number): Promise<{
    worldRank?: number;
    olympicRank?: number;
    worldCategory?: string;
    olympicCategory?: string;
    worldPreviousRank?: number;
    olympicPreviousRank?: number;
    worldRankChange?: number;
    olympicRankChange?: number;
  }>;
  getAllAthletesWithRankings(): Promise<
    (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      worldPreviousRank?: number;
      olympicPreviousRank?: number;
      worldRankChange?: number;
      olympicRankChange?: number;
    })[]
  >;
  getOpponentsByWeightClass(athleteId: number, limit?: number, offset?: number, searchTerm?: string): Promise<{
    opponents: (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      threatLevel?: string;
    })[];
    total: number;
  }>;
  getAllOpponentsByWeightClass(athleteId: number, limit?: number, offset?: number, searchTerm?: string): Promise<{
    opponents: (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      threatLevel?: string;
    })[];
    total: number;
  }>;


  // Athlete Rankings
  getAthleteRanksByAthleteId(athleteId: number): Promise<AthleteRank[]>;
  createAthleteRank(rank: InsertAthleteRank): Promise<AthleteRank>;

  // Training Recommendations
  getTrainingRecommendationsByAthleteId(
    athleteId: number,
  ): Promise<TrainingRecommendation[]>;
  createTrainingRecommendation(
    recommendation: InsertTrainingRecommendation,
  ): Promise<TrainingRecommendation>;

  // Career Events
  getCareerEventsByAthleteId(athleteId: number): Promise<CareerEvent[]>;
  createCareerEvent(event: InsertCareerEvent): Promise<CareerEvent>;

  // AI Queries
  getAiQueriesByAthleteId(athleteId: number): Promise<AiQuery[]>;
  createAiQuery(query: InsertAiQuery): Promise<AiQuery>;
  deleteAiQuery(id: number): Promise<boolean>;

  // Performance Data (using career events as performance data)
  getPerformanceDataByAthleteId(athleteId: number): Promise<CareerEvent[]>;

  // Competitions
  getAllCompetitions(): Promise<Competition[]>;
  getCompetition(id: number): Promise<Competition | undefined>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  updateCompetition(id: number, updates: Partial<InsertCompetition>): Promise<Competition>;
  deleteCompetition(id: number): Promise<void>;

  // Rank Up functionality
  getCompetitionsByCategory(category?: string, competitionType?: string): Promise<Competition[]>;
  calculateRankUpRequirements(athleteId: number, targetRank: number, rankingType: string, category: string, targetDate?: string): Promise<{
    currentRank: number;
    currentPoints: number;
    targetPoints: number;
    pointsNeeded: number;
    suggestedCompetitions: (Competition & { cumulativePoints: number })[];
    aiRecommendations: CompetitionRecommendation;
  }>;

  // Training Plans
  getTrainingPlansByAthleteId(athleteId: number): Promise<TrainingPlan[]>;
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  getTrainingPlan(id: number): Promise<TrainingPlan | undefined>;
  updateTrainingPlan(
    id: number,
    updates: Partial<InsertTrainingPlan>,
  ): Promise<TrainingPlan>;
  deleteTrainingPlan(id: number): Promise<void>;

  // Sponsorship Bids
  getSponsorshipBidsByAthleteId(athleteId: number): Promise<SponsorshipBid[]>;
  getAllSponsorshipBids(): Promise<SponsorshipBid[]>;
  getSponsorshipBid(id: number): Promise<SponsorshipBid | undefined>;
  createSponsorshipBid(bid: InsertSponsorshipBid): Promise<SponsorshipBid>;
  updateSponsorshipBidStatus(id: number, status: 'PENDING' | 'ACCEPTED' | 'REJECTED'): Promise<SponsorshipBid>;
  getAthletesWithBids(): Promise<(Athlete & { bidsCount: number })[]>;

}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Hardcoded data initialization removed - athletes should be imported via scraper or JSON import
  }

  private async initializeSampleData() {
    // Hardcoded data initialization removed - athletes should be imported via scraper or JSON import
    return;
  }

  private async populateRealData() {
    // Hardcoded data population removed - athletes should be imported via scraper or JSON import
    return;
  }

  // KPI Metrics
  async getKpiMetricsByAthleteId(athleteId: number): Promise<KpiMetric[]> {
    return await db
      .select()
      .from(kpiMetrics)
      .where(eq(kpiMetrics.athleteId, athleteId));
  }

  async createKpiMetric(insertMetric: InsertKpiMetric): Promise<KpiMetric> {
    const [metric] = await db
      .insert(kpiMetrics)
      .values(insertMetric)
      .returning();
    return metric;
  }

  // Strengths & Weaknesses
  async getStrengthsByAthleteId(athleteId: number): Promise<Strength[]> {
    return await db
      .select()
      .from(strengths)
      .where(eq(strengths.athleteId, athleteId));
  }

  async getWeaknessesByAthleteId(athleteId: number): Promise<Weakness[]> {
    return await db
      .select()
      .from(weaknesses)
      .where(eq(weaknesses.athleteId, athleteId));
  }

  async createStrength(insertStrength: InsertStrength): Promise<Strength> {
    const [strength] = await db
      .insert(strengths)
      .values(insertStrength)
      .returning();
    return strength;
  }

  async createWeakness(insertWeakness: InsertWeakness): Promise<Weakness> {
    const [weakness] = await db
      .insert(weaknesses)
      .values(insertWeakness)
      .returning();
    return weakness;
  }

  async clearStrengthsByAthleteId(athleteId: number): Promise<void> {
    await db.delete(strengths).where(eq(strengths.athleteId, athleteId));
  }

  async clearWeaknessesByAthleteId(athleteId: number): Promise<void> {
    await db.delete(weaknesses).where(eq(weaknesses.athleteId, athleteId));
  }

  // Opponents functionality removed - opponents are now treated as regular athletes
  // Performance Data functionality removed - replaced with athlete_ranks table

  // Training Recommendations
  async getTrainingRecommendationsByAthleteId(
    athleteId: number,
  ): Promise<TrainingRecommendation[]> {
    return await db
      .select()
      .from(trainingRecommendations)
      .where(eq(trainingRecommendations.athleteId, athleteId));
  }

  async createTrainingRecommendation(
    insertRec: InsertTrainingRecommendation,
  ): Promise<TrainingRecommendation> {
    const [recommendation] = await db
      .insert(trainingRecommendations)
      .values(insertRec)
      .returning();
    return recommendation;
  }

  // Career Events
  async getCareerEventsByAthleteId(athleteId: number): Promise<CareerEvent[]> {
    const allEvents = await db
      .select()
      .from(careerEvents)
      .where(eq(careerEvents.athleteId, athleteId));

    // Filter to prioritize World Senior Division over Olympic Senior Division
    const eventMap = new Map<string, CareerEvent>();

    for (const event of allEvents) {
      const metadata = event.metadata as any;
      const category = metadata?.category || "";
      const eventKey = `${event.title}_${event.date}_${event.location || ""}`;

      const isWorldDivision = category.includes("World Senior Division");
      const isOlympicDivision = category.includes("Olympic Senior Division");

      const existing = eventMap.get(eventKey);

      if (!existing) {
        // No existing event, add this one
        eventMap.set(eventKey, event);
      } else {
        const existingMetadata = existing.metadata as any;
        const existingCategory = existingMetadata?.category || "";
        const existingIsOlympic = existingCategory.includes(
          "Olympic Senior Division",
        );

        // If current event is World Division and existing is Olympic Division, replace
        if (isWorldDivision && existingIsOlympic) {
          eventMap.set(eventKey, event);
        }
        // If both are the same type or existing is already World Division, keep existing
      }
    }

    return Array.from(eventMap.values());
  }

  async createCareerEvent(
    insertEvent: InsertCareerEvent,
  ): Promise<CareerEvent> {
    const [event] = await db
      .insert(careerEvents)
      .values(insertEvent)
      .returning();
    return event;
  }

  // AI Queries
  async getAiQueriesByAthleteId(athleteId: number): Promise<AiQuery[]> {
    return await db
      .select()
      .from(aiQueries)
      .where(eq(aiQueries.athleteId, athleteId));
  }

  async createAiQuery(insertQuery: InsertAiQuery): Promise<AiQuery> {
    const [query] = await db.insert(aiQueries).values(insertQuery).returning();
    return query;
  }

  async deleteAiQuery(id: number): Promise<boolean> {
    const result = await db.delete(aiQueries).where(eq(aiQueries.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // User operations (required for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const [upsertedUser] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          bio: user.bio,
          profileImageUrl: user.profileImageUrl,
          passwordHash: user.passwordHash,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Athletes
  async getAthlete(id: number): Promise<Athlete | undefined> {
    const [athlete] = await db
      .select()
      .from(athletes)
      .where(eq(athletes.id, id));
    return athlete || undefined;
  }

  async getAllAthletes(): Promise<Athlete[]> {
    try {
      console.log("DatabaseStorage: Starting getAllAthletes query...");
      const result = await withRetry(() => db.select().from(athletes));
      console.log("DatabaseStorage: Successfully retrieved", result.length, "athletes");
      return result;
    } catch (error) {
      console.error("DatabaseStorage: Error in getAllAthletes:", error);
      throw error;
    }
  }

  async getAthletesByCountry(country: string): Promise<Athlete[]> {
    try {
      console.log(`DatabaseStorage: Getting athletes for country: ${country}`);
      const result = await withRetry(() =>
        db.select()
          .from(athletes)
          .where(eq(athletes.nationality, country))
      );
      console.log(`DatabaseStorage: Found ${result.length} athletes from ${country}`);
      return result;
    } catch (error) {
      console.error(`DatabaseStorage: Error getting athletes by country:`, error);
      throw error;
    }
  }

  async getAthleteStats(sportFilter?: string, egyptOnly?: boolean): Promise<{
    totalAthletes: number;
    worldRankedAthletes: number;
    olympicQualified: number;
  }> {
    // Build base query conditions
    const conditions = [];

    if (sportFilter) {
      const sportName = sportFilter === 'taekwondo' ? 'Taekwondo' :
                       sportFilter === 'karate' ? 'Karate' : sportFilter;
      conditions.push(eq(athletes.sport, sportName));
    }

    if (egyptOnly) {
      conditions.push(eq(athletes.nationality, 'Egypt'));
    }

    // Get total athletes count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(athletes)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get world ranked athletes count
    const worldRankedResult = await db
      .select({ count: sql<number>`count(DISTINCT ${athletes.id})` })
      .from(athletes)
      .innerJoin(athleteRanks, eq(athletes.id, athleteRanks.athleteId))
      .where(and(
        eq(athleteRanks.rankingType, 'world'),
        isNotNull(athleteRanks.ranking),
        ...(conditions.length > 0 ? conditions : [])
      ));

    // Get Olympic qualified athletes count
    const olympicResult = await db
      .select({ count: sql<number>`count(DISTINCT ${athletes.id})` })
      .from(athletes)
      .innerJoin(athleteRanks, eq(athletes.id, athleteRanks.athleteId))
      .where(and(
        eq(athleteRanks.rankingType, 'olympic'),
        isNotNull(athleteRanks.ranking),
        ...(conditions.length > 0 ? conditions : [])
      ));

    return {
      totalAthletes: totalResult[0]?.count || 0,
      worldRankedAthletes: worldRankedResult[0]?.count || 0,
      olympicQualified: olympicResult[0]?.count || 0,
    };
  }

  async getAthletesPaginated(params: {
    searchTerm?: string;
    sportFilter?: string;
    nationalityFilter?: string;
    genderFilter?: string;
    topRankedOnly?: boolean;
    sortBy?: string;
    limit: number;
    offset: number;
  }): Promise<{
    athletes: (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      worldPreviousRank?: number;
      olympicPreviousRank?: number;
      worldRankChange?: number;
      olympicRankChange?: number;
    })[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { searchTerm, sportFilter, nationalityFilter, genderFilter, topRankedOnly, sortBy, limit, offset } = params;

    // Build query conditions
    const conditions = [];

    if (sportFilter) {
      const sportName = sportFilter === 'taekwondo' ? 'Taekwondo' :
                       sportFilter === 'karate' ? 'Karate' : sportFilter;
      conditions.push(eq(athletes.sport, sportName));
    }

    if (nationalityFilter && nationalityFilter !== 'all') {
      conditions.push(eq(athletes.nationality, nationalityFilter));
    }

    if (genderFilter && genderFilter !== 'all') {
      conditions.push(eq(athletes.gender, genderFilter));
    }

    if (searchTerm) {
      conditions.push(
        sql`(${athletes.name} ILIKE ${`%${searchTerm}%`} OR ${athletes.nationality} ILIKE ${`%${searchTerm}%`})`
      );
    }

    // Get ALL athletes matching filters (we'll sort and paginate after adding rankings)
    let allAthletesList = await db
      .select()
      .from(athletes)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get rankings for ALL athletes (needed for sorting and topRankedOnly filter)
    const batchSize = 50;
    const athletesWithRankings: (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      worldPreviousRank?: number;
      olympicPreviousRank?: number;
      worldRankChange?: number;
      olympicRankChange?: number;
    })[] = [];

    for (let i = 0; i < allAthletesList.length; i += batchSize) {
      const batch = allAthletesList.slice(i, i + batchSize);
      const batchWithRankings = await Promise.all(
        batch.map(async (athlete) => {
          const rankings = await this.getAthleteRankings(athlete.id);
          return { ...athlete, ...rankings };
        })
      );
      athletesWithRankings.push(...batchWithRankings);
    }

    // Handle topRankedOnly filter
    let filteredAthletes = athletesWithRankings;
    if (topRankedOnly) {
      filteredAthletes = athletesWithRankings.filter(
        athlete => athlete.worldRank && athlete.worldRank <= 10
      );
    }

    // Apply sorting to ALL filtered athletes
    if (sortBy === 'rank') {
      filteredAthletes.sort((a, b) => {
        const aRank = a.worldRank || 9999;
        const bRank = b.worldRank || 9999;
        return aRank - bRank;
      });
    } else if (sortBy === 'olympicRank') {
      filteredAthletes.sort((a, b) => {
        const aRank = a.olympicRank || 9999;
        const bRank = b.olympicRank || 9999;
        return aRank - bRank;
      });
    } else if (sortBy === 'nationality') {
      filteredAthletes.sort((a, b) => a.nationality.localeCompare(b.nationality));
    } else if (sortBy === 'winRate') {
      filteredAthletes.sort((a, b) => {
        const aRate = parseFloat(a.winRate || '0');
        const bRate = parseFloat(b.winRate || '0');
        return bRate - aRate;
      });
    } else {
      // Default: sort by name (A-Z)
      filteredAthletes.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Calculate totals after filtering
    const total = filteredAthletes.length;
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Apply pagination to sorted results
    const paginatedAthletes = filteredAthletes.slice(offset, offset + limit);

    return {
      athletes: paginatedAthletes,
      total,
      page: currentPage,
      totalPages,
    };
  }

  async getAthleteNationalities(sportFilter?: string): Promise<string[]> {
    const conditions = [];

    if (sportFilter) {
      const sportName = sportFilter === 'taekwondo' ? 'Taekwondo' :
                       sportFilter === 'karate' ? 'Karate' : sportFilter;
      conditions.push(eq(athletes.sport, sportName));
    }

    const result = await db
      .selectDistinct({ nationality: athletes.nationality })
      .from(athletes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(athletes.nationality));

    return result.map(row => row.nationality).filter(Boolean);
  }

  async createAthlete(athlete: InsertAthlete): Promise<Athlete> {
    const [newAthlete] = await db.insert(athletes).values(athlete).returning();
    return newAthlete;
  }

  async updateAthlete(
    id: number,
    updates: Partial<InsertAthlete>,
  ): Promise<Athlete> {
    const [athlete] = await db
      .update(athletes)
      .set(updates)
      .where(eq(athletes.id, id))
      .returning();
    return athlete;
  }

  async deleteAthlete(id: number): Promise<void> {
    // Delete related data first (cascade delete)
    await Promise.all([
      db.delete(kpiMetrics).where(eq(kpiMetrics.athleteId, id)),
      db.delete(strengths).where(eq(strengths.athleteId, id)),
      db.delete(weaknesses).where(eq(weaknesses.athleteId, id)),
      db.delete(athleteRanks).where(eq(athleteRanks.athleteId, id)),
      db.delete(careerEvents).where(eq(careerEvents.athleteId, id)),
      db
        .delete(trainingRecommendations)
        .where(eq(trainingRecommendations.athleteId, id)),
      db.delete(aiQueries).where(eq(aiQueries.athleteId, id)),
    ]);

    // Finally delete the athlete
    await db.delete(athletes).where(eq(athletes.id, id));
  }

  // Rankings (now stored in athlete_ranks)
  async getAthleteRankings(athleteId: number): Promise<{
    worldRank?: number;
    olympicRank?: number;
    worldCategory?: string;
    olympicCategory?: string;
    worldPreviousRank?: number;
    olympicPreviousRank?: number;
    worldRankChange?: number;
    olympicRankChange?: number;
  }> {
    const worldRankingData = await db
      .select()
      .from(athleteRanks)
      .where(
        and(
          eq(athleteRanks.athleteId, athleteId),
          eq(athleteRanks.rankingType, "world"),
        ),
      )
      .orderBy(desc(athleteRanks.rankingDate))
      .limit(1);

    const olympicRankingData = await db
      .select()
      .from(athleteRanks)
      .where(
        and(
          eq(athleteRanks.athleteId, athleteId),
          eq(athleteRanks.rankingType, "olympic"),
        ),
      )
      .orderBy(desc(athleteRanks.rankingDate))
      .limit(1);

    // Compute previous ranks when missing (fallback: ranking + rank_change)
    const worldPreviousRank = worldRankingData[0]?.previousRanking ||
      (worldRankingData[0]?.ranking && worldRankingData[0]?.rankChange
        ? worldRankingData[0].ranking + worldRankingData[0].rankChange
        : undefined);

    const olympicPreviousRank = olympicRankingData[0]?.previousRanking ||
      (olympicRankingData[0]?.ranking && olympicRankingData[0]?.rankChange
        ? olympicRankingData[0].ranking + olympicRankingData[0].rankChange
        : undefined);

    return {
      worldRank: worldRankingData[0]?.ranking,
      olympicRank: olympicRankingData[0]?.ranking,
      worldCategory: worldRankingData[0]?.category || undefined,
      olympicCategory: olympicRankingData[0]?.category || undefined,
      worldPreviousRank,
      olympicPreviousRank,
      worldRankChange: worldRankingData[0]?.rankChange || undefined,
      olympicRankChange: olympicRankingData[0]?.rankChange || undefined,
    };
  }


  async getAllAthletesWithRankings(): Promise<
    (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      worldPreviousRank?: number;
      olympicPreviousRank?: number;
      worldRankChange?: number;
      olympicRankChange?: number;
    })[]
  > {

    const athletesList = await this.getAllAthletes();

    // Process athletes in batches to avoid overwhelming the database connection pool
    const batchSize = 10;
    const athletesWithRankings: (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      worldPreviousRank?: number;
      olympicPreviousRank?: number;
      worldRankChange?: number;
      olympicRankChange?: number;
    })[] = [];

    for (let i = 0; i < athletesList.length; i += batchSize) {
      const batch = athletesList.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (athlete) => {
          try {
            const rankings = await this.getAthleteRankings(athlete.id);
            return {
              ...athlete,
              worldRank: rankings.worldRank,
              olympicRank: rankings.olympicRank,
              worldCategory:
                rankings.worldCategory || athlete.worldCategory || undefined,
              olympicCategory: rankings.olympicCategory || undefined,
              worldPreviousRank: rankings.worldPreviousRank,
              olympicPreviousRank: rankings.olympicPreviousRank,
              worldRankChange: rankings.worldRankChange,
              olympicRankChange: rankings.olympicRankChange,
            } as Athlete & {
              worldRank?: number;
              olympicRank?: number;
              worldCategory?: string;
              olympicCategory?: string;
              worldPreviousRank?: number;
              olympicPreviousRank?: number;
              worldRankChange?: number;
              olympicRankChange?: number;
            };
          } catch (error) {
            console.error(`Error fetching rankings for athlete ${athlete.id}:`, error);
            // Return athlete without rankings if there's an error
            return {
              ...athlete,
              worldRank: undefined,
              olympicRank: undefined,
              worldCategory: athlete.worldCategory || undefined,
              olympicCategory: undefined,
              worldPreviousRank: undefined,
              olympicPreviousRank: undefined,
              worldRankChange: undefined,
              olympicRankChange: undefined,
            } as Athlete & {
              worldRank?: number;
              olympicRank?: number;
              worldCategory?: string;
              olympicCategory?: string;
              worldPreviousRank?: number;
              olympicPreviousRank?: number;
              worldRankChange?: number;
              olympicRankChange?: number;
            };
          }
        })
      );
      athletesWithRankings.push(...batchResults);

      // Small delay between batches to prevent connection spam
      if (i + batchSize < athletesList.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return athletesWithRankings;
  }



  async getOpponentsByWeightClass(athleteId: number, limit: number = 20, offset: number = 0, searchTerm?: string): Promise<{
    opponents: (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      threatLevel?: string;
    })[];
    total: number;
  }> {
    try {
      const athlete = await db.select().from(athletes).where(eq(athletes.id, athleteId)).limit(1);

      if (!athlete || athlete.length === 0) {
        return { opponents: [], total: 0 };
      }

      const athleteData = athlete[0];
      const athleteRanks = await db.select().from(athleteRanks)
        .where(eq(athleteRanks.athleteId, athleteId))
        .limit(1);

      const worldRank = athleteRanks.find(rank => rank.rankingType === 'world');

      if (!worldRank || !athleteData.worldCategory) {
        return { opponents: [], total: 0 };
      }

      const athleteRanking = worldRank.ranking;
      const minRank = Math.max(1, athleteRanking - 10);
      const maxRank = athleteRanking + 10;

      // Build optimized query with JOIN
      let query = db
        .select({
          id: athletes.id,
          name: athletes.name,
          nationality: athletes.nationality,
          worldCategory: athletes.worldCategory,
          olympicCategory: athletes.olympicCategory,
          profileImage: athletes.profileImage,
          playingStyle: athletes.playingStyle,
          worldRank: athleteRanks.ranking
        })
        .from(athletes)
        .innerJoin(athleteRanks, and(
          eq(athleteRanks.athleteId, athletes.id),
          eq(athleteRanks.rankingType, 'world')
        ))
        .where(and(
          eq(athletes.worldCategory, athleteData.worldCategory),
          ne(athletes.id, athleteId),
          gte(athleteRanks.ranking, minRank),
          lte(athleteRanks.ranking, maxRank)
        ));

      // Add search filter if provided
      if (searchTerm && searchTerm.trim()) {
        query = query.where(
          or(
            ilike(athletes.name, `%${searchTerm}%`),
            ilike(athletes.nationality, `%${searchTerm}%`)
          )
        );
      }

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(athletes)
        .innerJoin(athleteRanks, and(
          eq(athleteRanks.athleteId, athletes.id),
          eq(athleteRanks.rankingType, 'world')
        ))
        .where(and(
          eq(athletes.worldCategory, athleteData.worldCategory),
          ne(athletes.id, athleteId),
          gte(athleteRanks.ranking, minRank),
          lte(athleteRanks.ranking, maxRank)
        ));

      const [totalResult, opponents] = await Promise.all([
        countQuery,
        query.orderBy(asc(athleteRanks.ranking)).limit(limit).offset(offset)
      ]);

      const total = totalResult[0]?.count || 0;

      const opponentsWithThreat = opponents.map(opponent => ({
        ...opponent,
        threatLevel: calculateThreatLevel(athleteRanking, opponent.worldRank)
      }));

      return { opponents: opponentsWithThreat, total };
    } catch (error) {
      console.error("Error fetching opponents by weight class:", error);
      return { opponents: [], total: 0 };
    }
  }

  async getAllOpponentsByWeightClass(athleteId: number, limit: number = 20, offset: number = 0, searchTerm?: string): Promise<{
    opponents: (Athlete & {
      worldRank?: number;
      olympicRank?: number;
      worldCategory?: string;
      olympicCategory?: string;
      threatLevel?: string;
    })[];
    total: number;
  }> {
    try {
      const athlete = await db.select().from(athletes).where(eq(athletes.id, athleteId)).limit(1);

      if (!athlete || athlete.length === 0) {
        return { opponents: [], total: 0 };
      }

      const athleteData = athlete[0];

      if (!athleteData.worldCategory) {
        return { opponents: [], total: 0 };
      }

      // Build optimized query with JOIN
      let query = db
        .select({
          id: athletes.id,
          name: athletes.name,
          nationality: athletes.nationality,
          worldCategory: athletes.worldCategory,
          olympicCategory: athletes.olympicCategory,
          profileImage: athletes.profileImage,
          playingStyle: athletes.playingStyle,
          worldRank: athleteRanks.ranking
        })
        .from(athletes)
        .leftJoin(athleteRanks, and(
          eq(athleteRanks.athleteId, athletes.id),
          eq(athleteRanks.rankingType, 'world')
        ))
        .where(and(
          eq(athletes.worldCategory, athleteData.worldCategory),
          ne(athletes.id, athleteId)
        ));

      // Add search filter if provided
      if (searchTerm && searchTerm.trim()) {
        query = query.where(
          or(
            ilike(athletes.name, `%${searchTerm}%`),
            ilike(athletes.nationality, `%${searchTerm}%`)
          )
        );
      }

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(athletes)
        .where(and(
          eq(athletes.worldCategory, athleteData.worldCategory),
          ne(athletes.id, athleteId)
        ));

      const [totalResult, opponents] = await Promise.all([
        countQuery,
        query.orderBy(asc(athleteRanks.ranking)).limit(limit).offset(offset)
      ]);

      const total = totalResult[0]?.count || 0;

      const opponentsWithThreat = opponents.map(opponent => ({
        ...opponent,
        threatLevel: opponent.worldRank ? calculateThreatLevel(
          athleteData.worldRank || 999,
          opponent.worldRank
        ) : 'Unknown'
      }));

      return { opponents: opponentsWithThreat, total };
    } catch (error) {
      console.error("Error fetching all opponents by weight class:", error);
      return { opponents: [], total: 0 };
    }
  }

  private isMatchingWeightClass(category1: string, category2: string): boolean {
    // Direct match
    if (category1 === category2) return true;

    // Extract weight and gender from categories like "M-68 kg", "W+67 kg"
    const parseCategory = (cat: string) => {
      const match = cat.match(/([MW])([+-]?)(\d+)\s*kg/i);
      if (!match) return null;
      return {
        gender: match[1].toUpperCase(),
        modifier: match[2] || "",
        weight: parseInt(match[3]),
      };
    };

    const parsed1 = parseCategory(category1);
    const parsed2 = parseCategory(category2);

    if (!parsed1 || !parsed2) return false;

    // Must be same gender
    if (parsed1.gender !== parsed2.gender) return false;

    // Only match exact weights, but allow different modifiers (+ vs -)
    // This handles cases like "M-80 kg" matching "M+80 kg"
    if (parsed1.weight === parsed2.weight) {
      return true;
    }

    return false;
  }

  // Athlete Rankings
  async getAthleteRanksByAthleteId(athleteId: number): Promise<AthleteRank[]> {
    return await db
      .select()
      .from(athleteRanks)
      .where(eq(athleteRanks.athleteId, athleteId));
  }

  async createAthleteRank(rank: InsertAthleteRank): Promise<AthleteRank> {
    const [newRank] = await db.insert(athleteRanks).values(rank).returning();
    return newRank;
  }

  // Performance Data implementation (using career events)
  async getPerformanceDataByAthleteId(
    athleteId: number,
  ): Promise<CareerEvent[]> {
    return await this.getCareerEventsByAthleteId(athleteId);
  }


  // Competitions
  async getAllCompetitions(): Promise<Competition[]> {
    return await db.select().from(competitions);
  }

  async getCompetition(id: number): Promise<Competition | undefined> {
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
    return competition;
  }

  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    const [newCompetition] = await db.insert(competitions).values(competition).returning();
    return newCompetition;
  }

  async updateCompetition(id: number, updates: Partial<InsertCompetition>): Promise<Competition> {
    const [updatedCompetition] = await db
      .update(competitions)
      .set(updates)
      .where(eq(competitions.id, id))
      .returning();
    return updatedCompetition;
  }

  async deleteCompetition(id: number): Promise<void> {
    await db.delete(competitions).where(eq(competitions.id, id));
  }

  async getCompetitionsByCategory(category?: string, competitionType?: string): Promise<(Competition & { date: string; eventType: string })[]> {
    let results;
    if (category && competitionType) {
      results = await db
        .select()
        .from(competitions)
        .where(and(
          eq(competitions.category, category),
          eq(competitions.competitionType, competitionType)
        ))
        .orderBy(desc(competitions.pointsAvailable));
    } else if (category) {
      results = await db
        .select()
        .from(competitions)
        .where(eq(competitions.category, category))
        .orderBy(desc(competitions.pointsAvailable));
    } else if (competitionType) {
      results = await db
        .select()
        .from(competitions)
        .where(eq(competitions.competitionType, competitionType))
        .orderBy(desc(competitions.pointsAvailable));
    } else {
      results = await db
        .select()
        .from(competitions)
        .orderBy(desc(competitions.pointsAvailable));
    }

    // Add backward compatibility fields that frontend expects
    return results.map(comp => ({
      ...comp,
      date: comp.startDate, // Frontend expects 'date' field
      eventType: 'competition', // Frontend filters by eventType
      title: comp.name, // Frontend expects 'title' instead of 'name'
      location: comp.city && comp.country ? `${comp.city}, ${comp.country}` : (comp.city || comp.country || 'TBD'), // Frontend expects combined 'location'
      competitionLevel: comp.competitionType || 'international' // Frontend expects 'competitionLevel'
    }));
  }

  // Competition Participants
  async getCompetitionsWithParticipantCount(): Promise<(Competition & { participantCount: number })[]> {
    const results = await db
      .select({
        id: competitions.id,
        name: competitions.name,
        country: competitions.country,
        city: competitions.city,
        startDate: competitions.startDate,
        endDate: competitions.endDate,
        category: competitions.category,
        gradeLevel: competitions.gradeLevel,
        pointsAvailable: competitions.pointsAvailable,
        competitionType: competitions.competitionType,
        registrationDeadline: competitions.registrationDeadline,
        status: competitions.status,
        createdAt: competitions.createdAt,
        simplyCompeteEventId: competitions.simplyCompeteEventId,
        participantCount: sql<number>`cast(count(${competitionParticipants.id}) as integer)`,
      })
      .from(competitions)
      .leftJoin(competitionParticipants, eq(competitions.id, competitionParticipants.competitionId))
      .groupBy(competitions.id)
      .orderBy(desc(competitions.startDate));

    return results;
  }

  async getCompetitionParticipants(competitionId: number): Promise<(CompetitionParticipant & { athlete: Athlete })[]> {
    const results = await db
      .select({
        id: competitionParticipants.id,
        competitionId: competitionParticipants.competitionId,
        athleteId: competitionParticipants.athleteId,
        seedNumber: competitionParticipants.seedNumber,
        weightCategory: competitionParticipants.weightCategory,
        registrationDate: competitionParticipants.registrationDate,
        status: competitionParticipants.status,
        createdAt: competitionParticipants.createdAt,
        athlete: athletes,
      })
      .from(competitionParticipants)
      .innerJoin(athletes, eq(competitionParticipants.athleteId, athletes.id))
      .where(eq(competitionParticipants.competitionId, competitionId))
      .orderBy(competitionParticipants.seedNumber, athletes.name);

    return results;
  }

  async addCompetitionParticipant(participant: InsertCompetitionParticipant): Promise<CompetitionParticipant> {
    const [newParticipant] = await db
      .insert(competitionParticipants)
      .values(participant)
      .returning();
    return newParticipant;
  }

  async removeCompetitionParticipant(competitionId: number, athleteId: number): Promise<void> {
    await db
      .delete(competitionParticipants)
      .where(and(
        eq(competitionParticipants.competitionId, competitionId),
        eq(competitionParticipants.athleteId, athleteId)
      ));
  }

  async calculateRankUpRequirements(athleteId: number, targetRank: number, rankingType: string, category: string, targetDate?: string): Promise<{
    currentRank: number;
    currentPoints: number;
    targetPoints: number;
    pointsNeeded: number;
    suggestedCompetitions: (Competition & { cumulativePoints: number })[];
    aiRecommendations: CompetitionRecommendation;
  }> {
    // Check for cached result first
    const [cachedResult] = await db
      .select()
      .from(rankUpCalculationCache)
      .where(and(
        eq(rankUpCalculationCache.athleteId, athleteId),
        eq(rankUpCalculationCache.targetRank, targetRank),
        eq(rankUpCalculationCache.rankingType, rankingType),
        eq(rankUpCalculationCache.category, category)
      ))
      .orderBy(desc(rankUpCalculationCache.createdAt))
      .limit(1);

    // Check if cache exists and is not expired
    if (cachedResult && cachedResult.expiresAt > new Date()) {
      console.log(`Using cached rank-up calculation for athlete ${athleteId}`);
      return {
        currentRank: cachedResult.currentRank,
        currentPoints: Number(cachedResult.currentPoints),
        targetPoints: Number(cachedResult.targetPoints),
        pointsNeeded: Number(cachedResult.pointsNeeded),
        suggestedCompetitions: cachedResult.suggestedCompetitions as (Competition & { cumulativePoints: number })[],
        aiRecommendations: cachedResult.aiRecommendations as CompetitionRecommendation
      };
    }

    console.log(`Calculating new rank-up requirements for athlete ${athleteId}`);

    // First, get athlete's points from the main athletes table
    const [athlete] = await db
      .select()
      .from(athletes)
      .where(eq(athletes.id, athleteId))
      .limit(1);

    if (!athlete) {
      throw new Error(`Athlete ${athleteId} not found`);
    }

    // Get current athlete's ranking for the specified category and type
    const [currentRanking] = await db
      .select()
      .from(athleteRanks)
      .where(and(
        eq(athleteRanks.athleteId, athleteId),
        eq(athleteRanks.rankingType, rankingType),
        eq(athleteRanks.category, category)
      ))
      .orderBy(desc(athleteRanks.rankingDate))
      .limit(1);

    if (!currentRanking) {
      throw new Error(`No ranking found for athlete ${athleteId} in ${rankingType} ${category}`);
    }

    // Get points from athlete_ranks table first (specific to category), then fallback to athletes table
    let currentPoints = 0;
    if (currentRanking.points) {
      // Use points from athlete_ranks table (category-specific)
      currentPoints = Number(currentRanking.points);
      console.log(`✅ Using category-specific points from athlete_ranks: ${currentPoints} points for rank #${currentRanking.ranking}`);
    } else if (rankingType === 'world' && athlete.worldPoints) {
      // Fallback to overall world points
      currentPoints = Number(athlete.worldPoints);
      console.log(`⚠️ Using overall world points as fallback: ${currentPoints} points for rank #${currentRanking.ranking}`);
    } else if (rankingType === 'olympic' && athlete.olympicPoints) {
      // Fallback to overall olympic points
      currentPoints = Number(athlete.olympicPoints);
      console.log(`⚠️ Using overall olympic points as fallback: ${currentPoints} points for rank #${currentRanking.ranking}`);
    } else {
      throw new Error(`No points data available for athlete ${athleteId} in ${rankingType} rankings. Points data is required for rank-up calculations.`);
    }

    console.log(`🔍 Current ranking data:`, {
      athleteId,
      ranking: currentRanking.ranking,
      points: currentRanking.points,
      estimatedPoints: currentPoints,
      pointsType: typeof currentRanking.points,
      rankingType,
      category
    });

    // Get target rank's points by finding the athlete at that rank with actual points data
    const [targetRanking] = await db
      .select()
      .from(athleteRanks)
      .where(and(
        eq(athleteRanks.rankingType, rankingType),
        eq(athleteRanks.category, category),
        isNotNull(athleteRanks.points) // Only get records that have points data
      ))
      .orderBy(sql`ABS(${athleteRanks.ranking} - ${targetRank})`) // Order by proximity to target rank
      .limit(1);

    let targetPoints = 0;

    if (!targetRanking) {
      console.log(`❌ No athlete with points found at target rank ${targetRank} in ${category} ${rankingType}`);

      // Try to find the closest ranked athlete with points data for better estimation
      const [closestAthleteWithPoints] = await db
        .select()
        .from(athleteRanks)
        .where(and(
          eq(athleteRanks.rankingType, rankingType),
          eq(athleteRanks.category, category),
          isNotNull(athleteRanks.points)
        ))
        .orderBy(sql`ABS(${athleteRanks.ranking} - ${targetRank})`)
        .limit(1);

      if (closestAthleteWithPoints && closestAthleteWithPoints.points) {
        // Use linear interpolation based on closest athlete with points
        const closestPoints = Number(closestAthleteWithPoints.points);
        const closestRank = closestAthleteWithPoints.ranking;
        const rankDifference = targetRank - closestRank;

        // Estimate: each rank improvement typically requires 15% more points
        const pointsMultiplier = rankDifference < 0 ? 1.15 : 0.85; // Higher rank = more points needed
        targetPoints = Math.max(1, closestPoints * Math.pow(pointsMultiplier, Math.abs(rankDifference)));

        console.log(`📊 Estimated target points: ${targetPoints.toFixed(1)} (based on closest athlete with points: rank ${closestRank} = ${closestPoints} points)`);
      } else {
        // Last resort: simple estimation based on current athlete
        const rankDifference = currentRanking.ranking - targetRank;
        targetPoints = currentPoints + (rankDifference * 5); // Conservative 5 points per rank
        console.log(`📊 Fallback estimated target points: ${targetPoints} (no athletes with points found in category)`);
      }
    } else {
      // Use actual points from target athlete's JSON import data
      targetPoints = targetRanking.points ? Number(targetRanking.points) : 0;
      console.log(`✅ Found actual target points from JSON import: ${targetPoints} points for rank #${targetRank}`);
    }

    // Calculate points needed: (target rank points - current points) + 10
    const pointsNeeded = Math.max(0, (targetPoints - currentPoints) + 10);

    console.log(`🧮 Points calculation:`, {
      currentPoints,
      targetPoints,
      difference: targetPoints - currentPoints,
      pointsNeeded,
      formula: `(${targetPoints} - ${currentPoints}) + 10 = ${pointsNeeded}`
    });

    // Get suitable competitions that can provide enough points
    let availableCompetitions = await this.getCompetitionsByCategory(category);
    console.log(`Found ${availableCompetitions.length} competitions for category: ${category}`);

    // If no competitions found for specific category, get all competitions as fallback
    if (availableCompetitions.length === 0) {
      console.log(`No competitions found for category ${category}, getting all competitions as fallback`);
      availableCompetitions = await this.getCompetitionsByCategory();
      console.log(`Fallback: Found ${availableCompetitions.length} total competitions`);
    }

    // Filter for upcoming competitions only
    const upcomingCompetitions = availableCompetitions.filter(comp => comp.status === 'upcoming');
    console.log(`Filtered to ${upcomingCompetitions.length} upcoming competitions`);

    // Get AI recommendations for strategic competition planning (primary approach)
    let aiRecommendations: CompetitionRecommendation;
    let suggestedCompetitions: (Competition & { cumulativePoints: number })[] = [];

    try {
      aiRecommendations = await getCompetitionRecommendations(
        upcomingCompetitions,
        pointsNeeded,
        currentRanking.ranking,
        targetRank,
        category,
        rankingType,
        targetDate
      );

      // Convert AI recommendations to suggestedCompetitions format
      // Match by name since AI doesn't know the correct database IDs
      suggestedCompetitions = aiRecommendations.priorityCompetitions.map(aiComp => {
        const fullCompetition = upcomingCompetitions.find(comp => comp.name === aiComp.name);
        if (fullCompetition) {
          return {
            ...fullCompetition,
            cumulativePoints: aiComp.points // Use AI's realistic point calculation
          };
        }
        console.warn(`Could not find competition: ${aiComp.name}`);
        return null;
      }).filter(Boolean) as (Competition & { cumulativePoints: number })[];

      console.log(`Converted ${suggestedCompetitions.length} AI recommendations to suggested competitions`);

    } catch (error) {
      console.warn("AI recommendations failed, using algorithmic fallback:", error);
      // Fallback to algorithmic approach when AI fails
      const fallbackCompetitions = this.findOptimalCompetitions(upcomingCompetitions, pointsNeeded);
      suggestedCompetitions = fallbackCompetitions;

      // Provide a safe fallback when AI fails
      aiRecommendations = {
        strategy: "Basic strategy: Focus on highest-point competitions that fit your schedule and training level.",
        priorityCompetitions: fallbackCompetitions.slice(0, 3).map(comp => ({
          competitionId: comp.id,
          name: comp.name,
          points: Number(comp.pointsAvailable),
          reasoning: `High-value competition offering ${comp.pointsAvailable} points`,
          rank_needed: "Top 3 finish recommended",
          startDate: comp.startDate,
          endDate: comp.endDate || comp.startDate
        })),
        totalPointsFromRecommendations: fallbackCompetitions.slice(0, 3).reduce((sum, comp) => sum + Number(comp.pointsAvailable), 0),
        timelineToTarget: "6-12 months depending on competition schedule",
        riskAssessment: "Moderate risk - success depends on consistent performance",
        alternativeStrategies: ["Focus on local competitions first", "Consider lower-tier events for guaranteed points"]
      };
    }

    const result = {
      currentRank: currentRanking.ranking,
      currentPoints,
      targetPoints,
      pointsNeeded,
      suggestedCompetitions,
      aiRecommendations
    };

    // Cache the result for 1 month
    try {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1); // 1 month from now

      await db.insert(rankUpCalculationCache).values({
        athleteId,
        targetRank,
        rankingType,
        category,
        currentRank: currentRanking.ranking,
        currentPoints: currentPoints.toString(),
        targetPoints: targetPoints.toString(),
        pointsNeeded: pointsNeeded.toString(),
        suggestedCompetitions: suggestedCompetitions as any,
        aiRecommendations: aiRecommendations as any,
        expiresAt: expirationDate
      }).onConflictDoUpdate({
        target: [
          rankUpCalculationCache.athleteId,
          rankUpCalculationCache.targetRank,
          rankUpCalculationCache.rankingType,
          rankUpCalculationCache.category
        ],
        set: {
          currentRank: currentRanking.ranking,
          currentPoints: currentPoints.toString(),
          targetPoints: targetPoints.toString(),
          pointsNeeded: pointsNeeded.toString(),
          suggestedCompetitions: suggestedCompetitions as any,
          aiRecommendations: aiRecommendations as any,
          expiresAt: expirationDate
        }
      });

      console.log(`Cached rank-up calculation for athlete ${athleteId}, expires: ${expirationDate.toISOString()}`);
    } catch (error) {
      console.warn("Failed to cache rank-up calculation:", error);
      // Don't fail the request if caching fails
    }

    return result;
  }

  private findOptimalCompetitions(competitions: Competition[], pointsNeeded: number): (Competition & { cumulativePoints: number })[] {
    // Sort by points available descending
    const sorted = competitions.sort((a, b) => Number(b.pointsAvailable) - Number(a.pointsAvailable));

    const result: (Competition & { cumulativePoints: number })[] = [];
    let cumulativePoints = 0;

    for (const comp of sorted) {
      if (cumulativePoints >= pointsNeeded) break;

      cumulativePoints += Number(comp.pointsAvailable);
      result.push({
        ...comp,
        cumulativePoints
      });
    }

    return result;
  }

  // Training Plans
  async getTrainingPlansByAthleteId(
    athleteId: number,
  ): Promise<TrainingPlan[]> {
    return await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.athleteId, athleteId))
      .orderBy(desc(trainingPlans.createdAt));
  }

  async createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan> {
    const [newPlan] = await db.insert(trainingPlans).values(plan).returning();
    return newPlan;
  }

  async getTrainingPlan(id: number): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.id, id));
    return plan;
  }

  async updateTrainingPlan(
    id: number,
    updates: Partial<InsertTrainingPlan>,
  ): Promise<TrainingPlan> {
    const [updatedPlan] = await db
      .update(trainingPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingPlans.id, id))
      .returning();
    return updatedPlan;
  }

  async deleteTrainingPlan(id: number): Promise<void> {
    await db.delete(trainingPlans).where(eq(trainingPlans.id, id));

  }

  // Sponsorship Bids
  async getSponsorshipBidsByAthleteId(athleteId: number): Promise<SponsorshipBid[]> {
    return await db
      .select()
      .from(sponsorshipBids)
      .where(eq(sponsorshipBids.athleteId, athleteId))
      .orderBy(desc(sponsorshipBids.createdAt));
  }

  async getAllSponsorshipBids(): Promise<SponsorshipBid[]> {
    return await db
      .select()
      .from(sponsorshipBids)
      .orderBy(desc(sponsorshipBids.createdAt));
  }

  async getSponsorshipBid(id: number): Promise<SponsorshipBid | undefined> {
    const results = await db
      .select()
      .from(sponsorshipBids)
      .where(eq(sponsorshipBids.id, id));
    return results[0];
  }

  async createSponsorshipBid(bid: InsertSponsorshipBid): Promise<SponsorshipBid> {
    const [newBid] = await db
      .insert(sponsorshipBids)
      .values(bid)
      .returning();
    return newBid;
  }

  async updateSponsorshipBidStatus(id: number, status: 'PENDING' | 'ACCEPTED' | 'REJECTED'): Promise<SponsorshipBid> {
    const [updatedBid] = await db
      .update(sponsorshipBids)
      .set({ status, updatedAt: new Date() })
      .where(eq(sponsorshipBids.id, id))
      .returning();
    return updatedBid;
  }

  async getAthletesWithBids(): Promise<(Athlete & { bidsCount: number })[]> {
    const results = await db
      .select({
        id: athletes.id,
        name: athletes.name,
        sport: athletes.sport,
        nationality: athletes.nationality,
        gender: athletes.gender,
        profileImage: athletes.profileImage,
        worldCategory: athletes.worldCategory,
        coachId: athletes.coachId,
        createdAt: athletes.createdAt,
      })
      .from(athletes)
      .innerJoin(sponsorshipBids, eq(athletes.id, sponsorshipBids.athleteId))
      .groupBy(athletes.id, athletes.name, athletes.sport, athletes.nationality, athletes.gender, athletes.profileImage, athletes.worldCategory, athletes.coachId, athletes.createdAt);

    // Get bid counts for each athlete
    const athleteIds = results.map(r => r.id);
    const bidCounts = await Promise.all(
      athleteIds.map(async (athleteId) => {
        const count = await db
          .select()
          .from(sponsorshipBids)
          .where(eq(sponsorshipBids.athleteId, athleteId));
        return { athleteId, count: count.length };
      })
    );

    return results.map(result => ({
      ...result,
      bidsCount: bidCounts.find(bc => bc.athleteId === result.id)?.count || 0
    }));
  }
}

export const storage = new DatabaseStorage();