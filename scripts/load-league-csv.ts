/**
 * Script to load CWL (Clan War Leagues) League data from CSV files and enrich player aggregated data.
 * 
 * @description
 * This script performs the following operations:
 * 1. Reads CSV files from the `public/data/mix csv` directory containing clan league history
 * 2. Parses clan league data including league IDs, names, positions, and performance metrics
 * 3. Loads the aggregated player data from `players-aggregated.json`
 * 4. Enriches each player's season statistics with corresponding league information
 * 5. Updates history season clan files with league tier information
 * 6. Outputs statistics about the enrichment process
 * 
 * @remarks
 * - Requires the aggregated players file to exist (run `npm run prebuild` first)
 * - CSV files should contain columns: Tag, Name, Season, League ID, League Name, Position, Size, Stars, etc.
 * - Maps season and clan tag combinations to their respective league data
 * 
 * @example
 * ```bash
 * # Run this script to enrich player data with league information
 * npx ts-node scripts/load-league-csv.ts
 * ```
 * 
 * @module load-league-csv
 */
/**
 * Load CWL League data from CSV files and enrich player aggregated data
 * Maps season -> league info (League ID, League Name)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ClanLeagueData {
  tag: string;
  name: string;
  season: string;
  leagueId: string;
  leagueName: string;
  position: number;
  size: number;
  stars: number;
  destruction: number;
  threeStars: number;
  twoStars: number;
  oneStar: number;
  zeroStars: number;
  victories: number;
  defeats: number;
  draws: number;
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
  th?: number;
  warLeague?: string;
  leagueId?: string;
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
  th?: number;
  seasons: number;
}

function parseCSVLine(line: string): string[] {
  // Handle quoted fields
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

function loadLeagueDataFromCSVs(): Map<string, ClanLeagueData[]> {
  const csvDir = path.join(__dirname, '../public/data/mix csv');
  const leagueDataMap = new Map<string, ClanLeagueData[]>();

  if (!fs.existsSync(csvDir)) {
    console.log(`CSV directory not found at ${csvDir}`);
    return leagueDataMap;
  }

  const files = fs.readdirSync(csvDir).filter((f) => f.endsWith('.csv'));
  console.log(`Found ${files.length} CSV files\n`);

  for (const file of files) {
    const filePath = path.join(csvDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Parse header
      const header = parseCSVLine(lines[0]);
      const indices = {
        tag: header.indexOf('Tag'),
        name: header.indexOf('Name'),
        season: header.indexOf('Season'),
        leagueId: header.indexOf('League ID'),
        leagueName: header.indexOf('League Name'),
        position: header.indexOf('Position'),
        size: header.indexOf('Size'),
        stars: header.indexOf('Stars'),
        destruction: header.indexOf('Destruction'),
        threeStars: header.indexOf('3 Stars'),
        twoStars: header.indexOf('2 Stars'),
        oneStar: header.indexOf('1 Star'),
        zeroStars: header.indexOf('0 Star'),
        victories: header.indexOf('Victories'),
        defeats: header.indexOf('Defeats'),
        draws: header.indexOf('Draws'),
      };

      // Parse data rows
      const clans: ClanLeagueData[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const fields = parseCSVLine(lines[i]);
        const clan: ClanLeagueData = {
          tag: fields[indices.tag]?.replace('#', '') || '',
          name: fields[indices.name] || '',
          season: fields[indices.season] || '',
          leagueId: fields[indices.leagueId] || '',
          leagueName: fields[indices.leagueName] || '',
          position: parseInt(fields[indices.position]) || 0,
          size: parseInt(fields[indices.size]) || 0,
          stars: parseInt(fields[indices.stars]) || 0,
          destruction: parseInt(fields[indices.destruction]) || 0,
          threeStars: parseInt(fields[indices.threeStars]) || 0,
          twoStars: parseInt(fields[indices.twoStars]) || 0,
          oneStar: parseInt(fields[indices.oneStar]) || 0,
          zeroStars: parseInt(fields[indices.zeroStars]) || 0,
          victories: parseInt(fields[indices.victories]) || 0,
          defeats: parseInt(fields[indices.defeats]) || 0,
          draws: parseInt(fields[indices.draws]) || 0,
        };

        clans.push(clan);
      }

      for (const clan of clans) {
        if (!leagueDataMap.has(clan.tag)) {
          leagueDataMap.set(clan.tag, []);
        }
        leagueDataMap.get(clan.tag)!.push(clan);
      }

      console.log(`  ✓ ${file}: ${clans.length} seasons loaded`);
    } catch (error) {
      console.error(`  ✗ Error reading ${file}:`, error);
    }
  }

  return leagueDataMap;
}

async function main() {
  console.log('Loading CWL League data from CSV files...\n');

  const leagueDataMap = loadLeagueDataFromCSVs();
  console.log(`\nLoaded ${leagueDataMap.size} clans with league history\n`);

  // Load aggregated players
  const aggregatedPath = path.join(__dirname, '../public/data/players-aggregated.json');
  if (!fs.existsSync(aggregatedPath)) {
    console.log('Aggregated players file not found. Run "npm run prebuild" first.');
    return;
  }

  const players: AggregatedPlayer[] = JSON.parse(fs.readFileSync(aggregatedPath, 'utf-8'));
  console.log(`Loaded ${players.length} players\n`);

  // Create season -> league info map for quick lookup
  const seasonLeagueMap = new Map<string, ClanLeagueData>();
  for (const [clanTag, seasons] of leagueDataMap) {
    for (const season of seasons) {
      const key = `${clanTag}|${season.season}`;
      seasonLeagueMap.set(key, season);
    }
  }

  // Enrich player data
  console.log('Enriching player data with league information...');
  let enrichedCount = 0;

  for (const player of players) {
    for (const seasonStats of player.allSeasons) {
      const seasonClanTag = (seasonStats.clanTag || player.clanTag || '').replace('#', '');
      const key = `${seasonClanTag}|${seasonStats.season}`;
      const leagueData = seasonLeagueMap.get(key);

      if (leagueData) {
        seasonStats.leagueId = leagueData.leagueId;
        seasonStats.leagueName = leagueData.leagueName;
        enrichedCount++;
      }
    }
  }

  console.log(`✓ Enriched ${enrichedCount} player-season records with league data\n`);

  // Save enriched data
  fs.writeFileSync(aggregatedPath, JSON.stringify(players, null, 2));
  console.log(`✓ Updated ${aggregatedPath}\n`);

  // Also enrich history season clan files with league name (tier)
  console.log('Updating history season files with league info...');
  let updatedHistory = 0;
  for (const [clanTag, seasons] of leagueDataMap) {
    for (const s of seasons) {
      const seasonDir = path.join(__dirname, `../public/data/history/seasons/${s.season}/clans`);
      const clanFile = path.join(seasonDir, `${clanTag}.json`);
      if (!fs.existsSync(clanFile)) continue;
      try {
        const data = JSON.parse(fs.readFileSync(clanFile, 'utf-8'));
        data.league = data.league || {};
        data.league.tier = s.leagueName || data.league.tier;
        // keep existing group if present; don't add unknown id field to avoid type mismatches
        fs.writeFileSync(clanFile, JSON.stringify(data, null, 2));
        updatedHistory++;
      } catch (e) {
        console.warn(`  ⚠️ Failed to update ${clanFile}:`, (e as Error).message);
      }
    }
  }
  console.log(`✓ Updated ${updatedHistory} season clan files with league names\n`);

  // Statistics
  const seasonsWithLeague = new Set(
    players.flatMap((p) =>
      p.allSeasons
        .filter((s) => s.leagueName)
        .map((s) => `${s.season}|${s.leagueName}`)
    )
  ).size;

  const uniqueLeagues = new Set(
    players.flatMap((p) =>
      p.allSeasons.filter((s) => s.leagueName).map((s) => s.leagueName)
    )
  );

  console.log('Summary:');
  console.log(`  Total players: ${players.length}`);
  console.log(`  Player-seasons with league: ${enrichedCount}`);
  console.log(`  Unique league-season combos: ${seasonsWithLeague}`);
  console.log(`  Unique leagues: ${Array.from(uniqueLeagues).sort().join(', ')}`);
}

main().catch(console.error);
