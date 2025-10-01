/**
 * G-Ranking Point Calculator
 * 
 * This module handles the calculation of ranking points based on the official 
 * G-ranking system and athlete placement in competitions.
 */

// G-Ranking Points Table based on OFFICIAL WT standards
const GRANKING_POINTS_TABLE: Record<string, Record<number, number>> = {
  'G1': {
    1: 10.00,
    2: 6.00,
    3: 3.60,
    4: 2.16,
    5: 1.51,
    9: 1.06,
    17: 1.06,
    33: 0.74,
    65: 0.52
  },
  'G2*': { // Grand Prix Challenge only
    1: 20.00,
    2: 12.00,
    3: 7.20,
    4: 4.32,
    5: 3.02,
    9: 2.12,
    17: 1.48,
    33: 1.04,
    65: 0.73
  },
  'G2': {
    1: 20.00,
    2: 12.00,
    3: 7.20,
    4: 4.32,
    5: 3.02,
    9: 2.12,
    17: 1.48,
    33: 1.04,
    65: 0.73
  },
  'G3': {
    1: 30.00,
    2: 18.00,
    3: 10.80,
    4: 6.48,
    5: 4.54,
    9: 3.18,
    17: 2.22,
    33: 1.56,
    65: 1.04
  },
  'G4': {
    1: 40.00,
    2: 24.00,
    3: 14.40,
    4: 8.64,
    5: 6.05,
    9: 4.23,
    17: 2.96,
    33: 2.07,
    65: 1.56
  },
  'G6': {
    1: 50.00,
    2: 30.00,
    3: 18.00,
    4: 10.80,
    5: 7.56,
    9: 5.29,
    17: 3.70,
    33: 2.59,
    65: 1.81
  },
  'G10**': { // Grand Prix Final only
    1: 100.00,
    2: 60.00,
    3: 36.00,
    4: 21.60,
    5: 15.12,
    9: 10.58,
    17: 7.41,
    33: 5.19,
    65: 3.63
  },
  'G14': {
    1: 140.00,
    2: 84.00,
    3: 50.40,
    4: 30.24,
    5: 21.17,
    9: 14.82,
    17: 10.37,
    33: 7.26,
    65: 5.08
  }
};

// Placement positions that are defined in the table
const DEFINED_PLACEMENTS = [1, 2, 3, 4, 5, 9, 17, 33, 65];

/**
 * Calculate points for a specific placement in a G-ranking competition
 * @param gradeLevel - The G-ranking level (e.g., 'G1', 'G2', 'G14', etc.)
 * @param placement - The athlete's placement position (1st, 2nd, etc.)
 * @param isGrandPrixChallenge - Whether this is a Grand Prix Challenge (for G2* calculation)
 * @param isGrandPrixFinal - Whether this is a Grand Prix Final (for G10** calculation)
 * @returns The points awarded for this placement, or 0 if not valid
 */
export function calculateGRankingPoints(
  gradeLevel: string,
  placement: number,
  isGrandPrixChallenge: boolean = false,
  isGrandPrixFinal: boolean = false
): number {
  // Normalize grade level format: "G-14" -> "G14", "G-4" -> "G4", etc.
  let adjustedGradeLevel = gradeLevel.toUpperCase().replace(/-/g, '');
  
  if (adjustedGradeLevel === 'G2' && isGrandPrixChallenge) {
    adjustedGradeLevel = 'G2*';
  } else if (adjustedGradeLevel === 'G10' && isGrandPrixFinal) {
    adjustedGradeLevel = 'G10**';
  }

  // Get the points table for this grade level
  const gradeTable = GRANKING_POINTS_TABLE[adjustedGradeLevel];
  if (!gradeTable) {
    console.warn(`Unknown G-ranking level: ${adjustedGradeLevel}`);
    return 0;
  }

  // Check if the exact placement is defined
  if (gradeTable[placement] !== undefined) {
    return gradeTable[placement];
  }

  // If placement is not directly defined, find the closest lower placement
  // For example, if placement is 10, use the points for 9th place
  const applicablePlacement = DEFINED_PLACEMENTS
    .filter(p => p <= placement)
    .sort((a, b) => b - a)[0]; // Get the highest placement that's still <= our placement

  if (applicablePlacement && gradeTable[applicablePlacement] !== undefined) {
    return gradeTable[applicablePlacement];
  }

  // If placement is higher than any defined placement, return 0
  return 0;
}

/**
 * Get all available G-ranking levels
 */
export function getAvailableGRankingLevels(): string[] {
  return Object.keys(GRANKING_POINTS_TABLE);
}

/**
 * Get the maximum points possible for a G-ranking level (1st place points)
 */
export function getMaxPointsForGRanking(gradeLevel: string): number {
  return calculateGRankingPoints(gradeLevel, 1);
}

/**
 * Generate a realistic points projection for an athlete in a competition
 * Based on their skill level and competition strength
 */
export function getRealisticPointsProjection(
  gradeLevel: string,
  athleteCurrentRank: number,
  competitionStrength: 'weak' | 'moderate' | 'strong' = 'moderate',
  isGrandPrixChallenge: boolean = false,
  isGrandPrixFinal: boolean = false
): { optimistic: number; realistic: number; conservative: number } {
  
  // Estimate likely placements based on current rank and competition strength
  let optimisticPlacement: number;
  let realisticPlacement: number;
  let conservativePlacement: number;

  if (athleteCurrentRank <= 3) {
    // Top 3 athletes
    optimisticPlacement = 1;
    realisticPlacement = competitionStrength === 'strong' ? 3 : 2;
    conservativePlacement = competitionStrength === 'strong' ? 5 : 3;
  } else if (athleteCurrentRank <= 10) {
    // Top 10 athletes
    optimisticPlacement = competitionStrength === 'weak' ? 1 : 3;
    realisticPlacement = competitionStrength === 'strong' ? 9 : 5;
    conservativePlacement = competitionStrength === 'strong' ? 17 : 9;
  } else if (athleteCurrentRank <= 20) {
    // Top 20 athletes
    optimisticPlacement = competitionStrength === 'weak' ? 3 : 5;
    realisticPlacement = 9;
    conservativePlacement = 17;
  } else {
    // Lower ranked athletes
    optimisticPlacement = competitionStrength === 'weak' ? 9 : 17;
    realisticPlacement = 33;
    conservativePlacement = 65;
  }

  return {
    optimistic: calculateGRankingPoints(gradeLevel, optimisticPlacement, isGrandPrixChallenge, isGrandPrixFinal),
    realistic: calculateGRankingPoints(gradeLevel, realisticPlacement, isGrandPrixChallenge, isGrandPrixFinal),
    conservative: calculateGRankingPoints(gradeLevel, conservativePlacement, isGrandPrixChallenge, isGrandPrixFinal)
  };
}

/**
 * Parse competition name to determine if it's a special type
 */
export function parseCompetitionType(competitionName: string): {
  isGrandPrixChallenge: boolean;
  isGrandPrixFinal: boolean;
} {
  const name = competitionName.toLowerCase();
  return {
    isGrandPrixChallenge: name.includes('grand prix challenge') || name.includes('gp challenge'),
    isGrandPrixFinal: name.includes('grand prix final') || name.includes('gp final')
  };
}