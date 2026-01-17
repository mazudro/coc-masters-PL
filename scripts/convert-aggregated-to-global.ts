/**
 * Converts aggregated CWL (Clan War League) player data to a simplified GlobalPlayer format
 * suitable for UI consumption.
 * 
 * This script:
 * - Reads player data from the aggregated JSON file
 * - Filters players to include only those with participation in family clans
 * - Recomputes statistics (stars, attacks, averages) based only on family clan seasons
 * - Outputs a simplified player list sorted by total stars
 * - Displays summary statistics and top 10 players
 * 
 * @remarks
 * The script uses a predefined list of family clan tags to filter relevant seasons.
 * Players without any family clan participation are excluded from the output.
 * 
 * @example
 * ```bash
 * npx tsx scripts/convert-aggregated-to-global.ts
 * ```
 * 
 * @throws Will exit with code 1 if the aggregated data file is not found
 */
/**
 * Convert aggregated CWL data to GlobalPlayer format for use in UI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AggregatedPlayer {
  playerTag: string;
  playerName: string;
  clanTag: string;
  clanName: string;
  allSeasons: Array<{
    clanTag: string;
    clanName: string;
    season: string;
    stars?: number;
    attacks?: number;
    th?: number;
  }>;
  totalStars: number;
  totalDestructions: number;
  totalAttacks: number;
  totalWars: number;
  avgStars: number;
  avgDestruction: number;
  th?: number;
  seasons: number;
}

interface GlobalPlayer {
  name: string;
  tag: string;
  clan: string;
  clanTag: string;
  th: number;
  stars: number;
  attacks: number;
  avgStars: number | null;
}

async function main() {
  const aggregatedPath = path.join(__dirname, '../public/data/players-aggregated.json');

  if (!fs.existsSync(aggregatedPath)) {
    console.error('aggregated data not found at', aggregatedPath);
    process.exit(1);
  }

  const aggregatedData: AggregatedPlayer[] = JSON.parse(
    fs.readFileSync(aggregatedPath, 'utf-8')
  );

  console.log(`Converting ${aggregatedData.length} aggregated players to GlobalPlayer format...\n`);

  // CoC Masters PL family clan tags (no '#')
  const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8'];

  // Convert to GlobalPlayer format (family-only)
  const globalPlayers: GlobalPlayer[] = aggregatedData
    .map(p => {
      const familySeasons = (p.allSeasons || []).filter(s => FAMILY_CLAN_TAGS.includes((s.clanTag || '').replace('#', '')));
      if (familySeasons.length === 0) return null;

      // Recompute totals based only on family seasons
      const stars = familySeasons.reduce((sum, s) => sum + (s.stars || 0), 0);
      const attacks = familySeasons.reduce((sum, s) => sum + (s.attacks || 0), 0);
      const avgStars = attacks > 0 ? Math.round((stars / attacks) * 100) / 100 : null;
      const latest = familySeasons.slice().sort((a, b) => b.season.localeCompare(a.season))[0];

      return {
        name: p.playerName,
        tag: p.playerTag,
        clan: latest?.clanName || p.clanName,
        clanTag: (latest?.clanTag || p.clanTag || '').replace('#', ''),
        th: (latest?.th ?? p.th ?? 0),
        stars,
        attacks,
        avgStars,
      } as GlobalPlayer;
    })
    .filter((x): x is GlobalPlayer => x !== null)
    .sort((a, b) => b.stars - a.stars); // Sort by total stars descending

  // Save to players.json
  const outputPath = path.join(__dirname, '../public/data/players.json');
  fs.writeFileSync(outputPath, JSON.stringify(globalPlayers, null, 2));

  console.log(`✓ Converted and saved ${globalPlayers.length} players to ${outputPath}\n`);

  // Summary statistics
  const totalStars = globalPlayers.reduce((sum, p) => sum + p.stars, 0);
  const totalAttacks = globalPlayers.reduce((sum, p) => sum + p.attacks, 0);
  const avgAttacksPerPlayer = (totalAttacks / globalPlayers.length).toFixed(2);
  const avgStarsPerAttack = (totalStars / totalAttacks).toFixed(2);

  console.log('Summary:');
  console.log(`  Total players: ${globalPlayers.length}`);
  console.log(`  Total stars: ${totalStars.toLocaleString()}`);
  console.log(`  Total attacks: ${totalAttacks.toLocaleString()}`);
  console.log(`  Avg attacks per player: ${avgAttacksPerPlayer}`);
  console.log(`  Avg stars per attack: ${avgStarsPerAttack}`);
  console.log(`\nTop 10 players:`);
  globalPlayers.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.tag}) - ${p.stars} stars in ${p.attacks} attacks`);
  });
}

main().catch(console.error);


