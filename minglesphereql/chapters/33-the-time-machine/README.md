# Chapter 33: The Time Machine

## Story

It was the quarterly review, and the analytics team had a problem. "We can tell you how many posts were created last month," said Priya, the data analyst, "but we cannot show you the trend. We cannot answer questions like: Which days had the most activity? Is engagement growing week over week? How much time passes between a user's posts?"

The engineering team recognized the gap immediately. MingleSphereQL had timestamps on every record -- `created_at` columns on posts, comments, messages, and more. But the application had never leveraged PostgreSQL's powerful temporal capabilities. It was time to build a time machine.

PostgreSQL treats time as a first-class concept. The `timestamptz` type stores moments with timezone awareness. The `date_trunc` function can collapse timestamps to the nearest month, week, day, or hour -- perfect for grouping data into buckets. The `generate_series` function can conjure a sequence of dates from thin air, which is essential when you need to show "zero post" days on a chart instead of gaps. Window functions like `LAG` let you calculate the time between consecutive events, and `EXTRACT(EPOCH FROM ...)` converts intervals into raw seconds for numerical analysis.

The team started with date range queries -- filtering posts between two timestamps. Then they aggregated posts by month to build trend charts. The breakthrough came when they used `generate_series` with a `LEFT JOIN` to produce complete daily timelines, including days with no activity. This data powered the new engagement dashboard. Next, they built per-user activity timelines using `LAG` to show how much time elapsed between each of a user's posts. Finally, they created a real-time activity stats query that could answer "how many posts, comments, and unique active users appeared in the last N hours?"

By the end of the sprint, MingleSphereQL could look backward through time with precision, answering temporal questions that had previously required exporting data to external analytics tools. The time machine was running -- and it spoke fluent SQL.

## Concepts

- **Date range filtering**: Use `>= $1::timestamptz` and `< $2::timestamptz` for inclusive-start, exclusive-end ranges.
- **date_trunc**: Truncate a timestamp to a specified precision (year, month, week, day, hour).
- **generate_series with dates**: Produce a sequence of dates/timestamps at a specified interval.
- **LEFT JOIN with date series**: Ensure every date in a range appears in results, even with zero counts.
- **LAG window function**: Access the previous row's value to calculate time between events.
- **EXTRACT(EPOCH FROM ...)**: Convert an interval or timestamp difference to seconds.
- **Interval arithmetic**: Use expressions like `NOW() - ('24 hours')::interval` for relative time windows.

## Code Examples

### Filtering by date range

```sql
SELECT id, content, created_at
FROM posts
WHERE created_at >= '2024-01-01'::timestamptz
  AND created_at < '2024-02-01'::timestamptz
ORDER BY created_at;
```

### Grouping by month

```sql
SELECT date_trunc('month', created_at) as month, COUNT(*)::int as post_count
FROM posts
GROUP BY date_trunc('month', created_at)
ORDER BY month;
```

### Generating a complete daily timeline

```sql
SELECT d.date, COUNT(p.id)::int as post_count
FROM generate_series('2024-01-01'::date, '2024-01-31'::date, '1 day'::interval) as d(date)
LEFT JOIN posts p ON date_trunc('day', p.created_at) = d.date
GROUP BY d.date
ORDER BY d.date;
```

### Calculating time between consecutive posts

```sql
SELECT id, content, created_at,
  created_at - LAG(created_at) OVER (ORDER BY created_at) as gap
FROM posts
WHERE author_id = 1
ORDER BY created_at;
```

## Practice Goals

1. Query posts within a date range using parameterized `timestamptz` comparisons.
2. Aggregate posts by month using `date_trunc` and `COUNT`.
3. Generate a complete date series with `generate_series` and `LEFT JOIN` to fill in gaps.
4. Build a per-user activity timeline using `LAG` and `EXTRACT(EPOCH FROM ...)`.
5. Calculate real-time activity statistics over a sliding time window using interval arithmetic.

## Tips

- Always use `timestamptz` (timestamp with time zone) rather than `timestamp` to avoid timezone ambiguity.
- Use `::int` after `COUNT(*)` to get a JavaScript number instead of a string (PostgreSQL returns `bigint` by default for COUNT).
- `generate_series` with dates is powerful for dashboards -- it guarantees every date appears in the output, even if there is no matching data.
- The `LAG` window function returns `NULL` for the first row in each partition, since there is no previous row to reference.
- When building interval strings dynamically (e.g., `($1 || ' hours')::interval`), be aware of SQL injection risks in production. Use parameterized queries wherever possible.
