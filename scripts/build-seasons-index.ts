/**
 * Builds an index of all CWL (Clan War Leagues) seasons from historical data.
 * 
 * This script scans the history directory for season folders and reads league info
 * from CSV files in `public/data/mix csv/` to get accurate league names.
 * 
 * @remarks
 * The script expects:
 * - `public/data/history/seasons/<season-id>/family.json`
 * - `public/data/mix csv/<clan-tag>-clan-war-leagues.csv` (for league names)
 * 
 * The output file is written to:
 * - `public/data/history/seasons.json`
 * 
 * @example
 * Run this script using:
 * ```bash
 * npx tsx scripts/build-seasons-index.ts
 * ```
 * 
 * @module build-seasons-index
 */
// scripts/build-seasons-index.ts
import fs from "node:fs";
import path from "node:path";

const HISTORY_DIR = path.join("public", "data", "history", "seasons");
const CSV_DIR = path.join("public", "data", "mix csv");
const OUTPUT_FILE = path.join("public", "data", "history", "seasons.json");

// CoC Masters PL family clan tags (without #)
const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8'];

interface CsvLeagueRecord {
  clanTag: string;
  clanName: string;
  season: string;
  leagueId: string;
  leagueName: string;
  position: number;
  size: number;
  stars: number;
  destruction: number;
  victories: number;
  defeats: number;
  draws: number;
}

interface SeasonFamilyData {
  generatedAt: string;
  season: string;
  state: string | null;
  league: { tier: string; group: number | null } | null;
  clans: Array<{
    name: string | null;
    tag: string;
    rank: number;
    stars: number;
    destruction: number;
    rounds: { won: number; tied: number; lost: number };
    groupPosition: number | null;
  }>;
}

interface ClanSeasonLeague {
  clanTag: string;
  clanName: string;
  leagueId: string;
  leagueName: string;
  position: number;
  stars: number;
  destruction: number;
  wins: number;
  losses: number;
  draws: number;
}

interface SeasonEntry {
  season: string;
  state: string | null;
  clans: ClanSeasonLeague[];
}

interface SeasonIndex {
  generatedAt: string;
  seasons: SeasonEntry[];
}

/**
 * Parse a CSV file and return league records
 */
function parseCsvFile(filePath: string): CsvLeagueRecord[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) return []; // Header + at least one data row

  const records: CsvLeagueRecord[] = [];

  // Skip header (line 0), parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // CSV format: Tag,Name,Season,"League ID","League Name",Position,Size,Stars,Destruction,"3 Stars","2 Stars","1 Star","0 Star",Victories,Defeats,Draws
    const parts = line.split(',');
    if (parts.length < 16) continue;

    records.push({
      clanTag: parts[0].replace('#', ''),
      clanName: parts[1],
      season: parts[2],
      leagueId: parts[3],
      leagueName: parts[4].replace(/"/g, ''),
      position: parseInt(parts[5], 10) || 0,
      size: parseInt(parts[6], 10) || 0,
      stars: parseInt(parts[7], 10) || 0,
      destruction: parseInt(parts[8], 10) || 0,
      victories: parseInt(parts[13], 10) || 0,
      defeats: parseInt(parts[14], 10) || 0,
      draws: parseInt(parts[15], 10) || 0,
    });
  }

  return records;
}

/**
 * Load all league records from CSV files for all family clans
 */
function loadAllLeagueRecords(): Map<string, Map<string, CsvLeagueRecord>> {
  // Map: season -> clanTag -> record
  const seasonMap = new Map<string, Map<string, CsvLeagueRecord>>();

  for (const clanTag of FAMILY_CLAN_TAGS) {
    const csvPath = path.join(CSV_DIR, `${clanTag}-clan-war-leagues.csv`);
    const records = parseCsvFile(csvPath);

    for (const record of records) {
      if (!seasonMap.has(record.season)) {
        seasonMap.set(record.season, new Map());
      }
      seasonMap.get(record.season)!.set(record.clanTag, record);
    }
  }

  return seasonMap;
}

function main() {
  // Load league data from CSV files
  console.log(`[build-seasons-index] Loading league data from CSV files...`);
  const leagueData = loadAllLeagueRecords();
  console.log(`[build-seasons-index] Found ${leagueData.size} seasons in CSV data`);

  if (!fs.existsSync(HISTORY_DIR)) {
    console.log(`[build-seasons-index] No history directory found at ${HISTORY_DIR}`);
    process.exit(0);
  }

  const seasonDirs = fs
    .readdirSync(HISTORY_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort();

  const seasons: SeasonEntry[] = [];

  for (const seasonDir of seasonDirs) {
    const familyPath = path.join(HISTORY_DIR, seasonDir, "family.json");
    if (!fs.existsSync(familyPath)) continue;

    try {
      const familyData: SeasonFamilyData = JSON.parse(fs.readFileSync(familyPath, "utf8"));
      const seasonId = familyData.season;

      // Build clan list with league info from CSV
      const clans: ClanSeasonLeague[] = [];
      const csvSeasonData = leagueData.get(seasonId);

      for (const clan of familyData.clans) {
        const clanTag = clan.tag.replace('#', '');
        const csvRecord = csvSeasonData?.get(clanTag);

        if (csvRecord) {
          clans.push({
            clanTag: clanTag,
            clanName: csvRecord.clanName || clan.name || 'Unknown',
            leagueId: csvRecord.leagueId,
            leagueName: csvRecord.leagueName,
            position: csvRecord.position,
            stars: csvRecord.stars,
            destruction: csvRecord.destruction,
            wins: csvRecord.victories,
            losses: csvRecord.defeats,
            draws: csvRecord.draws,
          });
        } else {
          // Fallback to family.json data if no CSV record
          clans.push({
            clanTag: clanTag,
            clanName: clan.name || 'Unknown',
            leagueId: '',
            leagueName: familyData.league?.tier || 'Unknown',
            position: clan.rank,
            stars: clan.stars,
            destruction: clan.destruction,
            wins: clan.rounds?.won || 0,
            losses: clan.rounds?.lost || 0,
            draws: clan.rounds?.tied || 0,
          });
        }
      }

      seasons.push({
        season: seasonId,
        state: familyData.state,
        clans,
      });
    } catch (err) {
      console.warn(`[build-seasons-index] Failed to parse ${familyPath}:`, err);
    }
  }

  const index: SeasonIndex = {
    generatedAt: new Date().toISOString(),
    seasons,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), "utf8");
  console.log(`[build-seasons-index] Generated index with ${seasons.length} seasons`);
}

main();
