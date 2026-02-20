# Chapter 30: The Search Engine

## The Story So Far

It is Wednesday morning and the product manager walks into the engineering standup with a single slide: a screenshot of a user typing "enginer" into the MingleSphereQL search bar and getting zero results. The user meant "engineer," but the platform's simple `LIKE '%engineer%'` query demands exact spelling and punishes anyone who makes a typo. Worse, even when users spell things correctly, the search ignores context -- searching for "building" returns nothing because bios say "builds" or "builder," and a naive pattern match cannot see that these words share the same root.

The team knows they need two things: *full-text search* that understands language (stemming, stop words, ranking by relevance) and *fuzzy matching* that forgives typos and approximations. Some engineers suggest adding Elasticsearch. But the senior DBA raises an eyebrow and opens the PostgreSQL documentation. "We already have everything we need," she says.

PostgreSQL ships with a powerful full-text search engine built on two core concepts: `tsvector` (a processed document stripped down to its searchable stems) and `tsquery` (a structured search expression). When you convert a bio like "Full-stack engineer who loves building web applications" into a tsvector, PostgreSQL reduces it to stems: `'applic' 'build' 'engin' 'full' 'full-stack' 'love' 'stack' 'web'`. Now a search for "engineer" matches because it shares the stem "engin." Add a GIN index on the tsvector and the search runs in milliseconds even across millions of rows.

For fuzzy matching, PostgreSQL offers the `pg_trgm` extension. It breaks strings into trigrams (three-character slices) and compares how many trigrams two strings share. "alice" and "alce" share most of their trigrams, so `similarity('alice', 'alce')` returns a high score. Combined with a GIN trigram index, this powers a "did you mean?" experience without any external service.

The real power comes from combining both approaches. Full-text search finds users whose bios are semantically relevant. Trigram matching finds users whose usernames are close to what was typed. Blend the scores and you get a search engine that is both intelligent and forgiving.

## Concepts Covered

- **tsvector and tsquery**: PostgreSQL's built-in full-text search primitives. `to_tsvector` converts text to a searchable vector of lexemes. `plainto_tsquery` converts a search string into a query.
- **ts_rank**: Ranks search results by relevance based on how well the document matches the query.
- **GIN indexes for FTS**: Generalized Inverted Indexes store the tsvector tokens for fast lookup.
- **pg_trgm extension**: Provides trigram-based similarity functions (`similarity()`, `%` operator) for fuzzy string matching.
- **GIN trigram indexes**: Index trigrams for fast approximate string matching.
- **Combined search**: Blending FTS relevance and trigram similarity into a unified ranking.

## Code Examples

### Full-Text Search with Ranking

```sql
SELECT id, username, display_name,
  ts_rank(
    to_tsvector('english', COALESCE(bio, '') || ' ' || COALESCE(display_name, '')),
    plainto_tsquery('english', 'engineer')
  ) as rank
FROM users
WHERE to_tsvector('english', COALESCE(bio, '') || ' ' || COALESCE(display_name, ''))
      @@ plainto_tsquery('english', 'engineer')
ORDER BY rank DESC;
```

### Creating a GIN FTS Index

```sql
CREATE INDEX idx_users_fts ON users
  USING GIN(to_tsvector('english', COALESCE(bio, '') || ' ' || COALESCE(display_name, '')));
```

### Trigram Fuzzy Search

```sql
-- Enable the extension first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT id, username, similarity(username, 'alce') as score
FROM users
WHERE username % 'alce'
ORDER BY score DESC;
```

### Creating a GIN Trigram Index

```sql
CREATE INDEX idx_users_trgm_username ON users
  USING GIN(username gin_trgm_ops);
```

## Practice Goals

1. **Perform full-text search** across user bios and display names with relevance ranking.
2. **Create a GIN index** for full-text search to make it production-fast.
3. **Perform trigram fuzzy search** on usernames to handle typos and partial matches.
4. **Create a GIN trigram index** to accelerate fuzzy matching queries.
5. **Combine both search strategies** into a single query that ranks by blended relevance.

## Tips

- Always wrap nullable columns with `COALESCE(column, '')` before passing them to `to_tsvector` to avoid null propagation.
- The `'english'` configuration handles stemming and stop words for English text. PostgreSQL supports many languages.
- `plainto_tsquery` is the simplest way to convert user input to a tsquery. For advanced users, `websearch_to_tsquery` supports quoted phrases and boolean operators.
- Set `pg_trgm.similarity_threshold` to control how strict the `%` operator is. Lower values return more results but with lower quality.
- GIN indexes are slower to update than B-tree indexes but much faster for search queries. They are ideal for read-heavy workloads.
- Consider using `ts_headline` to generate search result snippets with highlighted matches.
