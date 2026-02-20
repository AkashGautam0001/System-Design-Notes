import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/30-the-search-engine.solution.ts'
  : './exercise.ts';

const {
  fullTextSearch,
  createFullTextIndex,
  trigramSearch,
  createTrigramIndex,
  combinedSearch,
} = await import(exercisePath);

describe('Chapter 30: The Search Engine', () => {
  beforeEach(async () => {
    const pool = getPool();
    // Drop custom search indexes
    await pool.query('DROP INDEX IF EXISTS idx_users_fts');
    await pool.query('DROP INDEX IF EXISTS idx_users_trgm_username');
    await clearAllTables();

    // Ensure pg_trgm extension is enabled
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    // Seed users with meaningful bios and display names for search
    await pool.query(
      `INSERT INTO users (username, email, display_name, bio) VALUES
        ('alice_dev', 'alice@test.com', 'Alice Developer', 'Full-stack engineer who loves building web applications and open source projects'),
        ('bob_designer', 'bob@test.com', 'Bob the Designer', 'Creative designer specializing in user experience and interface design'),
        ('charlie_data', 'charlie@test.com', 'Charlie Data', 'Data scientist exploring machine learning and artificial intelligence'),
        ('diana_devops', 'diana@test.com', 'Diana DevOps', 'DevOps engineer passionate about infrastructure automation and cloud computing'),
        ('eve_engineer', 'eve@test.com', 'Eve Engineer', 'Software engineer focused on building scalable distributed systems')`
    );
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query('DROP INDEX IF EXISTS idx_users_fts');
    await pool.query('DROP INDEX IF EXISTS idx_users_trgm_username');
    await closeConnection();
  });

  it('should perform full-text search across user bios and display names', async () => {
    const results = await fullTextSearch('engineer');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // At least alice (Full-stack engineer) and eve (Software engineer) should match
    const usernames = results.map((r: any) => r.username);
    expect(usernames).toContain('eve_engineer');
    // Results should have a rank score
    for (const row of results) {
      expect(row.rank).toBeDefined();
      expect(parseFloat(row.rank)).toBeGreaterThan(0);
    }
  });

  it('should create a GIN full-text search index and verify it exists', async () => {
    const result = await createFullTextIndex();
    expect(result.created).toBe(true);

    // Verify the index uses GIN
    const pool = getPool();
    const check = await pool.query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_users_fts'`
    );
    expect(check.rows.length).toBe(1);
    expect(check.rows[0].indexdef.toLowerCase()).toContain('gin');
  });

  it('should perform trigram fuzzy search on usernames', async () => {
    const results = await trigramSearch('alice');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // alice_dev should be the best match
    expect(results[0].username).toBe('alice_dev');
    expect(parseFloat(results[0].sim_score)).toBeGreaterThan(0);
  });

  it('should create a GIN trigram index on usernames and verify it exists', async () => {
    const result = await createTrigramIndex();
    expect(result.created).toBe(true);

    // Verify the index uses GIN with trigram ops
    const pool = getPool();
    const check = await pool.query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_users_trgm_username'`
    );
    expect(check.rows.length).toBe(1);
    expect(check.rows[0].indexdef.toLowerCase()).toContain('gin_trgm_ops');
  });

  it('should perform a combined full-text and trigram search', async () => {
    const results = await combinedSearch('engineer');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // Results should have both fts_rank and trgm_score
    for (const row of results) {
      expect(row.fts_rank).toBeDefined();
      expect(row.trgm_score).toBeDefined();
    }
  });
});
