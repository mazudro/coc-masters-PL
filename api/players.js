/* global process, console */
import { Pool } from 'pg';

// Pool is shared across invocations
let pool;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // simple health/test endpoint: ?test=1
    if (req.query.test) {
      const pool = getPool();
      const { rows } = await pool.query('SELECT now() AS now');
      return res.json({ now: rows[0].now });
    }

    // Use a configured query from env for players
    const query = process.env.PLAYERS_QUERY;
    if (!query) {
      return res.status(400).json({
        error: 'PLAYERS_QUERY not configured. Set an env var with a SELECT that returns player rows, or call with ?test=1'
      });
    }

    const pool = getPool();
    const { rows } = await pool.query(query);
    return res.json(rows);
  } catch (err) {
    console.error('players proxy error', err);
    return res.status(500).json({ error: err.message || 'internal error' });
  }
}
