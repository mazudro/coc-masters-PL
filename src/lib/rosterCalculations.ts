import type { LeagueProjection, ManualPlayerEntry, PlayerSeasonStats, RosterPlayerStats } from './types'

/**
 * CWL season constants
 * CWL: 7 wars, 1 attack per player per war (not 2 like regular wars)
 */
export const ATTACKS_PER_SEASON = 7

/**
 * Minimum wars required for meaningful form calculation (1 full CWL season)
 */
export const MIN_WARS_FOR_FORM = 7

/**
 * Maximum roster size with substitutes
 */
export const MAX_ROSTER_WITH_SUBS = 17 // 15 main + 2 substitutes
export const MAX_ROSTER_30V30_WITH_SUBS = 32 // 30 main + 2 substitutes

/**
 * Scoring weights for auto-distribute algorithm
 * 
 * Weights determine how much each metric contributes to overall player score.
 * Auto-distribute scoring aligned with the Advanced Reliability formula:
 * Reliability already includes: Performance (45%) + Attendance (35%) + League Difficulty (20%)
 * 
 * So we use RELIABILITY as the primary metric (0-100 scale → normalized):
 * - RELIABILITY (0.45): Primary - the weighted reliability score
 * - AVG_STARS (0.35): Secondary - raw attack quality as tie-breaker
 * - THREE_STAR_RATE (0.20): Bonus for players who consistently triple
 * 
 * All normalized: reliability/100, avgStars/3, threeStarRate/100 → then weighted
 */
export const SCORING_WEIGHTS = {
  RELIABILITY: 0.45,    // 45% - uses the advanced weighted reliability score
  AVG_STARS: 0.35,      // 35% - raw attack effectiveness
  THREE_STAR_RATE: 0.20 // 20% - clutch performance bonus
} as const

/**
 * Calculate player score for auto-distribution ranking
 * Uses normalized values weighted by SCORING_WEIGHTS
 * 
 * @param player - Player stats
 * @returns Score between 0 and 1 (higher = better)
 */
export function calculatePlayerScore(player: RosterPlayerStats): number {
  return (
    ((player.reliabilityScore / 100) * SCORING_WEIGHTS.RELIABILITY) +
    ((player.avgStars / 3) * SCORING_WEIGHTS.AVG_STARS) +
    ((player.threeStarRate / 100) * SCORING_WEIGHTS.THREE_STAR_RATE)
  )
}

/**
 * Calculate "Form" score - a composite metric for recent performance
 * Requires minimum 7 wars (1 full CWL season) for meaningful calculation
 * 
 * @param player - Player stats
 * @returns Form score (higher = better recent form)
 */
export function calculateForm(player: RosterPlayerStats): number {
  const warsFactor = player.totalWars >= MIN_WARS_FOR_FORM
    ? 1.0
    : (player.totalWars / MIN_WARS_FOR_FORM) * 0.8

  // Form weights - all values normalized to 0-1 scale
  const FORM_WEIGHTS = {
    AVG_STARS: 0.70,      // 70% - primary attack quality signal
    THREE_STAR_RATE: 0.20, // 20% - triple consistency bonus
    RELIABILITY: 0.10      // 10% - stability factor
  }

  const baseForm =
    ((player.avgStars / 3) * FORM_WEIGHTS.AVG_STARS) +
    ((player.threeStarRate / 100) * FORM_WEIGHTS.THREE_STAR_RATE) +
    ((player.reliabilityScore / 100) * FORM_WEIGHTS.RELIABILITY)

  return baseForm * warsFactor  // Returns 0-1 scale
}

/**
 * Get max roster capacity for a roster mode
 * 
 * @param mode - '15v15' or '30v30'
 * @param includeSubs - Include substitute slots
 * @returns Maximum players allowed
 */
export function getMaxRosterCapacity(mode: '15v15' | '30v30', includeSubs: boolean = false): number {
  const baseSize = mode === '30v30' ? 30 : 15
  return includeSubs ? baseSize + 2 : baseSize
}

/**
 * Calculate projected stars for a season
 * 
 * @param avgStars - Player's average stars per attack
 * @returns Projected total stars for a full CWL season (7 attacks)
 */
export function calculateProjectedStars(avgStars: number): number {
  return avgStars * ATTACKS_PER_SEASON
}

/**
 * League tier hierarchy (higher index = harder league)
 * Used for calculating league distance and adjustments
 */
/**
 * An ordered array of all available league tiers in Clash of Clans Clan War League.
 * The tiers are ordered from lowest (Gold League III) to highest (Champion League I).
 * 
 * @remarks
 * This constant is defined as a readonly tuple using `as const` to enable
 * type-safe league tier references throughout the application.
 * 
 * @example
 * ```typescript
 * const currentLeague = LEAGUE_TIERS[5]; // 'Crystal League I'
 * ```
 */
export const LEAGUE_TIERS = [
  'Gold League III',
  'Gold League II',
  'Gold League I',
  'Crystal League III',
  'Crystal League II',
  'Crystal League I',
  'Master League III',
  'Master League II',
  'Master League I',
  'Champion League III',
  'Champion League II',
  'Champion League I'
] as const

/**
 * Calculate distance between two league tiers
 * Positive = moving up (harder), Negative = moving down (easier)
 * 
 * @param fromLeague - Source league tier
 * @param toLeague - Target league tier
 * @returns Number of tiers between leagues (positive = harder, negative = easier)
 */
export function getLeagueTierDistance(fromLeague: string, toLeague: string): number {
  const fromIdx = LEAGUE_TIERS.indexOf(fromLeague as typeof LEAGUE_TIERS[number])
  const toIdx = LEAGUE_TIERS.indexOf(toLeague as typeof LEAGUE_TIERS[number])

  if (fromIdx === -1 || toIdx === -1) return 0

  // Positive = moving up (harder), Negative = moving down (easier)
  return toIdx - fromIdx
}

/**
 * Get the most common league tier from a player's season history
 * More recent seasons are weighted higher
 * 
 * @param seasons - Array of player season stats with league tier info (assumed chronological order: oldest to newest)
 * @returns Most common league tier or null if no data
 */
function getMostCommonLeague(seasons: PlayerSeasonStats[]): string | null {
  if (!seasons || seasons.length === 0) return null

  const leagueTiers = seasons
    .filter(s => s.leagueTier)
    .map((s, idx) => ({
      tier: s.leagueTier!,
      weight: idx + 1,  // Assumes chronological order: first season (idx=0) gets weight 1, last season gets highest weight
    }))

  if (leagueTiers.length === 0) return null

  // Find most common league tier (weighted)
  const leagueCounts = new Map<string, number>()
  leagueTiers.forEach(({ tier, weight }) => {
    leagueCounts.set(tier, (leagueCounts.get(tier) || 0) + weight)
  })

  const sorted = Array.from(leagueCounts.entries())
    .sort((a, b) => b[1] - a[1])

  return sorted[0]?.[0] || null
}

/**
 * Calculate league-adjusted projected stars for a player
 * 
 * Logic:
 * 1. If player has season data with league tiers, analyze league performance
 * 2. If target league matches player's typical league → use career avgStars
 * 3. If target league is harder → apply penalty (5-15%)
 * 4. If target league is easier → apply bonus (5-10%)
 * 5. If no league data → use career avgStars (no adjustment)
 * 
 * @param player - Player stats or manual entry
 * @param targetLeague - Target clan's league tier
 * @param playerSeasons - Optional: player's season history for league analysis
 * @returns League projection with adjusted stars and metadata
 */
export function getLeagueAdjustedProjection(
  player: RosterPlayerStats | ManualPlayerEntry,
  targetLeague: string,
  playerSeasons?: PlayerSeasonStats[]
): LeagueProjection {
  // For manual entries, use estimated avg
  if ('manualEntry' in player && player.manualEntry) {
    return {
      projectedStars: player.estimatedAvgStars * ATTACKS_PER_SEASON,
      adjustment: 0,
      confidence: 'low',
      historicalLeague: null
    }
  }

  // Type guard: now we know player is RosterPlayerStats
  const rosterPlayer = player as RosterPlayerStats
  const baseProjection = rosterPlayer.avgStars * ATTACKS_PER_SEASON

  // Get player's typical league from season history
  if (!playerSeasons || playerSeasons.length === 0) {
    return {
      projectedStars: baseProjection,
      adjustment: 0,
      confidence: 'low',
      historicalLeague: null
    }
  }

  const historicalLeague = getMostCommonLeague(playerSeasons)

  if (!historicalLeague) {
    return {
      projectedStars: baseProjection,
      adjustment: 0,
      confidence: 'low',
      historicalLeague: null
    }
  }

  // Calculate league distance (-3 to +3 tiers)
  const leagueDistance = getLeagueTierDistance(historicalLeague, targetLeague)

  // Apply adjustment based on distance
  let adjustment = 0
  let confidence: 'high' | 'medium' | 'low'

  if (leagueDistance === 0) {
    // Same league → no adjustment
    adjustment = 0
    confidence = 'high'
  } else if (leagueDistance > 0) {
    // Moving to HARDER league → penalty
    // +1 tier = -5%, +2 tiers = -10%, +3 tiers = -15%
    adjustment = Math.max(-15, leagueDistance * -5)
    confidence = leagueDistance === 1 ? 'medium' : 'low'
  } else {
    // Moving to EASIER league → bonus
    // -1 tier = +4%, -2 tiers = +8%, -3+ tiers = +10% (capped)
    const rawBonus = Math.abs(leagueDistance) * 4
    adjustment = Math.min(10, rawBonus)
    confidence = 'medium'
  }

  const adjustedAvg = rosterPlayer.avgStars * (1 + adjustment / 100)
  const projectedStars = adjustedAvg * ATTACKS_PER_SEASON

  return {
    projectedStars,
    adjustment,
    confidence,
    historicalLeague
  }
}
