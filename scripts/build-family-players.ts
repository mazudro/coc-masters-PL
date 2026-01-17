/**
 * Build consolidated family-only players file with ALL statistics.
 * Input: public/data/players-aggregated.json (from aggregate-cwl.ts)
 * Output: public/data/players-full.json
 * 
 * This file includes:
 * - Full player stats (stars, attacks, destruction)
 * - Reliability scores with breakdown
 * - Star buckets (0/1/2/3 star distribution)
 * - Defense statistics
 * - League history for projections
 * - Season-by-season breakdown
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CoC Masters PL family clan tags (without # prefix)
const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8'];

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

interface LeagueHistoryEntry {
  leagueTier: string;
  seasonsPlayed: number;
  attacksInLeague: number;
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
  leagueId?: number;
  leagueName?: string;
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
  leagueHistory?: LeagueHistoryEntry[];
}

interface FamilyPlayerOutput {
  tag: string;
  name: string;
  th: number;
  clans: string[];
  seasonsCount: number;
  
  // Overall totals
  totals: {
    stars: number;
    attacks: number;
    wars: number;
    destruction: number;
    triples: number;
    missedAttacks: number;
    avgStars: number;
    avgDestruction: number;
    threeStarRate: number;
  };
  
  // Reliability
  reliabilityScore: number;
  reliabilityBreakdown: ReliabilityBreakdown;
  
  // Star distribution
  starBuckets: StarBuckets;
  
  // Defense stats
  defense: {
    timesAttacked: number;
    starsAllowed: number;
    triplesAllowed: number;
    avgStarsAllowed: number;
    defenseQuality: number;
  };
  
  // League info
  lastLeague?: {
    tier: string;
    id?: number;
    name?: string;
  };
  primaryLeague?: string;
  leagueHistory?: LeagueHistoryEntry[];
  
  // Performance
  bestSeason?: {
    season: string;
    stars: number;
    avgStars: number;
  };
  performanceTrend?: 'improving' | 'stable' | 'declining';
  
  // Per-season breakdown (for charts/history)
  seasons: Array<{
    season: string;
    clanTag: string;
    clanName: string;
    th: number;
    warsParticipated: number;
    attacks: number;
    stars: number;
    triples: number;
    avgStars: number;
    avgDestruction: number;
    starBuckets: StarBuckets;
    leagueTier?: string;
    leagueId?: number;
    leagueName?: string;
    reliabilityScore?: number;
    defenseQuality: number;
  }>;
}

async function main() {
  const aggregatedPath = path.join(__dirname, '../public/data/players-aggregated.json');
  if (!fs.existsSync(aggregatedPath)) {
    console.error('Missing aggregated file at', aggregatedPath);
    console.error('Run: npx tsx scripts/aggregate-cwl.ts first');
    process.exit(1);
  }

  const players: AggregatedPlayer[] = JSON.parse(fs.readFileSync(aggregatedPath, 'utf-8'));
  console.log(`Processing ${players.length} total players...`);

  const familyPlayers: FamilyPlayerOutput[] = [];

  for (const p of players) {
    // Filter to only family clan seasons
    const familySeasons = (p.allSeasons || []).filter(s => 
      FAMILY_CLAN_TAGS.includes((s.clanTag || '').replace('#', ''))
    );
    
    if (familySeasons.length === 0) continue;

    // Sort seasons newest first
    familySeasons.sort((a, b) => b.season.localeCompare(a.season));

    // Recalculate totals from family seasons only
    const totalStars = familySeasons.reduce((sum, s) => sum + (s.stars || 0), 0);
    const totalAttacks = familySeasons.reduce((sum, s) => sum + (s.attacks || 0), 0);
    const totalWars = familySeasons.reduce((sum, s) => sum + (s.warsParticipated || 0), 0);
    const totalDestruction = familySeasons.reduce((sum, s) => sum + (s.destruction || 0), 0);
    const totalTriples = familySeasons.reduce((sum, s) => sum + (s.triples || 0), 0);
    const missedAttacks = Math.max(0, totalWars - totalAttacks);

    // Aggregate star buckets from family seasons
    const starBuckets: StarBuckets = familySeasons.reduce((acc, s) => ({
      zeroStars: acc.zeroStars + (s.starBuckets?.zeroStars || 0),
      oneStars: acc.oneStars + (s.starBuckets?.oneStars || 0),
      twoStars: acc.twoStars + (s.starBuckets?.twoStars || 0),
      threeStars: acc.threeStars + (s.starBuckets?.threeStars || 0),
    }), { zeroStars: 0, oneStars: 0, twoStars: 0, threeStars: 0 });

    // Aggregate defense stats from family seasons
    const totalTimesAttacked = familySeasons.reduce((sum, s) => sum + (s.timesAttacked || 0), 0);
    const totalStarsAllowed = familySeasons.reduce((sum, s) => sum + (s.starsAllowed || 0), 0);
    const totalTriplesAllowed = familySeasons.reduce((sum, s) => sum + (s.triplesAllowed || 0), 0);

    const avgStars = totalAttacks > 0 ? Math.round((totalStars / totalAttacks) * 100) / 100 : 0;
    const avgDestruction = totalAttacks > 0 ? Math.round((totalDestruction / totalAttacks) * 100) / 100 : 0;
    const threeStarRate = totalAttacks > 0 ? Math.round((totalTriples / totalAttacks) * 100 * 100) / 100 : 0;
    const avgStarsAllowed = totalTimesAttacked > 0 ? Math.round((totalStarsAllowed / totalTimesAttacked) * 100) / 100 : 0;
    const defenseQuality = totalTimesAttacked > 0 ? Math.round((1 - avgStarsAllowed / 3) * 100) : 0;

    // Get latest season info
    const latest = familySeasons[0];
    const clans = Array.from(new Set(familySeasons.map(s => s.clanTag)));

    // Find last league info
    const lastLeagueSeason = familySeasons.find(s => s.leagueTier || s.leagueName);
    
    // Build output
    const output: FamilyPlayerOutput = {
      tag: p.playerTag,
      name: p.playerName,
      th: latest?.th || p.th || 0,
      clans,
      seasonsCount: new Set(familySeasons.map(s => s.season)).size,
      
      totals: {
        stars: totalStars,
        attacks: totalAttacks,
        wars: totalWars,
        destruction: totalDestruction,
        triples: totalTriples,
        missedAttacks,
        avgStars,
        avgDestruction,
        threeStarRate,
      },
      
      // Use original reliability if available, otherwise recalculate
      reliabilityScore: p.reliabilityScore || 0,
      reliabilityBreakdown: p.reliabilityBreakdown || {
        performance: 0,
        attendance: 0,
        leagueAdj: 0,
        weighted: 0,
      },
      
      starBuckets,
      
      defense: {
        timesAttacked: totalTimesAttacked,
        starsAllowed: totalStarsAllowed,
        triplesAllowed: totalTriplesAllowed,
        avgStarsAllowed,
        defenseQuality,
      },
      
      lastLeague: lastLeagueSeason ? {
        tier: lastLeagueSeason.leagueTier || lastLeagueSeason.leagueName || '',
        id: lastLeagueSeason.leagueId,
        name: lastLeagueSeason.leagueName,
      } : undefined,
      
      primaryLeague: p.primaryLeague,
      leagueHistory: p.leagueHistory,
      
      bestSeason: p.bestSeason,
      performanceTrend: p.performanceTrend,
      
      seasons: familySeasons.map(s => ({
        season: s.season,
        clanTag: s.clanTag || '',
        clanName: s.clanName,
        th: s.th || 0,
        warsParticipated: s.warsParticipated || 0,
        attacks: s.attacks || 0,
        stars: s.stars || 0,
        triples: s.triples || 0,
        avgStars: s.attacks ? Math.round((s.stars / s.attacks) * 100) / 100 : 0,
        avgDestruction: s.attacks ? Math.round((s.destruction / s.attacks) * 100) / 100 : 0,
        starBuckets: s.starBuckets || { zeroStars: 0, oneStars: 0, twoStars: 0, threeStars: 0 },
        leagueTier: s.leagueTier,
        leagueId: s.leagueId,
        leagueName: s.leagueName,
        defenseQuality: s.defenseQuality || 0,
      })),
    };

    familyPlayers.push(output);
  }

  // Sort by total stars (best performers first)
  familyPlayers.sort((a, b) => b.totals.stars - a.totals.stars);

  const outPath = path.join(__dirname, '../public/data/players-full.json');
  fs.writeFileSync(outPath, JSON.stringify(familyPlayers, null, 2));
  
  console.log(`\n✓ Wrote ${familyPlayers.length} family players → ${outPath}`);
  
  // Summary
  const totalStars = familyPlayers.reduce((sum, p) => sum + p.totals.stars, 0);
  const totalAttacks = familyPlayers.reduce((sum, p) => sum + p.totals.attacks, 0);
  const avgReliability = familyPlayers.reduce((sum, p) => sum + p.reliabilityScore, 0) / familyPlayers.length;
  
  console.log(`\nSummary:`);
  console.log(`  Total players: ${familyPlayers.length}`);
  console.log(`  Total family stars: ${totalStars.toLocaleString()}`);
  console.log(`  Total attacks: ${totalAttacks.toLocaleString()}`);
  console.log(`  Avg reliability: ${avgReliability.toFixed(1)}%`);
}

main().catch(console.error);
