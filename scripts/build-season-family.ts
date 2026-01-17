/**
 * Builds per-season family.json files from clan detail data.
 * 
 * This script aggregates clan data for each season into a family summary file.
 * League info per clan is loaded from CSV files.
 * 
 * @remarks
 * - Input: Clan detail files from `public/data/history/seasons/<season>/clans/<clanTag>.json`
 * - Input: League CSV files from `public/data/mix csv/<clanTag>-clan-war-leagues.csv`
 * - Output: Family summary at `public/data/history/seasons/<season>/family.json`
 * 
 * @example
 * ```bash
 * npx tsx scripts/build-season-family.ts
 * ```
 * 
 * @module build-season-family
 */

import fs from 'node:fs'
import path from 'node:path'

const HISTORY_DIR = path.join('public', 'data', 'history', 'seasons')
const CSV_DIR = path.join('public', 'data', 'mix csv')

// CoC Masters PL family clan tags (without # prefix)
const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8']

// Map of clanTag -> season -> leagueName
type LeagueMap = Map<string, Map<string, string>>

interface ClanDetailFile {
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
  state?: string
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
  roster: Array<{
    tag: string
    name: string
    townHallLevel: number | null
  }>
}

interface SeasonFamilyClan {
  name: string
  tag: string
  stars: number
  destruction: number
  rounds: {
    won: number
    tied: number
    lost: number
  }
  groupPosition: number
  roster: number
  state: string
  league: string | null
}

interface SeasonFamily {
  generatedAt: string
  season: string
  state: string
  clans: SeasonFamilyClan[]
}

/**
 * Load league data from CSV files for all family clans.
 * Returns a map: clanTag (without #) -> season -> leagueName
 */
function loadLeagueDataFromCSV(): LeagueMap {
  const leagueMap: LeagueMap = new Map()

  for (const clanTag of FAMILY_CLAN_TAGS) {
    const csvPath = path.join(CSV_DIR, `${clanTag}-clan-war-leagues.csv`)

    if (!fs.existsSync(csvPath)) {
      console.log(`  No CSV file for ${clanTag}`)
      continue
    }

    const seasonMap = new Map<string, string>()

    try {
      const content = fs.readFileSync(csvPath, 'utf-8')
      const lines = content.trim().split('\n')

      // Skip header line: Tag,Name,Season,"League ID","League Name",...
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        // Parse CSV - handle quoted fields
        const fields = parseCSVLine(line)

        if (fields.length >= 5) {
          const season = fields[2]  // Season column
          const leagueName = fields[4]  // "League Name" column

          if (season && leagueName) {
            seasonMap.set(season, leagueName)
          }
        }
      }

      leagueMap.set(clanTag, seasonMap)
      console.log(`  Loaded ${seasonMap.size} league entries for ${clanTag}`)
    } catch (err) {
      console.warn(`  Failed to parse CSV for ${clanTag}:`, err)
    }
  }

  return leagueMap
}

/**
 * Simple CSV line parser that handles quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Push last field
  fields.push(current.trim())

  return fields
}

function buildSeasonFamily(seasonDir: string, leagueMap: LeagueMap): SeasonFamily | null {
  const clansDir = path.join(HISTORY_DIR, seasonDir, 'clans')

  if (!fs.existsSync(clansDir)) {
    console.log(`  No clans directory for ${seasonDir}`)
    return null
  }

  const clans: SeasonFamilyClan[] = []

  for (const clanTag of FAMILY_CLAN_TAGS) {
    const clanFile = path.join(clansDir, `${clanTag}.json`)

    if (!fs.existsSync(clanFile)) {
      continue
    }

    try {
      const content = fs.readFileSync(clanFile, 'utf-8')
      const clanData: ClanDetailFile = JSON.parse(content)

      // Get league name from CSV data for this clan and season
      const clanLeagueMap = leagueMap.get(clanTag)
      const leagueName = clanLeagueMap?.get(seasonDir) ?? null

      clans.push({
        name: clanData.clan.name,
        tag: clanData.clan.tag,
        stars: clanData.stats.stars,
        destruction: Math.round(clanData.stats.destruction * 100) / 100,
        rounds: {
          won: clanData.stats.warsWon,
          tied: clanData.stats.warsTied,
          lost: clanData.stats.warsLost
        },
        groupPosition: clanData.groupPosition,
        roster: clanData.roster.length,
        state: 'ended',
        league: leagueName
      })
    } catch (err) {
      console.warn(`  Failed to parse ${clanFile}:`, err)
    }
  }

  if (clans.length === 0) {
    console.log(`  No clan data found for ${seasonDir}`)
    return null
  }

  // Sort clans by stars (descending)
  clans.sort((a, b) => b.stars - a.stars)

  return {
    generatedAt: new Date().toISOString(),
    season: seasonDir,
    state: 'ended',
    clans
  }
}

function main(): void {
  console.log('[build-season-family] Starting...')

  if (!fs.existsSync(HISTORY_DIR)) {
    console.log(`[build-season-family] No history directory found at ${HISTORY_DIR}`)
    return
  }

  // Load league data from CSV files first
  console.log('[build-season-family] Loading league data from CSV files...')
  const leagueMap = loadLeagueDataFromCSV()

  const seasonDirs = fs.readdirSync(HISTORY_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^\d{4}-\d{2}$/.test(d.name))
    .map(d => d.name)
    .sort()

  console.log(`[build-season-family] Found ${seasonDirs.length} seasons`)

  let generated = 0
  let skipped = 0

  for (const seasonDir of seasonDirs) {
    console.log(`Processing ${seasonDir}...`)

    const familyData = buildSeasonFamily(seasonDir, leagueMap)

    if (familyData) {
      const outputPath = path.join(HISTORY_DIR, seasonDir, 'family.json')
      fs.writeFileSync(outputPath, JSON.stringify(familyData, null, 2), 'utf-8')
      console.log(`  ✓ Written family.json (${familyData.clans.length} clans)`)
      generated++
    } else {
      skipped++
    }
  }

  console.log(`\n[build-season-family] Complete: ${generated} generated, ${skipped} skipped`)
}

main()
