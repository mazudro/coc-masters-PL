/**
 * Update League CSV files with latest CWL season data
 * 
 * This script:
 * 1. Scans CWL cache files for completed seasons
 * 2. Gets league tier from Official CoC API (current) or infers from previous season
 * 3. Calculates position from clan_rankings array order
 * 4. Appends new rows to CSV files matching existing format
 * 
 * Run after each CWL season ends (around day 8-20 of month):
 * npx tsx scripts/update-league-csv.ts
 * 
 * @module update-league-csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, 'tmp', 'cwl-cache');
const CSV_DIR = path.join(ROOT_DIR, 'public', 'data', 'mix csv');

// Official CoC API for current league info
const COC_API_KEY = process.env.COC_API_KEY || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImFmMDcyYjU1LWVlNWQtNGQ1Yy1hOWI4LTYzOTlkOTJiMTU0OSIsImlhdCI6MTc3MDk4MzI5MSwic3ViIjoiZGV2ZWxvcGVyL2I0MTQ5NGFmLWI0YTYtMDhhZi1jNmI5LWQxYjY5MWJkOTMzNCIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjIxMi4xMjkuNzYuMjE4Il0sInR5cGUiOiJjbGllbnQifV19.hsKa2SNaAj-AT6IEb0q0Aw5F3IscjSuWaMQHVwclydTQwxII-zi4jN4RTI1Tesus0jI0TN5CLVBm2TzUlDtb1w";

const FAMILY_CLANS = [
  { name: "coc masters PL", tag: "#P0J2J8GJ", csvName: "P0J2J8GJ" },
  { name: "Akademia CoC PL", tag: "#JPRPRVUY", csvName: "JPRPRVUY" },
  { name: "Psychole!", tag: "#29RYVJ8C8", csvName: "29RYVJ8C8" },
];

// League ID mapping (from Official CoC API)
const LEAGUE_IDS: Record<string, number> = {
  "Unranked": 48000000,
  "Bronze League III": 48000001,
  "Bronze League II": 48000002,
  "Bronze League I": 48000003,
  "Silver League III": 48000004,
  "Silver League II": 48000005,
  "Silver League I": 48000006,
  "Gold League III": 48000007,
  "Gold League II": 48000008,
  "Gold League I": 48000009,
  "Crystal League III": 48000010,
  "Crystal League II": 48000011,
  "Crystal League I": 48000012,
  "Master League III": 48000013,
  "Master League II": 48000014,
  "Master League I": 48000015,
  "Champion League III": 48000016,
  "Champion League II": 48000017,
  "Champion League I": 48000018,
};

interface ClanRanking {
  name: string;
  tag: string;
  stars: number;
  destruction: number;
  rounds: { won: number; tied: number; lost: number };
}

interface CWLCacheData {
  state: string;
  season: string;
  clans: Array<{
    tag: string;
    name: string;
    members: Array<{ tag: string; name: string; townHallLevel: number }>;
  }>;
  clan_rankings?: ClanRanking[];
}

interface CSVRow {
  tag: string;
  name: string;
  season: string;
  leagueId: number;
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

interface ExistingCSVData {
  seasons: Set<string>;
  lastLeague: string | null;
}

// Parse existing CSV to find what seasons we have and last known league
function parseExistingCSV(csvPath: string): ExistingCSVData {
  const result: ExistingCSVData = { seasons: new Set(), lastLeague: null };
  
  if (!fs.existsSync(csvPath)) {
    return result;
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n').slice(1); // Skip header
  
  let latestSeason = '';
  
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 5) {
      const season = parts[2];
      const leagueName = parts[4].replace(/"/g, '');
      result.seasons.add(season);
      
      if (season > latestSeason) {
        latestSeason = season;
        result.lastLeague = leagueName;
      }
    }
  }
  
  return result;
}

// Fetch current league from Official CoC API
async function fetchCurrentLeague(tag: string): Promise<string | null> {
  const encodedTag = encodeURIComponent(tag);
  const url = `https://api.clashofclans.com/v1/clans/${encodedTag}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${COC_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`    ⚠️  CoC API error ${response.status} - using fallback`);
      return null;
    }
    
    const data = await response.json();
    return data.warLeague?.name || null;
  } catch {
    console.log(`    ⚠️  CoC API fetch failed - using fallback`);
    return null;
  }
}

// Calculate star counts from war data in cache
function calculateStarCounts(cacheData: CWLCacheData, clanTag: string): { threeStars: number; twoStars: number; oneStar: number; zeroStars: number } {
  let threeStars = 0, twoStars = 0, oneStar = 0, zeroStars = 0;
  
  // Find clan in data
  const clan = cacheData.clans?.find(c => c.tag === clanTag);
  const clanWithRounds = clan as { rounds?: Array<{ attacks?: Array<{ stars?: number }> }> };
  if (!clan || !clanWithRounds.rounds) {
    return { threeStars: 0, twoStars: 0, oneStar: 0, zeroStars: 0 };
  }
  
  // Iterate through rounds/wars to count stars
  for (const round of clanWithRounds.rounds || []) {
    if (!round.attacks) continue;
    for (const attack of round.attacks) {
      const stars = attack.stars || 0;
      if (stars === 3) threeStars++;
      else if (stars === 2) twoStars++;
      else if (stars === 1) oneStar++;
      else zeroStars++;
    }
  }
  
  return { threeStars, twoStars, oneStar, zeroStars };
}

// Format CSV row
function formatCSVRow(row: CSVRow): string {
  return [
    row.tag,
    row.name,
    row.season,
    row.leagueId,
    `"${row.leagueName}"`,
    row.position,
    row.size,
    row.stars,
    row.destruction,
    row.threeStars,
    row.twoStars,
    row.oneStar,
    row.zeroStars,
    row.victories,
    row.defeats,
    row.draws
  ].join(',');
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('Update League CSV Files');
  console.log('='.repeat(60));
  
  // Ensure CSV directory exists
  if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
    console.log(`Created CSV directory: ${CSV_DIR}`);
  }
  
  // Get all cache files
  if (!fs.existsSync(CACHE_DIR)) {
    console.error('❌ Cache directory not found. Run npm run fetch first.');
    process.exit(1);
  }
  
  const cacheFiles = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${cacheFiles.length} cache files\n`);
  
  // Process each clan
  for (const clan of FAMILY_CLANS) {
    console.log(`\n📊 Processing ${clan.name} (${clan.tag})...`);
    
    const csvPath = path.join(CSV_DIR, `${clan.csvName}-clan-war-leagues.csv`);
    const existingData = parseExistingCSV(csvPath);
    
    console.log(`  Existing CSV seasons: ${existingData.seasons.size}`);
    console.log(`  Last known league: ${existingData.lastLeague || 'Unknown'}`);
    
    // Get current league from API (for recently completed seasons)
    const currentLeague = await fetchCurrentLeague(clan.tag);
    console.log(`  Current league (API): ${currentLeague || 'N/A'}`);
    
    // Find cache files for this clan
    const clanCacheFiles = cacheFiles.filter(f => f.startsWith(clan.csvName));
    const newRows: CSVRow[] = [];
    
    for (const cacheFile of clanCacheFiles) {
      const season = cacheFile.replace(`${clan.csvName}-`, '').replace('.json', '');
      
      // Skip if already in CSV
      if (existingData.seasons.has(season)) {
        continue;
      }
      
      const cachePath = path.join(CACHE_DIR, cacheFile);
      const cacheData: CWLCacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      
      // Only process completed seasons
      if (cacheData.state !== 'ended') {
        console.log(`  ⏳ ${season}: Still in progress, skipping`);
        continue;
      }
      
      // Find clan in rankings
      const rankings = cacheData.clan_rankings || [];
      const clanRankIndex = rankings.findIndex(r => r.tag === clan.tag);
      
      if (clanRankIndex === -1) {
        console.log(`  ⚠️  ${season}: Clan not found in rankings`);
        continue;
      }
      
      const ranking = rankings[clanRankIndex];
      const position = clanRankIndex + 1; // 1-indexed position
      
      // Determine league name
      // Use current API league for most recent season, otherwise use last known or infer
      const leagueName = currentLeague || existingData.lastLeague || 'Crystal League I';
      
      // For older missing seasons, we'd need to infer from position changes
      // Position 1 = promoted, Position 7-8 = demoted (typically)
      
      // Find clan roster size
      const clanData = cacheData.clans?.find(c => c.tag === clan.tag);
      const size = clanData?.members?.length || 15;
      
      // Calculate star breakdown (approximate from total if detailed not available)
      const starCounts = calculateStarCounts(cacheData, clan.tag);
      
      const leagueId = LEAGUE_IDS[leagueName] || 48000012; // Default to Crystal I
      
      const row: CSVRow = {
        tag: clan.tag,
        name: clan.name,
        season,
        leagueId,
        leagueName,
        position,
        size,
        stars: ranking.stars,
        destruction: Math.round(ranking.destruction * 100), // Convert to percentage points
        threeStars: starCounts.threeStars,
        twoStars: starCounts.twoStars,
        oneStar: starCounts.oneStar,
        zeroStars: starCounts.zeroStars,
        victories: ranking.rounds.won,
        defeats: ranking.rounds.lost,
        draws: ranking.rounds.tied
      };
      
      newRows.push(row);
      console.log(`  ✓ ${season}: Position ${position}, ${ranking.stars}★, ${leagueName}`);
    }
    
    // Append new rows to CSV
    if (newRows.length > 0) {
      // Sort by season descending (newest first)
      newRows.sort((a, b) => b.season.localeCompare(a.season));
      
      // Check if CSV exists, if not create with header
      if (!fs.existsSync(csvPath)) {
        const header = 'Tag,Name,Season,"League ID","League Name",Position,Size,Stars,Destruction,"3 Stars","2 Stars","1 Star","0 Star",Victories,Defeats,Draws';
        fs.writeFileSync(csvPath, header + '\n');
        console.log(`  Created new CSV file`);
      }
      
      // Read existing content
      const existingContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = existingContent.trim().split('\n');
      const header = lines[0];
      const existingRows = lines.slice(1);
      
      // Add new rows and re-sort all by season descending
      const allRowLines = [...existingRows];
      for (const row of newRows) {
        allRowLines.push(formatCSVRow(row));
      }
      
      // Sort all rows by season (column 3) descending
      allRowLines.sort((a, b) => {
        const seasonA = a.split(',')[2];
        const seasonB = b.split(',')[2];
        return seasonB.localeCompare(seasonA);
      });
      
      // Write back
      const newContent = header + '\n' + allRowLines.join('\n') + '\n';
      fs.writeFileSync(csvPath, newContent);
      
      console.log(`  📝 Added ${newRows.length} new season(s) to CSV`);
    } else {
      console.log(`  ✓ CSV is up to date`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ CSV update complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Review CSV files in public/data/mix csv/');
  console.log('  2. Manually verify/fix league names if needed');
  console.log('  3. Run: npm run generate');
}

main().catch(console.error);
