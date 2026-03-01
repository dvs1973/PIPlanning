# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PI Planning Dashboard for the Flemish government (Vlaamse overheid). A full-stack monorepo for 5 agile teams to manage capacity, projects, sprint planning, and what-if scenarios. Deployed on Railway with PostgreSQL.

## Commands

```bash
# Development (starts both server and client concurrently)
npm run dev

# Server only (tsx watch, auto-reload)
npm run dev:server

# Client only (Vite dev server on port 5173)
npm run dev:client

# Build for production (client Vite build + server TypeScript compile)
npm run build

# Start production server
npm run start

# Database
npm run db:migrate    # Prisma migrate dev (local)
npm run db:push       # Prisma db push (Railway deployment)
npm run db:seed       # Seed with 5 teams, 30 members, 12 sprints, 8 projects
npm run db:studio     # Prisma Studio GUI
```

Environment variables needed in `.env` (see `.env.example`): `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `PORT`.

## Architecture

**Monorepo** — Express serves both API (`/api/*`) and the static React build in production.

### Server (`server/`)
- **Entry**: `server/index.ts` — Express app with helmet, CORS, all route modules mounted under `/api`
- **Routes → Services → Prisma**: Each domain has a route file and a service file. Routes handle HTTP, services contain business logic and Prisma queries.
- **Auth**: JWT tokens (7-day expiry) with bcrypt hashing. Middleware in `server/middleware/auth.ts` provides `authenticate()` and `requireAdmin()`.
- **Core calculation engine**: `server/services/capacity.service.ts` — all capacity formulas: net capacity = `(sprint_days - leave) × (1 - overhead%) × (1 - bug_reserve%)`. This is the most critical file.
- **Planning logic**: `server/services/planning.service.ts` — roadmap generation, sprint planning grids, project duration estimation based on bottleneck role.

### Client (`client/`)
- React 18 + TypeScript + Vite (dev port 5173, proxies `/api` to `:3000`)
- Tailwind CSS with custom dark theme colors defined in `client/tailwind.config.ts`
- **State**: React Context for auth (`AuthContext.tsx`), TanStack Query for all server state
- **API layer**: Axios instance in `client/src/api/client.ts` with JWT interceptor (auto-logout on 401)
- **Hooks**: `client/src/hooks/` — one hook file per domain (useTeams, useProjects, useCapacity, useSprints, useMembers) wrapping TanStack Query with cache invalidation on mutations
- **Pages**: Login, Roadmap (Gantt), Sprint Planning (capacity grid), Capacity (heatmap), Projects (CRUD table), Teams (members + leave blocks), Scenarios (what-if builder)

### Shared (`shared/`)
- `shared/types.ts` — TypeScript interfaces and enums used by both server and client

### Database (`prisma/`)
- PostgreSQL via Prisma ORM
- Key models: User, Team, TeamMember, Sprint, LeaveEntry, Project, ProjectAssignment, Scenario, ScenarioChange
- Teams have configurable role percentages (dev/test/analysis/po), overhead%, and bug_reserve%
- Two team types: `JAVA_ANGULAR` and `ORACLE_APEX` with different default distribution keys

## Key Conventions

- **Dutch UI, English code**: All user-facing labels, buttons, toasts, and error messages are in Dutch. All variable names, function names, and code comments are in English.
- **Calculations are backend-only**: The frontend never computes capacity or planning data — it only renders results from API responses.
- **Prisma ORM only**: Use Prisma for all database access. Use `include` for relations, avoid raw SQL unless needed for complex aggregations.
- **TanStack Query patterns**: Use `invalidateQueries` after mutations. Leave entries use optimistic updates for responsive leave-block clicking.
- **Delete confirmation**: Always use the `ConfirmDialog` component before delete actions.
- **Capacity color coding**: Green (<80%), Orange (80-95%), Red (>95%) — applied consistently across Sprint Planning, Capacity heatmap, and Roadmap pages.

## Deployment

Railway with `railway.toml`. Build command: `npm run build`. Start: `npm run start`. Health check at `/api/health`. Use `prisma db push` (not migrate) for Railway deployments.
