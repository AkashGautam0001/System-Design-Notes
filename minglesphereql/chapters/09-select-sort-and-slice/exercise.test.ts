import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/09-select-sort-and-slice.solution.ts'
  : './exercise.ts';

const {
  getUsersSortedByCreatedAt,
  getUsersPageinated,
  countUsersByStatus,
  getTotalUserCount,
  getTopUsersByPostCount,
} = await import(exercisePath);

async function seedUsersForSorting() {
  const pool = getPool();
  await pool.query(
    `INSERT INTO users (username, email, display_name, status, post_count, created_at)
     VALUES
       ('alice',   'alice@test.com',   'Alice',   'online',  10, '2024-01-01T00:00:00Z'),
       ('bob',     'bob@test.com',     'Bob',     'offline',  5, '2024-02-01T00:00:00Z'),
       ('charlie', 'charlie@test.com', 'Charlie', 'online',  20, '2024-03-01T00:00:00Z'),
       ('diana',   'diana@test.com',   'Diana',   'away',     2, '2024-04-01T00:00:00Z'),
       ('eve',     'eve@test.com',     'Eve',     'offline', 15, '2024-05-01T00:00:00Z'),
       ('frank',   'frank@test.com',   'Frank',   'online',   8, '2024-06-01T00:00:00Z'),
       ('grace',   'grace@test.com',   'Grace',   'busy',     0, '2024-07-01T00:00:00Z')`
  );
}

describe('Chapter 9: Select, Sort, and Slice', () => {
  beforeEach(async () => {
    await clearAllTables();
    await seedUsersForSorting();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should return users sorted by created_at in ascending and descending order', async () => {
    const ascending = await getUsersSortedByCreatedAt('asc');
    expect(ascending.length).toBe(7);
    expect(ascending[0].username).toBe('alice');
    expect(ascending[6].username).toBe('grace');

    const descending = await getUsersSortedByCreatedAt('desc');
    expect(descending[0].username).toBe('grace');
    expect(descending[6].username).toBe('alice');
  });

  it('should paginate users correctly with page and pageSize', async () => {
    const page1 = await getUsersPageinated(1, 3);
    expect(page1.length).toBe(3);

    const page2 = await getUsersPageinated(2, 3);
    expect(page2.length).toBe(3);

    const page3 = await getUsersPageinated(3, 3);
    expect(page3.length).toBe(1);

    // Verify no overlap between pages (ordered by id)
    const page1Ids = page1.map((u: any) => u.id);
    const page2Ids = page2.map((u: any) => u.id);
    const overlap = page1Ids.filter((id: number) => page2Ids.includes(id));
    expect(overlap.length).toBe(0);
  });

  it('should count users grouped by status', async () => {
    const statusCounts = await countUsersByStatus();
    expect(Array.isArray(statusCounts)).toBe(true);
    expect(statusCounts.length).toBeGreaterThan(0);

    const onlineGroup = statusCounts.find((s: any) => s.status === 'online');
    expect(onlineGroup).toBeDefined();
    expect(Number(onlineGroup!.count)).toBe(3);

    const offlineGroup = statusCounts.find((s: any) => s.status === 'offline');
    expect(offlineGroup).toBeDefined();
    expect(Number(offlineGroup!.count)).toBe(2);
  });

  it('should return the total user count as a number', async () => {
    const total = await getTotalUserCount();
    expect(total).toBe(7);
  });

  it('should return the top N users by post count in descending order', async () => {
    const top3 = await getTopUsersByPostCount(3);
    expect(top3.length).toBe(3);
    expect(top3[0].username).toBe('charlie'); // 20 posts
    expect(top3[1].username).toBe('eve');     // 15 posts
    expect(top3[2].username).toBe('alice');   // 10 posts
  });
});
