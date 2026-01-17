/**
 * Create player detail files for quick lookup by player tag
 * Converts aggregated data into per-player detail files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

interface PlayerCareerStats {
  playerTag: string;
  playerName: string;
  th?: number;
  seasons: PlayerSeasonStats[];
  totalStars: number;
  totalAttacks: number;
  totalWars: number;
  avgStars: number;
  avgDestruction: number;
  seasons_count: number;
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

  console.log(`Creating player detail files for ${aggregatedData.length} players...\n`);

  const playersDir = path.join(__dirname, '../public/data/players');
  if (!fs.existsSync(playersDir)) {
    fs.mkdirSync(playersDir, { recursive: true });
  }

  let processedCount = 0;

  for (const player of aggregatedData) {
    try {
      // CoC Masters PL family-only filter
      const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8'];
      const familySeasons = (player.allSeasons || []).filter(s => FAMILY_CLAN_TAGS.includes((s.clanTag || '').replace('#','')));
      if (familySeasons.length === 0) continue;

      // Recompute totals from family seasons
      const totalStars = familySeasons.reduce((sum, s) => sum + (s.stars || 0), 0);
      const totalAttacks = familySeasons.reduce((sum, s) => sum + (s.attacks || 0), 0);
      const totalWars = familySeasons.reduce((sum, s) => sum + (s.warsParticipated || 0), 0);
      const avgStars = totalAttacks > 0 ? Math.round((totalStars / totalAttacks) * 100) / 100 : 0;
      const avgDestruction = totalAttacks > 0 ? Math.round((familySeasons.reduce((sum, s) => sum + (s.destruction || 0), 0) / totalAttacks) * 100) / 100 : 0;

      const careerStats: PlayerCareerStats = {
        playerTag: player.playerTag,
        playerName: player.playerName,
        th: player.th,
        seasons: familySeasons.sort((a, b) => b.season.localeCompare(a.season)),
        totalStars,
        totalAttacks,
        totalWars,
        avgStars,
        avgDestruction,
        seasons_count: new Set(familySeasons.map(s => s.season)).size,
      };

      // Sanitize tag for filename (remove #)
      const fileTag = player.playerTag.replace(/^#/, '');
      const playerPath = path.join(playersDir, `${fileTag}.json`);
      fs.writeFileSync(playerPath, JSON.stringify(careerStats, null, 2));
      processedCount++;

      if (processedCount % 1000 === 0) {
        console.log(`  Created ${processedCount} player files...`);
      }
    } catch (error) {
      console.error(`Error creating file for player ${player.playerTag}:`, (error as Error).message);
    }
  }

  console.log(`\n✓ Created ${processedCount} player detail files in ${playersDir}\n`);

  // Also create a combined index for efficient lookup
  const playerIndex = aggregatedData.map(p => ({
    tag: p.playerTag,
    name: p.playerName,
    th: p.th || 0,
    totalStars: p.totalStars,
    totalAttacks: p.totalAttacks,
    seasons: p.seasons,
  }));

  const indexPath = path.join(__dirname, '../public/data/players-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(playerIndex, null, 2));
  console.log(`✓ Created player index at ${indexPath}`);
}

main().catch(console.error);
