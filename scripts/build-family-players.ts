/**
 * Build consolidated family-only players file with season details and league info.
 * Input: public/data/players-aggregated.json (already enriched with CSVs)
 * Output: public/data/players-full.json
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

async function main() {
  const aggregatedPath = path.join(__dirname, '../public/data/players-aggregated.json');
  if (!fs.existsSync(aggregatedPath)) {
    console.error('Missing aggregated file at', aggregatedPath);
    process.exit(1);
  }

  // CoC Masters PL family clan tags (without # prefix)
  const FAMILY_CLAN_TAGS = ['P0J2J8GJ', 'JPRPRVUY', '29RYVJ8C8'];
  const players: AggregatedPlayer[] = JSON.parse(fs.readFileSync(aggregatedPath, 'utf-8'));

  const consolidated = players
    .map(p => {
      const familySeasons = (p.allSeasons || []).filter(s => FAMILY_CLAN_TAGS.includes((s.clanTag || '').replace('#','')));
      if (familySeasons.length === 0) return null;

      const seasons = familySeasons
        .map(s => ({
          season: s.season,
          clanTag: (s.clanTag || ''),
          clanName: s.clanName,
          th: (s as { th?: number }).th || p.th || 0,
          warsParticipated: s.warsParticipated || 0,
          attacks: s.attacks || 0,
          stars: s.stars || 0,
          avgStars: s.attacks ? Math.round(((s.stars || 0) / s.attacks) * 100) / 100 : 0,
          avgDestruction: s.attacks ? Math.round(((s.destruction || 0) / s.attacks) * 100) / 100 : 0,
          leagueId: s.leagueId || null,
          leagueName: s.leagueName || null,
        }))
        .sort((a, b) => b.season.localeCompare(a.season));

      const totals = seasons.reduce((acc, s) => {
        acc.stars += s.stars; acc.attacks += s.attacks; acc.wars += s.warsParticipated; acc.destruction += s.avgDestruction * s.attacks; return acc;
      }, { stars: 0, attacks: 0, wars: 0, destruction: 0 });

      const avgStars = totals.attacks ? Math.round((totals.stars / totals.attacks) * 100) / 100 : 0;
      const avgDestruction = totals.attacks ? Math.round((totals.destruction / totals.attacks) * 100) / 100 : 0;

      const latest = seasons[0];
      const clans = Array.from(new Set(seasons.map(s => s.clanTag)));

      return {
        tag: p.playerTag,
        name: p.playerName,
        th: latest?.th || p.th || 0,
        clans,
        seasons_count: new Set(seasons.map(s => s.season)).size,
        totals: { stars: totals.stars, attacks: totals.attacks, wars: totals.wars, avgStars, avgDestruction },
        seasons,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.totals?.stars ?? 0) - (a?.totals?.stars ?? 0));

  const outPath = path.join(__dirname, '../public/data/players-full.json');
  fs.writeFileSync(outPath, JSON.stringify(consolidated, null, 2));
  console.log(`✓ Wrote consolidated family players: ${consolidated.length} → ${outPath}`);
}

main().catch(console.error);
