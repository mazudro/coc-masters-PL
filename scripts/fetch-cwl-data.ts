/**
 * Fetch CWL (Clan War Leagues) data from Clash of Clans API
 * 
 * @description
 * This script fetches current CWL data for all tracked clans:
 * 1. Gets the current war league group for each clan
 * 2. Fetches individual war details with player attacks
 * 3. Saves data to tmp/cwl-cache/ directory
 * 
 * NOTE: CoC API only provides CURRENT season CWL data, not historical.
 * Historical data must be collected during each CWL season.
 * 
 * @example
 * npx tsx scripts/fetch-cwl-data.ts
 */

import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Official CoC API Key - set COC_API_KEY in .env.local or environment
const COC_API_KEY = process.env.COC_API_KEY;
if (!COC_API_KEY) {
  console.warn("⚠️  COC_API_KEY not set - some features may not work");
}

const FAMILY_CLANS = [
  { name: "coc masters PL", tag: "#P0J2J8GJ" },
  { name: "Akademia CoC PL", tag: "#JPRPRVUY" },
  { name: "Psychole!", tag: "#29RYVJ8C8" },
];

const CWL_CACHE_DIR = path.join(__dirname, "..", "tmp", "cwl-cache");

// API Types
interface CWLGroup {
  tag: string;
  state: "preparation" | "inWar" | "warEnded" | "ended";
  season: string;
  clans: CWLClan[];
  rounds: CWLRound[];
}

interface CWLClan {
  tag: string;
  name: string;
  clanLevel: number;
  badgeUrls: { small: string; medium: string; large: string };
  members: CWLMember[];
}

interface CWLMember {
  tag: string;
  name: string;
  townHallLevel: number;
}

interface CWLRound {
  warTags: string[];
}

interface CWLWar {
  tag: string;
  state: string;
  teamSize: number;
  attacksPerMember: number;
  preparationStartTime: string;
  startTime: string;
  endTime: string;
  clan: CWLWarClan;
  opponent: CWLWarClan;
}

interface CWLWarClan {
  tag: string;
  name: string;
  clanLevel: number;
  attacks: number;
  stars: number;
  destructionPercentage: number;
  members: CWLWarMember[];
}

interface CWLWarMember {
  tag: string;
  name: string;
  townhallLevel: number;
  mapPosition: number;
  attacks?: CWLAttack[];
  opponentAttacks: number;
  bestOpponentAttack?: CWLAttack;
}

interface CWLAttack {
  attackerTag: string;
  defenderTag: string;
  stars: number;
  destructionPercentage: number;
  order: number;
  duration: number;
}

async function fetchApi<T>(endpoint: string): Promise<T | null> {
  const url = `https://api.clashofclans.com/v1${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${COC_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (response.status === 404) {
      return null; // Clan not in CWL or war not found
    }

    if (!response.ok) {
      console.error(`  API Error ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error(`  Response: ${text}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`  Fetch error for ${endpoint}:`, error);
    return null;
  }
}

async function fetchCWLGroup(clanTag: string): Promise<CWLGroup | null> {
  const encodedTag = encodeURIComponent(clanTag);
  return fetchApi<CWLGroup>(`/clans/${encodedTag}/currentwar/leaguegroup`);
}

async function fetchCWLWar(warTag: string): Promise<CWLWar | null> {
  const encodedTag = encodeURIComponent(warTag);
  return fetchApi<CWLWar>(`/clanwarleagues/wars/${encodedTag}`);
}

async function processClan(clanName: string, clanTag: string): Promise<void> {
  console.log(`\n📋 ${clanName} (${clanTag})`);

  const group = await fetchCWLGroup(clanTag);

  if (!group) {
    console.log("  ❌ Not in active CWL or CWL data unavailable");
    return;
  }

  console.log(`  ✅ Season: ${group.season}, State: ${group.state}`);
  console.log(`  📊 ${group.clans.length} clans in group, ${group.rounds.length} rounds`);

  // Find our clan in the group
  const ourClan = group.clans.find(c => c.tag === clanTag);
  if (!ourClan) {
    console.log("  ⚠️ Clan not found in group data");
    return;
  }

  console.log(`  👥 ${ourClan.members.length} members registered for CWL`);

  // Collect all wars involving our clan
  const wars: CWLWar[] = [];
  let warIndex = 0;

  for (const round of group.rounds) {
    for (const warTag of round.warTags) {
      if (warTag === "#0") continue; // Placeholder for bye round

      const war = await fetchCWLWar(warTag);
      if (!war) continue;

      // Check if our clan is in this war
      if (war.clan.tag === clanTag || war.opponent.tag === clanTag) {
        warIndex++;
        const isHome = war.clan.tag === clanTag;
        const ourSide = isHome ? war.clan : war.opponent;
        const enemySide = isHome ? war.opponent : war.clan;

        console.log(`  ⚔️ War ${warIndex}: vs ${enemySide.name} - ${ourSide.stars}★ vs ${enemySide.stars}★`);
        wars.push(war);
      }

      // Rate limit: max 10 requests per second
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Save to cache
  const tagWithoutHash = clanTag.replace("#", "");
  const filename = `${tagWithoutHash}-${group.season}.json`;
  const filepath = path.join(CWL_CACHE_DIR, filename);

  const cacheData = {
    clanTag,
    clanName,
    season: group.season,
    state: group.state,
    group: {
      clans: group.clans.map(c => ({
        tag: c.tag,
        name: c.name,
        clanLevel: c.clanLevel,
        memberCount: c.members.length
      })),
      roundCount: group.rounds.length
    },
    members: ourClan.members,
    wars: wars.map(w => ({
      warTag: w.tag,
      state: w.state,
      teamSize: w.teamSize,
      startTime: w.startTime,
      endTime: w.endTime,
      clan: {
        tag: w.clan.tag,
        name: w.clan.name,
        stars: w.clan.stars,
        destruction: w.clan.destructionPercentage,
        attacks: w.clan.attacks,
        members: w.clan.members
      },
      opponent: {
        tag: w.opponent.tag,
        name: w.opponent.name,
        stars: w.opponent.stars,
        destruction: w.opponent.destructionPercentage,
        attacks: w.opponent.attacks,
        members: w.opponent.members
      }
    })),
    fetchedAt: new Date().toISOString()
  };

  // Ensure directory exists
  if (!fs.existsSync(CWL_CACHE_DIR)) {
    fs.mkdirSync(CWL_CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify(cacheData, null, 2));
  console.log(`  💾 Saved: ${filename}`);
}

async function generateSeasonSummary(): Promise<void> {
  console.log("\n📊 Generating season summary from CSV files...");

  const csvDir = path.join(__dirname, "..", "public", "data", "mix csv");

  if (!fs.existsSync(csvDir)) {
    console.log("  ❌ CSV directory not found");
    return;
  }

  const csvFiles = fs.readdirSync(csvDir).filter(f => f.endsWith(".csv"));
  console.log(`  📁 Found ${csvFiles.length} CSV files`);

  const allSeasons = new Map<string, { clan: string; league: string; position: number }[]>();

  for (const file of csvFiles) {
    const content = fs.readFileSync(path.join(csvDir, file), "utf-8");
    const lines = content.trim().split("\n").slice(1); // Skip header

    for (const line of lines) {
      const parts = parseCSVLine(line);
      if (parts.length < 6) continue;

      const [, name, season, , leagueName, position] = parts;

      if (!allSeasons.has(season)) {
        allSeasons.set(season, []);
      }

      allSeasons.get(season)!.push({
        clan: name,
        league: leagueName,
        position: parseInt(position)
      });
    }
  }

  // Sort seasons and output summary
  const sortedSeasons = [...allSeasons.keys()].sort().reverse();
  console.log(`\n📅 Season Summary (${sortedSeasons.length} seasons):\n`);

  for (const season of sortedSeasons.slice(0, 6)) {
    console.log(`  ${season}:`);
    const clans = allSeasons.get(season)!;
    clans.sort((a, b) => a.league.localeCompare(b.league) || a.position - b.position);
    for (const { clan, league, position } of clans) {
      console.log(`    ${clan.padEnd(20)} ${league.padEnd(20)} #${position}`);
    }
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Clash of Clans - CWL Data Fetcher");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\n📅 Date: ${new Date().toISOString()}`);
  console.log(`📁 Cache: ${CWL_CACHE_DIR}`);

  // Check if API key works
  console.log("\n🔑 Testing API connection...");
  const testClan = await fetchApi<{ tag: string; name: string }>("/clans/%232LC99JJUQ");
  if (!testClan) {
    console.error("❌ API connection failed. Check your API key.");
    console.error("   The CoC API key is IP-restricted. Generate a new one at:");
    console.error("   https://developer.clashofclans.com/");
    return;
  }
  console.log(`✅ API connected: ${testClan.name}`);

  // Fetch current CWL for all clans
  console.log("\n🔄 Fetching current CWL data for all clans...");

  for (const clan of FAMILY_CLANS) {
    await processClan(clan.name, clan.tag);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit between clans
  }

  // Generate summary from CSV files
  await generateSeasonSummary();

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  ✅ Done!");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch(console.error);
