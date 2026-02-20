import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/31-the-similarity-engine.solution.ts'
  : './exercise.ts';

const {
  insertUserWithEmbedding,
  findSimilarUsers,
  createHNSWIndex,
  findUsersInEmbeddingRange,
  getEmbeddingStats,
} = await import(exercisePath);

/**
 * Generate a random vector of a given dimension with values between -1 and 1.
 */
function randomVector(dim: number): number[] {
  return Array.from({ length: dim }, () => Math.random() * 2 - 1);
}

/**
 * Generate a vector similar to the base vector by adding small noise.
 */
function similarVector(base: number[], noise: number = 0.1): number[] {
  return base.map((v) => v + (Math.random() * 2 - 1) * noise);
}

describe('Chapter 31: The Similarity Engine', () => {
  const DIM = 384;

  beforeEach(async () => {
    const pool = getPool();
    // Drop custom vector indexes
    await pool.query('DROP INDEX IF EXISTS idx_users_embedding_hnsw');
    await pool.query('DROP INDEX IF EXISTS idx_users_embedding_ivfflat');
    // Ensure pgvector extension is enabled
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await clearAllTables();
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query('DROP INDEX IF EXISTS idx_users_embedding_hnsw');
    await pool.query('DROP INDEX IF EXISTS idx_users_embedding_ivfflat');
    await closeConnection();
  });

  it('should insert a user with a vector embedding and return the row', async () => {
    const embedding = randomVector(DIM);
    const result = await insertUserWithEmbedding('vec_user', 'vec@test.com', embedding);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.username).toBe('vec_user');
    expect(result.email).toBe('vec@test.com');

    // Verify the embedding was stored
    const pool = getPool();
    const check = await pool.query(
      `SELECT embedding FROM users WHERE id = $1`,
      [result.id]
    );
    expect(check.rows[0].embedding).toBeDefined();
  });

  it('should find similar users based on cosine distance', async () => {
    const baseEmbedding = randomVector(DIM);
    const pool = getPool();

    // Insert a reference user
    const refResult = await pool.query(
      `INSERT INTO users (username, email, embedding) VALUES ($1, $2, $3::vector) RETURNING id`,
      ['ref_user', 'ref@test.com', `[${baseEmbedding.join(',')}]`]
    );
    const refId = refResult.rows[0].id;

    // Insert a similar user (close embedding)
    const closeEmb = similarVector(baseEmbedding, 0.05);
    await pool.query(
      `INSERT INTO users (username, email, embedding) VALUES ($1, $2, $3::vector)`,
      ['close_user', 'close@test.com', `[${closeEmb.join(',')}]`]
    );

    // Insert a dissimilar user (random embedding)
    const farEmb = randomVector(DIM);
    await pool.query(
      `INSERT INTO users (username, email, embedding) VALUES ($1, $2, $3::vector)`,
      ['far_user', 'far@test.com', `[${farEmb.join(',')}]`]
    );

    const results = await findSimilarUsers(refId, 5);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(2);
    // The closest user should be close_user (smallest distance)
    expect(results[0].username).toBe('close_user');
    expect(parseFloat(results[0].distance)).toBeLessThan(parseFloat(results[1].distance));
  });

  it('should create an HNSW index for vector similarity search', async () => {
    const result = await createHNSWIndex();
    expect(result.created).toBe(true);

    // Verify the index exists and uses hnsw
    const pool = getPool();
    const check = await pool.query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_users_embedding_hnsw'`
    );
    expect(check.rows.length).toBe(1);
    expect(check.rows[0].indexdef.toLowerCase()).toContain('hnsw');
  });

  it('should find users within a given embedding distance range', async () => {
    const baseEmbedding = randomVector(DIM);
    const pool = getPool();

    // Insert users at varying distances from the base embedding
    for (let i = 0; i < 5; i++) {
      const noise = 0.05 * (i + 1); // Increasing noise = increasing distance
      const emb = similarVector(baseEmbedding, noise);
      await pool.query(
        `INSERT INTO users (username, email, embedding) VALUES ($1, $2, $3::vector)`,
        [`range_user_${i}`, `range${i}@test.com`, `[${emb.join(',')}]`]
      );
    }

    // Search with a generous max distance
    const results = await findUsersInEmbeddingRange(baseEmbedding, 1.0, 10);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // All returned distances should be less than 1.0
    for (const row of results) {
      expect(parseFloat(row.distance)).toBeLessThan(1.0);
    }
    // Results should be ordered by distance ascending
    for (let i = 1; i < results.length; i++) {
      expect(parseFloat(results[i].distance)).toBeGreaterThanOrEqual(
        parseFloat(results[i - 1].distance)
      );
    }
  });

  it('should return embedding statistics for all users', async () => {
    const pool = getPool();

    // Insert some users with embeddings and some without
    await pool.query(
      `INSERT INTO users (username, email, embedding) VALUES ($1, $2, $3::vector)`,
      ['emb_user1', 'emb1@test.com', `[${randomVector(DIM).join(',')}]`]
    );
    await pool.query(
      `INSERT INTO users (username, email, embedding) VALUES ($1, $2, $3::vector)`,
      ['emb_user2', 'emb2@test.com', `[${randomVector(DIM).join(',')}]`]
    );
    await pool.query(
      `INSERT INTO users (username, email) VALUES ($1, $2)`,
      ['no_emb_user', 'noemb@test.com']
    );

    const stats = await getEmbeddingStats();
    expect(stats).toBeDefined();
    expect(stats.total_users).toBe(3);
    expect(stats.users_with_embeddings).toBe(2);
    expect(typeof stats.avg_norm).toBe('number');
    expect(stats.avg_norm).toBeGreaterThan(0);
  });
});
