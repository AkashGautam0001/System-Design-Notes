# Chapter 19: Window into the Data

## Story

The analytics dashboard from the last chapter was a hit. But the product team has a new request that stops you in your tracks: "We want to show each user their ranking compared to others, and we want to show trends -- like what was the previous post's engagement and what came after." The problem? GROUP BY collapses rows. Once you aggregate, the individual records vanish into summaries. You cannot show a user their rank while also showing them every single post.

Enter window functions -- one of the most powerful and often underutilized features of SQL. Window functions perform calculations across a set of rows that are related to the current row, but unlike GROUP BY, they do not collapse the result set. Every row remains visible, and each row gains additional computed columns that reflect its position within the window.

Think of it like looking through a window. You can see the entire landscape (all the rows), but the window frame (the OVER clause) determines which part of the landscape is relevant for each computation. You can partition the window by author to rank posts within each author's collection. You can order the window by date to compute running totals. You can look backward with LAG and forward with LEAD to see what came before and after each row.

Window functions unlock an entirely new dimension of analytics. Rankings, running totals, moving averages, comparisons with adjacent rows -- all become possible without subqueries or self-joins. In this chapter, you will harness RANK, ROW_NUMBER, DENSE_RANK, SUM, LAG, and LEAD to give MingleSphereQL users the rich, detailed analytics they crave.

## Concepts

- **OVER()**: The clause that defines the window for a window function
- **PARTITION BY**: Divides rows into groups (partitions) for independent window calculations
- **ORDER BY** (in OVER): Determines the order of rows within each partition
- **RANK()**: Assigns a rank with gaps (e.g., 1, 2, 2, 4)
- **DENSE_RANK()**: Assigns a rank without gaps (e.g., 1, 2, 2, 3)
- **ROW_NUMBER()**: Assigns a unique sequential number to each row
- **SUM() OVER**: Running/cumulative sum across an ordered window
- **LAG()**: Accesses the previous row's value
- **LEAD()**: Accesses the next row's value

## Code Examples

### Ranking with RANK()

```sql
SELECT id, username, post_count,
  RANK() OVER (ORDER BY post_count DESC) as rank
FROM users;
```

### Partitioned ROW_NUMBER

```sql
SELECT id, content, author_id,
  ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as row_num
FROM posts;
```

### Running total with SUM OVER

```sql
SELECT id, likes_count,
  SUM(likes_count) OVER (ORDER BY created_at) as running_total
FROM posts;
```

### Looking backward and forward

```sql
SELECT id, likes_count,
  LAG(likes_count) OVER (ORDER BY created_at) as prev_likes,
  LEAD(likes_count) OVER (ORDER BY created_at) as next_likes
FROM posts;
```

## Practice Goals

1. Rank users by their post counts using RANK()
2. Assign row numbers to posts partitioned by author
3. Calculate running totals of likes using SUM() OVER
4. Access previous and next values using LAG and LEAD
5. Apply DENSE_RANK to avoid gaps in ranking sequences

## Tips

- Window functions are computed after WHERE, GROUP BY, and HAVING, but before ORDER BY and LIMIT
- RANK() leaves gaps after ties (1, 2, 2, 4), DENSE_RANK() does not (1, 2, 2, 3)
- ROW_NUMBER() always produces unique numbers even for tied values
- LAG/LEAD return NULL when there is no previous/next row (first/last in the window)
- Drizzle ORM does not natively support window functions, so we use raw SQL via getPool()
- The `OVER()` clause with no arguments treats the entire result set as one window
