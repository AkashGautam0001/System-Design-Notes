/** ============================================================
 *  FILE 28: DESIGN A NEWS FEED SYSTEM
 *  ============================================================
 *  Topic: Fan-out on write vs read, ranking algorithms, cursor
 *         pagination, celebrity problem, hybrid fan-out
 *
 *  WHY THIS MATTERS:
 *  News feeds power Instagram, Twitter, and LinkedIn. The core
 *  challenge is delivering personalized content to millions in
 *  real-time. When Virat Kohli posts on Instagram with 200M+
 *  followers, fan-out strategy determines system survival.
 *  ============================================================ */

// STORY: Instagram India / Virat Kohli
// Virat Kohli has 270M Instagram followers — the most followed Indian.
// When he posts a photo after winning a match, 270 million feed entries
// cannot be written instantly (fan-out on write would take hours). Instead,
// Instagram uses fan-out on READ for celebrities — Virat's post is fetched
// on demand. Normal users like your cousin with 500 followers use fan-out
// on WRITE. This hybrid approach keeps feeds fresh without melting servers.

console.log("=".repeat(70));
console.log("  FILE 28: DESIGN A NEWS FEED SYSTEM");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Requirements Analysis
// ════════════════════════════════════════════════════════════════

// WHY: Feed systems must balance freshness, relevance, and performance.

console.log("SECTION 1 — Requirements Analysis");
console.log("-".repeat(50));

const feedRequirements = {
  functional: [
    "User creates posts (text, image, video)",
    "User sees feed of posts from followed accounts",
    "Feed is ranked by relevance + recency",
    "Support pagination (infinite scroll)",
    "Support likes, comments, shares"
  ],
  nonFunctional: [
    "Feed generation < 200ms",
    "New post visible in feed within 5 seconds (for normal users)",
    "Support users with 200M+ followers",
    "Handle 500M daily active users",
    "Feed should feel personalized"
  ],
  scaleEstimates: {
    dau: 500_000_000,
    avgFollowing: 200,
    postsPerUserPerDay: 0.5,
    newPostsPerDay: 250_000_000,
    feedReadsPerDay: 5_000_000_000
  }
};

console.log("Scale Estimates:");
Object.entries(feedRequirements.scaleEstimates).forEach(([k, v]) => {
  console.log(`  ${k}: ${v.toLocaleString()}`);
});
// Output: 5 billion feed reads per day

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Data Models (User, Post, Follow, Feed)
// ════════════════════════════════════════════════════════════════

// WHY: Clean data models are the foundation of any feed system.

console.log("SECTION 2 — Data Models");
console.log("-".repeat(50));

class User {
  constructor(id, name, followerCount = 0, isCelebrity = false) {
    this.id = id;
    this.name = name;
    this.followerCount = followerCount;
    this.isCelebrity = isCelebrity; // > 100K followers
    this.following = new Set();
    this.followers = new Set();
    this.posts = [];
    this.feed = []; // Pre-computed feed (for fan-out on write)
  }
}

class Post {
  constructor(authorId, content, type = "text") {
    this.id = `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.authorId = authorId;
    this.content = content;
    this.type = type;
    this.timestamp = Date.now();
    this.likes = 0;
    this.comments = 0;
    this.shares = 0;
    this.engagementScore = 0;
  }
}

class SocialGraph {
  constructor() {
    this.users = new Map();
  }

  addUser(id, name, followerCount = 0) {
    const isCelebrity = followerCount > 100000;
    const user = new User(id, name, followerCount, isCelebrity);
    this.users.set(id, user);
    return user;
  }

  follow(followerId, followeeId) {
    const follower = this.users.get(followerId);
    const followee = this.users.get(followeeId);
    if (follower && followee) {
      follower.following.add(followeeId);
      followee.followers.add(followerId);
      followee.followerCount = followee.followers.size;
    }
  }

  getUser(id) {
    return this.users.get(id);
  }

  getFollowees(userId) {
    const user = this.users.get(userId);
    return user ? Array.from(user.following) : [];
  }

  getFollowers(userId) {
    const user = this.users.get(userId);
    return user ? Array.from(user.followers) : [];
  }
}

const graph = new SocialGraph();

// Create users
const virat = graph.addUser("virat", "Virat Kohli", 270000000);
const anushka = graph.addUser("anushka", "Anushka Sharma", 65000000);
const normalUser = graph.addUser("rahul", "Rahul from Delhi", 150);
const anotherUser = graph.addUser("priya", "Priya from Mumbai", 300);
const friendUser = graph.addUser("amit", "Amit from Pune", 80);

// Set up follows
graph.follow("rahul", "virat");
graph.follow("rahul", "anushka");
graph.follow("rahul", "priya");
graph.follow("rahul", "amit");
graph.follow("priya", "virat");
graph.follow("priya", "rahul");
graph.follow("amit", "rahul");
graph.follow("amit", "priya");

console.log("Users created:");
[virat, anushka, normalUser, anotherUser, friendUser].forEach(u => {
  const tag = u.isCelebrity ? " [CELEBRITY]" : "";
  console.log(`  ${u.name.padEnd(25)} Followers: ${u.followerCount.toLocaleString().padStart(15)}${tag}`);
});

console.log(`\n  Rahul follows: ${graph.getFollowees("rahul").join(", ")}`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Fan-Out on Write (Push Model)
// ════════════════════════════════════════════════════════════════

// WHY: Push model pre-computes feeds — fast reads but expensive writes for celebrities.

console.log("SECTION 3 — Fan-Out on Write (Push Model)");
console.log("-".repeat(50));

class FanOutOnWrite {
  constructor(socialGraph) {
    this.graph = socialGraph;
    this.feeds = new Map(); // userId -> sorted feed entries
    this.writeOps = 0;
    this.maxFeedSize = 500;
  }

  publish(post) {
    const author = this.graph.getUser(post.authorId);
    if (!author) return { success: false };

    // Write to author's own posts
    author.posts.push(post);

    // Fan-out: push to every follower's feed
    const followers = this.graph.getFollowers(post.authorId);
    this.writeOps = 0;

    followers.forEach(followerId => {
      if (!this.feeds.has(followerId)) {
        this.feeds.set(followerId, []);
      }
      const feed = this.feeds.get(followerId);
      feed.unshift({
        postId: post.id,
        authorId: post.authorId,
        content: post.content,
        timestamp: post.timestamp,
        score: 0 // Will be ranked later
      });

      // Trim feed
      if (feed.length > this.maxFeedSize) {
        feed.pop();
      }
      this.writeOps++;
    });

    return {
      success: true,
      fanOutCount: followers.length,
      writeOps: this.writeOps,
      timeEstimate: `${(followers.length * 0.001).toFixed(1)}ms (at 1us per write)`
    };
  }

  getFeed(userId, limit = 10) {
    const feed = this.feeds.get(userId) || [];
    return feed.slice(0, limit);
  }
}

const pushModel = new FanOutOnWrite(graph);

// Normal user posts — fan-out is cheap
console.log("Normal user (Rahul, 2 followers) posts:");
const rahulPost = new Post("rahul", "Just had amazing chole bhature at Connaught Place!");
const rahulResult = pushModel.publish(rahulPost);
console.log(`  Fan-out: ${rahulResult.fanOutCount} writes`);
console.log(`  Time estimate: ${rahulResult.timeEstimate}`);

// Celebrity posts — fan-out is VERY expensive
console.log("\nCelebrity (Virat, 270M followers) posts:");
// Simulate with reduced followers for demo
const viratPost = new Post("virat", "What a match! India wins! Jai Hind!");
console.log(`  If we fan-out to 270M followers:`);
console.log(`  Write operations: 270,000,000`);
console.log(`  At 1us/write = 270 seconds = 4.5 MINUTES!`);
console.log(`  Post would be stale before reaching all feeds`);
console.log(`  THIS IS THE CELEBRITY PROBLEM`);

// Check Priya's feed (she follows Rahul)
console.log("\nPriya's feed after Rahul's post:");
const priyaFeed = pushModel.getFeed("priya");
priyaFeed.forEach(entry => {
  console.log(`  ${entry.authorId}: "${entry.content}"`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Fan-Out on Read (Pull Model)
// ════════════════════════════════════════════════════════════════

// WHY: Pull model fetches posts at read time — perfect for celebrities with millions of followers.

console.log("SECTION 4 — Fan-Out on Read (Pull Model)");
console.log("-".repeat(50));

class FanOutOnRead {
  constructor(socialGraph) {
    this.graph = socialGraph;
    this.postStore = new Map(); // authorId -> [posts]
    this.readOps = 0;
  }

  publish(post) {
    if (!this.postStore.has(post.authorId)) {
      this.postStore.set(post.authorId, []);
    }
    this.postStore.get(post.authorId).unshift(post);
    // No fan-out at write time — just store the post
    return { success: true, writeOps: 1 };
  }

  getFeed(userId, limit = 10) {
    const followees = this.graph.getFollowees(userId);
    this.readOps = 0;

    // Fetch recent posts from each followee
    const allPosts = [];
    followees.forEach(followeeId => {
      const posts = this.postStore.get(followeeId) || [];
      allPosts.push(...posts.slice(0, 20)); // Take 20 recent from each
      this.readOps++;
    });

    // Sort by timestamp (most recent first)
    allPosts.sort((a, b) => b.timestamp - a.timestamp);

    return {
      posts: allPosts.slice(0, limit),
      readOps: this.readOps,
      timeEstimate: `${(this.readOps * 5).toFixed(0)}ms (at 5ms per followee query)`
    };
  }
}

const pullModel = new FanOutOnRead(graph);

// Publish posts
const posts = [
  new Post("virat", "Century number 80! Dedicated to Indian fans!"),
  new Post("anushka", "Beautiful sunset in Mumbai today"),
  new Post("priya", "Weekend coding session"),
  new Post("amit", "New cafe opened in Koregaon Park!")
];

posts.forEach(p => {
  const result = pullModel.publish(p);
  console.log(`  ${p.authorId} published: writeOps = ${result.writeOps}`);
});

// Rahul reads his feed (follows virat, anushka, priya, amit)
console.log("\nRahul reads his feed (pull model):");
const rahulFeed = pullModel.getFeed("rahul", 5);
console.log(`  Read operations: ${rahulFeed.readOps} (one per followee)`);
console.log(`  Time estimate: ${rahulFeed.timeEstimate}`);
rahulFeed.posts.forEach(p => {
  console.log(`    ${p.authorId}: "${p.content}"`);
});

console.log("\n  Problem: If Rahul follows 500 accounts, feed generation = 2500ms");
console.log("  That's way too slow for infinite scroll!");

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Hybrid Approach for Celebrities
// ════════════════════════════════════════════════════════════════

// WHY: Instagram's actual approach — push for normal users, pull for celebrities.

console.log("SECTION 5 — Hybrid Fan-Out (Instagram's Approach)");
console.log("-".repeat(50));

class HybridFeedService {
  constructor(socialGraph) {
    this.graph = socialGraph;
    this.precomputedFeeds = new Map(); // userId -> [feed entries] (from push)
    this.celebrityPosts = new Map();   // celebrityId -> [posts] (for pull)
    this.celebrityThreshold = 100000;
    this.maxFeedSize = 500;
    this.stats = { pushWrites: 0, pullReads: 0 };
  }

  publish(post) {
    const author = this.graph.getUser(post.authorId);
    if (!author) return null;

    if (author.isCelebrity) {
      // Celebrity: just store the post (pull on read)
      if (!this.celebrityPosts.has(post.authorId)) {
        this.celebrityPosts.set(post.authorId, []);
      }
      this.celebrityPosts.get(post.authorId).unshift(post);

      return {
        strategy: "pull",
        reason: `${author.name} has ${author.followerCount.toLocaleString()} followers`,
        writeOps: 1
      };
    } else {
      // Normal user: fan-out on write
      const followers = this.graph.getFollowers(post.authorId);
      let writeOps = 0;

      followers.forEach(followerId => {
        if (!this.precomputedFeeds.has(followerId)) {
          this.precomputedFeeds.set(followerId, []);
        }
        const feed = this.precomputedFeeds.get(followerId);
        feed.unshift({
          postId: post.id,
          authorId: post.authorId,
          authorName: author.name,
          content: post.content,
          timestamp: post.timestamp,
          likes: post.likes,
          source: "push"
        });
        if (feed.length > this.maxFeedSize) feed.pop();
        writeOps++;
      });

      this.stats.pushWrites += writeOps;

      return {
        strategy: "push",
        reason: `${author.name} has ${author.followerCount.toLocaleString()} followers`,
        writeOps
      };
    }
  }

  getFeed(userId, limit = 10) {
    // Step 1: Get pre-computed feed (from push)
    const pushFeed = (this.precomputedFeeds.get(userId) || []).slice(0, limit * 2);

    // Step 2: Pull celebrity posts that user follows
    const followees = this.graph.getFollowees(userId);
    const celebrityEntries = [];
    let pullReads = 0;

    followees.forEach(followeeId => {
      const followee = this.graph.getUser(followeeId);
      if (followee && followee.isCelebrity) {
        const posts = this.celebrityPosts.get(followeeId) || [];
        posts.slice(0, 10).forEach(p => {
          celebrityEntries.push({
            postId: p.id,
            authorId: p.authorId,
            authorName: followee.name,
            content: p.content,
            timestamp: p.timestamp,
            likes: p.likes,
            source: "pull"
          });
        });
        pullReads++;
      }
    });

    this.stats.pullReads += pullReads;

    // Step 3: Merge and sort
    const merged = [...pushFeed, ...celebrityEntries];
    merged.sort((a, b) => b.timestamp - a.timestamp);

    return {
      entries: merged.slice(0, limit),
      pushCount: pushFeed.length,
      pullCount: celebrityEntries.length,
      pullReads
    };
  }

  getStats() {
    return this.stats;
  }
}

const hybridFeed = new HybridFeedService(graph);

// Publish from different user types
console.log("Publishing posts with hybrid strategy:\n");

const hybridPosts = [
  new Post("virat", "New record! 50 Test centuries!"),
  new Post("anushka", "Loved shooting in Rajasthan today"),
  new Post("rahul", "Monday motivation: Keep coding!"),
  new Post("priya", "New blog post on system design"),
  new Post("amit", "Pune weather is amazing today")
];

// Stagger timestamps for ordering
hybridPosts.forEach((p, i) => {
  p.timestamp = Date.now() - (hybridPosts.length - i) * 1000;
  p.likes = Math.floor(Math.random() * 10000);
  const result = hybridFeed.publish(p);
  console.log(`  [${result.strategy.toUpperCase()}] ${p.authorId.padEnd(10)} "${p.content.substring(0, 40)}..." (${result.writeOps} writes)`);
  console.log(`         Reason: ${result.reason}`);
});

// Rahul views his feed
console.log("\nRahul's hybrid feed:");
const hybridResult = hybridFeed.getFeed("rahul", 5);
console.log(`  Composed from: ${hybridResult.pushCount} push entries + ${hybridResult.pullCount} pull entries (${hybridResult.pullReads} celebrity reads)`);
hybridResult.entries.forEach((e, i) => {
  console.log(`  ${i + 1}. [${e.source.toUpperCase()}] ${e.authorName}: "${e.content.substring(0, 45)}..."`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Feed Ranking Algorithm
// ════════════════════════════════════════════════════════════════

// WHY: Chronological feeds are dead — ranking shows what matters most.

console.log("SECTION 6 — Feed Ranking Algorithm");
console.log("-".repeat(50));

class FeedRanker {
  constructor() {
    this.weights = {
      recency: 0.3,
      engagement: 0.25,
      relationship: 0.25,
      contentType: 0.1,
      diversity: 0.1
    };
  }

  calculateScore(feedEntry, viewerContext) {
    const scores = {};

    // Recency score: exponential decay over 24 hours
    const ageHours = (Date.now() - feedEntry.timestamp) / (1000 * 60 * 60);
    scores.recency = Math.exp(-ageHours / 24); // 1.0 for new, ~0.37 after 24h

    // Engagement score: normalized likes + comments + shares
    const totalEngagement = (feedEntry.likes || 0) + (feedEntry.comments || 0) * 2 + (feedEntry.shares || 0) * 3;
    scores.engagement = Math.min(1, totalEngagement / 10000);

    // Relationship score: how often viewer interacts with author
    const interactionCount = viewerContext.interactions[feedEntry.authorId] || 0;
    scores.relationship = Math.min(1, interactionCount / 50);

    // Content type score
    const typeScores = { video: 1.0, image: 0.8, text: 0.5, link: 0.3 };
    scores.contentType = typeScores[feedEntry.type] || 0.5;

    // Diversity penalty: reduce score if too many from same author
    const authorCount = viewerContext.authorAppearances[feedEntry.authorId] || 0;
    scores.diversity = Math.max(0, 1 - authorCount * 0.3);

    // Weighted sum
    const finalScore =
      scores.recency * this.weights.recency +
      scores.engagement * this.weights.engagement +
      scores.relationship * this.weights.relationship +
      scores.contentType * this.weights.contentType +
      scores.diversity * this.weights.diversity;

    return { finalScore: parseFloat(finalScore.toFixed(4)), breakdown: scores };
  }

  rankFeed(feedEntries, viewerContext) {
    const authorAppearances = {};
    viewerContext.authorAppearances = authorAppearances;

    const scored = feedEntries.map(entry => {
      const score = this.calculateScore(entry, viewerContext);
      authorAppearances[entry.authorId] = (authorAppearances[entry.authorId] || 0) + 1;
      return { ...entry, rankScore: score.finalScore, scoreBreakdown: score.breakdown };
    });

    scored.sort((a, b) => b.rankScore - a.rankScore);
    return scored;
  }
}

const ranker = new FeedRanker();

// Create sample feed entries for ranking
const feedEntries = [
  { authorId: "virat", authorName: "Virat Kohli", content: "World Cup trophy!", type: "image", timestamp: Date.now() - 1800000, likes: 5000000, comments: 200000, shares: 100000 },
  { authorId: "priya", authorName: "Priya", content: "Check out my new React project", type: "link", timestamp: Date.now() - 600000, likes: 15, comments: 3, shares: 1 },
  { authorId: "amit", authorName: "Amit", content: "Morning run in Pune!", type: "image", timestamp: Date.now() - 300000, likes: 50, comments: 8, shares: 0 },
  { authorId: "anushka", authorName: "Anushka Sharma", content: "New movie trailer!", type: "video", timestamp: Date.now() - 3600000, likes: 2000000, comments: 80000, shares: 50000 },
  { authorId: "amit", authorName: "Amit", content: "Another Pune photo", type: "image", timestamp: Date.now() - 200000, likes: 30, comments: 2, shares: 0 }
];

const viewerContext = {
  userId: "rahul",
  interactions: { priya: 45, amit: 30, virat: 10, anushka: 5 }
};

console.log("Ranking Rahul's feed (5 posts):\n");
console.log(`  Ranking weights: ${JSON.stringify(ranker.weights)}`);
console.log();

const ranked = ranker.rankFeed(feedEntries, viewerContext);
ranked.forEach((entry, i) => {
  const b = entry.scoreBreakdown;
  console.log(`  ${i + 1}. [Score: ${entry.rankScore}] ${entry.authorName}: "${entry.content}"`);
  console.log(`     Recency:${b.recency.toFixed(2)} Engage:${b.engagement.toFixed(2)} Relation:${b.relationship.toFixed(2)} Type:${b.contentType.toFixed(2)} Diverse:${b.diversity.toFixed(2)}`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Cursor-Based Pagination
// ════════════════════════════════════════════════════════════════

// WHY: Offset pagination breaks with real-time feeds; cursor pagination is stable.

console.log("SECTION 7 — Cursor-Based Pagination");
console.log("-".repeat(50));

class PaginatedFeed {
  constructor() {
    this.allPosts = [];
  }

  addPosts(posts) {
    this.allPosts.push(...posts);
    this.allPosts.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Offset pagination (BAD for real-time feeds)
  getPageOffset(page, pageSize) {
    const start = page * pageSize;
    const items = this.allPosts.slice(start, start + pageSize);
    return {
      items,
      page,
      totalPages: Math.ceil(this.allPosts.length / pageSize),
      problem: "New posts shift offsets — user sees duplicates or misses posts!"
    };
  }

  // Cursor pagination (GOOD for real-time feeds)
  getPageCursor(cursor, limit) {
    let startIdx = 0;

    if (cursor) {
      startIdx = this.allPosts.findIndex(p => p.timestamp < cursor);
      if (startIdx === -1) startIdx = this.allPosts.length;
    }

    const items = this.allPosts.slice(startIdx, startIdx + limit);
    const nextCursor = items.length > 0 ? items[items.length - 1].timestamp : null;
    const hasMore = startIdx + limit < this.allPosts.length;

    return { items, nextCursor, hasMore };
  }
}

const paginatedFeed = new PaginatedFeed();

// Add 20 posts with descending timestamps
for (let i = 0; i < 20; i++) {
  paginatedFeed.addPosts([{
    id: `p${i}`,
    authorId: `user_${i % 4}`,
    content: `Post number ${i + 1}`,
    timestamp: Date.now() - i * 60000
  }]);
}

console.log("Offset Pagination (problematic):");
const page0 = paginatedFeed.getPageOffset(0, 5);
console.log(`  Page 0: ${page0.items.map(p => p.id).join(", ")}`);
console.log(`  Problem: ${page0.problem}`);

console.log("\nCursor Pagination (reliable):");
let cursor = null;
for (let page = 0; page < 4; page++) {
  const result = paginatedFeed.getPageCursor(cursor, 5);
  console.log(`  Page ${page}: ${result.items.map(p => p.id).join(", ")} | hasMore: ${result.hasMore}`);
  cursor = result.nextCursor;
}

console.log("\n  Why cursor wins:");
console.log("    - New posts don't affect pagination position");
console.log("    - No duplicate posts when scrolling");
console.log("    - Efficient with database indexes on timestamp");

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Celebrity Problem Deep Dive
// ════════════════════════════════════════════════════════════════

// WHY: The celebrity problem is the #1 scaling challenge in feed systems.

console.log("SECTION 8 — Celebrity Problem Deep Dive");
console.log("-".repeat(50));

class CelebrityAnalyzer {
  constructor() {
    this.celebrities = [];
  }

  analyze(name, followers, postFrequency) {
    const fanOutWriteTime = (followers * 0.001).toFixed(0); // 1us per write
    const fanOutWriteOps = followers;
    const pullReadOps = 1; // Just read from celebrity's timeline
    const pullReadTime = 5; // 5ms per read

    const analysis = {
      name,
      followers: followers.toLocaleString(),
      strategy: followers > 100000 ? "PULL (fan-out on read)" : "PUSH (fan-out on write)",
      pushCost: {
        ops: fanOutWriteOps.toLocaleString(),
        time: `${fanOutWriteTime}ms`,
        perDay: `${(fanOutWriteOps * postFrequency).toLocaleString()} ops/day`
      },
      pullCost: {
        ops: pullReadOps,
        time: `${pullReadTime}ms`,
        note: "Read happens only when follower loads feed"
      }
    };

    this.celebrities.push(analysis);
    return analysis;
  }

  printReport() {
    this.celebrities.forEach(c => {
      console.log(`\n  ${c.name} (${c.followers} followers): ${c.strategy}`);
      console.log(`    Push cost: ${c.pushCost.ops} ops (${c.pushCost.time}) per post`);
      console.log(`    Pull cost: ${c.pullCost.ops} op (${c.pullCost.time}) per feed read`);
    });
  }
}

const celebAnalyzer = new CelebrityAnalyzer();

console.log("Celebrity Fan-Out Analysis:");

celebAnalyzer.analyze("Virat Kohli", 270_000_000, 2);
celebAnalyzer.analyze("Narendra Modi", 90_000_000, 5);
celebAnalyzer.analyze("Priyanka Chopra", 90_000_000, 1);
celebAnalyzer.analyze("Your College Friend", 500, 3);
celebAnalyzer.analyze("Local Restaurant", 2000, 5);

celebAnalyzer.printReport();

console.log("\n  Threshold Decision:");
console.log("    Followers > 100K -> Pull model (celebrity)");
console.log("    Followers <= 100K -> Push model (normal user)");
console.log("    This is configurable and can be dynamic!");

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Feed Cache Management
// ════════════════════════════════════════════════════════════════

// WHY: Caching pre-ranked feeds avoids re-computation on every scroll.

console.log("SECTION 9 — Feed Cache Management");
console.log("-".repeat(50));

class FeedCache {
  constructor(maxUsers = 10000, feedTTL = 300000) {
    this.cache = new Map(); // userId -> { feed, timestamp, version }
    this.maxUsers = maxUsers;
    this.feedTTL = feedTTL; // 5 minutes
    this.stats = { hits: 0, misses: 0, invalidations: 0, evictions: 0 };
  }

  get(userId) {
    const entry = this.cache.get(userId);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > this.feedTTL) {
      this.cache.delete(userId);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.feed;
  }

  set(userId, feed) {
    if (this.cache.size >= this.maxUsers) {
      // Evict oldest
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
    this.cache.set(userId, {
      feed,
      timestamp: Date.now(),
      version: (this.cache.get(userId)?.version || 0) + 1
    });
  }

  // Invalidate when user's followee posts something
  invalidateForFollowers(followerIds) {
    followerIds.forEach(id => {
      if (this.cache.has(id)) {
        this.cache.delete(id);
        this.stats.invalidations++;
      }
    });
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + "%" : "N/A",
      size: this.cache.size
    };
  }
}

const feedCache = new FeedCache(1000, 300000);

// Simulate cache behavior
console.log("Feed cache simulation:");

// Populate cache for some users
for (let i = 0; i < 20; i++) {
  feedCache.set(`user_${i}`, [{ content: `Cached feed for user ${i}` }]);
}

// Simulate reads
for (let i = 0; i < 100; i++) {
  const userId = `user_${Math.floor(Math.random() * 25)}`; // Some will miss
  feedCache.get(userId);
}

// Simulate invalidation when celebrity posts
feedCache.invalidateForFollowers(["user_0", "user_1", "user_2", "user_3", "user_4"]);

const cacheStats = feedCache.getStats();
console.log(`  Cache size: ${cacheStats.size}`);
console.log(`  Hits: ${cacheStats.hits}, Misses: ${cacheStats.misses}`);
console.log(`  Hit rate: ${cacheStats.hitRate}`);
console.log(`  Invalidations: ${cacheStats.invalidations}`);
console.log(`  Evictions: ${cacheStats.evictions}`);

console.log("\n  Cache Strategy:");
console.log("    - Cache pre-ranked feed per user (top 200 posts)");
console.log("    - Invalidate on new post from followee");
console.log("    - TTL of 5 min ensures freshness without staleness");
console.log("    - Celebrity posts invalidate ZERO caches (pull model)");

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 10 — Full System Simulation
// ════════════════════════════════════════════════════════════════

// WHY: End-to-end simulation shows hybrid approach handling all user types.

console.log("SECTION 10 — Full System Simulation");
console.log("-".repeat(50));

class InstagramFeedSystem {
  constructor() {
    this.graph = new SocialGraph();
    this.hybridFeed = null;
    this.ranker = new FeedRanker();
    this.cache = new FeedCache(1000, 300000);
    this.postCount = 0;
    this.feedReads = 0;
  }

  initialize(users, follows) {
    users.forEach(u => this.graph.addUser(u.id, u.name, u.followers));
    follows.forEach(f => this.graph.follow(f.from, f.to));
    this.hybridFeed = new HybridFeedService(this.graph);
  }

  createPost(authorId, content, type = "text") {
    const post = new Post(authorId, content, type);
    post.likes = Math.floor(Math.random() * 50000);
    post.comments = Math.floor(Math.random() * 5000);
    post.timestamp = Date.now() - Math.random() * 3600000;

    const result = this.hybridFeed.publish(post);
    this.postCount++;

    // Invalidate cache for followers if push model
    if (result && result.strategy === "push") {
      const followers = this.graph.getFollowers(authorId);
      this.cache.invalidateForFollowers(followers);
    }

    return result;
  }

  readFeed(userId, limit = 5) {
    this.feedReads++;

    // Check cache
    const cached = this.cache.get(userId);
    if (cached) {
      return { entries: cached.slice(0, limit), source: "cache" };
    }

    // Generate feed
    const feedResult = this.hybridFeed.getFeed(userId, limit * 3);
    const viewerCtx = { userId, interactions: {}, authorAppearances: {} };

    // Rank
    const rankedEntries = this.ranker.rankFeed(feedResult.entries, viewerCtx);
    const topEntries = rankedEntries.slice(0, limit);

    // Cache
    this.cache.set(userId, topEntries);

    return { entries: topEntries, source: "computed" };
  }

  getSystemStats() {
    return {
      posts: this.postCount,
      feedReads: this.feedReads,
      users: this.graph.users.size,
      cacheStats: this.cache.getStats()
    };
  }
}

const instagram = new InstagramFeedSystem();

instagram.initialize(
  [
    { id: "virat", name: "Virat Kohli", followers: 270000000 },
    { id: "anushka", name: "Anushka Sharma", followers: 65000000 },
    { id: "rohit", name: "Rohit Sharma", followers: 45000000 },
    { id: "rahul", name: "Rahul", followers: 150 },
    { id: "priya", name: "Priya", followers: 300 },
    { id: "amit", name: "Amit", followers: 80 }
  ],
  [
    { from: "rahul", to: "virat" },
    { from: "rahul", to: "anushka" },
    { from: "rahul", to: "priya" },
    { from: "rahul", to: "amit" },
    { from: "priya", to: "virat" },
    { from: "priya", to: "rahul" },
    { from: "amit", to: "rahul" },
    { from: "amit", to: "priya" }
  ]
);

console.log("=== Instagram-style Feed System Simulation ===\n");

// Create posts
const simPosts = [
  { author: "virat", content: "Match day! Let's go India!", type: "image" },
  { author: "anushka", content: "New collection launching tomorrow", type: "video" },
  { author: "priya", content: "Finally deployed my ML model", type: "text" },
  { author: "amit", content: "Pune rains are beautiful", type: "image" },
  { author: "rahul", content: "Built a URL shortener today!", type: "text" },
  { author: "rohit", content: "45k run milestone!", type: "image" }
];

console.log("Posts created:");
simPosts.forEach(p => {
  const result = instagram.createPost(p.author, p.content, p.type);
  if (result) {
    console.log(`  [${result.strategy.toUpperCase()}] ${p.author}: "${p.content}"`);
  }
});

// Read feeds
console.log("\nRahul's feed:");
const rahulFeedResult = instagram.readFeed("rahul", 5);
console.log(`  Source: ${rahulFeedResult.source}`);
rahulFeedResult.entries.forEach((e, i) => {
  console.log(`  ${i + 1}. ${(e.authorName || e.authorId).padEnd(18)} [Score: ${(e.rankScore || 0).toFixed(3)}] "${(e.content || "").substring(0, 40)}"`);
});

// Read again (should be cached)
console.log("\nRahul's feed (second read):");
const cachedResult = instagram.readFeed("rahul", 5);
console.log(`  Source: ${cachedResult.source}`);

const sysStats = instagram.getSystemStats();
console.log(`\nSystem Stats:`);
console.log(`  Posts: ${sysStats.posts}, Feed Reads: ${sysStats.feedReads}`);
console.log(`  Cache hit rate: ${sysStats.cacheStats.hitRate}`);

console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. Fan-out on WRITE: pre-computes feeds, fast reads, expensive writes");
console.log("  2. Fan-out on READ: no write cost, expensive reads, good for celebrities");
console.log("  3. HYBRID approach: push for <100K followers, pull for celebrities");
console.log("  4. Virat Kohli (270M followers) cannot fan-out on write — it would take 4.5 min per post");
console.log("  5. Feed ranking uses recency, engagement, relationship, and diversity signals");
console.log("  6. Cursor pagination prevents duplicate/missing posts in infinite scroll");
console.log("  7. Feed caches reduce re-computation; invalidate on new posts from followees");
console.log("  8. The celebrity problem is the defining challenge of news feed design");
console.log();
console.log('  "When Virat posts after a century, the system must not collapse —');
console.log('   270 million fans want to double-tap, not see a loading spinner."');
console.log('   — Instagram India Engineering');
console.log();
