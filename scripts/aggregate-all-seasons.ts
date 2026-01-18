/**
 * Comprehensive CWL Data Aggregation Script
 * 
 * This script:
 * - Fetches ALL available CWL seasons from ClashKing API
 * - Aggregates player statistics across all seasons
 * - Generates complete players.json with historical data
 * - Generates family.json with aggregated family stats
 * - Updates individual clan files with complete historical data
 * 
 * Usage:
 *   npx tsx scripts/aggregate-all-seasons.ts
 *   npx tsx scripts/aggregate-all-seasons.ts --refresh  # Force refresh from API
 *   npx tsx scripts/aggregate-all-seasons.ts --start=2021-11  # Start from specific season
 *   npx tsx scripts/aggregate-all-seasons.ts --verbose  # Show detailed progress
 */

import fs from "node:fs";
import path from "node:path";

// ============================================================================
// Types
// ============================================================================

type StandingRound = { won: number; tied: number; lost: number };

type RawMemberAttack = {
  attackerTag?: string;
  defenderTag?: string;
  stars?: number;
  destructionPercentage?: number;
  duration?: number;
  order?: number;
};

type RawMember = {
  tag?: string;
  name?: string;
  townHallLevel?: number;
  mapPosition?: number;
  attacks?: RawMemberAttack[];
  opponentAttacks?: number;
};

type RawClanSide = {
  tag?: string;
  name?: string;
  clanLevel?: number;
  attacks?: number;
  stars?: number;
  destructionPercentage?: number;
  members?: RawMember[];
};

type RawWar = {
  tag?: string;
  warTag?: string;
  state?: string;
  teamSize?: number;
  startTime?: string;
  preparationStartTime?: string;
  endTime?: string;
  season?: string;
  clan?: RawClanSide;
  opponent?: RawClanSide;
};

type RawSeason = {
  state?: string;
  season?: string;
  clans?: RawClanSide[];
  standings?: Array<{
    name?: string;
    tag?: string;
    stars?: number;
    destruction?: number;
    rounds?: StandingRound;
  }>;
  warTags?: RawWar[];
  rounds?: { warTags?: RawWar[] }[];
  clan_rankings?: Array<{
    tag?: string;
    name?: string;
    stars?: number;
    destruction?: number;
    rounds?: StandingRound;
  }>;
};

type PlayerSeasonStats = {
  season: string;
  clan: string;
  clanTag: string;
  townHallLevel: number | null;
  attacks: number;
  stars: number;
  destruction: number;
  triples: number;
  avgStars: number;
  avgDestruction: number;
  warsParticipated: number;
  starBuckets: {
    zeroStars: number;
    oneStars: number;
    twoStars: number;
    threeStars: number;
  };
  timesAttacked?: number;
  starsAllowed?: number;
  avgStarsAllowed?: number;
  triplesAllowed?: number;
  defenseQuality?: number;
  leagueTier?: string; // e.g., 'Champion League I', 'Champion League II', etc.
};

/**
 * Reliability Score Breakdown
 * Formula: reliabilityScore = (Performance × 0.45) + (Attendance × 0.35) + (LeagueAdj × 0.20)
 * 
 * Components (all 0-100 scale):
 * - Performance: Based on avgStars and threeStarRate
 * - Attendance: Based on attacks/wars ratio
 * - LeagueAdj: Bonus for playing in higher leagues (Champion I = 100, Champion II = 90, etc.)
 */
type ReliabilityBreakdown = {
  performance: number;    // (avgStars/3)*50 + (threeStarRate/100)*50
  attendance: number;     // (attacks/wars)*100
  leagueAdj: number;      // Weighted average based on seasons in each league
  weighted: number;       // Final weighted score: perf*0.45 + att*0.35 + league*0.20
};

type PlayerCareerStats = {
  name: string;
  tag: string;
  th: number | null;
  wars: number;
  attacks: number;
  stars: number;
  avgStars: number;
  destruction: number;
  avgDestruction: number;
  triples: number;
  starBuckets: {
    zeroStars: number;
    oneStars: number;
    twoStars: number;
    threeStars: number;
  };
  clan: string;
  clanTag: string;
  seasons: PlayerSeasonStats[];
  threeStarRate?: number;
  reliabilityScore?: number;
  reliabilityBreakdown?: ReliabilityBreakdown;
  missedAttacks?: number;
  bestSeason?: {
    season: string;
    stars: number;
    avgStars: number;
  };
  performanceTrend?: 'improving' | 'stable' | 'declining';
  totalTimesAttacked?: number;
  totalStarsAllowed?: number;
  totalTriplesAllowed?: number;
  careerAvgStarsAllowed?: number;
  careerDefenseQuality?: number;
  // League history for projections
  primaryLeague?: string; // Most frequently played league tier (e.g., "Champion League II")
  leagueHistory?: {
    leagueTier: string;
    seasonsPlayed: number;
    attacksInLeague: number;
  }[];
};

type ClanStats = {
  name: string;
  tag: string;
  rank: number;
  stars: number;
  destruction: number;
  attacks: number;
  wars: number;
  warsWon: number;
  warsLost: number;
  warsTied: number;
  players: string[];
  winRate?: number;
};

type LeagueInfo = {
  tier: string;
  group: number | null;
};

// ============================================================================
// Configuration
// ============================================================================

// CoC Masters PL family clans:
// - coc masters PL (#P0J2J8GJ) - main clan
// - Akademia CoC PL (#JPRPRVUY) - academy
// - Psychole! (#29RYVJ8C8) - training
const FAMILY_CLANS: Record<string, string> = {
  "coc masters PL": "#P0J2J8GJ",
  "Akademia CoC PL": "#JPRPRVUY",
  "Psychole!": "#29RYVJ8C8",
};

/**
 * League tier difficulty scores (0-100 scale)
 * Higher leagues get higher scores as a bonus for competing at a harder level
 * 
 * These values reward players who maintain good performance in top-tier leagues
 * Champion I is the highest, so it gets 100 points as the LeagueAdj component
 */
const LEAGUE_TIER_SCORES: Record<string, number> = {
  "Champion League I": 100,
  "Champion League II": 90,
  "Champion League III": 80,
  "Master League I": 70,
  "Master League II": 60,
  "Master League III": 50,
  "Crystal League I": 40,
  "Crystal League II": 35,
  "Crystal League III": 30,
  "Gold League I": 25,
  "Gold League II": 20,
  "Gold League III": 15,
  // Default for unknown or lower leagues
};
const DEFAULT_LEAGUE_SCORE = 50; // Default score for unknown leagues

// Reliability formula weights
const RELIABILITY_WEIGHTS = {
  performance: 0.45,   // Weight for performance component (avgStars + threeStarRate)
  attendance: 0.35,    // Weight for attendance component (attacks/wars)
  leagueAdj: 0.20,     // Weight for league adjustment bonus
};

const OUTPUT_DIR = path.join("public", "data");
const CLANS_DIR = path.join(OUTPUT_DIR, "clans");
const HISTORY_DIR = path.join(OUTPUT_DIR, "history");
const CACHE_DIR = path.join("tmp", "cwl-cache");
const BASE_URL = "https://api.clashk.ing";

// Rate limiting configuration
const RATE_LIMIT_DELAY = 400; // 400ms between requests (can be lowered)
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 500;

// Ensure directories exist
fs.mkdirSync(CLANS_DIR, { recursive: true });
fs.mkdirSync(HISTORY_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTag(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function log(message: string, level: "info" | "warn" | "error" | "verbose" = "info"): void {
  const config = parseArgs(process.argv.slice(2));
  if (level === "verbose" && !config.verbose) return;

  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const prefix = {
    info: "ℹ",
    warn: "⚠",
    error: "✗",
    verbose: "→",
  }[level];

  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Get league info from most recent season for a clan
function getLeagueForClan(clanTag: string): LeagueInfo | null {
  const cleanTag = clanTag.replace("#", "");
  const seasonsDir = path.join(HISTORY_DIR, "seasons");

  if (!fs.existsSync(seasonsDir)) return null;

  // Get all season folders and sort descending to get most recent first
  const seasonFolders = fs.readdirSync(seasonsDir)
    .filter(f => f.match(/^\d{4}-\d{2}$/))
    .sort((a, b) => b.localeCompare(a));

  for (const season of seasonFolders) {
    const clanFile = path.join(seasonsDir, season, "clans", `${cleanTag}.json`);
    if (fs.existsSync(clanFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(clanFile, "utf8"));
        if (data.league && data.league.tier) {
          return { tier: data.league.tier, group: data.league.group ?? null };
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  return null;
}

function cachePath(tag: string, season: string): string {
  return path.join(CACHE_DIR, `${tag.replace(/#/g, "")}-${season}.json`);
}

// ============================================================================
// API Functions
// ============================================================================

// Global offline mode flag
let OFFLINE_MODE = false;

function setOfflineMode(offline: boolean): void {
  OFFLINE_MODE = offline;
  if (offline) {
    log("Running in OFFLINE mode - using cached data only, no API calls");
  }
}

// Track current season state globally
let CURRENT_SEASON_STATE: string | null = null;

/**
 * Get the current month in YYYY-MM format
 */
function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Check if a season is the current month
 */
function isCurrentSeason(season: string): boolean {
  return season === getCurrentSeason();
}

/**
 * Check if the cached/fetched data has complete war data with attack details
 * The /group endpoint returns warTags as string IDs, but historical endpoint returns full war objects
 * We need full war objects for build-war-timelines.ts to work properly
 */
function hasCompleteWarData(data: RawSeason | null): boolean {
  if (!data) return false;
  if (!data.rounds || !Array.isArray(data.rounds) || data.rounds.length === 0) {
    return false;
  }

  // Check first non-empty round to see if warTags are objects or strings
  for (const round of data.rounds) {
    if (round.warTags && Array.isArray(round.warTags) && round.warTags.length > 0) {
      const firstTag = round.warTags[0];
      // If warTags are strings (like "#8LPCQPYL9"), data is incomplete
      // If warTags are objects with clan/opponent data, data is complete
      if (typeof firstTag === 'string') {
        return false;
      }
      // It's an object - check if it has the required clan property
      if (typeof firstTag === 'object' && firstTag !== null && 'clan' in firstTag) {
        return true;
      }
    }
  }

  // No rounds with warTags found - consider incomplete
  return false;
}

/**
 * Fetch CWL data using the /group endpoint (for current season)
 * Returns the data nested under .data property from ClashKing API
 */
async function fetchCurrentSeasonGroup(tag: string): Promise<RawSeason | null> {
  if (OFFLINE_MODE) {
    log(`Skipping /group fetch for ${tag} (offline mode)`, "verbose");
    return null;
  }

  const url = `${BASE_URL}/cwl/${encodeURIComponent(tag)}/group`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      log(`Fetching current season via /group for ${tag} (attempt ${attempt + 1}/${MAX_RETRIES})`, "verbose");

      const res = await fetch(url);

      if (res.status === 404) {
        log(`No current CWL data for ${tag} (404)`, "verbose");
        return null;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json() as { data?: RawSeason } | null;

      // Handle null/empty responses (clan not in CWL this season)
      if (!json) {
        log(`Empty response for ${tag} - clan may not be in CWL this season`, "verbose");
        return null;
      }

      // ClashKing /group endpoint wraps data in a .data property
      const data = json.data ?? json as unknown as RawSeason;

      // Validate we got actual season data
      if (!data || !data.season) {
        log(`No season data in response for ${tag}`, "verbose");
        return null;
      }

      // Cache it using the season format
      const cpath = cachePath(tag, data.season);
      fs.writeFileSync(cpath, JSON.stringify(data, null, 2));
      log(`Cached current season data for ${tag} (${data.season}, state: ${data.state})`, "verbose");

      // Track the season state
      if (data.state) {
        CURRENT_SEASON_STATE = data.state;
      }

      return data;
    } catch (error) {
      const errorMsg = (error as Error).message;

      if (attempt === MAX_RETRIES - 1) {
        log(`Failed to fetch /group for ${tag}: ${errorMsg}`, "error");
        return null;
      }

      const delay = RETRY_BASE_DELAY * (attempt + 1);
      log(`Retry in ${delay}ms due to: ${errorMsg}`, "verbose");
      await sleep(delay);
    }
  }

  return null;
}

async function fetchWithCache(
  tag: string,
  season: string,
  refresh: boolean
): Promise<RawSeason | null> {
  const cpath = cachePath(tag, season);

  // Check cache first (always in offline mode, or when not refreshing)
  if (fs.existsSync(cpath) && !refresh) {
    try {
      const cached = fs.readFileSync(cpath, "utf8");
      const data = JSON.parse(cached) as RawSeason;

      // Track current season state from cache
      if (isCurrentSeason(season) && data.state) {
        CURRENT_SEASON_STATE = data.state;
      }

      // IMPORTANT: Validate that cached data has complete war objects, not just string tags
      // The /group endpoint returns warTags as strings, but we need full war data
      // If cached data is incomplete, we'll re-fetch from the historical API
      if (!hasCompleteWarData(data)) {
        log(`Cache for ${tag} ${season} has incomplete war data (string tags only), will re-fetch`, "verbose");
        // Don't return - fall through to fetch from API
      } else {
        return data;
      }
    } catch (error) {
      log(`Cache read error for ${tag} ${season}: ${(error as Error).message}`, "warn");
    }
  }

  // In offline mode, if no cache exists, return null
  if (OFFLINE_MODE) {
    log(`No cached data for ${tag} ${season} (offline mode)`, "verbose");
    return null;
  }

  // For prebuild/backfill: ALWAYS use the historical /cwl/{tag}/{season} endpoint
  // The /group endpoint is only useful for LIVE in-progress seasons
  // For ended seasons (including recent ones like 2026-01), use historical endpoint

  // Only try /group endpoint if:
  // 1. It's the current calendar month
  // 2. We know the season is NOT ended yet
  // 3. We're not doing a refresh (which means we want fresh historical data)
  const shouldUseGroupEndpoint = isCurrentSeason(season)
    && CURRENT_SEASON_STATE !== 'ended'
    && !refresh;

  if (shouldUseGroupEndpoint) {
    log(`Current season ${season} may be in progress, trying /group endpoint first`, "verbose");
    const groupData = await fetchCurrentSeasonGroup(tag);
    if (groupData && hasCompleteWarData(groupData)) {
      return groupData;
    }
    // Fall through to try the historical endpoint
    log(`/group data incomplete, falling back to historical endpoint`, "verbose");
  }

  // Fetch from ClashKing historical API: /cwl/{tag}/{season}
  const url = `${BASE_URL}/cwl/${encodeURIComponent(tag)}/${season}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      log(`Fetching ${tag} ${season} from historical API (attempt ${attempt + 1}/${MAX_RETRIES})`, "verbose");

      const res = await fetch(url);

      if (res.status === 404) {
        log(`No data for ${tag} ${season} (404)`, "verbose");
        return null;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as RawSeason;

      // Track current season state
      if (isCurrentSeason(season) && json.state) {
        CURRENT_SEASON_STATE = json.state;
      }

      // Cache the response
      fs.writeFileSync(cpath, JSON.stringify(json, null, 2));
      log(`Cached ${tag} ${season} (state: ${json.state || 'unknown'})`, "verbose");

      return json;
    } catch (error) {
      const errorMsg = (error as Error).message;

      if (attempt === MAX_RETRIES - 1) {
        log(`Failed to fetch ${tag} ${season}: ${errorMsg}`, "error");
        return null;
      }

      const delay = RETRY_BASE_DELAY * (attempt + 1);
      log(`Retry in ${delay}ms due to: ${errorMsg}`, "verbose");
      await sleep(delay);
    }
  }

  return null;
}

// ============================================================================
// Data Processing Functions
// ============================================================================

/**
 * War states from ClashKing API:
 * - "preparation" - War is in preparation phase, no attacks yet
 * - "inWar" - War is ongoing, attacks are in progress
 * - "warEnded" - War has ended, all attacks are final
 * - undefined/null - Usually means war hasn't started
 */

/**
 * Check if a war has usable attack data
 * Wars in preparation have no attacks, so we skip them for stats
 */
function hasWarAttackData(war: RawWar): boolean {
  const state = war.state?.toLowerCase();
  // Skip wars in preparation (no attacks yet)
  if (state === "preparation") return false;
  // Wars that are in progress or ended have attack data
  return true;
}

/**
 * Check if a war is complete (all attacks are final)
 */
function isWarComplete(war: RawWar): boolean {
  const state = war.state?.toLowerCase();
  return state === "warended" || state === "ended";
}

function extractWars(raw: RawSeason): RawWar[] {
  const wars: RawWar[] = [];

  if (Array.isArray(raw.warTags)) {
    wars.push(...raw.warTags);
  }

  if (Array.isArray(raw.rounds)) {
    for (const round of raw.rounds) {
      if (Array.isArray(round.warTags)) {
        // Filter out placeholder war tags (#0) that indicate unstarted rounds
        const validWars = round.warTags.filter((war: RawWar) => {
          // Skip placeholder entries
          if (war.tag === "#0" || war.warTag === "#0") return false;
          // Skip if no clan data at all
          if (!war.clan && !war.opponent) return false;
          return true;
        });
        wars.push(...validWars);
      }
    }
  }

  return wars;
}

/**
 * Extract wars with attack data only (skips preparation wars)
 */
function extractWarsWithAttacks(raw: RawSeason): RawWar[] {
  return extractWars(raw).filter(hasWarAttackData);
}

function processPlayerFromWars(
  wars: RawWar[],
  playerTag: string,
  clanTag: string
): {
  attacks: number;
  stars: number;
  destruction: number;
  triples: number;
  starBuckets: { zeroStars: number; oneStars: number; twoStars: number; threeStars: number };
  warsParticipated: number;
  latestName: string | null;
  latestTH: number | null;
} {
  const normalizedPlayerTag = normalizeTag(playerTag);
  const normalizedClanTag = normalizeTag(clanTag);

  let attacks = 0;
  let stars = 0;
  let destruction = 0;
  let triples = 0;
  let zeroStars = 0;
  let oneStars = 0;
  let twoStars = 0;
  let threeStars = 0;
  let warsParticipated = 0;
  let latestName: string | null = null;
  let latestTH: number | null = null;

  const participatedWars = new Set<string>();

  for (const war of wars) {
    // FIX: Check both clan and opponent sides, as our clan may appear on either side
    let members: RawMember[] = [];

    if (war.clan && normalizeTag(war.clan.tag ?? "") === normalizedClanTag) {
      members = war.clan.members ?? [];
    } else if (war.opponent && normalizeTag(war.opponent.tag ?? "") === normalizedClanTag) {
      members = war.opponent.members ?? [];
    } else {
      continue;
    }

    const member = members.find((m) => normalizeTag(m.tag ?? "") === normalizedPlayerTag);

    if (!member) continue;

    // Track war participation using startTime as unique identifier
    // (warTag is not always present in API response)
    if (war.startTime) {
      participatedWars.add(war.startTime);
    }

    // Update latest info
    if (member.name) latestName = member.name;
    if (member.townHallLevel) latestTH = member.townHallLevel;

    // Process attacks
    const memberAttacks = member.attacks ?? [];
    for (const attack of memberAttacks) {
      const attackStars = attack.stars ?? 0;
      const attackDestruction = attack.destructionPercentage ?? 0;

      attacks++;
      stars += attackStars;
      destruction += attackDestruction;

      if (attackStars === 3) {
        triples++;
        threeStars++;
      } else if (attackStars === 2) {
        twoStars++;
      } else if (attackStars === 1) {
        oneStars++;
      } else {
        zeroStars++;
      }
    }
  }

  warsParticipated = participatedWars.size;

  return {
    attacks,
    stars,
    destruction,
    triples,
    starBuckets: { zeroStars, oneStars, twoStars, threeStars },
    warsParticipated,
    latestName,
    latestTH,
  };
}

function generateAllSeasons(startYear: number = 2021): string[] {
  const seasons: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 0-indexed

  for (let year = startYear; year <= currentYear; year++) {
    const maxMonth = year === currentYear ? currentMonth : 12;
    for (let month = 1; month <= maxMonth; month++) {
      seasons.push(`${year}-${String(month).padStart(2, "0")}`);
    }
  }

  return seasons;
}

// ============================================================================
// Main Aggregation Logic
// ============================================================================

async function aggregateAllData(
  refresh: boolean,
  startSeason: string | null,
  refreshCurrentOnly: boolean = false
): Promise<void> {
  log("Starting comprehensive CWL data aggregation...");

  // Generate season list
  const allSeasons = generateAllSeasons(2021);
  const startIndex = startSeason
    ? allSeasons.findIndex((s) => s === startSeason)
    : 0;
  const seasons = startIndex >= 0 ? allSeasons.slice(startIndex) : allSeasons;

  log(`Processing ${seasons.length} seasons: ${seasons[0]} to ${seasons[seasons.length - 1]}`);

  // Player aggregation map: tag -> PlayerCareerStats
  const playerMap = new Map<string, PlayerCareerStats>();

  // Clan aggregation map: tag -> ClanStats
  const clanMap = new Map<string, ClanStats>();

  // Initialize clan stats
  for (const [name, tag] of Object.entries(FAMILY_CLANS)) {
    clanMap.set(normalizeTag(tag), {
      name,
      tag: normalizeTag(tag),
      rank: -1,
      stars: 0,
      destruction: 0,
      attacks: 0,
      wars: 0,
      warsWon: 0,
      warsLost: 0,
      warsTied: 0,
      players: [],
    });
  }

  let totalSeasonsFetched = 0;
  let totalPlayersProcessed = 0;

  // Process each season
  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i];
    log(`\nProcessing season ${season} (${i + 1}/${seasons.length})...`);

    let seasonHasData = false;

    // Process each clan
    for (const [clanName, clanTag] of Object.entries(FAMILY_CLANS)) {
      const normalizedClanTag = normalizeTag(clanTag);

      try {
        // Determine if we should refresh this season
        const shouldRefresh = refresh || (refreshCurrentOnly && isCurrentSeason(season));
        const raw = await fetchWithCache(normalizedClanTag, season, shouldRefresh);

        if (!raw) {
          log(`No data for ${clanName} in ${season}`, "verbose");
          await sleep(RATE_LIMIT_DELAY);
          continue;
        }

        seasonHasData = true;

        // Log season state for current month
        if (isCurrentSeason(season) && raw.state) {
          log(`Current season state: ${raw.state}`, "info");
        }

        // Extract all wars (for roster tracking) and wars with attacks (for stats)
        const allWars = extractWars(raw);
        const warsWithAttacks = extractWarsWithAttacks(raw);

        // Count wars by state for logging
        const warStates = allWars.reduce((acc, w) => {
          const state = w.state ?? "unknown";
          acc[state] = (acc[state] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        if (Object.keys(warStates).length > 0) {
          log(`War states for ${clanName}: ${JSON.stringify(warStates)}`, "verbose");
        }

        if (allWars.length === 0) {
          log(`No wars found for ${clanName} in ${season}`, "verbose");
          await sleep(RATE_LIMIT_DELAY);
          continue;
        }

        log(`Processing ${warsWithAttacks.length}/${allWars.length} wars with attacks for ${clanName}`, "verbose");

        // Collect all player tags from ALL wars (including preparation) for roster tracking
        // FIX: Check both clan and opponent sides, as our clan may appear on either side
        const playerTags = new Set<string>();
        for (const war of allWars) {
          // Check if our clan is on the "clan" side
          if (war.clan && normalizeTag(war.clan.tag ?? "") === normalizedClanTag) {
            for (const member of war.clan.members ?? []) {
              if (member.tag) {
                playerTags.add(normalizeTag(member.tag));
              }
            }
          }
          // Also check if our clan is on the "opponent" side
          if (war.opponent && normalizeTag(war.opponent.tag ?? "") === normalizedClanTag) {
            for (const member of war.opponent.members ?? []) {
              if (member.tag) {
                playerTags.add(normalizeTag(member.tag));
              }
            }
          }
        }

        // Process each player - use only wars with attack data for stats
        for (const playerTag of playerTags) {
          const playerData = processPlayerFromWars(warsWithAttacks, playerTag, normalizedClanTag);

          if (playerData.attacks === 0) continue;

          totalPlayersProcessed++;

          // Get or create player career stats
          let player = playerMap.get(playerTag);
          if (!player) {
            player = {
              name: playerData.latestName ?? "Unknown",
              tag: playerTag,
              th: playerData.latestTH,
              wars: 0,
              attacks: 0,
              stars: 0,
              avgStars: 0,
              destruction: 0,
              avgDestruction: 0,
              triples: 0,
              starBuckets: {
                zeroStars: 0,
                oneStars: 0,
                twoStars: 0,
                threeStars: 0,
              },
              clan: clanName,
              clanTag: normalizedClanTag,
              seasons: [],
            };
            playerMap.set(playerTag, player);
          }

          // Update name and TH if we have newer data
          if (playerData.latestName) player.name = playerData.latestName;
          if (playerData.latestTH) player.th = playerData.latestTH;
          player.clan = clanName; // Update to latest clan
          player.clanTag = normalizedClanTag;

          // Add season stats
          const seasonStats: PlayerSeasonStats = {
            season,
            clan: clanName,
            clanTag: normalizedClanTag,
            townHallLevel: playerData.latestTH,
            attacks: playerData.attacks,
            stars: playerData.stars,
            destruction: playerData.destruction,
            triples: playerData.triples,
            avgStars: playerData.attacks > 0 ? playerData.stars / playerData.attacks : 0,
            avgDestruction: playerData.attacks > 0 ? playerData.destruction / playerData.attacks : 0,
            warsParticipated: playerData.warsParticipated,
            starBuckets: playerData.starBuckets,
          };
          player.seasons.push(seasonStats);

          // Aggregate career stats
          player.wars += playerData.warsParticipated;
          player.attacks += playerData.attacks;
          player.stars += playerData.stars;
          player.destruction += playerData.destruction;
          player.triples += playerData.triples;
          player.starBuckets.zeroStars += playerData.starBuckets.zeroStars;
          player.starBuckets.oneStars += playerData.starBuckets.oneStars;
          player.starBuckets.twoStars += playerData.starBuckets.twoStars;
          player.starBuckets.threeStars += playerData.starBuckets.threeStars;
        }

        // Update clan stats - use only completed wars for accurate win/loss stats
        const clanStats = clanMap.get(normalizedClanTag)!;

        // Count all wars (including in-progress) for participation tracking
        clanStats.wars += allWars.length;

        // Count wins/losses/ties - only from wars with attack data
        for (const war of warsWithAttacks) {
          if (!war.clan || !war.opponent) continue;

          // Determine which side is our clan
          const isOurClanSide = normalizeTag(war.clan.tag ?? "") === normalizedClanTag;
          const ourSide = isOurClanSide ? war.clan : war.opponent;
          const theirSide = isOurClanSide ? war.opponent : war.clan;

          const ourStars = ourSide.stars ?? 0;
          const theirStars = theirSide.stars ?? 0;

          // Only count complete wars for W/L/T
          if (isWarComplete(war)) {
            if (ourStars > theirStars) {
              clanStats.warsWon++;
            } else if (ourStars < theirStars) {
              clanStats.warsLost++;
            } else {
              clanStats.warsTied++;
            }
          }

          clanStats.stars += ourStars;
          clanStats.destruction += ourSide.destructionPercentage ?? 0;
          clanStats.attacks += ourSide.attacks ?? 0;
        }

        await sleep(RATE_LIMIT_DELAY);

      } catch (error) {
        log(`Error processing ${clanName} ${season}: ${(error as Error).message}`, "error");
      }
    }

    if (seasonHasData) {
      totalSeasonsFetched++;
    }
  }

  // TIER 2: Populate defense data from season clan detail files
  log("\nPopulating defense data from season files...", "verbose");
  type RosterDefense = {
    timesAttacked?: number;
    starsAllowed?: number;
    avgStarsAllowed?: number;
    triplesAllowed?: number;
    defenseQuality?: number;
  };
  const seasonDefenseCache = new Map<string, Map<string, RosterDefense>>(); // key: season|clanTag

  for (const player of playerMap.values()) {
    for (const season of player.seasons) {
      const key = `${season.season}|${normalizeTag(season.clanTag)}`;
      let rosterMap = seasonDefenseCache.get(key);

      if (!rosterMap) {
        rosterMap = new Map<string, RosterDefense>();
        try {
          const clanTagNoHash = normalizeTag(season.clanTag).replace(/#/g, "");
          const seasonFile = path.join(HISTORY_DIR, "seasons", season.season, "clans", `${clanTagNoHash}.json`);
          if (fs.existsSync(seasonFile)) {
            const content = fs.readFileSync(seasonFile, "utf-8");
            const json = JSON.parse(content) as { roster?: Array<{ tag?: string } & RosterDefense> };
            if (Array.isArray(json.roster)) {
              for (const r of json.roster) {
                if (r.tag) {
                  rosterMap.set(normalizeTag(r.tag), {
                    timesAttacked: r.timesAttacked ?? 0,
                    starsAllowed: r.starsAllowed ?? 0,
                    avgStarsAllowed: r.avgStarsAllowed ?? 0,
                    triplesAllowed: r.triplesAllowed ?? 0,
                    defenseQuality: r.defenseQuality ?? 100,
                  });
                }
              }
            }
          }
        } catch (error) {
          // Ignore parse errors and missing files, but log for debugging
          console.error(
            `Failed to load defense data for ${season.season}|${season.clanTag}: ${(error as Error).message}`
          );
        }
        seasonDefenseCache.set(key, rosterMap);
      }

      const def = rosterMap.get(normalizeTag(player.tag));
      if (def) {
        season.timesAttacked = def.timesAttacked ?? 0;
        season.starsAllowed = def.starsAllowed ?? 0;
        season.avgStarsAllowed = def.avgStarsAllowed ?? 0;
        season.triplesAllowed = def.triplesAllowed ?? 0;
        season.defenseQuality = def.defenseQuality ?? 100;
      }
    }
  }

  // TIER 3: Populate league tier data from CSV files
  log("\nPopulating league tier data from CSV files...", "verbose");

  // Build a map of clanTag+season -> leagueName from CSV files
  const leagueTierCache = new Map<string, string>(); // key: clanTag|season -> leagueName
  const csvDir = path.join("public", "data", "mix csv");

  if (fs.existsSync(csvDir)) {
    const csvFiles = fs.readdirSync(csvDir).filter(f => f.endsWith("-clan-war-leagues.csv"));
    log(`Found ${csvFiles.length} league CSV files`, "verbose");

    for (const csvFile of csvFiles) {
      try {
        const content = fs.readFileSync(path.join(csvDir, csvFile), "utf-8");
        const lines = content.split("\n").filter(line => line.trim());

        if (lines.length < 2) continue;

        // Parse header to find column indices
        const header = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
        const tagIdx = header.indexOf("Tag");
        const seasonIdx = header.indexOf("Season");
        const leagueNameIdx = header.indexOf("League Name");

        if (tagIdx === -1 || seasonIdx === -1 || leagueNameIdx === -1) continue;

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          // Simple CSV parsing (handles quoted fields)
          const fields: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const char of lines[i]) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              fields.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          fields.push(current.trim());

          const clanTag = normalizeTag(fields[tagIdx] ?? "");
          const season = fields[seasonIdx] ?? "";
          const leagueName = fields[leagueNameIdx]?.replace(/"/g, "") ?? "";

          if (clanTag && season && leagueName) {
            leagueTierCache.set(`${clanTag}|${season}`, leagueName);
          }
        }
      } catch (error) {
        log(`Error parsing CSV ${csvFile}: ${(error as Error).message}`, "verbose");
      }
    }
    log(`Loaded ${leagueTierCache.size} league tier entries`, "verbose");

    // TIER 4: Populate TH data from war-statistics CSV files
    log("\nPopulating TH data from war-statistics CSV files...", "verbose");
    const warStatFiles = fs.readdirSync(csvDir).filter(f => f.endsWith("-war-statistics.csv"));
    log(`Found ${warStatFiles.length} war-statistics CSV files`, "verbose");

    const playerThMap = new Map<string, number>(); // playerTag -> TH (most recent/highest)

    for (const csvFile of warStatFiles) {
      try {
        const content = fs.readFileSync(path.join(csvDir, csvFile), "utf-8");
        const lines = content.split("\n").filter(line => line.trim());

        if (lines.length < 2) continue;

        // Parse header to find column indices
        const header = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
        const tagIdx = header.indexOf("Tag");
        const avgThIdx = header.indexOf("Average TH");

        if (tagIdx === -1 || avgThIdx === -1) continue;

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          // Simple CSV parsing (handles quoted fields)
          const fields: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const char of lines[i]) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              fields.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          fields.push(current.trim());

          const playerTag = normalizeTag(fields[tagIdx] ?? "");
          const avgTh = parseFloat(fields[avgThIdx] ?? "0");

          if (playerTag && avgTh > 0) {
            // Round the average TH to get integer TH level
            const thLevel = Math.round(avgTh);
            // Keep the highest TH level we've seen for this player
            const existing = playerThMap.get(playerTag) ?? 0;
            if (thLevel > existing) {
              playerThMap.set(playerTag, thLevel);
            }
          }
        }
      } catch (error) {
        log(`Error parsing CSV ${csvFile}: ${(error as Error).message}`, "verbose");
      }
    }
    log(`Loaded TH data for ${playerThMap.size} players`, "verbose");

    // Apply TH to players from war-statistics CSV
    for (const player of playerMap.values()) {
      const th = playerThMap.get(normalizeTag(player.tag));
      if (th) {
        player.th = th;
      }
    }

    // TIER 5: Also read TH from individual player files as fallback
    log("\nPopulating TH data from individual player files...", "verbose");
    const playersDir = path.join("public", "data", "players");
    let playerFilesRead = 0;
    let playerThUpdated = 0;

    if (fs.existsSync(playersDir)) {
      const playerFiles = fs.readdirSync(playersDir).filter(f => f.endsWith(".json"));

      for (const playerFile of playerFiles) {
        try {
          const content = fs.readFileSync(path.join(playersDir, playerFile), "utf-8");
          const playerData = JSON.parse(content);

          const playerTag = normalizeTag(playerData.playerTag ?? "");
          const player = playerMap.get(playerTag);

          if (player && playerData.seasons && Array.isArray(playerData.seasons)) {
            playerFilesRead++;

            // Get the most recent TH from the seasons array (sorted newest first)
            let latestTH: number | null = null;
            for (const season of playerData.seasons) {
              if (season.th && typeof season.th === "number") {
                latestTH = season.th;
                break; // First season is newest
              }
            }

            // Also check root-level th
            if (!latestTH && playerData.th && typeof playerData.th === "number") {
              latestTH = playerData.th;
            }

            if (latestTH && (!player.th || latestTH > player.th)) {
              player.th = latestTH;
              playerThUpdated++;
            }
          }
        } catch {
          // Silently skip invalid files
        }
      }
      log(`Read ${playerFilesRead} player files, updated TH for ${playerThUpdated} players`, "verbose");
    }
  }

  // Apply league tier to each player's seasons
  for (const player of playerMap.values()) {
    for (const season of player.seasons) {
      const key = `${normalizeTag(season.clanTag)}|${season.season}`;
      const leagueTier = leagueTierCache.get(key);
      if (leagueTier) {
        season.leagueTier = leagueTier;
      }
    }
  }

  // Calculate final stats for each player
  for (const player of playerMap.values()) {
    player.avgStars = player.attacks > 0 ? player.stars / player.attacks : 0;
    player.avgDestruction = player.attacks > 0 ? player.destruction / player.attacks : 0;

    // TIER 1: Calculate three-star rate
    player.threeStarRate = player.attacks > 0 ? (player.triples / player.attacks) * 100 : 0;

    // TIER 3: Calculate advanced reliability score with weighted components
    // Formula: (Performance × 0.45) + (Attendance × 0.35) + (LeagueAdj × 0.20)
    {
      // Performance component (0-100): based on avgStars and threeStarRate
      // avgStars contribution: (avgStars / 3) * 50  (max 50 points for 3-star average)
      // threeStarRate contribution: (threeStarRate / 100) * 50  (max 50 points for 100% three-star rate)
      const avgStarsContrib = (player.avgStars / 3) * 50;
      const threeStarContrib = (player.threeStarRate / 100) * 50;
      const performanceScore = Math.min(100, avgStarsContrib + threeStarContrib);

      // Attendance component (0-100): ratio of attacks to wars
      const attendanceScore = player.wars > 0 ? Math.min(100, (player.attacks / player.wars) * 100) : 0;

      // League adjustment component (0-100): weighted average of league tiers across seasons
      // Players who competed in higher leagues (Champion I, II, III) get higher scores
      let totalLeagueScore = 0;
      let totalLeagueWeight = 0;

      for (const season of player.seasons) {
        const leagueTier = season.leagueTier;
        const leagueScore = leagueTier && LEAGUE_TIER_SCORES[leagueTier] !== undefined
          ? LEAGUE_TIER_SCORES[leagueTier]
          : DEFAULT_LEAGUE_SCORE;

        // Weight by number of attacks in the season (more active seasons matter more)
        const weight = season.attacks;
        totalLeagueScore += leagueScore * weight;
        totalLeagueWeight += weight;
      }

      const leagueAdjScore = totalLeagueWeight > 0 ? totalLeagueScore / totalLeagueWeight : DEFAULT_LEAGUE_SCORE;

      // Final weighted reliability score
      const weightedScore =
        (performanceScore * RELIABILITY_WEIGHTS.performance) +
        (attendanceScore * RELIABILITY_WEIGHTS.attendance) +
        (leagueAdjScore * RELIABILITY_WEIGHTS.leagueAdj);

      player.reliabilityScore = weightedScore;
      player.reliabilityBreakdown = {
        performance: Math.round(performanceScore * 100) / 100,
        attendance: Math.round(attendanceScore * 100) / 100,
        leagueAdj: Math.round(leagueAdjScore * 100) / 100,
        weighted: Math.round(weightedScore * 100) / 100,
      };

      // Calculate league history for projections
      const leagueCounts = new Map<string, { seasons: number; attacks: number }>();
      for (const season of player.seasons) {
        if (season.leagueTier) {
          const existing = leagueCounts.get(season.leagueTier) ?? { seasons: 0, attacks: 0 };
          existing.seasons += 1;
          existing.attacks += season.attacks;
          leagueCounts.set(season.leagueTier, existing);
        }
      }

      // Build league history array sorted by attacks (most experience first)
      const leagueHistory = Array.from(leagueCounts.entries())
        .map(([leagueTier, data]) => ({
          leagueTier,
          seasonsPlayed: data.seasons,
          attacksInLeague: data.attacks,
        }))
        .sort((a, b) => b.attacksInLeague - a.attacksInLeague);

      if (leagueHistory.length > 0) {
        player.leagueHistory = leagueHistory;
        player.primaryLeague = leagueHistory[0].leagueTier;
      }
    }

    // TIER 1: Calculate missed attacks
    player.missedAttacks = player.wars - player.attacks;

    // TIER 2: Aggregate defense metrics across seasons
    {
      let totalTimesAttacked = 0;
      let totalStarsAllowed = 0;
      let totalTriplesAllowed = 0;
      for (const s of player.seasons) {
        totalTimesAttacked += s.timesAttacked ?? 0;
        totalStarsAllowed += s.starsAllowed ?? 0;
        totalTriplesAllowed += s.triplesAllowed ?? 0;
      }
      player.totalTimesAttacked = totalTimesAttacked;
      player.totalStarsAllowed = totalStarsAllowed;
      player.totalTriplesAllowed = totalTriplesAllowed;
      const careerAvgStarsAllowed = totalTimesAttacked > 0 ? totalStarsAllowed / totalTimesAttacked : 0;
      player.careerAvgStarsAllowed = careerAvgStarsAllowed;
      player.careerDefenseQuality = totalTimesAttacked > 0 ? Math.max(0, 100 - (careerAvgStarsAllowed / 3) * 100) : 100;
    }

    // TIER 1: Identify best season
    if (player.seasons.length > 0) {
      let bestSeason = player.seasons[0];
      for (const season of player.seasons) {
        if (season.stars > bestSeason.stars ||
          (season.stars === bestSeason.stars && season.avgStars > bestSeason.avgStars)) {
          bestSeason = season;
        }
      }
      player.bestSeason = {
        season: bestSeason.season,
        stars: bestSeason.stars,
        avgStars: bestSeason.avgStars
      };
    }

    // TIER 1: Calculate performance trend (compare recent 3 vs earlier seasons)
    // Performance trend threshold: difference in avgStars to consider significant change
    const PERFORMANCE_TREND_THRESHOLD = 0.15;

    if (player.seasons.length >= 4) {
      const recentSeasons = player.seasons.slice(-3);
      const earlierSeasons = player.seasons.slice(0, -3);

      const recentAvg = recentSeasons.reduce((sum, s) => sum + s.avgStars, 0) / recentSeasons.length;
      const earlierAvg = earlierSeasons.reduce((sum, s) => sum + s.avgStars, 0) / earlierSeasons.length;

      const difference = recentAvg - earlierAvg;

      if (difference > PERFORMANCE_TREND_THRESHOLD) {
        player.performanceTrend = 'improving';
      } else if (difference < -PERFORMANCE_TREND_THRESHOLD) {
        player.performanceTrend = 'declining';
      } else {
        player.performanceTrend = 'stable';
      }
    } else if (player.seasons.length >= 2) {
      // For players with 2-3 seasons, compare last vs first
      const lastSeason = player.seasons[player.seasons.length - 1];
      const firstSeason = player.seasons[0];
      const difference = lastSeason.avgStars - firstSeason.avgStars;

      if (difference > PERFORMANCE_TREND_THRESHOLD) {
        player.performanceTrend = 'improving';
      } else if (difference < -PERFORMANCE_TREND_THRESHOLD) {
        player.performanceTrend = 'declining';
      } else {
        player.performanceTrend = 'stable';
      }
    }
  }

  // TIER 1: Calculate win rate for each clan
  for (const clan of clanMap.values()) {
    clan.winRate = clan.wars > 0 ? (clan.warsWon / clan.wars) * 100 : 0;
  }

  // Update clan player lists
  for (const player of playerMap.values()) {
    const clanStats = clanMap.get(player.clanTag);
    if (clanStats && !clanStats.players.includes(player.tag)) {
      clanStats.players.push(player.tag);
    }
  }

  log(`\n✓ Aggregation complete!`);
  log(`  - Seasons processed: ${totalSeasonsFetched}`);
  log(`  - Unique players: ${playerMap.size}`);
  log(`  - Player-season records: ${totalPlayersProcessed}`);

  // ============================================================================
  // Enrich TH from Season Clan Details (fallback for missing TH from API)
  // ============================================================================

  log("\nEnriching TH from season clan detail files...");

  const SEASONS_DIR = path.join(OUTPUT_DIR, "history", "seasons");
  let thEnrichedCount = 0;

  // Build a map of playerTag -> latest TH from season clan details
  const thFromSeasonDetails = new Map<string, { th: number; season: string }>();

  if (fs.existsSync(SEASONS_DIR)) {
    const seasonDirs = fs.readdirSync(SEASONS_DIR)
      .filter((d) => fs.statSync(path.join(SEASONS_DIR, d)).isDirectory())
      .sort(); // chronological order, so latest season will overwrite earlier ones

    for (const season of seasonDirs) {
      const clansDir = path.join(SEASONS_DIR, season, "clans");
      if (!fs.existsSync(clansDir)) continue;

      for (const clanTag of Object.values(FAMILY_CLANS).map((t) => t.replace("#", "").toUpperCase())) {
        const detailPath = path.join(clansDir, `${clanTag}.json`);
        if (!fs.existsSync(detailPath)) continue;

        try {
          const detail = JSON.parse(fs.readFileSync(detailPath, "utf8"));
          if (!detail.roster) continue;

          for (const player of detail.roster) {
            const tag = normalizeTag(player.tag ?? "");
            const th = player.townHallLevel;
            if (tag && th && th > 0) {
              thFromSeasonDetails.set(tag, { th, season });
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  log(`  Loaded TH for ${thFromSeasonDetails.size} players from season details`);

  // Enrich players with missing TH
  for (const player of playerMap.values()) {
    if (player.th === null || player.th === 0) {
      const thData = thFromSeasonDetails.get(player.tag);
      if (thData) {
        player.th = thData.th;
        thEnrichedCount++;
      }
    }
  }

  log(`  ✓ Enriched TH for ${thEnrichedCount} players`);

  // ============================================================================
  // Write Output Files
  // ============================================================================

  log("\nWriting output files...");

  // Write players.json (sorted by total stars)
  const players = Array.from(playerMap.values()).sort((a, b) => b.stars - a.stars);
  const playersOutput = players.map((p) => ({
    name: p.name,
    tag: p.tag,
    th: p.th,
    wars: p.wars,
    attacks: p.attacks,
    stars: p.stars,
    avgStars: Math.round(p.avgStars * 100) / 100,
    destruction: Math.round(p.destruction * 100) / 100,
    avgDestruction: Math.round(p.avgDestruction * 100) / 100,
    triples: p.triples,
    starBuckets: p.starBuckets,
    clan: p.clan,
    clanTag: p.clanTag,
    threeStarRate: Math.round(p.threeStarRate! * 100) / 100,
    reliabilityScore: Math.round(p.reliabilityScore! * 100) / 100,
    reliabilityBreakdown: p.reliabilityBreakdown,
    missedAttacks: p.missedAttacks,
    bestSeason: p.bestSeason,
    performanceTrend: p.performanceTrend,
    totalTimesAttacked: p.totalTimesAttacked ?? 0,
    totalStarsAllowed: p.totalStarsAllowed ?? 0,
    totalTriplesAllowed: p.totalTriplesAllowed ?? 0,
    careerAvgStarsAllowed: Math.round(((p.careerAvgStarsAllowed ?? 0) * 100)) / 100,
    careerDefenseQuality: Math.round(((p.careerDefenseQuality ?? 0) * 100)) / 100,
    // League history for projections
    primaryLeague: p.primaryLeague,
    leagueHistory: p.leagueHistory,
  }));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "players.json"),
    JSON.stringify(playersOutput, null, 2)
  );
  log(`  ✓ Written players.json (${players.length} players)`);

  // Write family.json
  const familyStats = {
    generatedAt: new Date().toISOString(),
    currentSeason: getCurrentSeason(),
    totalPlayers: playerMap.size,
    totalWars: Array.from(clanMap.values()).reduce((sum, c) => sum + c.wars, 0),
    totalStars: Array.from(clanMap.values()).reduce((sum, c) => sum + c.stars, 0),
    totalAttacks: Array.from(clanMap.values()).reduce((sum, c) => sum + c.attacks, 0),
    clans: Array.from(clanMap.values())
      .sort((a, b) => b.stars - a.stars)
      .map((c, i) => ({
        name: c.name,
        tag: c.tag,
        rank: i + 1,
        stars: c.stars,
        destruction: Math.round(c.destruction * 100) / 100,
        attacks: c.attacks,
        wars: c.wars,
        warsWon: c.warsWon,
        warsLost: c.warsLost,
        warsTied: c.warsTied,
        playerCount: c.players.length,
        winRate: Math.round(c.winRate! * 100) / 100,
        league: getLeagueForClan(c.tag),
      })),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "family.json"),
    JSON.stringify(familyStats, null, 2)
  );
  log(`  ✓ Written family.json`);

  // Write individual clan files
  for (const clan of clanMap.values()) {
    const clanPlayers = players.filter((p) => p.clanTag === clan.tag);

    const clanOutput = {
      generatedAt: new Date().toISOString(),
      currentSeason: getCurrentSeason(),
      clan: {
        name: clan.name,
        tag: clan.tag,
      },
      stats: {
        wars: clan.wars,
        warsWon: clan.warsWon,
        warsLost: clan.warsLost,
        warsTied: clan.warsTied,
        stars: clan.stars,
        destruction: Math.round(clan.destruction * 100) / 100,
        attacks: clan.attacks,
        winRate: Math.round(clan.winRate! * 100) / 100,
      },
      players: clanPlayers.map((p) => ({
        name: p.name,
        tag: p.tag,
        th: p.th,
        wars: p.wars,
        attacks: p.attacks,
        stars: p.stars,
        avgStars: Math.round(p.avgStars * 100) / 100,
        destruction: Math.round(p.destruction * 100) / 100,
        avgDestruction: Math.round(p.avgDestruction * 100) / 100,
        triples: p.triples,
        starBuckets: p.starBuckets,
        threeStarRate: Math.round(p.threeStarRate! * 100) / 100,
        reliabilityScore: Math.round(p.reliabilityScore! * 100) / 100,
        reliabilityBreakdown: p.reliabilityBreakdown,
        missedAttacks: p.missedAttacks,
      })),
    };

    fs.writeFileSync(
      path.join(CLANS_DIR, `${clan.tag.replace(/#/g, "")}.json`),
      JSON.stringify(clanOutput, null, 2)
    );
    log(`  ✓ Written ${clan.name}.json (${clanPlayers.length} players)`);
  }

  log("\n✅ All files written successfully!");
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(argv: string[]): {
  refresh: boolean;
  refreshCurrent: boolean;
  start: string | null;
  verbose: boolean;
  help: boolean;
  offline: boolean;
} {
  const args = {
    refresh: false,
    refreshCurrent: false,
    start: null as string | null,
    verbose: false,
    help: false,
    offline: false,
  };

  for (const arg of argv) {
    if (arg === "--refresh") {
      args.refresh = true;
    } else if (arg === "--refresh-current") {
      args.refreshCurrent = true;
    } else if (arg === "--offline") {
      args.offline = true;
    } else if (arg.startsWith("--start=")) {
      args.start = arg.replace("--start=", "");
    } else if (arg === "--verbose" || arg === "-v") {
      args.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Comprehensive CWL Data Aggregation Script

Usage:
  npx tsx scripts/aggregate-all-seasons.ts [options]

Options:
  --refresh          Force refresh all data from API (ignore cache)
  --refresh-current  Refresh only current season from API, use cache for history
  --offline          Use only cached data, skip all API calls (fastest)
  --start=YYYY-MM    Start from specific season (e.g., --start=2021-11)
  --verbose, -v      Show detailed progress logs
  --help, -h         Show this help message

Examples:
  npx tsx scripts/aggregate-all-seasons.ts
  npx tsx scripts/aggregate-all-seasons.ts --refresh
  npx tsx scripts/aggregate-all-seasons.ts --refresh-current
  npx tsx scripts/aggregate-all-seasons.ts --start=2021-11 --verbose
  npx tsx scripts/aggregate-all-seasons.ts --refresh --start=2021-11

Output Files:
  public/data/players.json         - Complete player statistics across all seasons
  public/data/family.json          - Family-wide aggregated statistics
  public/data/clans/*.json         - Individual clan files with player data

Rate Limiting:
  - \${RATE_LIMIT_DELAY}ms delay between requests
  - \${MAX_RETRIES} retries with exponential backoff
  - Cached responses to minimize API calls
`);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  // Set offline mode before processing
  if (args.offline) {
    setOfflineMode(true);
  }

  try {
    await aggregateAllData(args.refresh, args.start, args.refreshCurrent);
  } catch (error) {
    log(`Fatal error: ${(error as Error).message}`, "error");
    console.error(error);
    process.exit(1);
  }
}

main();
