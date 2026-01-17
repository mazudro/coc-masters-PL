/**
 * Aggregate CWL data from ClashKing API cache files into a comprehensive players file
 * Parses the raw CWL API responses from tmp/cwl-cache/*.json files
 * 
 * This script creates players-aggregated.json which is used as an intermediate
 * file by other build scripts (load-league-csv.ts, convert-aggregated-to-global.ts, etc.)
 * 
 * Output matches the enhanced player data format with:
 * - Star buckets (0/1/2/3 star attack distribution)
 * - Reliability scores with breakdown
 * - Defense statistics
 * - League history for projections
 * 
 * Usage:
 *   npx tsx scripts/aggregate-cwl.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Types (aligned with src/lib/types.ts)
// ============================================================================

interface StarBuckets {
  zeroStars: number;
  oneStars: number;
  twoStars: number;
  threeStars: number;
}

interface ReliabilityBreakdown {
  performance: number;
  attendance: number;
  leagueAdj: number;
  weighted: number;
}

interface PlayerSeasonStats {
  playerTag: string;
  playerName: string;
  clanTag: string;
  clanName: string;
  season: string;
  stars: number;
  destruction: number;
  attacks: number;
  warsParticipated: number;
  th: number | null;
  warLeague?: string;
  triples: number;
  starBuckets: StarBuckets;
  timesAttacked: number;
  starsAllowed: number;
  avgStarsAllowed: number;
  triplesAllowed: number;
  defenseQuality: number;
  leagueTier?: string;
}

interface AggregatedPlayer {
  playerTag: string;
  playerName: string;
  clanTag: string;
  clanName: string;
  allSeasons: PlayerSeasonStats[];
  totalStars: number;
  totalDestructions: number;
  totalAttacks: number;
  totalWars: number;
  avgStars: number;
  avgDestruction: number;
  th: number | null;
  seasons: number;
  triples: number;
  starBuckets: StarBuckets;
  threeStarRate: number;
  reliabilityScore: number;
  reliabilityBreakdown: ReliabilityBreakdown;
  missedAttacks: number;
  bestSeason?: {
    season: string;
    stars: number;
    avgStars: number;
  };
  performanceTrend?: 'improving' | 'stable' | 'declining';
  totalTimesAttacked: number;
  totalStarsAllowed: number;
  totalTriplesAllowed: number;
  careerAvgStarsAllowed: number;
  careerDefenseQuality: number;
  primaryLeague?: string;
  leagueHistory?: {
    leagueTier: string;
    seasonsPlayed: number;
    attacksInLeague: number;
  }[];
}

interface RawAttack {
  attackerTag?: string;
  defenderTag?: string;
  stars?: number;
  destructionPercentage?: number;
  duration?: number;
  order?: number;
}

interface RawMember {
  tag?: string;
  name?: string;
  townhallLevel?: number;
  townHallLevel?: number;
  mapPosition?: number;
  attacks?: RawAttack[];
  bestOpponentAttack?: RawAttack;
  opponentAttacks?: number;
}

interface RawClanSide {
  tag?: string;
  name?: string;
  members?: RawMember[];
}

interface RawWar {
  clan?: RawClanSide;
  opponent?: RawClanSide;
}

interface RawRound {
  warTags?: RawWar[];
}

interface RawCWLData {
  rounds?: RawRound[];
  warTags?: RawWar[];
}

// ============================================================================
// League tier scores for reliability calculation
// ============================================================================

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
};
const DEFAULT_LEAGUE_SCORE = 50;

const RELIABILITY_WEIGHTS = {
  performance: 0.45,
  attendance: 0.35,
  leagueAdj: 0.20,
};

// ============================================================================
// Utilities
// ============================================================================

function extractSeasonFromFilename(filename: string): string {
  const match = filename.match(/^#?([A-Z0-9]+)-(\d{4}-\d{2})\.json$/);
  if (match) {
    return match[2];
  }
  return 'unknown';
}

function createEmptyStarBuckets(): StarBuckets {
  return { zeroStars: 0, oneStars: 0, twoStars: 0, threeStars: 0 };
}

function createEmptySeasonStats(
  playerTag: string,
  playerName: string,
  clanTag: string,
  clanName: string,
  season: string,
  th: number | null
): PlayerSeasonStats {
  return {
    playerTag,
    playerName,
    clanTag,
    clanName,
    season,
    stars: 0,
    destruction: 0,
    attacks: 0,
    warsParticipated: 0,
    th,
    triples: 0,
    starBuckets: createEmptyStarBuckets(),
    timesAttacked: 0,
    starsAllowed: 0,
    avgStarsAllowed: 0,
    triplesAllowed: 0,
    defenseQuality: 0,
  };
}

function createEmptyPlayer(
  playerTag: string,
  playerName: string,
  clanTag: string,
  clanName: string,
  th: number | null
): AggregatedPlayer {
  return {
    playerTag,
    playerName,
    clanTag,
    clanName,
    allSeasons: [],
    totalStars: 0,
    totalDestructions: 0,
    totalAttacks: 0,
    totalWars: 0,
    avgStars: 0,
    avgDestruction: 0,
    th,
    seasons: 0,
    triples: 0,
    starBuckets: createEmptyStarBuckets(),
    threeStarRate: 0,
    reliabilityScore: 0,
    reliabilityBreakdown: { performance: 0, attendance: 0, leagueAdj: 0, weighted: 0 },
    missedAttacks: 0,
    totalTimesAttacked: 0,
    totalStarsAllowed: 0,
    totalTriplesAllowed: 0,
    careerAvgStarsAllowed: 0,
    careerDefenseQuality: 0,
  };
}

function calculateReliabilityBreakdown(
  avgStars: number,
  threeStarRate: number,
  attacks: number,
  wars: number,
  leagueHistory?: { leagueTier: string; attacksInLeague: number }[]
): ReliabilityBreakdown {
  // Performance: based on avgStars and threeStarRate
  const performanceScore = ((avgStars / 3) * 50) + ((threeStarRate / 100) * 50);

  // Attendance: attacks / expected attacks (CWL = 1 attack per war)
  const attendanceScore = wars > 0 ? Math.min(100, (attacks / wars) * 100) : 0;

  // League adjustment: weighted average based on attacks in each league
  let leagueAdjScore = DEFAULT_LEAGUE_SCORE;
  if (leagueHistory && leagueHistory.length > 0) {
    const totalAttacks = leagueHistory.reduce((sum, l) => sum + l.attacksInLeague, 0);
    if (totalAttacks > 0) {
      leagueAdjScore = leagueHistory.reduce((sum, l) => {
        const tierScore = LEAGUE_TIER_SCORES[l.leagueTier] ?? DEFAULT_LEAGUE_SCORE;
        return sum + (tierScore * l.attacksInLeague);
      }, 0) / totalAttacks;
    }
  }

  // Weighted final score
  const weighted =
    (performanceScore * RELIABILITY_WEIGHTS.performance) +
    (attendanceScore * RELIABILITY_WEIGHTS.attendance) +
    (leagueAdjScore * RELIABILITY_WEIGHTS.leagueAdj);

  return {
    performance: Math.round(performanceScore * 100) / 100,
    attendance: Math.round(attendanceScore * 100) / 100,
    leagueAdj: Math.round(leagueAdjScore * 100) / 100,
    weighted: Math.round(weighted * 100) / 100,
  };
}

function calculatePerformanceTrend(seasons: PlayerSeasonStats[]): 'improving' | 'stable' | 'declining' | undefined {
  if (seasons.length < 2) return undefined;

  // Sort by season (chronological)
  const sorted = [...seasons].sort((a, b) => a.season.localeCompare(b.season));

  // Compare last 2 seasons
  const recentSeasons = sorted.slice(-3);
  if (recentSeasons.length < 2) return 'stable';

  const first = recentSeasons[0];
  const last = recentSeasons[recentSeasons.length - 1];

  const firstAvg = first.attacks > 0 ? first.stars / first.attacks : 0;
  const lastAvg = last.attacks > 0 ? last.stars / last.attacks : 0;

  const diff = lastAvg - firstAvg;

  if (diff > 0.3) return 'improving';
  if (diff < -0.3) return 'declining';
  return 'stable';
}

// ============================================================================
// Main aggregation
// ============================================================================

function aggregateCWLData(): Map<string, AggregatedPlayer> {
  const cacheDir = path.join(__dirname, '../tmp/cwl-cache');
  const playerMap = new Map<string, AggregatedPlayer>();

  if (!fs.existsSync(cacheDir)) {
    console.log('No cache directory found');
    return playerMap;
  }

  const files = fs
    .readdirSync(cacheDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  console.log(`Found ${files.length} season files in cache\n`);

  for (const file of files) {
    try {
      const season = extractSeasonFromFilename(file);
      if (season === 'unknown') continue;

      const filePath = path.join(cacheDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const cwlData: RawCWLData = JSON.parse(content);

      // Get wars from rounds or warTags
      const wars: RawWar[] = [];
      if (cwlData.rounds && Array.isArray(cwlData.rounds)) {
        for (const round of cwlData.rounds) {
          if (round.warTags && Array.isArray(round.warTags)) {
            wars.push(...round.warTags);
          }
        }
      } else if (cwlData.warTags && Array.isArray(cwlData.warTags)) {
        wars.push(...cwlData.warTags);
      }

      if (wars.length === 0) continue;

      // Process each war
      for (const war of wars) {
        if (!war.clan?.members) continue;

        const clanTag = war.clan.tag || '';
        const clanName = war.clan.name || '';

        // Build defender map for defense stats
        const defenderMap = new Map<string, { starsAllowed: number; isTriple: boolean }[]>();

        // First pass: collect all attacks to build defender stats
        for (const member of war.clan.members) {
          if (!member.attacks) continue;
          for (const attack of member.attacks) {
            if (attack.defenderTag && attack.stars !== undefined) {
              if (!defenderMap.has(attack.defenderTag)) {
                defenderMap.set(attack.defenderTag, []);
              }
              defenderMap.get(attack.defenderTag)!.push({
                starsAllowed: attack.stars,
                isTriple: attack.stars === 3,
              });
            }
          }
        }

        // Also check opponent attacks for our clan's defense
        if (war.opponent?.members) {
          for (const oppMember of war.opponent.members) {
            if (!oppMember.attacks) continue;
            for (const attack of oppMember.attacks) {
              if (attack.defenderTag && attack.stars !== undefined) {
                if (!defenderMap.has(attack.defenderTag)) {
                  defenderMap.set(attack.defenderTag, []);
                }
                defenderMap.get(attack.defenderTag)!.push({
                  starsAllowed: attack.stars,
                  isTriple: attack.stars === 3,
                });
              }
            }
          }
        }

        // Second pass: process each player
        for (const member of war.clan.members) {
          const playerKey = member.tag;
          if (!playerKey) continue;

          const th = member.townhallLevel ?? member.townHallLevel ?? null;
          const playerName = member.name || '';

          if (!playerMap.has(playerKey)) {
            playerMap.set(playerKey, createEmptyPlayer(playerKey, playerName, clanTag, clanName, th));
          }

          const player = playerMap.get(playerKey)!;

          // Update basic info
          if (th) player.th = th;
          player.playerName = playerName || player.playerName;
          player.clanTag = clanTag || player.clanTag;
          player.clanName = clanName || player.clanName;

          // Find or create season record
          let seasonRecord = player.allSeasons.find(
            (s) => s.season === season && s.clanTag === clanTag
          );

          if (!seasonRecord) {
            seasonRecord = createEmptySeasonStats(playerKey, playerName, clanTag, clanName, season, th);
            player.allSeasons.push(seasonRecord);
          }

          seasonRecord.warsParticipated++;

          // Process attacks
          const attacks = member.attacks || [];
          for (const attack of attacks) {
            const stars = attack.stars ?? 0;
            const destruction = attack.destructionPercentage ?? 0;

            seasonRecord.attacks++;
            seasonRecord.stars += stars;
            seasonRecord.destruction += destruction;

            // Star buckets
            if (stars === 0) seasonRecord.starBuckets.zeroStars++;
            else if (stars === 1) seasonRecord.starBuckets.oneStars++;
            else if (stars === 2) seasonRecord.starBuckets.twoStars++;
            else if (stars === 3) {
              seasonRecord.starBuckets.threeStars++;
              seasonRecord.triples++;
            }
          }

          // Process defense (from defender map)
          const defenseData = defenderMap.get(playerKey) || [];
          for (const def of defenseData) {
            seasonRecord.timesAttacked++;
            seasonRecord.starsAllowed += def.starsAllowed;
            if (def.isTriple) seasonRecord.triplesAllowed++;
          }
        }
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, (error as Error).message);
    }
  }

  // Post-process: finalize aggregates
  for (const player of playerMap.values()) {
    // Calculate season-level averages
    for (const season of player.allSeasons) {
      if (season.attacks > 0) {
        season.avgStarsAllowed = season.timesAttacked > 0
          ? Math.round((season.starsAllowed / season.timesAttacked) * 100) / 100
          : 0;

        // Defense quality: inverse of avg stars allowed, scaled 0-100
        season.defenseQuality = season.timesAttacked > 0
          ? Math.round((1 - season.avgStarsAllowed / 3) * 100)
          : 0;
      }
    }

    // Aggregate totals
    player.seasons = new Set(player.allSeasons.map((s) => s.season)).size;
    player.totalWars = player.allSeasons.reduce((sum, s) => sum + s.warsParticipated, 0);
    player.totalStars = player.allSeasons.reduce((sum, s) => sum + s.stars, 0);
    player.totalDestructions = player.allSeasons.reduce((sum, s) => sum + s.destruction, 0);
    player.totalAttacks = player.allSeasons.reduce((sum, s) => sum + s.attacks, 0);
    player.triples = player.allSeasons.reduce((sum, s) => sum + s.triples, 0);

    // Aggregate star buckets
    player.starBuckets = player.allSeasons.reduce(
      (acc, s) => ({
        zeroStars: acc.zeroStars + s.starBuckets.zeroStars,
        oneStars: acc.oneStars + s.starBuckets.oneStars,
        twoStars: acc.twoStars + s.starBuckets.twoStars,
        threeStars: acc.threeStars + s.starBuckets.threeStars,
      }),
      createEmptyStarBuckets()
    );

    // Aggregate defense stats
    player.totalTimesAttacked = player.allSeasons.reduce((sum, s) => sum + s.timesAttacked, 0);
    player.totalStarsAllowed = player.allSeasons.reduce((sum, s) => sum + s.starsAllowed, 0);
    player.totalTriplesAllowed = player.allSeasons.reduce((sum, s) => sum + s.triplesAllowed, 0);

    player.careerAvgStarsAllowed = player.totalTimesAttacked > 0
      ? Math.round((player.totalStarsAllowed / player.totalTimesAttacked) * 100) / 100
      : 0;

    player.careerDefenseQuality = player.totalTimesAttacked > 0
      ? Math.round((1 - player.careerAvgStarsAllowed / 3) * 100)
      : 0;

    // Calculate averages
    player.avgStars = player.totalAttacks > 0
      ? Math.round((player.totalStars / player.totalAttacks) * 100) / 100
      : 0;

    player.avgDestruction = player.totalAttacks > 0
      ? Math.round((player.totalDestructions / player.totalAttacks) * 100) / 100
      : 0;

    // Three-star rate
    player.threeStarRate = player.totalAttacks > 0
      ? Math.round((player.triples / player.totalAttacks) * 100 * 100) / 100
      : 0;

    // Missed attacks (expected - actual, CWL = 1 attack per war)
    player.missedAttacks = Math.max(0, player.totalWars - player.totalAttacks);

    // Best season
    if (player.allSeasons.length > 0) {
      const bestSeason = player.allSeasons
        .filter((s) => s.attacks > 0)
        .sort((a, b) => b.stars - a.stars)[0];

      if (bestSeason) {
        player.bestSeason = {
          season: bestSeason.season,
          stars: bestSeason.stars,
          avgStars: bestSeason.attacks > 0
            ? Math.round((bestSeason.stars / bestSeason.attacks) * 100) / 100
            : 0,
        };
      }
    }

    // Performance trend
    player.performanceTrend = calculatePerformanceTrend(player.allSeasons);

    // Reliability score
    player.reliabilityBreakdown = calculateReliabilityBreakdown(
      player.avgStars,
      player.threeStarRate,
      player.totalAttacks,
      player.totalWars,
      player.leagueHistory
    );
    player.reliabilityScore = player.reliabilityBreakdown.weighted;
  }

  return playerMap;
}

async function main() {
  console.log('Aggregating CWL season data...\n');

  const playerMap = aggregateCWLData();
  const players = Array.from(playerMap.values()).filter((p) => p.allSeasons.length > 0);

  console.log(`✓ Aggregated ${players.length} unique players\n`);

  // Save to players-aggregated.json
  const outputPath = path.join(__dirname, '../public/data/players-aggregated.json');
  fs.writeFileSync(outputPath, JSON.stringify(players, null, 2));
  console.log(`✓ Saved ${outputPath}\n`);

  // Summary statistics
  const uniqueSeasons = new Set(players.flatMap((p) => p.allSeasons.map((s) => s.season))).size;
  const uniqueClans = new Set(players.flatMap((p) => p.allSeasons.map((s) => s.clanTag))).size;
  const totalStars = players.reduce((sum, p) => sum + p.totalStars, 0);
  const totalWars = players.reduce((sum, p) => sum + p.totalWars, 0);
  const totalAttacks = players.reduce((sum, p) => sum + p.totalAttacks, 0);
  const totalDestruction = players.reduce((sum, p) => sum + p.totalDestructions, 0);
  const totalTriples = players.reduce((sum, p) => sum + p.triples, 0);

  console.log('Summary:');
  console.log(`  Total players: ${players.length}`);
  console.log(`  Total seasons: ${uniqueSeasons}`);
  console.log(`  Total clans: ${uniqueClans}`);
  console.log(`  Total stars: ${totalStars.toLocaleString()}`);
  console.log(`  Total triples: ${totalTriples.toLocaleString()} (${((totalTriples / totalAttacks) * 100).toFixed(1)}%)`);
  console.log(`  Total war participations: ${totalWars.toLocaleString()}`);
  console.log(`  Total attacks: ${totalAttacks.toLocaleString()}`);
  console.log(`  Avg stars per attack: ${(totalStars / totalAttacks).toFixed(2)}`);
  console.log(`  Avg destruction per attack: ${(totalDestruction / totalAttacks).toFixed(2)}%`);
}

main().catch(console.error);
