# Chapter 20: The Common Path

## Story

As MingleSphereQL matures, the queries grow more complex. You find yourself writing the same subqueries over and over -- filtering active users, finding popular posts, pulling comment hierarchies. The SQL files are getting long and tangled. You squint at a 40-line query and realize you cannot even remember what the third nested subquery is supposed to do.

There has to be a better way. And there is: Common Table Expressions, or CTEs. A CTE is like naming a subquery and placing it at the top of your SQL statement with the WITH keyword. Instead of burying logic inside nested parentheses, you declare your building blocks up front, give them clear names, and then compose them together in the final SELECT. It is the difference between a pile of tangled wires and a neatly labeled circuit board.

But CTEs go beyond just readability. Recursive CTEs unlock the ability to traverse hierarchical data -- think comment threads that can nest infinitely deep, or organizational trees, or category hierarchies. A recursive CTE defines a base case and a recursive step, and PostgreSQL will keep expanding the result until no new rows are produced. This is how you walk a tree structure in pure SQL, without any application-level recursion.

In this chapter, you will also encounter the EXISTS and NOT EXISTS operators, which are often the most efficient way to check for the presence or absence of related data. Combined with CTEs, they give you a powerful toolkit for writing queries that are both performant and comprehensible.

The common path is about clarity. When you come back to a query six months from now, CTEs ensure you can read it like a story rather than deciphering a puzzle.

## Concepts

- **CTE (Common Table Expression)**: Named temporary result set defined with `WITH ... AS`
- **Recursive CTE**: A CTE that references itself to traverse hierarchical data
- **WITH RECURSIVE**: The syntax that enables self-referencing CTEs
- **Multiple CTEs**: Defining several named CTEs in a single query, separated by commas
- **EXISTS / NOT EXISTS**: Efficient subquery operators for checking row existence
- **Base case + recursive step**: The two parts of a recursive CTE

## Code Examples

### Basic CTE

```sql
WITH active_users AS (
  SELECT * FROM users WHERE deleted_at IS NULL
)
SELECT au.id, au.username, COUNT(p.id)::int as post_count
FROM active_users au
LEFT JOIN posts p ON au.id = p.author_id
GROUP BY au.id, au.username;
```

### Recursive CTE for comment trees

```sql
WITH RECURSIVE comment_tree AS (
  -- Base case: the root comment
  SELECT id, content, parent_id, 1 as depth
  FROM comments WHERE id = $1

  UNION ALL

  -- Recursive step: find children
  SELECT c.id, c.content, c.parent_id, ct.depth + 1
  FROM comments c
  JOIN comment_tree ct ON c.parent_id = ct.id
)
SELECT * FROM comment_tree ORDER BY depth, id;
```

### NOT EXISTS

```sql
SELECT id, username FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM posts p WHERE p.author_id = u.id
);
```

### Multiple CTEs

```sql
WITH
  user_stats AS (SELECT COUNT(*)::int as total_users FROM users),
  post_stats AS (SELECT COUNT(*)::int as total_posts FROM posts),
  comment_stats AS (SELECT COUNT(*)::int as total_comments FROM comments)
SELECT * FROM user_stats, post_stats, comment_stats;
```

## Practice Goals

1. Use a CTE to isolate active users and join them with their posts
2. Build a parameterized CTE for filtering popular posts by minimum likes
3. Traverse a nested comment hierarchy using a recursive CTE
4. Find users without posts using NOT EXISTS
5. Combine multiple CTEs into a single dashboard statistics query

## Tips

- CTEs improve readability but in PostgreSQL they are optimization fences in some versions -- the planner may not push predicates into them
- Recursive CTEs must have a UNION ALL between the base case and recursive step
- Always include an ORDER BY on depth in recursive CTEs to get a sensible traversal order
- `::int` casts are important when using COUNT in CTEs to avoid bigint return types
- NOT EXISTS is often more efficient than LEFT JOIN ... WHERE IS NULL for anti-joins
- You can reference earlier CTEs in later ones within the same WITH block
