# Chapter 15: Many to Many

## Story

The posts were flowing. MingleSphereQL's timeline was alive with user-generated content -- thoughts, announcements, questions, and the occasional meme. But as the volume grew, a new problem emerged: discovery. Users scrolled through an undifferentiated stream of posts with no way to find content about topics they cared about. The product team needed a way to categorize posts, and they needed it fast.

The solution was tags. Simple, powerful, and ubiquitous across the web. A post about learning TypeScript could be tagged with "typescript" and "learning." A post about a Drizzle ORM bug could be tagged "drizzle" and "bugs." Users could then filter posts by tag, and trending tags could surface popular topics.

But tags introduced a new kind of relationship that the team had not yet encountered. Unlike users and posts, where each post belongs to exactly one author, tags and posts have a many-to-many relationship. A single post can have multiple tags, and a single tag can be applied to many different posts. This bidirectional multiplicity cannot be modeled with a simple foreign key on either table. Instead, it requires a third table -- a junction table -- that sits between posts and tags and records each individual pairing.

In MingleSphereQL's schema, this junction table is called `post_tags`. It has two columns: `post_id` and `tag_id`, forming a composite primary key. Each row represents one tag-to-post association. To find all tags on a post, you join through `post_tags` to `tags`. To find all posts with a given tag, you join through `post_tags` to `posts`. The junction table is the bridge that makes many-to-many relationships possible in a relational database.

In this chapter, you will learn to create, read, and delete many-to-many associations. You will also learn to aggregate across the junction table to answer questions like "how many posts use each tag?" These patterns appear everywhere in real-world applications -- roles and permissions, students and courses, products and categories -- so mastering them here will serve you well beyond MingleSphereQL.

## Key Concepts

- **Many-to-Many Relationships**: Two entities where each can be associated with multiple instances of the other. Requires a junction (join/bridge) table.
- **Junction Table**: A table with foreign keys to both related tables and a composite primary key. In our case, `post_tags(post_id, tag_id)`.
- **Multi-Table Joins**: Chaining `.innerJoin()` calls to traverse from one table through the junction to the other.
- **Deleting Associations**: Removing a row from the junction table without deleting either of the related entities.
- **Aggregating Across Junctions**: Using `count()` with `leftJoin` and `groupBy` on the junction table to compute statistics.

## Code Examples

### Inserting into the Junction Table
```typescript
const [link] = await db.insert(schema.postTags)
  .values({ postId: 1, tagId: 5 })
  .returning();
```

### Getting Tags for a Post
```typescript
const tags = await db.select({
    tagName: schema.tags.name,
    tagId: schema.tags.id,
  })
  .from(schema.postTags)
  .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
  .where(eq(schema.postTags.postId, postId));
```

### Getting Posts by Tag Name (Two Joins)
```typescript
const posts = await db.select({
    postId: schema.posts.id,
    content: schema.posts.content,
  })
  .from(schema.posts)
  .innerJoin(schema.postTags, eq(schema.posts.id, schema.postTags.postId))
  .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
  .where(eq(schema.tags.name, 'typescript'));
```

### Removing an Association
```typescript
const [deleted] = await db.delete(schema.postTags)
  .where(and(
    eq(schema.postTags.postId, postId),
    eq(schema.postTags.tagId, tagId),
  ))
  .returning();
```

## What You Will Practice

1. Inserting rows into a junction table to create many-to-many associations
2. Querying tags for a specific post by joining through the junction table
3. Querying posts by tag name using a two-table join chain
4. Deleting a specific association from the junction table
5. Aggregating post counts per tag with `count()`, `leftJoin`, and `groupBy`

## Tips

- **Composite primary key**: The `post_tags` table uses `(post_id, tag_id)` as its primary key, which means each post-tag pair can only exist once. Trying to insert a duplicate will throw a unique violation error.
- **Direction matters in joins**: When joining from posts to tags, start from `schema.posts`, join to `schema.postTags`, then join to `schema.tags`. Reversing the direction changes which table's columns are available in your `.where()` clause.
- **Left join for zero counts**: When counting posts per tag, use `leftJoin` so tags with zero posts still appear in the results with a count of 0.
- **and() for compound conditions**: When deleting from the junction table, use `and(eq(...), eq(...))` to match both the postId and tagId columns.
- **returning() on delete**: Just like insert and update, `.returning()` on a delete gives you back the rows that were actually removed, which is useful for confirmation.
