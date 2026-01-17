/**
 * Builds a player-to-seasons index to optimize player history loading.
 * 
 * This function scans all season directories in the history folder,
 * extracts player information from clan roster files, and creates
 * an index mapping each player tag to the seasons they participated in.
 * 
 * @remarks
 * The index reduces player history loading from 100+ requests to ~10 requests
 * by allowing direct lookup of which seasons contain a player's data.
 * 
 * The function performs the following steps:
 * 1. Reads all season directories from the history folder
 * 2. For each season, processes all clan JSON files
 * 3. Extracts player tags from clan rosters
 * 4. Builds an index mapping player tags to their season/clan entries
 * 5. Sorts each player's entries chronologically (newest first)
 * 6. Saves the index to `public/data/player-seasons-index.json`
 * 
 * @returns A promise that resolves when the index has been built and saved
 * 
 * @throws Will log an error and exit with code 1 if the build process fails
 * 
 * @example
 * ```ts
 * // Run the build process
 * await buildPlayerSeasonsIndex();
 * 
 * // Resulting index structure:
 * // {
 * //   "#PLAYER123": [
 * //     { season: "2021-11", clanTag: "#CLAN456" },
 * //     { season: "2023-12", clanTag: "#CLAN789" }
 * //   ]
 * // }
 * ```
/**
 * Build a player-to-seasons index to optimize player history loading.
 * 
 * Instead of loading 100+ season files to find a player's history,
 * this creates an index that maps player tags to the seasons they participated in.
 * 
 * The index maps: playerTag -> [{ season, clanTag }]
 * 
 * This reduces player history loading from 100+ requests to ~10 requests.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PlayerSeasonEntry {
  season: string;
  clanTag: string;
}

type PlayerSeasonsIndex = Record<string, PlayerSeasonEntry[]>;

async function buildPlayerSeasonsIndex() {
  console.log('Building player-seasons index...\n');

  const historyDir = path.join(__dirname, '../public/data/history/seasons');

  if (!fs.existsSync(historyDir)) {
    console.log('No history directory found. Skipping player-seasons index generation.');
    return;
  }

  const index: PlayerSeasonsIndex = {};

  // Get all season directories
  const seasons = fs.readdirSync(historyDir)
    .filter(f => {
      const stat = fs.statSync(path.join(historyDir, f));
      return stat.isDirectory();
    })
    .sort(); // Chronological order

  console.log(`Found ${seasons.length} seasons to process\n`);

  // Process each season
  for (const season of seasons) {
    const clansDir = path.join(historyDir, season, 'clans');

    if (!fs.existsSync(clansDir)) {
      continue;
    }

    // Get all clan files in this season
    const clanFiles = fs.readdirSync(clansDir)
      .filter(f => f.endsWith('.json'));

    console.log(`  ${season}: Processing ${clanFiles.length} clans...`);

    for (const clanFile of clanFiles) {
      const clanTag = clanFile.replace('.json', '');
      const filePath = path.join(clansDir, clanFile);

      try {
        const clanData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (!clanData.roster || !Array.isArray(clanData.roster)) {
          continue;
        }

        // Add each player to the index
        for (const player of clanData.roster) {
          if (!player.tag) continue;

          const playerTag = player.tag;

          if (!index[playerTag]) {
            index[playerTag] = [];
          }

          // Add this season entry (avoid duplicates)
          const exists = index[playerTag].some(
            entry => entry.season === season && entry.clanTag === clanTag
          );

          if (!exists) {
            index[playerTag].push({
              season,
              clanTag
            });
          }
        }
      } catch (err) {
        console.error(`    Error processing ${clanFile}:`, err);
      }
    }
  }

  // Sort each player's seasons chronologically (newest first)
  for (const playerTag in index) {
    index[playerTag].sort((a, b) => b.season.localeCompare(a.season));
  }

  // Save the index
  const outputPath = path.join(__dirname, '../public/data/player-seasons-index.json');
  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2), 'utf-8');

  const playerCount = Object.keys(index).length;
  const totalEntries = Object.values(index).reduce((sum, arr) => sum + arr.length, 0);

  console.log(`\n✓ Built player-seasons index`);
  console.log(`  Players: ${playerCount}`);
  console.log(`  Total season entries: ${totalEntries}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`  File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);
}

buildPlayerSeasonsIndex().catch(err => {
  console.error('Failed to build player-seasons index:', err);
  process.exit(1);
});
