/**
 * Fetch CWL data from ClashKing API for past seasons
 * 
 * @description
 * The official Clash of Clans API only provides CURRENT season CWL data.
 * For historical/past seasons, we use the ClashKing API which stores historical data.
 * 
 * ClashKing API endpoint:
 * GET https://api.clashk.ing/cwl/{clanTag}/{season}
 * 
 * @example
 * npx tsx scripts/fetch-clashking-cwl.ts 2026-01
 * npx tsx scripts/fetch-clashking-cwl.ts  # defaults to current month
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FAMILY_CLANS = [
  { name: "coc masters PL", tag: "#P0J2J8GJ" },
  { name: "Akademia CoC PL", tag: "#JPRPRVUY" },
  { name: "Psychole!", tag: "#29RYVJ8C8" },
];

const CWL_CACHE_DIR = path.join(__dirname, "..", "tmp", "cwl-cache");

interface ClashKingCWLResponse {
  state: string;
  season: string;
  clans: Array<{
    tag: string;
    name: string;
    clanLevel: number;
    badgeUrls: Record<string, string>;
    members: Array<{
      tag: string;
      name: string;
      townHallLevel: number;
    }>;
  }>;
  rounds: Array<{
    warTags: Array<ClashKingWarData>;
  }>;
  clan_rankings?: Array<{
    name: string;
    tag: string;
    stars: number;
    destruction: number;
    rounds: { won: number; tied: number; lost: number };
  }>;
}

interface ClashKingWarData {
  state: string;
  teamSize: number;
  preparationStartTime: string;
  startTime: string;
  endTime: string;
  tag: string;
  season: string;
  warStartTime: string;
  clan: ClashKingWarSide;
  opponent: ClashKingWarSide;
}

interface ClashKingWarSide {
  tag: string;
  name: string;
  clanLevel: number;
  attacks: number;
  stars: number;
  destructionPercentage: number;
  badgeUrls?: Record<string, string>;
  members: Array<{
    tag: string;
    name: string;
    townhallLevel: number;
    mapPosition: number;
    attacks?: Array<{
      attackerTag: string;
      defenderTag: string;
      stars: number;
      destructionPercentage: number;
      order: number;
      duration: number;
    }>;
    opponentAttacks?: number;
    bestOpponentAttack?: {
      attackerTag: string;
      defenderTag: string;
      stars: number;
      destructionPercentage: number;
      order: number;
      duration: number;
    };
  }>;
}

async function fetchClashKingCWL(clanTag: string, season: string): Promise<ClashKingCWLResponse | null> {
  const encodedTag = encodeURIComponent(clanTag);
  const url = `https://api.clashk.ing/cwl/${encodedTag}/${season}`;

  console.log(`  📡 Fetching from ClashKing: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status === 404) {
      console.log(`  ❌ No CWL data found for ${clanTag} in season ${season}`);
      return null;
    }

    if (!response.ok) {
      console.error(`  API Error ${response.status}: ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`  Fetch error:`, error);
    return null;
  }
}

async function processClan(clanName: string, clanTag: string, season: string): Promise<void> {
  console.log(`\n📋 ${clanName} (${clanTag})`);

  const data = await fetchClashKingCWL(clanTag, season);

  if (!data) {
    return;
  }

  console.log(`  ✅ Season: ${data.season}, State: ${data.state}`);
  console.log(`  📊 ${data.clans?.length || 0} clans in group, ${data.rounds?.length || 0} rounds`);

  // Count wars involving our clan
  let warCount = 0;
  for (const round of data.rounds || []) {
    for (const war of round.warTags || []) {
      if (typeof war === 'object' && (war.clan?.tag === clanTag || war.opponent?.tag === clanTag)) {
        warCount++;
      }
    }
  }
  console.log(`  ⚔️ ${warCount} wars found for this clan`);

  // Check clan rankings
  if (data.clan_rankings) {
    const ourRanking = data.clan_rankings.find(r => r.tag === clanTag);
    if (ourRanking) {
      const position = data.clan_rankings.findIndex(r => r.tag === clanTag) + 1;
      console.log(`  🏆 Position: #${position} (${ourRanking.stars}★, ${ourRanking.destruction.toFixed(0)}%)`);
      console.log(`  📈 Record: ${ourRanking.rounds.won}W-${ourRanking.rounds.tied}T-${ourRanking.rounds.lost}L`);
    }
  }

  // Save to cache
  const tagWithoutHash = clanTag.replace("#", "");
  const filename = `${tagWithoutHash}-${season}.json`;
  const filepath = path.join(CWL_CACHE_DIR, filename);

  // Ensure directory exists
  if (!fs.existsSync(CWL_CACHE_DIR)) {
    fs.mkdirSync(CWL_CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  💾 Saved: ${filename}`);
}

function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function main(): Promise<void> {
  // Get season from command line args or use current
  const season = process.argv[2] || getCurrentSeason();

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ClashKing CWL Data Fetcher");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\n📅 Target Season: ${season}`);
  console.log(`📁 Cache: ${CWL_CACHE_DIR}`);

  console.log("\n🔄 Fetching CWL data from ClashKing API...");

  for (const clan of FAMILY_CLANS) {
    await processClan(clan.name, clan.tag, season);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  ✅ Done!");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch(console.error);
