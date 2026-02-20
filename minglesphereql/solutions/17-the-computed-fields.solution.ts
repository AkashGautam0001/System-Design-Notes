import { getDb, schema } from '../shared/connection.js';
import { sql } from 'drizzle-orm';

/**
 * Chapter 17: The Computed Fields - SOLUTIONS
 */

export async function getUsersWithFullInfo() {
  const db = getDb();
  return db.select({
    id: schema.users.id,
    username: schema.users.username,
    fullLabel: sql<string>`${schema.users.displayName} || ' (@' || ${schema.users.username} || ')'`.as('full_label'),
  }).from(schema.users);
}

export async function getPostsWithCommentCount() {
  const db = getDb();
  return db.select({
    id: schema.posts.id,
    content: schema.posts.content,
    commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${schema.posts.id})`.as('comment_count'),
  }).from(schema.posts);
}

export async function getUsersWithAccountAge() {
  const db = getDb();
  return db.select({
    id: schema.users.id,
    username: schema.users.username,
    accountAgeDays: sql<number>`EXTRACT(DAY FROM NOW() - ${schema.users.createdAt})::int`.as('account_age_days'),
  }).from(schema.users);
}

export async function getPostsWithEngagementScore() {
  const db = getDb();
  return db.select({
    id: schema.posts.id,
    content: schema.posts.content,
    engagementScore: sql<number>`${schema.posts.likesCount} * 2 + (SELECT COUNT(*) FROM comments WHERE comments.post_id = ${schema.posts.id})`.as('engagement_score'),
  }).from(schema.posts);
}

export async function getUserStatusSummary() {
  const db = getDb();
  return db.select({
    username: schema.users.username,
    activityLevel: sql<string>`CASE WHEN ${schema.users.postCount} > 10 THEN 'power_user' WHEN ${schema.users.postCount} > 0 THEN 'active' ELSE 'lurker' END`.as('activity_level'),
  }).from(schema.users);
}
