# Chapter 31: The Similarity Engine

## The Story So Far

The feature request arrives with a mockup: a sidebar on every user profile that says "People you may know," showing five faces with eerily accurate suggestions. The product team wants recommendations that go beyond simple friend-of-friend graphs. They want the system to understand that a user who writes about "distributed systems and Rust" is probably more similar to someone who posts about "concurrent programming in Go" than to someone who shares recipes. The question is: how do you teach a database to understand meaning?

The answer is *vector embeddings*. Somewhere upstream -- perhaps a machine learning pipeline, perhaps an API call to an embedding model -- each user's profile gets compressed into a 384-dimensional vector. This vector is not random; it is a point in a high-dimensional space where proximity corresponds to semantic similarity. Users who share interests, writing styles, or professional backgrounds end up as neighbors in this space. Two users whose embeddings are close together (low cosine distance) are similar. Two users whose embeddings point in opposite directions are different.

PostgreSQL, thanks to the `pgvector` extension, can store these vectors as native column types and search them with remarkable speed. The `<=>` operator computes cosine distance between two vectors in a single expression. But scanning every vector in a table of millions to find the nearest neighbors would be too slow. That is where specialized indexes come in. The HNSW (Hierarchical Navigable Small World) index builds a multi-layered graph structure that enables approximate nearest neighbor search in logarithmic time. It trades a tiny amount of accuracy for enormous speed gains -- finding the closest vectors among millions in just a few milliseconds.

The team builds the pipeline: embeddings flow in from the ML service, get stored in the `embedding` column, and the recommendation sidebar queries `findSimilarUsers` with a single SQL call. No external vector database. No separate service. Just PostgreSQL doing what it does best -- storing, indexing, and querying data -- but now in 384 dimensions instead of one.

## Concepts Covered

- **pgvector extension**: Adds a native `vector` data type and distance operators to PostgreSQL.
- **Cosine distance (`<=>`)**: Measures the angle between two vectors. A distance of 0 means identical direction; values closer to 0 indicate higher similarity.
- **HNSW index**: A graph-based approximate nearest neighbor index that provides fast vector search with tunable accuracy.
- **Vector insertion**: Storing embedding arrays as `vector` typed columns using the `[x,y,z,...]` string format.
- **Range queries on vectors**: Finding all vectors within a given distance threshold.
- **Vector statistics**: Using `vector_norm` and aggregate functions to analyze embedding distributions.

## Code Examples

### Inserting a User with an Embedding

```sql
INSERT INTO users (username, email, embedding)
VALUES ('alice', 'alice@example.com', '[0.12, -0.34, 0.56, ...]'::vector)
RETURNING id, username, email;
```

### Finding Similar Users (Cosine Distance)

```sql
SELECT u2.id, u2.username,
  u2.embedding <=> (SELECT embedding FROM users WHERE id = 42) as distance
FROM users u2
WHERE u2.id != 42 AND u2.embedding IS NOT NULL
ORDER BY distance ASC
LIMIT 5;
```

### Creating an HNSW Index

```sql
CREATE INDEX idx_users_embedding_hnsw
ON users USING hnsw(embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

- `m`: Controls the maximum number of connections per node. Higher values improve recall but increase memory.
- `ef_construction`: Controls the search width during index building. Higher values improve index quality but slow down construction.

### Range Search

```sql
SELECT id, username, embedding <=> '[0.1, 0.2, ...]'::vector as distance
FROM users
WHERE embedding IS NOT NULL
  AND embedding <=> '[0.1, 0.2, ...]'::vector < 0.5
ORDER BY distance ASC
LIMIT 20;
```

### Embedding Statistics

```sql
SELECT
  COUNT(*) as total_users,
  COUNT(embedding) as users_with_embeddings,
  AVG(vector_norm(embedding)) as avg_norm
FROM users;
```

## Practice Goals

1. **Insert users with embeddings** and verify the vectors are stored correctly.
2. **Find similar users** using cosine distance and the `<=>` operator.
3. **Create an HNSW index** to accelerate nearest-neighbor search at scale.
4. **Perform range queries** to find all users within a given similarity threshold.
5. **Compute embedding statistics** to understand the distribution of vectors in the database.

## Tips

- Always cast embedding strings to `::vector` when inserting. PostgreSQL needs the explicit cast to interpret the array format.
- Cosine distance ranges from 0 (identical) to 2 (opposite). For normalized vectors, it ranges from 0 to 1.
- HNSW indexes support approximate nearest neighbor search. The results may not always be the exact nearest neighbors, but they are very close and much faster.
- Use `SET hnsw.ef_search = 100` to increase search accuracy at query time (at the cost of speed).
- The `vector_norm` function returns the L2 norm (magnitude) of a vector. Normalized vectors have a norm of 1.
- For very large datasets (millions of rows), consider IVFFlat indexes as an alternative to HNSW. IVFFlat is faster to build but requires a training step.
- pgvector supports multiple distance metrics: `<=>` (cosine), `<->` (L2/Euclidean), and `<#>` (inner product). Choose based on your embedding model's recommendation.
