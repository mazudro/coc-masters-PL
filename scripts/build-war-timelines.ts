/**
 * @fileoverview Extracts war timeline data from CWL cache files and writes structured war data
 * to individual JSON files organized by season and clan.
 * 
 * @description This build script processes cached Clan War League (CWL) data to generate
 * detailed war timeline files for each war involving family clans. The output files contain
 * comprehensive attack timelines, member summaries, and war results.
 * 
 * @remarks
 * - Input: CWL cache files from `tmp/cwl-cache/` in format `{clanTag}-{season}.json`
 * - Output: War timeline JSON files at `public/data/history/seasons/<season>/clans/<clanTag>/wars/<warEndTime>.json`
 * - Only processes wars involving configured family clans
 * - Automatically swaps perspective to always show family clan as the "clan" side
 * 
 * @example
 * ```bash
 * npx tsx scripts/build-war-timelines.ts
 * ```
 * 
 * @module build-war-timelines
 */
// scripts/build-war-timelines.ts
// Extracts war timeline data from CWL cache files and writes to public/data/history/seasons/<season>/clans/<clanTag>/wars/<warTag>.json

import fs from 'node:fs'
import path from 'node:path'

const CWL_CACHE_DIR = path.join('tmp', 'cwl-cache')
const HISTORY_DIR = path.join('public', 'data', 'history', 'seasons')

// CoC Masters PL family clan tags (without # prefix)
const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8']

interface CWLCacheFile {
  state: string
  season: string
  clans: Array<{
    tag: string
    name: string
    clanLevel: number
    members: Array<{
      tag: string
      name: string
      townHallLevel: number
    }>
  }>
  rounds: Array<{
    // warTags can be either full war data objects or just string war tag IDs
    // (strings occur when CWL is in progress and war data hasn't been fetched yet)
    warTags: Array<CWLWarData | string>
  }>
}

interface CWLWarData {
  state: string
  teamSize: number
  preparationStartTime: string
  startTime: string
  endTime: string
  clan: CWLWarSide
  opponent: CWLWarSide
}

interface CWLWarSide {
  tag: string
  name: string
  clanLevel: number
  attacks: number
  stars: number
  destructionPercentage: number
  badgeUrls?: Record<string, string>
  members: Array<{
    tag: string
    name: string
    townhallLevel: number
    mapPosition: number
    attacks?: Array<{
      attackerTag: string
      defenderTag: string
      stars: number
      destructionPercentage: number
      order: number
      duration: number
    }>
    opponentAttacks?: number
    bestOpponentAttack?: {
      attackerTag: string
      defenderTag: string
      stars: number
      destructionPercentage: number
      order: number
      duration: number
    }
  }>
}

interface WarAttack {
  attackerTag: string
  attackerName: string
  attackerTH: number
  attackerMapPosition: number
  defenderTag: string
  defenderName: string
  defenderTH: number
  defenderMapPosition: number
  stars: number
  destructionPercentage: number
  duration: number
  order: number
  side: 'clan' | 'opponent'
}

interface WarMemberSummary {
  tag: string
  name: string
  townhallLevel: number
  mapPosition: number
  attacks: WarAttack[]
  stars: number
  destruction: number
  opponentAttacks: number
  bestOpponentAttack?: {
    stars: number
    destructionPercentage: number
    attackerName: string
  }
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
    members: WarMemberSummary[]
  }
  opponent: {
    tag: string
    name: string
    clanLevel: number
    stars: number
    destructionPercentage: number
    attacks: number
    members: WarMemberSummary[]
  }
  attackTimeline: WarAttack[]
}

function determineWarResult(clanStars: number, opponentStars: number, clanDestruction: number, opponentDestruction: number): 'win' | 'loss' | 'tie' {
  if (clanStars > opponentStars) return 'win'
  if (clanStars < opponentStars) return 'loss'
  // Same stars - compare destruction
  if (clanDestruction > opponentDestruction) return 'win'
  if (clanDestruction < opponentDestruction) return 'loss'
  return 'tie'
}

function generateWarTag(clanTag: string, endTime: string): string {
  // Use a combination of clan tag and end time as a unique identifier
  return `${clanTag.replace('#', '')}-${endTime.replace(/[:.]/g, '')}`
}

function processWarData(cwlData: CWLCacheFile, familyClanTag: string): WarTimeline[] {
  const timelines: WarTimeline[] = []
  const normalizedFamilyTag = familyClanTag.startsWith('#') ? familyClanTag : `#${familyClanTag}`

  for (const round of cwlData.rounds) {
    for (const warData of round.warTags) {
      // Skip if warData is just a string (war tag ID, not full war data)
      // This happens when CWL is in progress and individual war data hasn't been fetched
      if (typeof warData === 'string') continue

      // Find war involving our family clan
      const isClanSide = warData.clan.tag === normalizedFamilyTag
      const isOpponentSide = warData.opponent.tag === normalizedFamilyTag

      if (!isClanSide && !isOpponentSide) continue

      // Swap perspectives if family clan is on opponent side
      const clanSide = isClanSide ? warData.clan : warData.opponent
      const opponentSide = isClanSide ? warData.opponent : warData.clan

      // Build member maps for name lookup
      const clanMemberMap = new Map<string, { name: string; th: number; pos: number }>()
      const opponentMemberMap = new Map<string, { name: string; th: number; pos: number }>()

      for (const m of clanSide.members) {
        clanMemberMap.set(m.tag, { name: m.name, th: m.townhallLevel, pos: m.mapPosition })
      }
      for (const m of opponentSide.members) {
        opponentMemberMap.set(m.tag, { name: m.name, th: m.townhallLevel, pos: m.mapPosition })
      }

      // Build attack timeline
      const attackTimeline: WarAttack[] = []

      // Process clan attacks
      for (const member of clanSide.members) {
        if (!member.attacks) continue
        for (const attack of member.attacks) {
          const attacker = clanMemberMap.get(attack.attackerTag)
          const defender = opponentMemberMap.get(attack.defenderTag)

          attackTimeline.push({
            attackerTag: attack.attackerTag,
            attackerName: attacker?.name || 'Unknown',
            attackerTH: attacker?.th || 0,
            attackerMapPosition: attacker?.pos || 0,
            defenderTag: attack.defenderTag,
            defenderName: defender?.name || 'Unknown',
            defenderTH: defender?.th || 0,
            defenderMapPosition: defender?.pos || 0,
            stars: attack.stars,
            destructionPercentage: attack.destructionPercentage,
            duration: attack.duration,
            order: attack.order,
            side: 'clan'
          })
        }
      }

      // Process opponent attacks
      for (const member of opponentSide.members) {
        if (!member.attacks) continue
        for (const attack of member.attacks) {
          const attacker = opponentMemberMap.get(attack.attackerTag)
          const defender = clanMemberMap.get(attack.defenderTag)

          attackTimeline.push({
            attackerTag: attack.attackerTag,
            attackerName: attacker?.name || 'Unknown',
            attackerTH: attacker?.th || 0,
            attackerMapPosition: attacker?.pos || 0,
            defenderTag: attack.defenderTag,
            defenderName: defender?.name || 'Unknown',
            defenderTH: defender?.th || 0,
            defenderMapPosition: defender?.pos || 0,
            stars: attack.stars,
            destructionPercentage: attack.destructionPercentage,
            duration: attack.duration,
            order: attack.order,
            side: 'opponent'
          })
        }
      }

      // Sort by attack order
      attackTimeline.sort((a, b) => a.order - b.order)

      // Build member summaries
      const processMemberSummaries = (
        members: CWLWarSide['members'],
        memberAttacks: WarAttack[],
        side: 'clan' | 'opponent',
        opponentMembers: Map<string, { name: string; th: number; pos: number }>
      ): WarMemberSummary[] => {
        return members.map(m => {
          const memberAttacksList = memberAttacks.filter(a => a.side === side && a.attackerTag === m.tag)
          const totalStars = memberAttacksList.reduce((sum, a) => sum + a.stars, 0)
          const totalDestruction = memberAttacksList.reduce((sum, a) => sum + a.destructionPercentage, 0)

          let bestOpponentAttack: WarMemberSummary['bestOpponentAttack']
          if (m.bestOpponentAttack) {
            const attackerInfo = opponentMembers.get(m.bestOpponentAttack.attackerTag)
            bestOpponentAttack = {
              stars: m.bestOpponentAttack.stars,
              destructionPercentage: m.bestOpponentAttack.destructionPercentage,
              attackerName: attackerInfo?.name || 'Unknown'
            }
          }

          return {
            tag: m.tag,
            name: m.name,
            townhallLevel: m.townhallLevel,
            mapPosition: m.mapPosition,
            attacks: memberAttacksList,
            stars: totalStars,
            destruction: totalDestruction,
            opponentAttacks: m.opponentAttacks || 0,
            bestOpponentAttack
          }
        }).sort((a, b) => a.mapPosition - b.mapPosition)
      }

      const result = determineWarResult(
        clanSide.stars,
        opponentSide.stars,
        clanSide.destructionPercentage,
        opponentSide.destructionPercentage
      )

      // Generate a warTag from existing data or create one
      const warTag = generateWarTag(clanSide.tag, warData.endTime)

      const timeline: WarTimeline = {
        generatedAt: new Date().toISOString(),
        season: cwlData.season,
        warTag,
        startTime: warData.startTime,
        endTime: warData.endTime,
        teamSize: warData.teamSize,
        result,
        clan: {
          tag: clanSide.tag,
          name: clanSide.name,
          clanLevel: clanSide.clanLevel,
          stars: clanSide.stars,
          destructionPercentage: clanSide.destructionPercentage,
          attacks: clanSide.attacks,
          members: processMemberSummaries(clanSide.members, attackTimeline, 'clan', opponentMemberMap)
        },
        opponent: {
          tag: opponentSide.tag,
          name: opponentSide.name,
          clanLevel: opponentSide.clanLevel,
          stars: opponentSide.stars,
          destructionPercentage: opponentSide.destructionPercentage,
          attacks: opponentSide.attacks,
          members: processMemberSummaries(opponentSide.members, attackTimeline, 'opponent', clanMemberMap)
        },
        attackTimeline
      }

      timelines.push(timeline)
    }
  }

  return timelines
}

function main() {
  if (!fs.existsSync(CWL_CACHE_DIR)) {
    console.log(`[build-war-timelines] No CWL cache directory found at ${CWL_CACHE_DIR}`)
    process.exit(0)
  }

  const cacheFiles = fs.readdirSync(CWL_CACHE_DIR).filter(f => f.endsWith('.json'))
  let totalWarsProcessed = 0

  for (const cacheFile of cacheFiles) {
    // Parse filename: {clanTag}-{season}.json e.g. 2LC99JJUQ-2021-11.json
    const match = cacheFile.match(/^([A-Z0-9]+)-(\d{4}-\d{2})\.json$/)
    if (!match) {
      console.log(`[build-war-timelines] Skipping ${cacheFile} - doesn't match expected format`)
      continue
    }

    const [, clanTag, season] = match

    if (!FAMILY_CLAN_TAGS.includes(clanTag)) {
      console.log(`[build-war-timelines] Skipping ${cacheFile} - not a family clan`)
      continue
    }

    const cacheFilePath = path.join(CWL_CACHE_DIR, cacheFile)

    try {
      const cwlData: CWLCacheFile = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'))

      if (!cwlData.rounds || cwlData.rounds.length === 0) {
        console.log(`[build-war-timelines] No rounds data in ${cacheFile}`)
        continue
      }

      const timelines = processWarData(cwlData, clanTag)

      // Write each timeline to its own file
      for (const timeline of timelines) {
        const warsDir = path.join(HISTORY_DIR, season, 'clans', clanTag, 'wars')
        fs.mkdirSync(warsDir, { recursive: true })

        // Use endTime as filename (sanitized for filesystem)
        const safeEndTime = timeline.endTime.replace(/[:.]/g, '')
        const outputPath = path.join(warsDir, `${safeEndTime}.json`)

        fs.writeFileSync(outputPath, JSON.stringify(timeline, null, 2), 'utf8')
        totalWarsProcessed++
      }

      console.log(`[build-war-timelines] Processed ${timelines.length} wars for ${clanTag} season ${season}`)
    } catch (err) {
      console.error(`[build-war-timelines] Error processing ${cacheFile}:`, err)
    }
  }

  console.log(`[build-war-timelines] Total wars processed: ${totalWarsProcessed}`)
}

main()
