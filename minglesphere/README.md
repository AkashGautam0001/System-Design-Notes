# MingleSphere - A Story-Driven MongoDB Learning Lab

> *"Where every connection tells a story."*

Build a full social media platform from scratch while mastering MongoDB and Mongoose through 28 story-driven chapters. Each chapter introduces new concepts through a narrative, provides failing tests, and challenges you to write the code that makes them pass.

## Prerequisites

- **Node.js** 20+
- **Docker** & **Docker Compose**
- A terminal and your favorite code editor

## Quick Start

### 1. Start MongoDB

```bash
docker compose up -d
```

This starts a MongoDB 8.0 single-node replica set (required for transactions and change streams). The replica set initializes automatically via healthcheck.

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Setup

```bash
npm run test:01
```

You should see 5 failing tests - that means everything is working! Your job is to make them pass.

## How It Works

### The Learning Flow

1. **Read** the chapter's `README.md` for the story and concept explanations
2. **Edit** `exercise.js` to implement the stub functions
3. **Run** `npm run test:XX` to check your work
4. **All green?** Move to the next chapter!

### Running Tests

```bash
# Run a specific chapter's tests
npm run test:01          # Chapter 1
npm run test:14          # Chapter 14

# Run ALL tests
npm test

# Test against reference solutions (to verify they work)
SOLUTIONS=true npm run test:01
SOLUTIONS=true npm test
```

### Track Your Progress

```bash
# CLI progress tracker
npm run progress

# Web dashboard
npm run dashboard
# Then open http://localhost:3000
```

## Chapters

### Part I: Foundations (Ch 1-5)
| # | Chapter | Concepts |
|---|---------|----------|
| 01 | The Birth of MingleSphere | Docker MongoDB, Mongoose connection, readyState |
| 02 | The First Blueprint | Schemas, Models, schema types, collection naming |
| 03 | Opening the Doors | save(), create(), insertMany(), ObjectId |
| 04 | Finding Your People | find(), findOne(), findById(), lean() |
| 05 | The Type Vault | Array, Mixed, Map, Buffer, Decimal128 |

### Part II: Data Integrity (Ch 6-9)
| # | Chapter | Concepts |
|---|---------|----------|
| 06 | The Gatekeepers | Validation: required, min/max, enum, custom |
| 07 | Schema Superpowers | timestamps, strict, defaults, toJSON transforms |
| 08 | The Query Masters | Comparison, logical, element query operators |
| 09 | Select, Sort, and Slice | select, sort, skip/limit, distinct, count |

### Part III: Data Manipulation (Ch 10-13)
| # | Chapter | Concepts |
|---|---------|----------|
| 10 | The Great Edit | updateOne/Many, $set/$unset/$inc, upsert |
| 11 | Array Alchemy | $push/$pull/$addToSet, $each/$slice, positional $ |
| 12 | The Clean Sweep | deleteOne/Many, soft delete pattern |
| 13 | The Bulk Express | bulkWrite, ordered vs unordered |

### Part IV: Relationships (Ch 14-17)
| # | Chapter | Concepts |
|---|---------|----------|
| 14 | A Deeper Layer | Subdocuments, arrays of subdocs |
| 15 | The Social Web | References, populate() |
| 16 | Going Deeper | Deep populate, relationship patterns |
| 17 | The Phantom Fields | Virtuals, virtual populate |

### Part V: Behavior (Ch 18-20)
| # | Chapter | Concepts |
|---|---------|----------|
| 18 | Document Intelligence | Instance methods, statics, query helpers |
| 19 | The Watchers | Pre/post hooks, async middleware |
| 20 | Family Ties | Discriminators, plugins |

### Part VI: Indexing & Search (Ch 21-22)
| # | Chapter | Concepts |
|---|---------|----------|
| 21 | Speed Lanes | Single/compound/unique/TTL indexes, explain() |
| 22 | The Search Engine | $text search, $regex, autocomplete |

### Part VII: Aggregation (Ch 23-24)
| # | Chapter | Concepts |
|---|---------|----------|
| 23 | The Data Refinery | $match, $group, $sort, $project, accumulators |
| 24 | The Data Architect | $lookup, $unwind, $bucket, $facet |

### Part VIII: Advanced (Ch 25-28)
| # | Chapter | Concepts |
|---|---------|----------|
| 25 | The Vault | ACID transactions, sessions |
| 26 | The Watchtower | Change streams, real-time events |
| 27 | The Map | GeoJSON, 2dsphere, $near, $geoNear |
| 28 | The Production Countdown | Connection pooling, lean, error handling |

## Project Structure

```
minglesphere/
├── chapters/           # 28 chapter folders with README, exercise, tests
├── solutions/          # Reference solutions for all chapters
├── models/             # Mongoose models (User, Post, Comment, etc.)
├── shared/             # Connection helpers, test utilities, visualization
├── dashboard/          # Express web dashboard
├── scripts/            # Progress tracker, init scripts
└── docker-compose.yml  # MongoDB replica set
```

## Optional: Mongo Express Admin UI

```bash
docker compose --profile admin up -d
# Open http://localhost:8081
```

## Web Dashboard

```bash
npm run dashboard
# Open http://localhost:4000
```

Features:
- Database stats and collection overview
- Document browser with pagination
- Index viewer with type badges
- Schema diagrams with relationships
- Aggregation pipeline playground
- Chapter progress tracker

## Tips

- Each chapter builds on the previous ones - work through them in order
- Stuck? Check `solutions/XX-chapter-name.solution.js` for the reference answer
- Use `npm run progress` to see your overall completion
- The web dashboard helps visualize your data as you work

## Stack

- **MongoDB 8.0** (Docker, replica set)
- **Mongoose 8** (ODM)
- **Jest 30** (testing)
- **Express 5** (dashboard)
- **chalk / cli-table3 / boxen** (console visualization)
