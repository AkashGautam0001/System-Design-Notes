import { getDb, getPool, schema } from '../shared/connection.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Chapter 23: The Vault - SOLUTIONS
 */

export async function transferLikes(
  fromPostId: number,
  toPostId: number,
  amount: number
): Promise<{ from: any; to: any }> {
  const db = getDb();

  return await db.transaction(async (tx) => {
    // Decrement likes on the source post
    await tx
      .update(schema.posts)
      .set({ likesCount: sql`${schema.posts.likesCount} - ${amount}` })
      .where(eq(schema.posts.id, fromPostId));

    // Increment likes on the target post
    await tx
      .update(schema.posts)
      .set({ likesCount: sql`${schema.posts.likesCount} + ${amount}` })
      .where(eq(schema.posts.id, toPostId));

    // Read back both posts
    const [from] = await tx
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, fromPostId));

    const [to] = await tx
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, toPostId));

    return { from, to };
  });
}

export async function transactionRollbackOnError(
  userId: number
): Promise<{ rolledBack: boolean }> {
  const db = getDb();

  // Read the user's current bio
  const [before] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.users)
        .set({ bio: 'Should not persist' })
        .where(eq(schema.users.id, userId));
      throw new Error('Intentional rollback');
    });
  } catch (e) {
    // Expected error -- transaction should have rolled back
  }

  // Read the user's bio again
  const [after] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  return { rolledBack: before.bio === after.bio };
}

export async function createUserWithPost(
  username: string,
  email: string,
  postContent: string
): Promise<{ user: any; post: any }> {
  const db = getDb();

  return await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(schema.users)
      .values({ username, email })
      .returning();

    const [post] = await tx
      .insert(schema.posts)
      .values({ authorId: user.id, content: postContent })
      .returning();

    return { user, post };
  });
}

export async function savepointExample(
  userId: number
): Promise<{ bio: string }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET bio = 'first update' WHERE id = $1`, [userId]);
    await client.query('SAVEPOINT sp1');
    await client.query(`UPDATE users SET bio = 'second update' WHERE id = $1`, [userId]);
    await client.query('ROLLBACK TO SAVEPOINT sp1');
    await client.query('COMMIT');

    const result = await client.query('SELECT bio FROM users WHERE id = $1', [userId]);
    return { bio: result.rows[0].bio };
  } finally {
    client.release();
  }
}

export async function isolationLevelTest(): Promise<{ isolationLevel: string; count: number }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const ilResult = await client.query('SHOW transaction_isolation');
    const countResult = await client.query('SELECT COUNT(*)::int as count FROM users');
    await client.query('COMMIT');

    return {
      isolationLevel: ilResult.rows[0].transaction_isolation,
      count: countResult.rows[0].count,
    };
  } finally {
    client.release();
  }
}
