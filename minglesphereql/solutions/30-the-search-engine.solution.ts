import { getPool } from '../shared/connection.js';

/**
 * Chapter 30: The Search Engine - SOLUTIONS
 */

export async function fullTextSearch(searchTerm: string): Promise<any[]> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT id, username, display_name,
       ts_rank(
         to_tsvector('english', COALESCE(bio, '') || ' ' || COALESCE(display_name, '')),
         plainto_tsquery('english', $1)
       ) as rank
     FROM users
     WHERE to_tsvector('english', COALESCE(bio, '') || ' ' || COALESCE(display_name, ''))
           @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC`,
    [searchTerm]
  );

  return result.rows;
}

export async function createFullTextIndex(): Promise<{ created: boolean }> {
  const pool = getPool();

  // Create a GIN index for full-text search across bio and display_name
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_fts
    ON users
    USING GIN(to_tsvector('english', COALESCE(bio, '') || ' ' || COALESCE(display_name, '')))
  `);

  // Verify the index exists
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_users_fts'`
  );

  return { created: result.rows.length > 0 };
}

export async function trigramSearch(searchTerm: string): Promise<any[]> {
  const pool = getPool();

  // Set a low similarity threshold for broader matching
  await pool.query(`SET pg_trgm.similarity_threshold = 0.1`);

  const result = await pool.query(
    `SELECT id, username, display_name, similarity(username, $1) as sim_score
     FROM users
     WHERE username % $1 OR similarity(username, $1) > 0.1
     ORDER BY sim_score DESC`,
    [searchTerm]
  );

  return result.rows;
}

export async function createTrigramIndex(): Promise<{ created: boolean }> {
  const pool = getPool();

  // Create a GIN index using trigram operators for fuzzy matching
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_trgm_username
    ON users USING GIN(username gin_trgm_ops)
  `);

  // Verify the index exists
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_users_trgm_username'`
  );

  return { created: result.rows.length > 0 };
}

export async function combinedSearch(searchTerm: string): Promise<any[]> {
  const pool = getPool();

  // Set a low similarity threshold for broader matching
  await pool.query(`SET pg_trgm.similarity_threshold = 0.1`);

  const result = await pool.query(
    `SELECT id, username, display_name, bio,
       ts_rank(to_tsvector('english', COALESCE(bio, '')), plainto_tsquery('english', $1)) as fts_rank,
       similarity(username, $1) as trgm_score
     FROM users
     WHERE to_tsvector('english', COALESCE(bio, '')) @@ plainto_tsquery('english', $1)
        OR similarity(username, $1) > 0.1
     ORDER BY (ts_rank(to_tsvector('english', COALESCE(bio, '')), plainto_tsquery('english', $1)) + similarity(username, $1)) DESC`,
    [searchTerm]
  );

  return result.rows;
}
