/**
 * Build script that converts CWL (Clan War League) statistics from an Excel file
 * into JSON data files for the CoC Masters PL clan family.
 *
 * @remarks
 * This script reads from `data-src/cwl-stats.xlsx` and generates:
 * - `public/data/family.json` - Summary of all clans with total stars
 * - `public/data/clans/{tag}.json` - Individual clan data with player rosters
 * - `public/data/players.json` - Combined player statistics across all clans
 *
 * The Excel file is expected to have:
 * - Ranking sheets named "Ranking - {ClanName}" with clan standings
 * - Player sheets named "{ClanName} ({...})" with individual player stats
 *
 * @example
 * ```bash
 * npx tsx scripts/build-data.ts
 * ```
 */
// scripts/build-data.ts
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = "data-src";
const OUT_DIR = "public/data";
fs.mkdirSync(path.join(OUT_DIR, "clans"), { recursive: true });

type LeagueInfo = { tier: string; group: number | null };
type ClanRow = { name: string; tag: string; rank: number; stars: number; destruction: number; attacks: number; league?: LeagueInfo | null };
type PlayerRow = {
  name: string;
  tag: string;
  th: number | null;
  wars: number | null;
  attacks: number | null;
  stars: number;
  avgStars: number | null;
  triples?: number;
  starBuckets?: {
    zeroStars: number;
    oneStars: number;
    twoStars: number;
    threeStars: number;
  };
};

// CoC Masters PL family clans:
// - coc masters PL (#P0J2J8GJ) - main clan
// - Akademia CoC PL (#JPRPRVUY) - academy
// - Psychole! (#29RYVJ8C8) - training
const CLANS: Record<string, string> = {
  "coc masters PL": "#P0J2J8GJ",
  "Akademia CoC PL": "#JPRPRVUY",
  "Psychole!": "#29RYVJ8C8",
};

const cwlPath = path.join(SRC_DIR, "cwl-stats.xlsx");
if (!fs.existsSync(cwlPath)) {
  console.error(`[build-data] Missing ${cwlPath}. Put your XLSX there.`);
  process.exit(0);
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(cwlPath);
function clanStanding(name: string, tag: string): ClanRow | null {
  const sheet = workbook.worksheets.find(ws => ws.name.startsWith("Ranking - ") && ws.name.includes(name));
  if (!sheet) return null;

  const headerValues = (sheet.getRow(1).values as Array<unknown>).map(v => (typeof v === "string" ? v : String(v ?? "")).trim());
  const colIndex = (...cands: string[]) => {
    for (const c of cands) {
      const idx = headerValues.findIndex(h => h === c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const clanCol = colIndex("Clan");
  const tagCol = colIndex("Tag", "Clan Tag");
  const rankCol = colIndex("Rank");
  const starsCol = colIndex("Stars", "Total Stars");
  const destrCol = colIndex("Destruction");
  const attacksCol = colIndex("Attacks", "Number of Attacks");

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const clanName = String(row.getCell(clanCol).value ?? "");
    const clanTag = String(row.getCell(tagCol).value ?? "");
    if (!clanName && !clanTag) continue;
    if (clanName.includes(name) || clanTag.includes(tag)) {
      return {
        name,
        tag,
        rank: Number(row.getCell(rankCol).value ?? -1),
        stars: Number(row.getCell(starsCol).value ?? 0),
        destruction: Number(row.getCell(destrCol).value ?? 0),
        attacks: Number(row.getCell(attacksCol).value ?? 0),
      };
    }
  }
  return null;
}

function playersForClan(name: string): PlayerRow[] {
  const sheet = workbook.worksheets.find(ws => ws.name.startsWith(name + " ("));
  if (!sheet) return [];

  const headerValues = (sheet.getRow(1).values as Array<unknown>).map(v => (typeof v === "string" ? v : String(v ?? "")).trim());
  const colIndex = (...cands: string[]) => {
    for (const c of cands) {
      const idx = headerValues.findIndex(h => h === c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameCol = colIndex("Name", "Player Name");
  const tagCol = colIndex("Tag", "Player Tag");
  const thCol = colIndex("Town Hall", "TH");
  const warsCol = colIndex("Wars Participated", "Wars");
  const attacksCol = colIndex("Number of Attacks", "Attacks");
  const starsCol = colIndex("Total Stars", "Stars", "True Stars");
  const avgStarsCol = colIndex("Avg. Stars", "Avg Stars", "Avg. True Stars");
  const triplesCol = colIndex("Triples", "3-Star Attacks", "3 Star Attacks");
  const zeroStarsCol = colIndex("0 Stars", "0★", "Zero Stars");
  const oneStarsCol = colIndex("1 Stars", "1★", "One Stars");
  const twoStarsCol = colIndex("2 Stars", "2★", "Two Stars");
  const threeStarsCol = colIndex("3 Stars", "3★", "Three Stars");

  const out: PlayerRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const nameVal = String(row.getCell(nameCol).value ?? "").trim();
    if (!nameVal) continue;

    const player: PlayerRow = {
      name: nameVal,
      tag: String(row.getCell(tagCol).value ?? "").trim(),
      th: Number(row.getCell(thCol).value ?? 0) || null,
      wars: Number(row.getCell(warsCol).value ?? 0) || null,
      attacks: Number(row.getCell(attacksCol).value ?? 0) || null,
      stars: Number(row.getCell(starsCol).value ?? 0) || 0,
      avgStars: Number(row.getCell(avgStarsCol).value ?? 0) || null,
    };

    // Add triples if column exists
    if (triplesCol !== -1) {
      player.triples = Number(row.getCell(triplesCol).value ?? 0) || 0;
    }

    // Add star buckets if columns exist
    if (zeroStarsCol !== -1 && oneStarsCol !== -1 && twoStarsCol !== -1 && threeStarsCol !== -1) {
      player.starBuckets = {
        zeroStars: Number(row.getCell(zeroStarsCol).value ?? 0) || 0,
        oneStars: Number(row.getCell(oneStarsCol).value ?? 0) || 0,
        twoStars: Number(row.getCell(twoStarsCol).value ?? 0) || 0,
        threeStars: Number(row.getCell(threeStarsCol).value ?? 0) || 0,
      };
    }

    out.push(player);
  }
  return out;
}

// ---- Helper to get league from most recent season data ----
function getLeagueForClan(clanTag: string): LeagueInfo | null {
  const cleanTag = clanTag.replace("#", "");
  const seasonsDir = path.join(OUT_DIR, "history", "seasons");

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

// ---- Build family + per-clan + players ----
const family: ClanRow[] = [];
const playersAll: (PlayerRow & { clan: string; clanTag: string })[] = [];

for (const [name, tag] of Object.entries(CLANS)) {
  const cs = clanStanding(name, tag);
  const league = getLeagueForClan(tag);

  // Always add to family, even if missing from sheets
  const clanSummary: ClanRow = cs ? { ...cs, league } : {
    name,
    tag,
    rank: -1,
    stars: 0,
    destruction: 0,
    attacks: 0,
    league,
  };
  family.push(clanSummary);

  const plist = playersForClan(name);
  const out = { ...clanSummary, players: plist };
  fs.writeFileSync(path.join(OUT_DIR, "clans", tag.replace("#", "") + ".json"), JSON.stringify(out, null, 2), "utf8");

  plist.forEach(p => playersAll.push({ ...p, clan: name, clanTag: tag }));
}

family.sort((a, b) => b.stars - a.stars || a.rank - b.rank);
const totalFamilyStars = family.reduce((s, c) => s + (c.stars || 0), 0);

fs.writeFileSync(path.join(OUT_DIR, "family.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalFamilyStars,
  clans: family
}, null, 2), "utf8");

playersAll.sort((a, b) => (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(OUT_DIR, "players.json"), JSON.stringify(playersAll, null, 2), "utf8");

console.log("[build-data] Data build complete.");
