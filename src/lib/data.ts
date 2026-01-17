import type {
  ClanDetail,
  FamilyData,
  FamilyStats,
  GlobalPlayer,
  PlayerCareerStats,
  PlayerSeasonStats,
  RosterPlayerStats,
  SeasonClanDetail,
  SeasonDetailStats,
  SeasonFamilyData,
  SeasonIndex,
  WarTimeline,
} from './types'

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

// Number of rounds in Clan War League (standard CWL format)
export const CWL_ROUNDS_PER_SEASON = 7

// Family clan tags for aggregating player data across all clans.
// Note: Tags are stored *without* the leading '#' here because they are used
// directly in file paths (e.g. `/data/clans/<tag>.json`). When working with
// user-facing or API clan tags that include '#', strip the prefix before use.
// CoC Masters PL family clans:
//   - coc masters PL (#P0J2J8GJ) - main clan
//   - Akademia CoC PL (#JPRPRVUY) - academy
//   - Psychole! (#29RYVJ8C8) - training
export const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8']

function withBase(path: string) {
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`
}

export async function getFamilyData(): Promise<FamilyData> {
  const response = await fetch(withBase('/data/family.json'))
  return response.json()
}

/**
 * Calculate family-wide aggregated statistics from all clans.
 * Aggregates player counts, wars, attacks, stars, and destruction
 * across all family clans for display on the home page.
 */
export async function getFamilyStats(): Promise<FamilyStats> {
  // Load family data and all clan details in parallel
  const familyData = await getFamilyData()
  const clanPromises = FAMILY_CLAN_TAGS.map(tag => getClanDetail(`#${tag}`))
  const clanDetails = await Promise.all(clanPromises)

  // Filter out null results and inactive clans (rank === -1)
  const activeClans = familyData.clans.filter(c => c.rank !== -1)
  const validDetails = clanDetails.filter((d): d is ClanDetail => d !== null)

  // Count total players across all clans
  const totalPlayers = validDetails.reduce((sum, clan) =>
    sum + (clan.players?.length || 0), 0
  )

  // Use aggregated stats from family.json if available, otherwise calculate from clans
  const totalAttacks = familyData.totalAttacks ?? activeClans.reduce((sum, c) => sum + (c.attacks ?? 0), 0)
  const totalStars = familyData.totalStars ?? activeClans.reduce((sum, c) => sum + (c.stars ?? 0), 0)
  const totalWars = familyData.totalWars ?? activeClans.reduce((sum, c) => sum + (c.wars ?? 0), 0)
  const totalDestruction = activeClans.reduce((sum, c) => sum + (c.destruction ?? 0), 0)

  // Calculate averages
  const avgStarsPerAttack = totalAttacks > 0
    ? Number((totalStars / totalAttacks).toFixed(2))
    : 0

  const avgDestructionPercent = totalWars > 0
    ? Number((totalDestruction / totalWars).toFixed(1))
    : 0

  return {
    totalClans: familyData.clans.length,
    activeClans: activeClans.length,
    totalPlayers,
    totalWars,
    totalAttacks,
    totalStars,
    avgStarsPerAttack,
    avgDestructionPercent,
    totalDestruction
  }
}

/**
 * Calculate reliability score for a player.
 * Reliability = (attacks made / max possible attacks) * 100
 * CWL has 1 attack per player per war (not 2 like regular clan wars)
 */
export function calculatePlayerReliability(attacks: number, wars: number): number {
  const maxPossible = wars // CWL: 1 attack per war
  return maxPossible > 0 ? (attacks / maxPossible) * 100 : 0
}

/**
 * Calculate average reliability for a clan based on all players.
 * Returns the average reliability percentage across all players,
 * along with the count of high/medium/low reliability players.
 */
export function getClanReliability(players: Array<{ attacks: number; wars: number }>): {
  average: number
  highCount: number  // >= 90%
  mediumCount: number // 75-89%
  lowCount: number   // < 75%
} {
  if (!players || players.length === 0) {
    return { average: 0, highCount: 0, mediumCount: 0, lowCount: 0 }
  }

  let totalReliability = 0
  let highCount = 0
  let mediumCount = 0
  let lowCount = 0

  for (const player of players) {
    const reliability = calculatePlayerReliability(player.attacks, player.wars)
    totalReliability += reliability

    if (reliability >= 90) {
      highCount++
    } else if (reliability >= 75) {
      mediumCount++
    } else {
      lowCount++
    }
  }

  return {
    average: totalReliability / players.length,
    highCount,
    mediumCount,
    lowCount
  }
}

/**
 * Get reliability badge color class based on percentage.
 */
export function getReliabilityColor(reliability: number): 'green' | 'yellow' | 'red' {
  if (reliability >= 90) return 'green'
  if (reliability >= 75) return 'yellow'
  return 'red'
}

export async function getClanDetail(clanTag: string): Promise<ClanDetail | null> {
  try {
    const cleanTag = clanTag.replace('#', '')
    const response = await fetch(withBase(`/data/clans/${cleanTag}.json`))
    if (!response.ok) return null

    // The JSON file has a nested structure: { clan: {...}, stats: {...}, players: [...] }
    // We need to flatten it to match the ClanDetail interface
    const data = await response.json()

    // Handle both old flat format and new nested format
    if (data.clan && data.stats) {
      // New nested format from aggregate-all-seasons.ts
      return {
        name: data.clan.name,
        tag: data.clan.tag,
        rank: data.stats.rank ?? 0,
        stars: data.stats.stars ?? 0,
        destruction: data.stats.destruction ?? 0,
        attacks: data.stats.attacks ?? 0,
        wars: data.stats.wars,
        warsWon: data.stats.warsWon,
        warsLost: data.stats.warsLost,
        warsTied: data.stats.warsTied,
        winRate: data.stats.winRate,
        players: data.players ?? [],
      }
    }

    // Old flat format (fallback)
    return data
  } catch {
    return null
  }
}

export async function getPlayers(): Promise<GlobalPlayer[]> {
  const response = await fetch(withBase('/data/players.json'))
  return response.json()
}

export async function getSeasons(): Promise<SeasonIndex> {
  const response = await fetch(withBase('/data/history/seasons.json'))
  return response.json()
}

// Get the latest (most recent) season ID
export async function getLatestSeasonId(): Promise<string | null> {
  try {
    const index = await getSeasons()
    if (!index.seasons || index.seasons.length === 0) return null
    // Seasons are sorted oldest to newest in the index, so get the last one
    const sorted = [...index.seasons].sort((a, b) => b.season.localeCompare(a.season))
    return sorted[0]?.season || null
  } catch {
    return null
  }
}

export async function getSeasonFamily(season: string): Promise<SeasonFamilyData | null> {
  try {
    const response = await fetch(withBase(`/data/history/seasons/${season}/family.json`))
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

/**
 * Calculate aggregated statistics for a specific season across all family clans.
 * This loads the season family data and computes overall stats.
 */
export async function getSeasonDetailStats(season: string): Promise<SeasonDetailStats | null> {
  try {
    const familyData = await getSeasonFamily(season)
    if (!familyData || !familyData.clans || familyData.clans.length === 0) return null

    let totalStars = 0
    let totalWins = 0
    let totalLosses = 0
    let totalTies = 0
    let totalDestruction = 0
    let totalWars = 0

    for (const clan of familyData.clans) {
      totalStars += clan.stars ?? 0
      totalWins += clan.rounds?.won ?? 0
      totalLosses += clan.rounds?.lost ?? 0
      totalTies += clan.rounds?.tied ?? 0
      totalDestruction += clan.destruction ?? 0
      totalWars += (clan.rounds?.won ?? 0) +
        (clan.rounds?.lost ?? 0) +
        (clan.rounds?.tied ?? 0)
    }

    const totalGames = totalWins + totalLosses + totalTies
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0
    const avgDestruction = familyData.clans.length > 0
      ? totalDestruction / familyData.clans.length
      : 0

    return {
      totalStars,
      totalWins,
      totalLosses,
      totalTies,
      winRate,
      clanCount: familyData.clans.length,
      avgDestruction,
      totalWars,
    }
  } catch {
    return null
  }
}

export function getClanAccentColor(clanName: string): string {
  if (clanName.includes('Black')) return 'secondary'
  if (clanName.includes('White')) return 'accent'
  return 'primary'
}

export function leagueBadgeVariant(tier: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!tier) return 'outline'
  const t = tier.toLowerCase()
  if (t.includes('champion')) return 'destructive'
  if (t.includes('master')) return 'default'
  if (t.includes('crystal')) return 'secondary'
  if (t.includes('gold')) return 'outline'
  return 'outline'
}

export function positionBadgeClass(position: number | null): string {
  if (position == null) return 'bg-muted text-muted-foreground border-border'
  if (position <= 3) return 'bg-green-500/15 text-green-400 border-green-500/40'
  if (position <= 5) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40'
  return 'bg-red-500/15 text-red-400 border-red-500/40'
}

// Season clan detail
export async function getSeasonClanDetail(season: string, clanTag: string): Promise<SeasonClanDetail | null> {
  try {
    const cleanTag = clanTag.replace('#', '')
    const response = await fetch(withBase(`/data/history/seasons/${season}/clans/${cleanTag}.json`))
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

// Player history aggregation (optimized with index)
export async function getPlayerHistory(playerTag: string): Promise<PlayerCareerStats | null> {
  try {
    // Try to load the player-seasons index first (much faster)
    let playerSeasonEntries: Array<{ season: string; clanTag: string }> | null = null

    try {
      const indexResponse = await fetch(withBase('/data/player-seasons-index.json'))
      if (indexResponse.ok) {
        const index: Record<string, Array<{ season: string; clanTag: string }>> = await indexResponse.json()
        playerSeasonEntries = index[playerTag] || null
      }
    } catch {
      // Index not available, fall back to old method
      console.log('Player-seasons index not available, using fallback method')
    }

    const playerSeasons: PlayerSeasonStats[] = []
    let currentName = ''
    let currentTH: number | null = null

    if (playerSeasonEntries) {
      // Optimized path: Only load the specific clan files where player participated
      console.log(`Loading ${playerSeasonEntries.length} season files for player ${playerTag}`)

      for (const entry of playerSeasonEntries) {
        const clanDetail = await getSeasonClanDetail(entry.season, `#${entry.clanTag}`)

        if (!clanDetail?.roster) continue

        const playerData = clanDetail.roster.find(p => p.tag === playerTag)
        if (playerData) {
          currentName = playerData.name
          if (playerData.townHallLevel) currentTH = playerData.townHallLevel

          const threeStarRate = playerData.attacks > 0
            ? (playerData.triples / playerData.attacks) * 100
            : 0

          playerSeasons.push({
            season: entry.season,
            clanTag: clanDetail.clan.tag,
            clanName: clanDetail.clan.name,
            townHallLevel: playerData.townHallLevel,
            warsParticipated: playerData.warsParticipated,
            attacks: playerData.attacks,
            stars: playerData.stars,
            triples: playerData.triples,
            avgStars: playerData.avgStars,
            avgDestruction: playerData.avgDestruction,
            zeroStars: playerData.zeroStars,
            oneStars: playerData.oneStars,
            twoStars: playerData.twoStars,
            threeStarRate,
            leagueTier: clanDetail.league?.tier ?? null,
          })
        }
      }
    } else {
      // Fallback path: Search through all seasons (old method)
      const seasonsIndex = await getSeasons()
      if (!seasonsIndex?.seasons) return null

      console.log(`Using fallback: Searching through ${seasonsIndex.seasons.length} seasons`)

      // Fetch all clan files for each season to find player
      for (const seasonInfo of seasonsIndex.seasons) {
        const season = seasonInfo.season

        // Load all clan files for this season in parallel
        const clanTags = FAMILY_CLAN_TAGS

        const clanDetailPromises = clanTags.map(clanTag =>
          getSeasonClanDetail(season, clanTag).catch(() => null),
        )

        const clanDetails = await Promise.all(clanDetailPromises)

        for (const clanDetail of clanDetails) {
          if (!clanDetail?.roster) continue

          const playerData = clanDetail.roster.find(p => p.tag === playerTag)
          if (playerData) {
            currentName = playerData.name
            if (playerData.townHallLevel) currentTH = playerData.townHallLevel

            const threeStarRate = playerData.attacks > 0
              ? (playerData.triples / playerData.attacks) * 100
              : 0

            playerSeasons.push({
              season,
              clanTag: clanDetail.clan.tag,
              clanName: clanDetail.clan.name,
              townHallLevel: playerData.townHallLevel,
              warsParticipated: playerData.warsParticipated,
              attacks: playerData.attacks,
              stars: playerData.stars,
              triples: playerData.triples,
              avgStars: playerData.avgStars,
              avgDestruction: playerData.avgDestruction,
              zeroStars: playerData.zeroStars,
              oneStars: playerData.oneStars,
              twoStars: playerData.twoStars,
              threeStarRate,
              leagueTier: clanDetail.league?.tier ?? null,
            })
            break // Found in this clan, move to next season
          }
        }
      }
    }

    if (playerSeasons.length === 0) return null

    // Calculate career totals
    const totalWars = playerSeasons.reduce((sum, s) => sum + s.warsParticipated, 0)
    const totalAttacks = playerSeasons.reduce((sum, s) => sum + s.attacks, 0)
    const totalStars = playerSeasons.reduce((sum, s) => sum + s.stars, 0)
    const totalTriples = playerSeasons.reduce((sum, s) => sum + s.triples, 0)
    const careerAvgStars = totalAttacks > 0 ? totalStars / totalAttacks : 0
    const totalDestruction = playerSeasons.reduce((sum, s) => sum + (s.avgDestruction * s.attacks), 0)
    const careerAvgDestruction = totalAttacks > 0 ? totalDestruction / totalAttacks : 0

    return {
      playerTag,
      playerName: currentName,
      currentTH,
      totalWars,
      totalAttacks,
      totalStars,
      totalTriples,
      careerAvgStars,
      careerAvgDestruction,
      seasons: playerSeasons.sort((a, b) => b.season.localeCompare(a.season)), // Most recent first
    }
  } catch (err) {
    console.error('Failed to get player history:', err)
    return null
  }
}

// Load current player data (for TH levels) from multiple sources
async function getCurrentPlayerData(): Promise<Map<string, { th: number; clan: string; clanTag: string }>> {
  const map = new Map<string, { th: number; clan: string; clanTag: string }>()

  try {
    // First try players.json (most recent season data)
    const response = await fetch(withBase('/data/players.json'))
    if (response.ok) {
      const players = await response.json() as Array<{ tag: string; th: number; clan: string; clanTag: string }>
      for (const p of players) {
        if (p.th) map.set(p.tag, { th: p.th, clan: p.clan, clanTag: p.clanTag })
      }
    }
  } catch {
    // Ignore errors, try next source
  }

  try {
    // Also load players-full.json for historical players not in current season
    const fullResponse = await fetch(withBase('/data/players-full.json'))
    if (fullResponse.ok) {
      const fullPlayers = await fullResponse.json() as Array<{ tag: string; th: number; clans?: string[] }>
      for (const p of fullPlayers) {
        // Only add if not already in map (prefer current season data)
        if (!map.has(p.tag) && p.th) {
          map.set(p.tag, {
            th: p.th,
            clan: '',
            clanTag: p.clans?.[0] ?? ''
          })
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return map
}

// League tier scores for reliability calculation
// Players who compete in higher leagues get higher league adjustment scores
const LEAGUE_TIER_SCORES: Record<string, number> = {
  'Champion League I': 100,
  'Champion League II': 90,
  'Champion League III': 80,
  'Master League I': 70,
  'Master League II': 60,
  'Master League III': 50,
  'Crystal League I': 40,
  'Crystal League II': 35,
  'Crystal League III': 30,
  'Gold League I': 25,
  'Gold League II': 20,
  'Gold League III': 15,
}
const DEFAULT_LEAGUE_SCORE = 50

// Reliability formula weights - designed so only ~10% of players get 100%
const RELIABILITY_WEIGHTS = {
  performance: 0.45,  // avgStars + threeStarRate contribution
  attendance: 0.35,   // attacks/wars ratio
  leagueAdj: 0.20,    // league difficulty bonus
}

// Get player pool from recent seasons for roster builder
export async function getRecentPlayerPool(lastNSeasons: number = 3): Promise<RosterPlayerStats[]> {
  try {
    // Load seasons index and current player data (for TH) in parallel
    const [seasonsIndex, currentPlayerData] = await Promise.all([
      getSeasons(),
      getCurrentPlayerData(),
    ])

    if (!seasonsIndex?.seasons) return []

    const recentSeasons = seasonsIndex.seasons.slice(-lastNSeasons)
    const playerMap = new Map<string, {
      name: string
      clanTag: string
      clanName: string
      th: number | null
      seasons: number
      wars: number
      attacks: number
      stars: number
      triples: number
      maxPossibleAttacks: number
      // Track league tiers for weighted average
      leagueData: { tier: string; attacks: number }[]
    }>()

    // Aggregate player data from recent seasons
    for (const seasonInfo of recentSeasons) {
      const season = seasonInfo.season
      const clanTags = FAMILY_CLAN_TAGS

      const clanDetails = await Promise.all(
        clanTags.map(async (clanTag) => {
          try {
            return await getSeasonClanDetail(season, clanTag)
          } catch {
            return null
          }
        }),
      )

      for (const clanDetail of clanDetails) {
        if (!clanDetail?.roster) continue

        const leagueTier = clanDetail.league?.tier ?? ''

        for (const player of clanDetail.roster) {
          const existing = playerMap.get(player.tag)
          if (existing) {
            existing.seasons++
            existing.wars += player.warsParticipated
            existing.attacks += player.attacks
            existing.stars += player.stars
            existing.triples += player.triples
            existing.maxPossibleAttacks += player.warsParticipated
            if (player.townHallLevel) existing.th = player.townHallLevel
            // Track league tier with attack weight
            if (leagueTier && player.attacks > 0) {
              existing.leagueData.push({ tier: leagueTier, attacks: player.attacks })
            }
          } else {
            const currentData = currentPlayerData.get(player.tag)
            const th = player.townHallLevel ?? currentData?.th ?? null

            playerMap.set(player.tag, {
              name: player.name,
              clanTag: clanDetail.clan.tag,
              clanName: clanDetail.clan.name,
              th,
              seasons: 1,
              wars: player.warsParticipated,
              attacks: player.attacks,
              stars: player.stars,
              triples: player.triples,
              maxPossibleAttacks: player.warsParticipated,
              leagueData: leagueTier && player.attacks > 0
                ? [{ tier: leagueTier, attacks: player.attacks }]
                : [],
            })
          }
        }
      }
    }

    // Enrich with current TH data if still missing
    for (const [tag, data] of playerMap.entries()) {
      if (data.th === null) {
        const currentData = currentPlayerData.get(tag)
        if (currentData?.th) {
          data.th = currentData.th
          data.clanName = currentData.clan
          data.clanTag = currentData.clanTag
        }
      }
    }

    // Convert to RosterPlayerStats array with weighted reliability
    const players: RosterPlayerStats[] = []
    for (const [tag, data] of playerMap.entries()) {
      const avgStars = data.attacks > 0 ? data.stars / data.attacks : 0
      const threeStarRate = data.attacks > 0 ? (data.triples / data.attacks) * 100 : 0

      // Calculate weighted reliability score (0-100)
      // Performance: (avgStars/3 * 50) + (threeStarRate/100 * 50) → max 100
      const avgStarsContrib = (avgStars / 3) * 50
      const threeStarContrib = (threeStarRate / 100) * 50
      const performanceScore = Math.min(100, avgStarsContrib + threeStarContrib)

      // Attendance: attacks / maxPossibleAttacks * 100
      const attendanceScore = data.maxPossibleAttacks > 0
        ? Math.min(100, (data.attacks / data.maxPossibleAttacks) * 100)
        : 0

      // League adjustment: weighted average of league tiers by attacks
      let leagueAdjScore = DEFAULT_LEAGUE_SCORE
      if (data.leagueData.length > 0) {
        let totalLeagueScore = 0
        let totalWeight = 0
        for (const { tier, attacks } of data.leagueData) {
          const score = LEAGUE_TIER_SCORES[tier] ?? DEFAULT_LEAGUE_SCORE
          totalLeagueScore += score * attacks
          totalWeight += attacks
        }
        if (totalWeight > 0) {
          leagueAdjScore = totalLeagueScore / totalWeight
        }
      }

      // Final weighted reliability
      const reliabilityScore = (
        (performanceScore * RELIABILITY_WEIGHTS.performance) +
        (attendanceScore * RELIABILITY_WEIGHTS.attendance) +
        (leagueAdjScore * RELIABILITY_WEIGHTS.leagueAdj)
      )

      const missedAttacks = data.maxPossibleAttacks - data.attacks

      players.push({
        playerTag: tag,
        playerName: data.name,
        clanTag: data.clanTag,
        clanName: data.clanName,
        currentTH: data.th,
        seasonsPlayed: data.seasons,
        totalWars: data.wars,
        totalAttacks: data.attacks,
        totalStars: data.stars,
        avgStars,
        threeStarRate,
        reliabilityScore: Math.round(reliabilityScore * 100) / 100,
        missedAttacks,
      })
    }

    return players
  } catch (err) {
    console.error('Failed to get recent player pool:', err)
    return []
  }
}

// War timeline data
export async function getWarTimeline(season: string, clanTag: string, endTime: string): Promise<WarTimeline | null> {
  try {
    const cleanTag = clanTag.replace('#', '')
    // endTime format in JSON: 20250804T130355.000Z -> filename: 20250804T130355000Z
    const safeEndTime = endTime.replace(/[:.]/g, '')
    const response = await fetch(withBase(`/data/history/seasons/${season}/clans/${cleanTag}/wars/${safeEndTime}.json`))
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

// Get all war timelines for a clan in a season
export async function getSeasonWarTimelines(season: string, clanTag: string): Promise<WarTimeline[]> {
  try {
    const clanDetail = await getSeasonClanDetail(season, clanTag)
    if (!clanDetail?.wars) return []

    const timelines: WarTimeline[] = []
    for (const war of clanDetail.wars) {
      const timeline = await getWarTimeline(season, clanTag, war.endTime)
      if (timeline) {
        timelines.push(timeline)
      }
    }

    return timelines
  } catch {
    return []
  }
}
