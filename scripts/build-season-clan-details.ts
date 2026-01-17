/**
 * @fileoverview Aggregates war timeline data into season clan detail files with roster statistics.
 * 
 * @description This build script processes war timeline JSON files for each season and clan,
 * aggregating player statistics to generate comprehensive season clan detail files.
 * 
 * Key features:
 * - Correctly calculates warsParticipated by counting roster appearances (not just attacks)
 * - Tracks missed attacks for reliability scoring
 * - Aggregates all player stats: attacks, stars, destruction, triples, etc.
 * - Preserves war history and league information
 * 
 * @remarks
 * - Input: War timeline files from `public/data/history/seasons/<season>/clans/<clanTag>/wars/*.json`
 * - Output: Season clan detail files at `public/data/history/seasons/<season>/clans/<clanTag>.json`
 * - Requires war timeline files to be generated first (by build-war-timelines.ts)
 * 
 * @example
 * ```bash
 * npx tsx scripts/build-season-clan-details.ts
 * ```
 * 
 * @module build-season-clan-details
 */

import fs from 'node:fs'
import path from 'node:path'

const HISTORY_DIR = path.join('public', 'data', 'history', 'seasons')
const CSV_DIR = path.join('public', 'data', 'mix csv')

// CoC Masters PL family clan tags (without # prefix)
const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8']

/**
 * Build a map of clanTag+season -> leagueName from CSV files
 */
function buildLeagueTierCache(): Map<string, { tier: string; group: number | null }> {
  const cache = new Map<string, { tier: string; group: number | null }>()

  if (!fs.existsSync(CSV_DIR)) {
    console.log('No CSV directory found, league data will not be populated')
    return cache
  }

  const csvFiles = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('-clan-war-leagues.csv'))
  console.log(`Found ${csvFiles.length} league CSV files`)

  for (const csvFile of csvFiles) {
    try {
      const content = fs.readFileSync(path.join(CSV_DIR, csvFile), 'utf-8')
      const lines = content.split('\n').filter(line => line.trim())

      if (lines.length < 2) continue

      // Parse header to find column indices
      const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const tagIdx = header.indexOf('Tag')
      const seasonIdx = header.indexOf('Season')
      const leagueNameIdx = header.indexOf('League Name')
      const positionIdx = header.indexOf('Position')

      if (tagIdx === -1 || seasonIdx === -1 || leagueNameIdx === -1) continue

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parsing (handles quoted fields)
        const fields: string[] = []
        let current = ''
        let inQuotes = false
        for (const char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            fields.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        fields.push(current.trim())

        const clanTag = (fields[tagIdx] ?? '').replace('#', '').toUpperCase()
        const season = fields[seasonIdx] ?? ''
        const leagueName = fields[leagueNameIdx]?.replace(/"/g, '') ?? ''
        const position = positionIdx !== -1 ? parseInt(fields[positionIdx] || '0', 10) : null

        if (clanTag && season && leagueName) {
          cache.set(`${clanTag}|${season}`, { tier: leagueName, group: position })
        }
      }
    } catch (error) {
      console.error(`Error parsing CSV ${csvFile}:`, (error as Error).message)
    }
  }

  console.log(`Loaded ${cache.size} league tier entries from CSV files`)
  return cache
}

interface WarTimeline {
  generatedAt: string
  season: string
  warTag: string
  startTime: string
  endTime: string
  teamSize: number
  result: 'win' | 'loss' | 'tie'
  clan: {
    tag: string
    name: string
    clanLevel: number
    stars: number
    destructionPercentage: number
    attacks: number
    members: Array<{
      tag: string
      name: string
      townhallLevel: number
      mapPosition: number
      attacks: Array<{
        stars: number
        destructionPercentage: number
        duration: number
      }>
      stars: number
      destruction: number
      bestOpponentAttack?: {
        stars: number
        destructionPercentage: number
        attackerName: string
      }
    }>
  }
  opponent: {
    tag: string
    name: string
    clanLevel: number
    stars: number
    destructionPercentage: number
    attacks: number
    members: Array<{
      tag: string
      name: string
      townhallLevel: number
      mapPosition: number
      attacks: Array<{
        stars: number
        destructionPercentage: number
        duration: number
      }>
      stars: number
      destruction: number
      bestOpponentAttack?: {
        stars: number
        destructionPercentage: number
        attackerName: string
      }
    }>
  }
}

interface PlayerStats {
  tag: string
  name: string
  townHallLevel: number | null
  warsParticipated: number
  attacks: number
  stars: number
  destruction: number
  triples: number
  zeroStars: number
  oneStars: number
  twoStars: number
  bestDestruction: number
  durationTotal: number
  durationSamples: number
  bestAttack: {
    stars: number
    destruction: number
    duration?: number
  }
  timesAttacked: number
  starsAllowed: number
  triplesAllowed: number
}

interface SeasonWar {
  warTag: string
  startTime: string
  endTime: string
  teamSize: number
  result: 'win' | 'loss' | 'tie'
  starsFor: number
  starsAgainst: number
  destructionFor: number
  destructionAgainst: number
  opponent: {
    tag: string
    name: string
    clanLevel?: number
  }
}

interface SeasonClanDetail {
  generatedAt: string
  season: string
  clan: {
    tag: string
    name: string
    clanLevel: number
  }
  league: {
    tier: string | null
    group: number | null
  }
  groupPosition: number
  state: string
  stats: {
    warsPlayed: number
    warsWon: number
    warsLost: number
    warsTied: number
    stars: number
    destruction: number
    attacks: number
    winRate: number
    avgDefenseQuality: number
    hardestToThreeCount: number
  }
  wars: SeasonWar[]
  roster: Array<{
    tag: string
    name: string
    townHallLevel: number | null
    attacks: number
    stars: number
    destruction: number
    triples: number
    bestDestruction: number
    avgStars: number
    avgDestruction: number
    warsParticipated: number
    missedAttacks: number
    zeroStars: number
    oneStars: number
    twoStars: number
    durationTotal?: number
    durationSamples?: number
    avgDuration?: number
    bestAttack: {
      stars: number
      destruction: number
      duration?: number
    }
    threeStarRate: number
    reliabilityScore: number
  }>
  cwlGroup?: Array<{
    tag: string
    name: string
    clanLevel: number
    stars: number
    destruction: number
    wins: number
    losses: number
    ties: number
  }>
}

function aggregateSeasonClanData(
  season: string,
  clanTag: string,
  warTimelines: WarTimeline[],
  leagueCache: Map<string, { tier: string; group: number | null }>
): SeasonClanDetail | null {
  if (warTimelines.length === 0) return null

  const playerStatsMap = new Map<string, PlayerStats>()
  const wars: SeasonWar[] = []

  let totalWins = 0
  let totalLosses = 0
  let totalTies = 0
  let totalStars = 0
  let totalDestruction = 0
  let totalAttacks = 0

  let clanInfo = {
    tag: '',
    name: '',
    clanLevel: 0
  }

  // Process each war
  for (const warTimeline of warTimelines) {
    // Capture clan info from first war
    if (!clanInfo.tag) {
      clanInfo = {
        tag: warTimeline.clan.tag,
        name: warTimeline.clan.name,
        clanLevel: warTimeline.clan.clanLevel
      }
    }

    // Track war result
    if (warTimeline.result === 'win') totalWins++
    else if (warTimeline.result === 'loss') totalLosses++
    else totalTies++

    // Add to wars list
    wars.push({
      warTag: warTimeline.warTag,
      startTime: warTimeline.startTime,
      endTime: warTimeline.endTime,
      teamSize: warTimeline.teamSize,
      result: warTimeline.result,
      starsFor: warTimeline.clan.stars,
      starsAgainst: warTimeline.opponent.stars,
      destructionFor: warTimeline.clan.destructionPercentage,
      destructionAgainst: warTimeline.opponent.destructionPercentage,
      opponent: {
        tag: warTimeline.opponent.tag,
        name: warTimeline.opponent.name,
        clanLevel: warTimeline.opponent.clanLevel
      }
    })

    totalStars += warTimeline.clan.stars
    totalDestruction += warTimeline.clan.destructionPercentage
    totalAttacks += warTimeline.clan.attacks

    // Process each member in the war
    // KEY FIX: Count ALL members in the war, not just those who attacked
    for (const member of warTimeline.clan.members) {
      let playerStats = playerStatsMap.get(member.tag)

      if (!playerStats) {
        playerStats = {
          tag: member.tag,
          name: member.name,
          townHallLevel: member.townhallLevel || null,
          warsParticipated: 0,
          attacks: 0,
          stars: 0,
          destruction: 0,
          triples: 0,
          zeroStars: 0,
          oneStars: 0,
          twoStars: 0,
          bestDestruction: 0,
          durationTotal: 0,
          durationSamples: 0,
          bestAttack: {
            stars: 0,
            destruction: 0
          },
          timesAttacked: 0,
          starsAllowed: 0,
          triplesAllowed: 0
        }
        playerStatsMap.set(member.tag, playerStats)
      }

      // FIX: Increment warsParticipated for being on the roster, regardless of attacks
      playerStats.warsParticipated++

      // Update TH if available (use most recent)
      if (member.townhallLevel) {
        playerStats.townHallLevel = member.townhallLevel
      }

      // Process attacks (if any)
      if (member.attacks && member.attacks.length > 0) {
        for (const attack of member.attacks) {
          playerStats.attacks++
          playerStats.stars += attack.stars
          playerStats.destruction += attack.destructionPercentage

          // Track star buckets
          if (attack.stars === 3) playerStats.triples++
          else if (attack.stars === 2) playerStats.twoStars++
          else if (attack.stars === 1) playerStats.oneStars++
          else playerStats.zeroStars++

          // Track best destruction
          if (attack.destructionPercentage > playerStats.bestDestruction) {
            playerStats.bestDestruction = attack.destructionPercentage
          }

          // Track duration
          if (attack.duration) {
            playerStats.durationTotal += attack.duration
            playerStats.durationSamples++
          }

          // Track best attack
          if (
            attack.stars > playerStats.bestAttack.stars ||
            (attack.stars === playerStats.bestAttack.stars &&
              (
                attack.destructionPercentage > playerStats.bestAttack.destruction ||
                (
                  attack.destructionPercentage === playerStats.bestAttack.destruction &&
                  attack.duration != null &&
                  (
                    playerStats.bestAttack.duration == null ||
                    attack.duration < playerStats.bestAttack.duration
                  )
                )
              ))
          ) {
            playerStats.bestAttack = {
              stars: attack.stars,
              destruction: attack.destructionPercentage,
              duration: attack.duration
            }
          }
        }
      }
      // If no attacks, player was on roster but didn't attack (missed attack)

      // Process defense: track attacks opponents made against this player
      // Note: bestOpponentAttack contains the best single attack against this player per war.
      // If a player is attacked multiple times in one war, only the best attack is tracked here.
      // This is a limitation of the war timeline data structure, which optimizes for the most
      // significant defensive outcome per war rather than tracking every defensive attempt.
      if (member.bestOpponentAttack) {
        playerStats.timesAttacked++
        playerStats.starsAllowed += member.bestOpponentAttack.stars
        if (member.bestOpponentAttack.stars === 3) {
          playerStats.triplesAllowed++
        }
      }
    }
  }

  // Build roster with calculated stats
  const roster = Array.from(playerStatsMap.values()).map(player => {
    const avgStarsAllowed = player.timesAttacked > 0 ? player.starsAllowed / player.timesAttacked : 0
    const defenseQuality = player.timesAttacked > 0 ? Math.max(0, 100 - (avgStarsAllowed / 3 * 100)) : 100

    return {
      tag: player.tag,
      name: player.name,
      townHallLevel: player.townHallLevel,
      attacks: player.attacks,
      stars: player.stars,
      destruction: player.destruction,
      triples: player.triples,
      bestDestruction: player.bestDestruction,
      avgStars: player.attacks > 0 ? player.stars / player.attacks : 0,
      avgDestruction: player.attacks > 0 ? player.destruction / player.attacks : 0,
      warsParticipated: player.warsParticipated,
      missedAttacks: player.warsParticipated - player.attacks,
      zeroStars: player.zeroStars,
      oneStars: player.oneStars,
      twoStars: player.twoStars,
      durationTotal: player.durationSamples > 0 ? player.durationTotal : undefined,
      durationSamples: player.durationSamples > 0 ? player.durationSamples : undefined,
      avgDuration: player.durationSamples > 0 ? player.durationTotal / player.durationSamples : undefined,
      bestAttack: player.bestAttack,
      threeStarRate: player.attacks > 0 ? (player.triples / player.attacks) * 100 : 0,
      reliabilityScore: player.warsParticipated > 0 ? (player.attacks / player.warsParticipated) * 100 : 0,
      timesAttacked: player.timesAttacked,
      starsAllowed: player.starsAllowed,
      avgStarsAllowed: Number(avgStarsAllowed.toFixed(2)),
      triplesAllowed: player.triplesAllowed,
      defenseQuality: Number(defenseQuality.toFixed(2))
    }
  })

  // Sort roster by total stars (descending)
  roster.sort((a, b) => b.stars - a.stars)

  // Try to load existing season clan file to preserve state info
  let existingGroupPosition = 0
  let existingState = 'ended'

  try {
    const existingFilePath = path.join(HISTORY_DIR, season, 'clans', `${clanTag}.json`)
    if (fs.existsSync(existingFilePath)) {
      const existingData = JSON.parse(fs.readFileSync(existingFilePath, 'utf8'))
      if (existingData.groupPosition !== undefined) existingGroupPosition = existingData.groupPosition
      if (existingData.state) existingState = existingData.state
    }
  } catch {
    // Ignore errors, use defaults
  }

  // Get league data from CSV cache (primary source) or fall back to existing file
  let leagueData: { tier: string | null; group: number | null } = { tier: null, group: null }
  const cacheKey = `${clanTag}|${season}`
  const cachedLeague = leagueCache.get(cacheKey)
  if (cachedLeague) {
    leagueData = cachedLeague
    if (cachedLeague.group !== null) {
      existingGroupPosition = cachedLeague.group
    }
  } else {
    // Fall back to existing file if no CSV data
    try {
      const existingFilePath = path.join(HISTORY_DIR, season, 'clans', `${clanTag}.json`)
      if (fs.existsSync(existingFilePath)) {
        const existingData = JSON.parse(fs.readFileSync(existingFilePath, 'utf8'))
        if (existingData.league) leagueData = existingData.league
      }
    } catch {
      // Ignore
    }
  }

  // Calculate win rate
  const winRate = warTimelines.length > 0 ? (totalWins / warTimelines.length) * 100 : 0

  // Calculate clan-level defense metrics
  const avgDefenseQuality = roster.length > 0
    ? roster.reduce((sum, p) => sum + (p.defenseQuality || 0), 0) / roster.length
    : 0
  const hardestToThreeCount = roster.filter(p => (p.triplesAllowed || 0) === 0).length

  return {
    generatedAt: new Date().toISOString(),
    season,
    clan: clanInfo,
    league: leagueData,
    groupPosition: existingGroupPosition,
    state: existingState,
    stats: {
      warsPlayed: warTimelines.length,
      warsWon: totalWins,
      warsLost: totalLosses,
      warsTied: totalTies,
      stars: totalStars,
      destruction: totalDestruction,
      attacks: totalAttacks,
      winRate: Number(winRate.toFixed(2)),
      avgDefenseQuality: Number(avgDefenseQuality.toFixed(2)),
      hardestToThreeCount
    },
    wars,
    roster
  }
}

function main() {
  if (!fs.existsSync(HISTORY_DIR)) {
    console.log(`[build-season-clan-details] No history directory found at ${HISTORY_DIR}`)
    process.exit(0)
  }

  const seasonDirs = fs.readdirSync(HISTORY_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort()

  // Build league tier cache from CSV files
  const leagueCache = buildLeagueTierCache()

  let totalClansProcessed = 0
  let totalSeasonsProcessed = 0

  for (const season of seasonDirs) {
    const clansDir = path.join(HISTORY_DIR, season, 'clans')
    if (!fs.existsSync(clansDir)) continue

    console.log(`[build-season-clan-details] Processing season ${season}...`)
    let clansInSeason = 0

    for (const clanTag of FAMILY_CLAN_TAGS) {
      const warsDir = path.join(clansDir, clanTag, 'wars')
      if (!fs.existsSync(warsDir)) continue

      // Load all war timelines for this clan/season
      const warFiles = fs.readdirSync(warsDir).filter(f => f.endsWith('.json'))
      const warTimelines: WarTimeline[] = []

      for (const warFile of warFiles) {
        try {
          const warData = JSON.parse(fs.readFileSync(path.join(warsDir, warFile), 'utf8'))
          warTimelines.push(warData)
        } catch (err) {
          console.warn(`  Warning: Failed to parse ${warFile}:`, err)
        }
      }

      if (warTimelines.length === 0) continue

      // Sort wars by start time
      warTimelines.sort((a, b) => a.startTime.localeCompare(b.startTime))

      // Aggregate season data
      const seasonClanDetail = aggregateSeasonClanData(season, clanTag, warTimelines, leagueCache)

      if (seasonClanDetail) {
        // Write season clan detail file
        const outputPath = path.join(clansDir, `${clanTag}.json`)
        fs.writeFileSync(outputPath, JSON.stringify(seasonClanDetail, null, 2), 'utf8')

        const totalRosterPlayers = seasonClanDetail.roster.length
        const leagueInfo = seasonClanDetail.league?.tier || 'No league'

        console.log(`  ✓ ${clanTag}: ${warTimelines.length} wars, ${totalRosterPlayers} players, ${leagueInfo}`)
        clansInSeason++
        totalClansProcessed++
      }
    }

    if (clansInSeason > 0) {
      totalSeasonsProcessed++
    }
  }

  console.log(`\n[build-season-clan-details] Complete!`)
  console.log(`  Seasons processed: ${totalSeasonsProcessed}`)
  console.log(`  Clan-seasons processed: ${totalClansProcessed}`)
}

main()
