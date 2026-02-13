/**
 * Fetch current clan data from Clash of Clans API
 * Updates league information for all CoC Masters PL clans
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });

// Official CoC API
const COC_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImFmMDcyYjU1LWVlNWQtNGQ1Yy1hOWI4LTYzOTlkOTJiMTU0OSIsImlhdCI6MTc3MDk4MzI5MSwic3ViIjoiZGV2ZWxvcGVyL2I0MTQ5NGFmLWI0YTYtMDhhZi1jNmI5LWQxYjY5MWJkOTMzNCIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjIxMi4xMjkuNzYuMjE4Il0sInR5cGUiOiJjbGllbnQifV19.hsKa2SNaAj-AT6IEb0q0Aw5F3IscjSuWaMQHVwclydTQwxII-zi4jN4RTI1Tesus0jI0TN5CLVBm2TzUlDtb1w";

const FAMILY_CLANS = [
  { name: "coc masters PL", tag: "#P0J2J8GJ" },
  { name: "Akademia CoC PL", tag: "#JPRPRVUY" },
  { name: "Psychole!", tag: "#29RYVJ8C8" },
];

interface ClanSearchResult {
  tag: string;
  name: string;
  type: string;
  location?: { id: number; name: string; countryCode: string };
  clanLevel: number;
  members: number;
  warLeague?: { id: number; name: string };
}

interface ClanApiResponse {
  tag: string;
  name: string;
  clanLevel: number;
  warLeague?: {
    id: number;
    name: string;
  };
  warWins: number;
  warTies: number;
  warLosses: number;
  members: number;
}

async function fetchClanFromApi(tag: string): Promise<ClanApiResponse | null> {
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
      console.error(`  Error ${response.status}: ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`  Fetch error:`, error);
    return null;
  }
}

async function searchFamilyClans(): Promise<ClanSearchResult[]> {
  console.log("\n🔍 Searching for family clans in Poland...");

  // Search for "coc masters" and "Akademia CoC" and "Psychole"
  const results: ClanSearchResult[] = [];

  // For CoC Masters PL family, we'll fetch each clan directly instead of searching
  // since the names are different
  console.log("  Fetching family clan data directly...\n");

  for (const clan of FAMILY_CLANS) {
    const data = await fetchClanFromApi(clan.tag);
    if (data) {
      results.push({
        tag: data.tag,
        name: data.name,
        type: "clan",
        clanLevel: data.clanLevel,
        members: data.members,
        warLeague: data.warLeague,
      });
      const league = data.warLeague?.name || "Unranked";
      console.log(`  📍 ${data.name} (${data.tag})`);
      console.log(`     Level: ${data.clanLevel} | Members: ${data.members} | League: ${league}`);
    }
  }

  return results;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Clash of Clans API - Family Clan Search");
  console.log("=".repeat(60));

  // First, fetch all family clans
  const searchResults = await searchFamilyClans();

  // Check for clans not in our list
  const knownTags = new Set(FAMILY_CLANS.map(c => c.tag));
  const unknownClans = searchResults.filter(c => !knownTags.has(c.tag));

  if (unknownClans.length > 0) {
    console.log("\n⚠️  Found clans NOT in our family list:");
    for (const clan of unknownClans) {
      console.log(`   - ${clan.name} (${clan.tag})`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Fetching Current Clan Data from Clash of Clans API");
  console.log("=".repeat(60));
  console.log("Fetching Current Clan Data from Clash of Clans API");
  console.log("=".repeat(60));

  const leagueData: Record<string, { tier: string; group: number }> = {};

  for (const clan of FAMILY_CLANS) {
    console.log(`\n📊 ${clan.name} (${clan.tag})...`);

    const data = await fetchClanFromApi(clan.tag);

    if (data) {
      const league = data.warLeague?.name || "Unknown";
      console.log(`  ✓ Clan Level: ${data.clanLevel}`);
      console.log(`  ✓ War League: ${league}`);
      console.log(`  ✓ Members: ${data.members}`);
      console.log(`  ✓ War Record: ${data.warWins}W / ${data.warTies}T / ${data.warLosses}L`);

      leagueData[clan.tag.replace("#", "")] = {
        tier: league,
        group: 1
      };
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log("\n" + "=".repeat(60));
  console.log("Current League Summary:");
  console.log("=".repeat(60));

  for (const clan of FAMILY_CLANS) {
    const tag = clan.tag.replace("#", "");
    const league = leagueData[tag]?.tier || "Unknown";
    console.log(`  ${clan.name}: ${league}`);
  }

  // Update the 2026-01 season files if needed
  console.log("\n📝 Updating 2026-01 season data...");

  const seasonPath = "public/data/history/seasons/2026-01/clans";

  for (const [tag, league] of Object.entries(leagueData)) {
    const filePath = path.join(seasonPath, `${tag}.json`);

    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

      if (data.league?.tier !== league.tier) {
        console.log(`  Updating ${tag}: ${data.league?.tier || 'null'} → ${league.tier}`);
        data.league = league;
        data.state = "ended";
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      } else {
        console.log(`  ${tag}: Already up to date (${league.tier})`);
      }
    }
  }

  // Update family.json for 2026-01
  const familyPath = "public/data/history/seasons/2026-01/family.json";
  if (fs.existsSync(familyPath)) {
    const familyData = JSON.parse(fs.readFileSync(familyPath, "utf8"));

    for (const clan of familyData.clans) {
      const tag = clan.tag.replace("#", "");
      if (leagueData[tag]) {
        clan.league = leagueData[tag].tier;
      }
    }

    fs.writeFileSync(familyPath, JSON.stringify(familyData, null, 2));
    console.log("  ✓ Updated family.json");
  }

  // Update main family.json
  const mainFamilyPath = "public/data/family.json";
  if (fs.existsSync(mainFamilyPath)) {
    const familyData = JSON.parse(fs.readFileSync(mainFamilyPath, "utf8"));

    for (const clan of familyData.clans) {
      const tag = clan.tag.replace("#", "");
      if (leagueData[tag]) {
        clan.league = {
          tier: leagueData[tag].tier,
          group: leagueData[tag].group
        };
      }
    }

    fs.writeFileSync(mainFamilyPath, JSON.stringify(familyData, null, 2));
    console.log("  ✓ Updated main family.json");
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
