/**
 * Utility functions for calculating and displaying rank changes
 */

export interface RankChange {
  direction: 'up' | 'down' | 'same' | 'new';
  amount: number;
  displayText: string;
  color: 'green' | 'red' | 'gray';
}

/**
 * Calculate rank change information
 * @param currentRank Current ranking position
 * @param previousRank Previous ranking position (null if new entry)
 * @returns RankChange object with direction, amount, and display information
 */
export function calculateRankChange(
  currentRank: number | null,
  previousRank: number | null | undefined
): RankChange | null {
  // No rank change data available
  if (currentRank === null) {
    return null;
  }

  // New entry (no previous rank)
  if (previousRank === null || previousRank === undefined) {
    return {
      direction: 'new',
      amount: 0,
      displayText: 'NEW',
      color: 'gray'
    };
  }

  // Same ranking
  if (currentRank === previousRank) {
    return {
      direction: 'same',
      amount: 0,
      displayText: '—',
      color: 'gray'
    };
  }

  // Improved ranking (lower number is better)
  if (currentRank < previousRank) {
    const improvement = previousRank - currentRank;
    return {
      direction: 'up',
      amount: improvement,
      displayText: `+${improvement}`,
      color: 'green'
    };
  }

  // Declined ranking (higher number is worse)
  const decline = currentRank - previousRank;
  return {
    direction: 'down',
    amount: decline,
    displayText: `-${decline}`,
    color: 'red'
  };
}

/**
 * Get the appropriate icon for rank change direction
 * @param direction Rank change direction
 * @returns Icon name for the direction
 */
export function getRankChangeIcon(direction: RankChange['direction']): string {
  switch (direction) {
    case 'up':
      return 'trending-up';
    case 'down':
      return 'trending-down';
    case 'same':
      return 'minus';
    case 'new':
      return 'star';
    default:
      return 'minus';
  }
}

/**
 * Get CSS classes for rank change styling
 * @param color Rank change color
 * @returns Tailwind CSS classes
 */
export function getRankChangeClasses(color: RankChange['color']): string {
  switch (color) {
    case 'green':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    case 'red':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    case 'gray':
      return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    default:
      return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
  }
}

/**
 * Create rank change information from a direct change value
 * @param changeValue Direct change value (negative for improvement, positive for decline)
 * @returns RankChange object with direction, amount, and display information
 */
export function createRankChangeFromValue(changeValue: number | null | undefined): RankChange | null {
  if (changeValue === null || changeValue === undefined) {
    return null;
  }

  // No change
  if (changeValue === 0) {
    return {
      direction: 'same',
      amount: 0,
      displayText: '—',
      color: 'gray'
    };
  }

  // Improved ranking (negative change value means improvement)
  if (changeValue < 0) {
    const improvement = Math.abs(changeValue);
    return {
      direction: 'up',
      amount: improvement,
      displayText: `+${improvement}`,
      color: 'green'
    };
  }

  // Declined ranking (positive change value means decline)
  return {
    direction: 'down',
    amount: changeValue,
    displayText: `-${changeValue}`,
    color: 'red'
  };
}