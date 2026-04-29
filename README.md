# Candidate Pipeline

A NestJS 11 mini-pipeline: submit a candidate application → store in PostgreSQL → trigger a BullMQ background job.

## Pipeline Flow

```
POST /candidates (multipart/form-data)
  └─▶ StorageService  →  save resume to uploads/ (mock S3)
  └─▶ PrismaService   →  persist Candidate to PostgreSQL
  └─▶ BullMQ Queue    →  enqueue `process-candidate` job
        └─▶ CandidateProcessor (worker)
              └─▶ status: PENDING → PROCESSING → PROCESSED
```

## Tech Stack

| Concern       | Library                    |
|---------------|----------------------------|
| Framework     | NestJS 11                  |
| ORM           | Prisma 6 + PostgreSQL      |
| Queue         | BullMQ + `@nestjs/bullmq`  |
| File upload   | Multer (disk storage)      |
| Validation    | `class-validator`          |
| API Docs      | Swagger (`@nestjs/swagger`) |

## Prerequisites

- Node.js ≥ 20
- Docker (for PostgreSQL + Redis)

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Run Prisma migration
npx prisma migrate dev --name init

# 5. Start the server
npm run start:dev
```

API available at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/docs`

## Environment Variables

| Variable       | Default                                                             | Description         |
|----------------|---------------------------------------------------------------------|---------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/candidate_pipeline`  | Prisma DB URL       |
| `REDIS_HOST`   | `localhost`                                                         | Redis host          |
| `REDIS_PORT`   | `6379`                                                              | Redis port          |
| `PORT`         | `3000`                                                              | HTTP server port    |
| `UPLOAD_DEST`  | `./uploads`                                                         | Resume storage path |

## API Endpoints

### `POST /candidates`
Submit a candidate application. Accepts `multipart/form-data`.

| Field      | Type   | Required | Description             |
|------------|--------|----------|-------------------------|
| `name`     | string | ✓        | Full name               |
| `email`    | string | ✓        | Unique email address    |
| `position` | string | ✓        | Role applying for       |
| `phone`    | string |          | Phone number            |
| `resume`   | file   |          | PDF/DOC/DOCX, max 5 MB  |

**Example (curl):**
```bash
curl -X POST http://localhost:3000/candidates \
  -F "name=Jane Doe" \
  -F "email=jane@example.com" \
  -F "position=Senior Engineer" \
  -F "resume=@/path/to/resume.pdf"
```

### `GET /candidates`
List all candidates.

### `GET /candidates/:id`
Get a single candidate by ID.

## Candidate Status Lifecycle

```
PENDING → PROCESSING → PROCESSED
                     ↘ REJECTED  (reserved for future rejection logic)
```

## Project Structure

```
src/
├── prisma/                      # PrismaService (DB connection)
├── storage/                     # StorageService (mock S3 via multer)
├── queue/                       # BullMQ setup + worker
│   ├── queue.constants.ts
│   ├── queue.module.ts
│   └── candidate.processor.ts
└── candidate/                   # Feature module
    ├── dto/create-candidate.dto.ts
    ├── candidate.controller.ts
    ├── candidate.service.ts
    └── candidate.module.ts
prisma/
└── schema.prisma
```

## Running Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Mock S3 Notes

Uploads are stored locally in `./uploads/`. `StorageService` exposes `upload()` and `delete()` — the same interface you'd use with a real S3 client — so swapping in `@aws-sdk/client-s3` requires only changing the service internals.
