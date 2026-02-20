# MingleSphereQL

> *Where every query tells a story.*

A story-driven **PostgreSQL + Drizzle ORM** learning lab with **34 chapters**, each containing a narrative README, failing Vitest tests, and stub exercises you fill in. Built with TypeScript, featuring PostgreSQL-specific superpowers: pgvector, pg_trgm, LISTEN/NOTIFY, PostGIS, and a 3-chapter deep-dive on Row-Level Security.

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL)
- [Node.js](https://nodejs.org/) 20+
- npm or pnpm

### 1. Clone and Install

```bash
cd minglesphereql
npm install
```

### 2. Start PostgreSQL

```bash
npm run db:up
```

This launches PostgreSQL 16 with PostGIS, pgvector, and pg_trgm extensions pre-installed.

### 3. Run Your First Test

```bash
npm run test:01
```

You'll see 5 failing tests. Open `chapters/01-the-genesis-of-minglesphereql/exercise.ts` and fill in the stub functions to make them pass!

### 4. Check Your Progress

```bash
npm run progress
```

### 5. Launch the Dashboard (optional)

```bash
npm run dashboard
```

Visit [http://localhost:3000](http://localhost:3000) to explore your database visually.

### 6. Launch pgAdmin (optional)

```bash
npm run db:admin
```

Visit [http://localhost:8080](http://localhost:8080) (login: `admin@minglesphereql.dev` / `admin`).

---

## How It Works

Each chapter follows the same pattern:

1. **Read the story** in `chapters/XX-chapter-name/README.md`
2. **Run the failing tests**: `npm run test:XX`
3. **Fill in the exercises** in `chapters/XX-chapter-name/exercise.ts`
4. **Watch tests go green** as you implement each function
5. **Move to the next chapter**

### Checking Solutions

If you get stuck, reference solutions are available:

```bash
# Run tests against solutions to verify they work
SOLUTIONS=true npm run test:01
```

---

## Chapters

### Part I: Foundations (Ch 1-5)
| # | Chapter | Concepts |
|---|---------|----------|
| 01 | The Genesis of MingleSphereQL | Docker, connections, pool |
| 02 | The Schema Forge | pgTable, column types |
| 03 | Opening the Gates | INSERT, returning, bulk |
| 04 | Finding Your People | SELECT, WHERE, LIKE |
| 05 | The Column Codex | All column types, JSONB |

### Part II: Data Integrity (Ch 6-9)
| # | Chapter | Concepts |
|---|---------|----------|
| 06 | The Gatekeepers | Constraints, errors |
| 07 | The Migration Trail | Drizzle Kit, ALTER TABLE |
| 08 | The Query Masters | AND, OR, IN, BETWEEN |
| 09 | Select, Sort, and Slice | ORDER BY, GROUP BY, pagination |

### Part III: Data Manipulation (Ch 10-13)
| # | Chapter | Concepts |
|---|---------|----------|
| 10 | The Great Edit | UPDATE, partial updates |
| 11 | The JSON Vault | JSONB, jsonb_set, operators |
| 12 | The Clean Sweep | DELETE, soft delete, CASCADE |
| 13 | The Batch Express | Upsert, bulk ops |

### Part IV: Relationships (Ch 14-17)
| # | Chapter | Concepts |
|---|---------|----------|
| 14 | The Relational Web | JOINs, relations API |
| 15 | Many to Many | Junction tables |
| 16 | Going Deeper | Nested with, self-ref |
| 17 | The Computed Fields | SQL expressions, subqueries |

### Part V: Advanced Queries (Ch 18-21)
| # | Chapter | Concepts |
|---|---------|----------|
| 18 | The Aggregation Engine | GROUP BY, HAVING, aggregates |
| 19 | Window into the Data | RANK, ROW_NUMBER, LAG/LEAD |
| 20 | The Common Path | CTEs, recursive CTEs |
| 21 | The View from Above | Views, materialized views |

### Part VI: Behavior & Structure (Ch 22-25)
| # | Chapter | Concepts |
|---|---------|----------|
| 22 | The Trigger Mechanism | Triggers, PL/pgSQL |
| 23 | The Vault | Transactions, isolation, savepoints |
| 24 | The Watchtower | LISTEN/NOTIFY |
| 25 | The Pipeline | LATERAL, ARRAY_AGG, FILTER |

### Part VII: Row-Level Security (Ch 26-28)
| # | Chapter | Concepts |
|---|---------|----------|
| 26 | The Invisible Walls | RLS basics, policies |
| 27 | The Policy Workshop | PERMISSIVE vs RESTRICTIVE |
| 28 | The Fortress in Production | Multi-tenant, performance |

### Part VIII: Indexing & Search (Ch 29-31)
| # | Chapter | Concepts |
|---|---------|----------|
| 29 | Speed Lanes | B-tree, GIN, GiST, EXPLAIN |
| 30 | The Search Engine | tsvector, tsquery, pg_trgm |
| 31 | The Similarity Engine | pgvector, HNSW, cosine |

### Part IX: Advanced Features (Ch 32-34)
| # | Chapter | Concepts |
|---|---------|----------|
| 32 | The Map | PostGIS, ST_Distance |
| 33 | The Time Machine | date_trunc, generate_series |
| 34 | The Production Countdown | Pooling, performance, monitoring |

---

## Stack

- **Database**: PostgreSQL 16 + PostGIS + pgvector + pg_trgm
- **ORM**: Drizzle ORM
- **Language**: TypeScript
- **Testing**: Vitest 3
- **Dashboard**: Express 5
- **CLI Viz**: chalk + cli-table3 + boxen

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:admin` | Start pgAdmin at :8080 |
| `npm run test` | Run all 170 tests |
| `npm run test:XX` | Run tests for chapter XX |
| `npm run progress` | Show chapter completion status |
| `npm run dashboard` | Start web dashboard at :3000 |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |

---

## License

MIT
