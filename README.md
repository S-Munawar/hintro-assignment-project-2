# Hintro — Real-Time Task Collaboration Platform

A full-stack Kanban board application built with the **PERN stack** (PostgreSQL, Express, React, Node.js). Create boards, organize tasks across lists, drag-and-drop across columns, collaborate in real-time with Socket.IO, and track activity history — all in a Turborepo monorepo.

---

## Tech Stack

| Layer            | Technology                                                     |
| ---------------- | -------------------------------------------------------------- |
| Frontend         | Next.js 16, React 19, Zustand 5, Tailwind CSS 3, @dnd-kit     |
| Backend          | Express 5, Prisma 6, Socket.IO 4, Zod 3                       |
| Database         | PostgreSQL 16                                                  |
| Auth             | Supabase Auth (email/password, OAuth)                          |
| Testing          | Vitest 4 (frontend — 348 tests), Jest 30 (backend — 150 tests)|
| Monorepo         | Turborepo 2, pnpm 9                                           |
| CI/CD            | GitHub Actions (lint → test → build → deploy)                  |
| Containerization | Docker, Docker Compose                                         |

---

## Key Features

- **Kanban Boards** — Create multiple boards with customizable colors
- **Drag & Drop** — Reorder tasks within and across lists (`@dnd-kit`)
- **Real-Time Sync** — Instant updates via Socket.IO WebSockets
- **Team Collaboration** — Invite members with admin / editor / viewer roles
- **Task Management** — Priority levels, due dates, assignees, descriptions
- **Activity Tracking** — Full audit log of all board changes
- **Authentication** — Email/password + Google/GitHub OAuth via Supabase
- **Responsive UI** — Tailwind CSS with modern design system

---

## Monorepo Structure

```
/
├── apps/
│   ├── api/               # Express 5 REST API + Socket.IO
│   │   ├── prisma/        #   Prisma schema & migrations
│   │   └── src/
│   │       ├── config/    #   env, database
│   │       ├── controllers/
│   │       ├── middleware/ #   auth, authorize, validation, errorHandler
│   │       ├── routes/    #   boards, tasks, users
│   │       ├── services/  #   boardService, taskService, socketService, …
│   │       └── utils/     #   logger, supabase
│   └── web/               # Next.js 16 frontend
│       ├── app/           #   App Router pages & layouts
│       ├── components/    #   React components (Board, Task, Auth, …)
│       ├── lib/           #   supabaseClient, apiClient, zustand stores
│       └── __tests__/     #   Vitest test suites
├── packages/
│   ├── shared/            # Zod schemas, TypeScript types, enums
│   ├── eslint-config/     # Shared ESLint configurations
│   ├── typescript-config/ # Shared tsconfig presets
│   └── ui/                # Shared React component library
├── docker-compose.yml     # PostgreSQL + API + Web
├── turbo.json             # Turborepo pipeline config
└── pnpm-workspace.yaml
```

---

## Prerequisites

| Requirement    | Version  | Notes                                                       |
| -------------- | -------- | ----------------------------------------------------------- |
| Node.js        | ≥ 18     | Recommend 20 LTS                                            |
| pnpm           | 9.x      | `corepack enable && corepack prepare pnpm@9.0.0 --activate` |
| PostgreSQL     | 14+      | Or use Docker (see below)                                   |
| Supabase       | —        | Free project at [supabase.com](https://supabase.com/dashboard) |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/hintro2.git
cd hintro2
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

**Backend** — create `apps/api/.env`:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://hintro:hintro@localhost:5432/hintro?schema=public

# Supabase  (Settings → API in your Supabase dashboard)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_JWT_SECRET=<your-jwt-secret>
```

**Frontend** — create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 4. Set up the database

**Option A — Local PostgreSQL:**

```bash
createdb hintro
cd apps/api
pnpm db:generate   # generate Prisma client
pnpm db:migrate    # run migrations
```

**Option B — Docker (PostgreSQL only):**

```bash
docker compose up postgres -d
cd apps/api
pnpm db:generate
pnpm db:migrate
```

> **Supabase setup:** Create a database trigger in your Supabase project to
> auto-insert a `profiles` row when a new user signs up. See the
> [Architecture Document](PERN_Architecture_Document.md) for the trigger SQL.

### 5. Start development servers

```bash
# From the repo root — starts API (port 5000) and Web (port 3000)
pnpm dev
```

Or start them individually:

```bash
cd apps/api && pnpm dev    # API only
cd apps/web && pnpm dev    # Web only
```

Open **http://localhost:3000** in your browser.

---

## Docker Compose (Full Stack)

Run the entire stack in containers:

```bash
# Copy env vars to root (Docker Compose reads from .env)
cp apps/api/.env .env

# Build and start all services
docker compose up -d --build

# Run migrations inside the container
docker compose exec api npx prisma migrate deploy

# Tail logs
docker compose logs -f api web

# Shut down
docker compose down          # keep data
docker compose down -v       # remove volumes too
```

| Service    | Port | Description             |
| ---------- | ---- | ----------------------- |
| `postgres` | 5432 | PostgreSQL 16 Alpine    |
| `api`      | 5000 | Express API + Socket.IO |
| `web`      | 3000 | Next.js frontend        |

---

## Available Scripts

### Root (monorepo)

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in dev mode         |
| `pnpm build`       | Build all apps and packages        |
| `pnpm lint`        | Lint all packages with ESLint      |
| `pnpm check-types` | TypeScript type-check all packages |
| `pnpm format`      | Format code with Prettier          |

### Backend (`apps/api`)

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Start API with hot reload (tsx)|
| `pnpm test`         | Run Jest test suite (150 tests)|
| `pnpm test:watch`   | Run tests in watch mode        |
| `pnpm db:generate`  | Generate Prisma client         |
| `pnpm db:migrate`   | Run Prisma migrations          |
| `pnpm db:studio`    | Open Prisma Studio GUI         |

### Frontend (`apps/web`)

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `pnpm dev`           | Start Next.js dev server            |
| `pnpm test`          | Run Vitest test suite (348 tests)   |
| `pnpm test:watch`    | Run tests in watch mode             |
| `pnpm test:coverage` | Run tests with coverage report      |

---

## Testing

```bash
# Backend (Jest 30 + Supertest)
cd apps/api && pnpm test         # 150 tests

# Frontend (Vitest 4 + React Testing Library)
cd apps/web && pnpm test         # 348 tests

# Total: 498 tests
```

---

## CI/CD

### CI — `.github/workflows/ci.yml`

Runs on every push / PR to `master` or `develop`:

1. **Lint & Type-check** — ESLint + TypeScript across all packages
2. **Frontend Tests** — Vitest (parallel with backend)
3. **Backend Tests** — Jest with PostgreSQL service container
4. **Build** — Full production build

### CD — `.github/workflows/cd.yml`

Runs on push to `main`:

1. CI gate (re-runs full pipeline)
2. Build & push Docker images to GHCR
3. SSH deploy → `docker compose up` on production

---

## API Documentation

Full REST API reference is available in [`docs/API.md`](docs/API.md).

Quick overview of endpoints:

| Resource   | Endpoints                                        |
| ---------- | ------------------------------------------------ |
| Health     | `GET /api/health`                                |
| Boards     | `GET / POST /api/boards`, `GET / PUT / DELETE /api/boards/:boardId` |
| Members    | `POST / DELETE /api/boards/:boardId/members`     |
| Lists      | `POST / PUT / DELETE /api/boards/:boardId/lists` |
| Tasks      | `GET / POST /api/boards/:boardId/tasks`, `GET / PUT / DELETE …/:taskId` |
| Move       | `PUT /api/boards/:boardId/tasks/:taskId/move`    |
| Assignees  | `POST / DELETE …/:taskId/assignees`              |
| Activity   | `GET /api/boards/:boardId/activity`              |
| Users      | `GET /api/users/search?q=…`                      |

All endpoints (except health) require `Authorization: Bearer <supabase_access_token>`.

---

## Environment Variables Reference

### Backend (`apps/api/.env`)

| Variable                     | Required | Default                   | Description                  |
| ---------------------------- | -------- | ------------------------- | ---------------------------- |
| `PORT`                       | No       | `5000`                    | API server port              |
| `NODE_ENV`                   | No       | `development`             | Environment mode             |
| `CORS_ORIGIN`                | No       | `http://localhost:3000`   | Allowed CORS origin          |
| `DATABASE_URL`               | Yes      | —                         | PostgreSQL connection string |
| `SUPABASE_URL`               | Yes      | —                         | Supabase project URL         |
| `SUPABASE_ANON_KEY`          | Yes      | —                         | Supabase anon / public key   |
| `SUPABASE_SERVICE_ROLE_KEY`  | Yes      | —                         | Supabase service role key    |
| `SUPABASE_JWT_SECRET`        | Yes      | —                         | JWT signing secret           |

### Frontend (`apps/web/.env.local`)

| Variable                        | Required | Description              |
| ------------------------------- | -------- | ------------------------ |
| `NEXT_PUBLIC_API_URL`           | Yes      | Backend API base URL     |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon / public key |

### Docker Compose (`.env` at project root)

| Variable            | Default | Description            |
| ------------------- | ------- | ---------------------- |
| `POSTGRES_USER`     | hintro  | PostgreSQL username    |
| `POSTGRES_PASSWORD`  | hintro  | PostgreSQL password    |
| `POSTGRES_DB`       | hintro  | Database name          |
| `POSTGRES_PORT`     | 5432    | Exposed PostgreSQL port|
| `API_PORT`          | 5000    | Exposed API port       |
| `WEB_PORT`          | 3000    | Exposed Web port       |

---

## License

Private — All rights reserved.
