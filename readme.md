# Debate Cards

Backend system for searching, parsing, and managing competitive debate evidence ("cards"). Parses Word documents, extracts individual cards, deduplicates them, and serves them via a GraphQL API. Live at [debate.cards](http://debate.cards).

## Architecture

```
                         ┌──────────────┐
                         │  GraphQL API │ :4000
                         │  (Apollo)    │
                         └──────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
        ┌─────┴─────┐   ┌──────┴──────┐   ┌──────┴──────┐
        │ PostgreSQL │   │    Redis    │   │Elasticsearch│
        │  (Prisma)  │   │  (BullMQ)  │   │  (Search)   │
        └─────┬──────┘   └──────┬──────┘   └─────────────┘
              │                 │
              │          ┌──────┴──────┐
              │          │ BullMQ      │
              │          │ Workers     │
              │          │ - parse     │
              │          │ - dedup     │
              │          │ - caselist  │
              │          │ - school    │
              │          │ - team      │
              │          │ - opensource│
              │          │ - openev    │
              │          │ - update    │
              │          └─────────────┘
              │
        ┌─────┴─────┐
        │   .docx   │
        │ documents/ │
        └───────────┘
```

**Stack:** TypeScript, Node.js 20, PostgreSQL 14 (Prisma), Redis 7 (BullMQ), Elasticsearch 8.19, Apollo Server 3, GraphQL

## Prerequisites

- Node.js 20+ and Yarn
- Docker and Docker Compose
- A Caselist API token (for loading from opencaselist.com)

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/debate-cards
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=debate-cards

# Storage
DOCUMENT_PATH=./documents

# Redis
REDIS_PASSWORD=password

# Elasticsearch
ELASTIC_PASSWORD=password

# Caselist API (get from opencaselist.com)
CASELIST_TOKEN=your_token_here

# Auth
JWT_SECRET=your_secret_here
ADMIN_PASSWORD=your_admin_password

# Optional
# API_PORT=4000
# GRAPHQL_PATH=/graphql
# REDIS_URL=redis://localhost:6379
# ELASTICSEARCH_URL=http://localhost:9200   # default http://elasticsearch:9200 only resolves inside Docker
# CACHE_PATH=./cache                        # on-disk cache of caselist API responses
# API_CACHE_ENABLED=false                   # turn that cache off
# FAILURE_LOG_PATH=./logs/failed-jobs.log   # jobs that exhausted their retries
# MAX_QUERY_COMPLEXITY=100                  # GraphQL query cost limit
# RATE_LIMIT_POINTS=1000                    # complexity points per RATE_LIMIT_DURATION
# RATE_LIMIT_DURATION=60                    # seconds
# TRUST_PROXY=1                            # reverse proxies in front of the API (Traefik: 1). Unset when clients connect directly
```

For Docker-internal connections (inside `compose.yaml`), hostnames use the service names (`postgres`, `redis`, `elasticsearch`). For host-machine access (dev commands, seed, tests), use `localhost`.

---

## Development Setup

### 1. Install dependencies

```bash
yarn install
npx prisma generate
```

### 2. Start infrastructure

```bash
docker compose up -d postgres redis elasticsearch
```

Wait for healthy status:

```bash
docker compose ps   # all three should show "healthy"
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

### 4. Seed with local data

If you have `.docx` files in `./documents/`:

```bash
# Parse 10 files (quick smoke test)
yarn seed

# Parse 50 files
yarn seed 50

# Parse ALL local files (~43k files, ~30 min)
yarn seed all
```

The seed script parses each `.docx`, extracts cards, and inserts them into PostgreSQL. It runs 10 files concurrently and reports progress.

### 5. Load data from Caselist API

To pull tournament metadata and download open-source documents from opencaselist.com, you need the task workers running alongside an entry point that enqueues jobs.

**Option A — Dev entry point** (runs inline, good for testing):

```bash
# Edit src/index.ts to call the desired flow, then:
yarn dev
```

**Option B — Start workers + enqueue via GraphQL**:

```bash
# Terminal 1: start task workers
npx ts-node -r tsconfig-paths/register src/tasks.ts

# Terminal 2: start API
yarn dev:api

# Terminal 3: enqueue via GraphQL mutation (requires admin auth)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{"query": "mutation { loadCaselistQueue(active: true, years: [2024]) { size } }"}'
```

To get a JWT token:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { login(password: \"your_admin_password\") { token } }"}'
```

### 6. Run the dev server

```bash
# API only (with hot reload)
yarn dev:api

# Full dev entry point (src/index.ts)
yarn dev
```

The GraphQL playground is available at `http://localhost:4000/graphql`.

### 7. Run tests

```bash
# All unit tests (no infra required)
yarn test

# Specific test suites
yarn test -- dedup-algorithm       # sentence matching algorithm
yarn test -- parse-roundtrip       # docx parse/regenerate cycle

# With a real docx file
DOCX_PATH=./documents/path/to/file.docx yarn test -- parse-roundtrip

# Bucket verification (needs a populated database; skipped unless RUN_DB_TESTS=1)
RUN_DB_TESTS=1 yarn test -- bucket-verify
RUN_DB_TESTS=1 BUCKET_ID=123 yarn test -- bucket-verify
```

**CLI test utilities:**

```bash
# Inspect dedup buckets — lists largest, or detail for a specific ID
npx ts-node -r tsconfig-paths/register src/__tests__/utils/inspect-bucket.ts
npx ts-node -r tsconfig-paths/register src/__tests__/utils/inspect-bucket.ts 42

# Compare docx parsing — round-trip or two files
npx ts-node -r tsconfig-paths/register src/__tests__/utils/compare-docx.ts original.docx
npx ts-node -r tsconfig-paths/register src/__tests__/utils/compare-docx.ts original.docx regenerated.docx
```

---

## Production Deployment

### 1. Build

```bash
yarn build
```

This compiles TypeScript to `./build/` and rewrites path aliases.

### 2. Docker Compose (full stack)

```bash
docker compose up -d
```

This starts:

| Service         | Port  | Description                        |
|-----------------|-------|------------------------------------|
| `postgres`      | 5432  | Primary database                   |
| `redis`         | 6379  | BullMQ job queue backend           |
| `elasticsearch` | 9200  | Full-text search                   |
| `migrate`       | -     | One-shot: applies the Prisma migrations, then exits. `api` and `tasks` wait for it |
| `api`           | 4000  | GraphQL API (`node ./build/modules/api`) |
| `tasks`         | -     | BullMQ workers (caselist, parse, dedup) and the search indexer (`node ./build/tasks.js`) |

Postgres, Redis and Elasticsearch are published on `127.0.0.1` only. The `loader` service (profile `tools`) is not started by `up`; run it to enqueue jobs, for example `docker compose run --rm loader openev 2024`.

### 3. Run migrations in production

With Docker Compose the `migrate` service applies them before the API and workers start. `yarn start` runs the same command in its `prestart` script. To run them by hand:

```bash
docker compose exec api npx prisma migrate deploy
```

### 4. Load API data in production

Once the API and task workers are running, load data via GraphQL mutations (requires admin JWT):

```graphql
# Load all active caselists for 2024
mutation { loadCaselistQueue(active: true, years: [2024]) { size } }

# Load open evidence files
mutation { loadOpenevQueue(years: [2024, 2023]) { size } }

# Start polling for caselist updates
mutation { loadUpdateQueue { size } }

# Load pending files into the parse queue
mutation { loadParseQueue(loadPending: true) { size } }

# Load unbucketed evidence into the dedup queue
mutation { loadDedupQueue(loadPending: true) { size } }
```

Monitor queue status:

```graphql
query { queueStats { name waiting active completed failed delayed } }
query { queueInfo(name: "caselist") { waiting active completed failed } }
```

Clear a stuck queue:

```graphql
mutation { clearQueue(name: "caselist") }
```

### 5. Data loading order

For a fresh deployment, load data in this order:

1. **Caselists** — `loadCaselistQueue` fetches tournament metadata, schools, teams, rounds, and enqueues opensource file downloads automatically (caselist → school → team → opensource chain)
2. **Open Evidence** — `loadOpenevQueue` downloads open-evidence camp files
3. **Parse** — `loadParseQueue(loadPending: true)` parses all downloaded `.docx` files into evidence cards
4. **Dedup** — `loadDedupQueue(loadPending: true)` groups duplicate cards into buckets
5. **Updates** — `loadUpdateQueue` polls active caselists for new rounds

Steps 1-2 download files. Step 3 parses them. Step 4 deduplicates. Step 5 is ongoing.

---

## Project Structure

```
src/
├── actions/              # Business logic (addFile, parseFile, dedupeEvidence, etc.)
├── constants/            # Config values, caselist API types (OpenAPI generated)
├── lib/
│   ├── debate-tools/     # .docx parsing, tokenization, card extraction, generation
│   ├── queues/           # BullMQ Redis connection
│   ├── db.ts             # Prisma client
│   ├── caselist.ts       # Caselist API client with rate limiting
│   ├── elastic.ts        # Elasticsearch client
│   └── events.ts         # TypedEvent emitter
├── modules/
│   ├── api/              # Apollo GraphQL server, resolvers, models
│   ├── caselist/         # BullMQ queues, workers, flow orchestration
│   ├── parser/           # BullMQ parse queue + worker
│   └── deduplicator/     # BullMQ dedup queue + worker, Redis entity system
├── __tests__/            # Jest tests and CLI utilities
├── index.ts              # Dev entry point
├── tasks.ts              # Worker process entry point (starts all BullMQ workers)
└── seed.ts               # Database seeding from local .docx files
```

## npm Scripts

| Script        | Description                                          |
|---------------|------------------------------------------------------|
| `yarn build`  | Compile TypeScript to `./build/`                     |
| `yarn start`  | Production start (migrate + workers + API)           |
| `yarn dev`    | Dev mode with hot reload (`src/index.ts`)            |
| `yarn dev:api`| Dev mode API only with hot reload                    |
| `yarn test`   | Run Jest test suite                                  |
| `yarn seed`   | Seed database from local `.docx` files               |
| `yarn generate` | Regenerate OpenAPI caselist client types            |

## Regenerating Caselist API Types

The caselist API client is generated from an OpenAPI spec:

```bash
yarn generate
```

This uses the spec at `src/constants/caselistSchema.json` and outputs to `src/constants/caselist/`.

## Search index

Search runs on Elasticsearch, which holds one document per card. The app keeps it up to date itself (there is no
separate sync service):

- Code that changes a card (parsing a file, dedup moving it into a bucket, a file's tags changing) adds the card's
  id to a Redis set. The indexer, a loop inside the `tasks` process, takes ids from that set 500 at a time, reads the
  cards' current state from Postgres and bulk-writes them. A card marked many times is indexed once, and ids that
  were being written when the process died are put back on restart.
- Cards are searchable a few seconds after they are indexed. The queue monitor (`node ./build/monitor.js`) prints how many cards are waiting.
- The index definition (analyzer, field mapping) is in `src/modules/search/mapping.ts`. Text is stemmed and
  accent-folded, with no stop word list so "no" and "not" still count.
- Reads and writes go through the `evidence` alias. To rebuild the index from Postgres, for example after changing
  the mapping or when moving off the old pgsync setup, run:

  ```bash
  docker compose run --rm loader reindex
  ```

  It builds a new index next to the live one, swaps the alias over when it is complete and deletes the old index, so
  search keeps working. Expect roughly 10 minutes per 100k cards. The indexer pauses meanwhile and then applies the
  changes it held back.
- Moving from the pgsync setup: run `reindex` once, then drop its leftovers in Postgres with
  `SELECT pg_drop_replication_slot('debatecards_evidence');` (the slot otherwise keeps write-ahead log files on disk).

Optional settings: `SEARCH_INDEX_BATCH` (cards per bulk write, default 500), `SEARCH_REINDEX_BATCH` (default 500),
`ELASTICSEARCH_INDEX` (alias name, default `evidence`).

## Searching

```graphql
query {
  searchEvidence(
    query: "nuclear war -famine"
    take: 20
    skip: 0
    filters: { all: ["hspolicy24"], any: ["wikiA", "wikiN"], none: ["openev"] }
  ) {
    total
    hits {
      score
      evidence { id tag cite markup bucket { count } file { name } }
      highlights { field fragments }   # fragments wrap matches in <mark>; everything else is HTML-escaped
    }
    facets { name buckets { value label count } }
  }
}
```

- **Query syntax.** Every word must match. `"quoted words"` match as a phrase, `-word` excludes, `a | b` means either,
  `word*` matches prefixes, `( )` groups. Odd input (an unbalanced quote, a trailing `OR`, `AT: spec`) is treated as
  plain text and never produces an error. Text is stemmed, so "regulation" also finds "regulations" and "regulate".
  `query` can be left out when `filters` are given, to browse by tag.
- **Filters** match tag names exactly (case sensitive): `all` needs every tag, `any` at least one, `none` excludes.
- **Results** are one hit per group of duplicate cards (the best scoring version). `total` counts those groups and
  `evidence.bucket.count` is how many copies exist. Cards that appear in many rounds are nudged up, gently
  (`duplicateWeight`, default 0.2, 0 turns it off).
- **Facets** count matching cards per tag for source (wiki / Open Evidence), side, level, event, year, camp and Open
  Evidence type. Each count is what `total` becomes if you add that tag to `filters.all`. Pass `facets: false` or
  `highlight: false` to skip them.
- **Limits.** `take` is 1 to 100 and `skip + take` cannot pass 10,000; a query is at most 500 characters. The API's
  query cost limit also caps `take`: with a full card selection (markup, file tags, bucket) about 58 fit in one page.
  Mistakes come back as a `BAD_USER_INPUT` error with a message safe to show. If Elasticsearch is down the error says
  search is temporarily unavailable and nothing more.
- The older `search` query still works (now on the same engine, with no raw Elasticsearch errors) but is deprecated.
