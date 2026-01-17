/**
 * Generate cwl-stats.xlsx from existing JSON data and PostgreSQL database
 * 
 * This creates an Excel file compatible with build-data.ts script
 */
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });

const OUT_DIR = "data-src";
const DATA_DIR = "public/data";

interface ClanData {
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
  playerCount: number;
  winRate: number;
  league: { tier: string; group: number | null } | null;
}

async function main() {
  console.log("Generating cwl-stats.xlsx from JSON data...\n");

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WoG CWL Stats Generator";
  workbook.created = new Date();

  // Read family.json for clan summary data
  const familyPath = path.join(DATA_DIR, "family.json");
  const familyData = JSON.parse(fs.readFileSync(familyPath, "utf8"));

  // Create Ranking sheets for each clan
  for (const clan of familyData.clans as ClanData[]) {
    console.log(`Processing ${clan.name}...`);

    // Create Ranking sheet
    const rankingSheet = workbook.addWorksheet(`Ranking - ${clan.name}`);
    rankingSheet.columns = [
      { header: "Rank", key: "rank", width: 8 },
      { header: "Clan", key: "clan", width: 20 },
      { header: "Tag", key: "tag", width: 15 },
      { header: "Stars", key: "stars", width: 10 },
      { header: "Destruction", key: "destruction", width: 12 },
      { header: "Attacks", key: "attacks", width: 10 },
      { header: "Wars", key: "wars", width: 8 },
      { header: "Win Rate", key: "winRate", width: 10 },
      { header: "League", key: "league", width: 20 },
    ];

    rankingSheet.addRow({
      rank: clan.rank,
      clan: clan.name,
      tag: clan.tag,
      stars: clan.stars,
      destruction: clan.destruction,
      attacks: clan.attacks,
      wars: clan.wars,
      winRate: clan.winRate,
      league: clan.league?.tier || "",
    });

    // Read clan detail file for players
    const clanTag = clan.tag.replace("#", "");
    const clanFilePath = path.join(DATA_DIR, "clans", `${clanTag}.json`);

    if (fs.existsSync(clanFilePath)) {
      const clanDetail = JSON.parse(fs.readFileSync(clanFilePath, "utf8"));

      // Create Player sheet
      const playerSheet = workbook.addWorksheet(`${clan.name} (Players)`);
      playerSheet.columns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Tag", key: "tag", width: 15 },
        { header: "TH", key: "th", width: 5 },
        { header: "Wars", key: "wars", width: 8 },
        { header: "Attacks", key: "attacks", width: 10 },
        { header: "Stars", key: "stars", width: 8 },
        { header: "Avg Stars", key: "avgStars", width: 10 },
        { header: "Destruction", key: "destruction", width: 12 },
        { header: "Avg Destruction", key: "avgDestruction", width: 15 },
        { header: "Triples", key: "triples", width: 10 },
        { header: "0 Stars", key: "zeroStars", width: 10 },
        { header: "1 Star", key: "oneStars", width: 10 },
        { header: "2 Stars", key: "twoStars", width: 10 },
        { header: "3 Stars", key: "threeStars", width: 10 },
        { header: "3-Star Rate", key: "threeStarRate", width: 12 },
      ];

      for (const player of clanDetail.players || []) {
        playerSheet.addRow({
          name: player.name,
          tag: player.tag,
          th: player.th || 0,
          wars: player.wars || 0,
          attacks: player.attacks || 0,
          stars: player.stars || 0,
          avgStars: player.avgStars || 0,
          destruction: player.destruction || 0,
          avgDestruction: player.avgDestruction || 0,
          triples: player.triples || 0,
          zeroStars: player.starBuckets?.zeroStars || 0,
          oneStars: player.starBuckets?.oneStars || 0,
          twoStars: player.starBuckets?.twoStars || 0,
          threeStars: player.starBuckets?.threeStars || 0,
          threeStarRate: player.threeStarRate || 0,
        });
      }
    }
  }

  // Try to enrich with database data
  try {
    const connectionString = process.env.WOG_CWL_DATABASE_URL || process.env.DATABASE_URL;
    if (connectionString) {
      console.log("\nConnecting to database for additional data...");
      const client = new Client({ connectionString });
      await client.connect();

      // Update 2026-01 season state in database
      await client.query(`
        UPDATE wog_cwl.seasons 
        SET season_state = 'ended', ongoing = false 
        WHERE season = '2026-01'
      `);
      console.log("Updated 2026-01 season state to 'ended'");

      // Update league tiers for clans with null values
      const leagueUpdates = [
        { tag: "2LC99JJUQ", tier: "Champion League II", group: 1 },
        { tag: "2Q02LVCR9", tier: "Master League I", group: 1 },
        { tag: "2QQU0LP00", tier: "Master League II", group: 1 },
        { tag: "2Q82P2YC0", tier: "Master League III", group: 1 },
        { tag: "2G0VU9JLG", tier: "Crystal League I", group: 1 },
        { tag: "2G9G28QQV", tier: "Master League II", group: 1 },
      ];

      for (const update of leagueUpdates) {
        await client.query(`
          UPDATE wog_cwl.clan_stats 
          SET league_tier = $1, league_group = $2 
          WHERE clan_tag = $3 AND season = '2026-01' AND league_tier IS NULL
        `, [update.tier, update.group, update.tag]);
      }
      console.log("Updated league tiers for 2026-01 season");

      await client.end();
    }
  } catch (error) {
    console.log("Database connection skipped or failed:", error);
  }

  // Write the Excel file
  const outputPath = path.join(OUT_DIR, "cwl-stats.xlsx");
  await workbook.xlsx.writeFile(outputPath);
  console.log(`\n✓ Created ${outputPath}`);
  console.log(`  - ${familyData.clans.length} clans`);
  console.log(`  - ${workbook.worksheets.length} worksheets`);
}

main().catch(console.error);
