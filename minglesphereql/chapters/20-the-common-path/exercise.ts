import { getPool } from '../../shared/connection.js';

/**
 * Chapter 20: The Common Path
 *
 * Reusable query fragments with CTEs (Common Table Expressions) --
 * making complex queries readable and maintainable. CTEs let you
 * name subqueries and reference them like temporary tables. Recursive
 * CTEs can even traverse hierarchical data like comment trees.
 * Complete each function using raw SQL via getPool().
 */

/**
 * Get active (non-deleted) users with their post counts using a CTE.
 * CTE: WITH active_users AS (SELECT * FROM users WHERE deleted_at IS NULL)
 * Then join with posts and count.
 * Return rows of { id, username, post_count }.
 */
export async function getActiveUsersWithPosts() {
  throw new Error('Not implemented');
}

/**
 * Get popular posts (by minimum likes) with their comment counts using a CTE.
 * CTE: WITH popular_posts AS (SELECT * FROM posts WHERE likes_count >= $1)
 * Then join with comments and count.
 * Return rows of { id, content, likes_count, comment_count }.
 */
export async function getTopPostsWithComments(minLikes: number) {
  throw new Error('Not implemented');
}

/**
 * Get a comment tree recursively starting from a root comment.
 * Use a recursive CTE to traverse parent-child comment relationships.
 * Return rows of { id, content, parent_id, depth }.
 */
export async function getCommentTreeRecursive(rootCommentId: number) {
  throw new Error('Not implemented');
}

/**
 * Find users who have NOT written any posts using NOT EXISTS.
 * Return rows of { id, username }.
 */
export async function existsUsersWithoutPosts() {
  throw new Error('Not implemented');
}

/**
 * Get combined statistics from multiple CTEs: user_stats, post_stats, comment_stats.
 * Return a single object with { total_users, total_posts, total_likes, total_comments }.
 */
export async function getMultipleCTEStats() {
  throw new Error('Not implemented');
}
