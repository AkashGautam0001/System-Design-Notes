import { getPool } from '../shared/connection.js';

/**
 * Chapter 31: The Similarity Engine - SOLUTIONS
 */

export async function insertUserWithEmbedding(
  username: string,
  email: string,
  embedding: number[]
): Promise<any> {
  const pool = getPool();

  // Convert the embedding array to the pgvector string format
  const embeddingStr = `[${embedding.join(',')}]`;

  const result = await pool.query(
    `INSERT INTO users (username, email, embedding)
     VALUES ($1, $2, $3::vector)
     RETURNING id, username, email`,
    [username, email, embeddingStr]
  );

  return result.rows[0];
}

export async function findSimilarUsers(userId: number, limit: number): Promise<any[]> {
  const pool = getPool();

  // Use cosine distance operator <=> to find the most similar users
  const result = await pool.query(
    `SELECT u2.id, u2.username,
       u2.embedding <=> (SELECT embedding FROM users WHERE id = $1) as distance
     FROM users u2
     WHERE u2.id != $1 AND u2.embedding IS NOT NULL
     ORDER BY distance ASC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

export async function createHNSWIndex(): Promise<{ created: boolean }> {
  const pool = getPool();

  // Create an HNSW index for approximate nearest neighbor search
  // m = 16: max number of connections per layer
  // ef_construction = 64: size of the dynamic candidate list during construction
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_embedding_hnsw
    ON users USING hnsw(embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `);

  // Verify the index exists
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_users_embedding_hnsw'`
  );

  return { created: result.rows.length > 0 };
}

export async function findUsersInEmbeddingRange(
  targetEmbedding: number[],
  maxDistance: number,
  limit: number
): Promise<any[]> {
  const pool = getPool();

  const embeddingStr = `[${targetEmbedding.join(',')}]`;

  const result = await pool.query(
    `SELECT id, username, embedding <=> $1::vector as distance
     FROM users
     WHERE embedding IS NOT NULL AND embedding <=> $1::vector < $2
     ORDER BY distance ASC
     LIMIT $3`,
    [embeddingStr, maxDistance, limit]
  );

  return result.rows;
}

export async function getEmbeddingStats(): Promise<any> {
  const pool = getPool();

  const result = await pool.query(`
    SELECT
      COUNT(*)::int as total_users,
      COUNT(embedding)::int as users_with_embeddings,
      AVG(vector_norm(embedding))::float as avg_norm
    FROM users
  `);

  return result.rows[0];
}
