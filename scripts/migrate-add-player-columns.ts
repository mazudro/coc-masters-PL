import { Client } from "pg";

/**
 * Migration: Add new player career stats columns
 * 
 * This updates the players table with new columns for:
 * - Career aggregated stats
 * - Defense stats  
 * - Reliability scores
 * - League history
 * - Performance tracking
 */

const MIGRATION_DDL = `
-- Add new columns to players table for career stats
ALTER TABLE players ADD COLUMN IF NOT EXISTS current_clan_tag VARCHAR(20);
ALTER TABLE players ADD COLUMN IF NOT EXISTS current_clan_name VARCHAR(100);

-- Career aggregated stats
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_wars INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_attacks INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_stars INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_triples INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS career_avg_stars DECIMAL(4,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS career_avg_destruction DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS three_star_rate DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS missed_attacks INTEGER DEFAULT 0;

-- Defense stats
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_times_attacked INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_stars_allowed INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_triples_allowed INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS career_avg_stars_allowed DECIMAL(4,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS career_defense_quality DECIMAL(5,2);

-- Reliability score
ALTER TABLE players ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS reliability_performance DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS reliability_attendance DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS reliability_league_adj DECIMAL(5,2);

-- League history
ALTER TABLE players ADD COLUMN IF NOT EXISTS primary_league VARCHAR(50);
ALTER TABLE players ADD COLUMN IF NOT EXISTS league_history JSONB;

-- Performance tracking
ALTER TABLE players ADD COLUMN IF NOT EXISTS best_season JSONB;
ALTER TABLE players ADD COLUMN IF NOT EXISTS performance_trend VARCHAR(20);

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_players_reliability ON players(reliability_score DESC);
CREATE INDEX IF NOT EXISTS idx_players_clan ON players(current_clan_tag);
CREATE INDEX IF NOT EXISTS idx_players_primary_league ON players(primary_league);
`;

async function runMigration() {
  const connectionString = process.env.WOG_CWL_DATABASE_URL;

  if (!connectionString) {
    console.error("❌ WOG_CWL_DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log("Connecting to Neon Postgres...");
    await client.connect();

    // Set search path
    await client.query("SET search_path TO wog_cwl, public");
    console.log("✅ Connected\n");

    console.log("Running schema migration...");
    await client.query(MIGRATION_DDL);
    console.log("✅ Migration complete\n");

    // Verify columns
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'wog_cwl' AND table_name = 'players'
      ORDER BY ordinal_position
    `);

    console.log("Players table columns:");
    result.rows.forEach((row) => {
      console.log(`  • ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\n✅ Done!");
  }
}

runMigration();
