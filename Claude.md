# PI Planning Dashboard — Claude Code Prompt

## Project Overzicht

Bouw een volledige PI Planning Dashboard webapplicatie voor de Vlaamse overheid. Dit is een tool voor 5 agile teams om capaciteit, projecten en sprintplanning te beheren. De applicatie wordt gehost op **Railway** met **PostgreSQL** als database.

---

## Tech Stack

| Laag | Technologie |
|------|-------------|
| **Frontend** | React 18+ met TypeScript, Tailwind CSS, Vite |
| **Backend** | Node.js met Express + TypeScript |
| **Database** | PostgreSQL (Railway built-in) |
| **ORM** | Prisma ORM |
| **Auth** | JWT tokens met bcrypt password hashing |
| **Hosting** | Railway (monorepo: Express serveert API + static React build) |
| **Overig** | Recharts voor grafieken, TanStack Query, date-fns |

---

## PostgreSQL Database Schema

### ERD Overzicht

```
users ──────────────┐
                     │
teams ───┬── team_members ── leave_entries
         │
         ├── projects ──┬── project_assignments (sprint allocatie)
         │              │
         │              └── (berekende rolverdeling via distribution_key)
         │
         └── distribution_keys (per team type)

sprints ─────────────── leave_entries
                         project_assignments

scenarios ── scenario_changes
```

### Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth & Users ───

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password_hash String
  name          String
  role          UserRole  @default(VIEWER)
  team_id       String?
  team          Team?     @relation(fields: [team_id], references: [id], onDelete: SetNull)
  scenarios     Scenario[]
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  @@map("users")
}

enum UserRole {
  ADMIN
  TEAM_LEAD
  VIEWER
}

// ─── Teams ───

model Team {
  id                    String       @id @default(uuid())
  name                  String       @unique
  type                  TeamType
  dev_percentage        Float        @default(0.50)
  test_percentage       Float        @default(0.25)
  analysis_percentage   Float        @default(0.15)
  po_percentage         Float        @default(0.10)
  overhead_percentage   Float        @default(15)
  bug_reserve_percentage Float       @default(20)
  sprint_days           Int          @default(10)
  created_at            DateTime     @default(now())
  updated_at            DateTime     @updatedAt

  members               TeamMember[]
  projects              Project[]
  users                 User[]

  @@map("teams")
}

enum TeamType {
  JAVA_ANGULAR
  ORACLE_APEX
}

// ─── Team Members ───

model TeamMember {
  id          String       @id @default(uuid())
  team_id     String
  team        Team         @relation(fields: [team_id], references: [id], onDelete: Cascade)
  name        String
  role        MemberRole
  initials    String       @db.VarChar(4)
  active      Boolean      @default(true)
  created_at  DateTime     @default(now())
  updated_at  DateTime     @updatedAt

  leave_entries LeaveEntry[]

  @@map("team_members")
}

enum MemberRole {
  DEV
  TEST
  ANALYST
  PO
}

// ─── Sprints ───

model Sprint {
  id          String    @id @default(uuid())
  name        String
  number      Int       @unique
  start_date  DateTime  @db.Date
  end_date    DateTime  @db.Date
  created_at  DateTime  @default(now())

  leave_entries       LeaveEntry[]
  project_assignments ProjectAssignment[]

  @@map("sprints")
}

// ─── Leave / Afwezigheid ───

model LeaveEntry {
  id          String    @id @default(uuid())
  member_id   String
  member      TeamMember @relation(fields: [member_id], references: [id], onDelete: Cascade)
  sprint_id   String
  sprint      Sprint    @relation(fields: [sprint_id], references: [id], onDelete: Cascade)
  date        DateTime  @db.Date
  type        LeaveType
  created_at  DateTime  @default(now())

  @@unique([member_id, date])
  @@index([member_id, sprint_id])
  @@map("leave_entries")
}

enum LeaveType {
  VERLOF
  OPLEIDING
  ZIEKTE
}

// ─── Projects ───

model Project {
  id                String        @id @default(uuid())
  pid               String        @unique
  name              String
  priority          Priority      @default(B)
  status            ProjectStatus @default(PLANNED)
  total_mandays     Float
  it_mandays        Float
  business_mandays  Float
  assigned_team_id  String?
  assigned_team     Team?         @relation(fields: [assigned_team_id], references: [id], onDelete: SetNull)
  capacity_split    Float         @default(1.0)
  start_sprint_id   String?
  start_sprint      Sprint?       @relation("ProjectStartSprint", fields: [start_sprint_id], references: [id], onDelete: SetNull)
  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt

  assignments       ProjectAssignment[]

  @@map("projects")
}

enum Priority {
  A
  B
  C
}

enum ProjectStatus {
  ACTIVE
  PLANNED
  DONE
}

// ─── Project Sprint Assignments ───
// Hoeveel capaciteit een project claimt per sprint (optioneel, voor fijnafstemming)

model ProjectAssignment {
  id          String  @id @default(uuid())
  project_id  String
  project     Project @relation(fields: [project_id], references: [id], onDelete: Cascade)
  sprint_id   String
  sprint      Sprint  @relation(fields: [sprint_id], references: [id], onDelete: Cascade)
  split       Float   @default(1.0)   // Welk deel van teamcapaciteit dit project krijgt
  created_at  DateTime @default(now())

  @@unique([project_id, sprint_id])
  @@map("project_assignments")
}

// ─── What-if Scenarios ───

model Scenario {
  id          String    @id @default(uuid())
  name        String
  created_by  String
  creator     User      @relation(fields: [created_by], references: [id], onDelete: Cascade)
  created_at  DateTime  @default(now())

  changes     ScenarioChange[]

  @@map("scenarios")
}

model ScenarioChange {
  id            String         @id @default(uuid())
  scenario_id   String
  scenario      Scenario       @relation(fields: [scenario_id], references: [id], onDelete: Cascade)
  change_type   ChangeType
  project_id    String?
  member_id     String?
  // Flexible JSON voor parameters per type
  parameters    Json           @default("{}")

  @@map("scenario_changes")
}

enum ChangeType {
  PRIORITY_CHANGE    // parameters: { from: "B", to: "A" }
  MEMBER_ABSENCE     // parameters: { sprints: 3 }
  PROJECT_DELAY      // parameters: { delay_sprints: 2 }
  CAPACITY_SPLIT     // parameters: { new_split: 0.6 }
}
```

---

## API Endpoints

### Auth
```
POST   /api/auth/login          { email, password } → { token, user }
POST   /api/auth/register       { email, password, name, role } → { token, user }
GET    /api/auth/me             → { user }   (JWT protected)
```

### Teams (CRUD)
```
GET    /api/teams                              → Team[] (include member count per role)
POST   /api/teams                              → Team
GET    /api/teams/:id                          → Team (met members + actieve projecten)
PUT    /api/teams/:id                          → Team
DELETE /api/teams/:id                          → { success }
```

### Team Members (CRUD)
```
GET    /api/teams/:teamId/members              → TeamMember[]
POST   /api/teams/:teamId/members              → TeamMember
PUT    /api/members/:id                        → TeamMember
DELETE /api/members/:id                        → { success }
```

### Sprints (CRUD)
```
GET    /api/sprints                            → Sprint[]
POST   /api/sprints                            → Sprint
POST   /api/sprints/generate                   → Sprint[]  { count, start_date }
PUT    /api/sprints/:id                        → Sprint
DELETE /api/sprints/:id                        → { success }
```

### Leave / Afwezigheid (CRUD)
```
GET    /api/leave?member_id=&sprint_id=        → LeaveEntry[]
POST   /api/leave                              → LeaveEntry
POST   /api/leave/bulk                         → LeaveEntry[]  (meerdere dagen tegelijk)
DELETE /api/leave/:id                          → { success }
```

### Projects (CRUD)
```
GET    /api/projects                           → Project[] (met berekende rolverdeling)
POST   /api/projects                           → Project
GET    /api/projects/:id                       → Project (detail + rolverdeling + geschatte sprints)
PUT    /api/projects/:id                       → Project
DELETE /api/projects/:id                       → { success }
```

### Berekeningen (read-only)
```
GET    /api/capacity/:teamId                   → CapacityPerRolePerSprint[]
       ?sprint_ids=uuid1,uuid2                   (optioneel filter)

GET    /api/capacity/overview                  → { teams: [{ team, sprints: [{ sprint, percentage }] }] }

GET    /api/planning/roadmap                   → RoadmapData
       ?months=4                                 (hoeveel maanden vooruit)

GET    /api/planning/sprint/:teamId            → SprintPlanningData
       ?from_sprint=1&count=6                    (welke sprints)

GET    /api/planning/availability              → [{ team, earliest_sprint, free_percentage }]
```

### Scenarios (CRUD)
```
GET    /api/scenarios                          → Scenario[]
POST   /api/scenarios                          → Scenario (met changes array)
GET    /api/scenarios/:id                      → Scenario (met changes)
POST   /api/scenarios/:id/simulate             → SimulationResult
DELETE /api/scenarios/:id                      → { success }
```

---

## Berekeningen (Backend Logic)

Alle berekeningen zitten in `server/services/capacity.service.ts`. Dit is de kern van de applicatie.

### 1. Netto capaciteit per persoon per sprint

```typescript
function calculateMemberCapacity(
  sprintDays: number,       // standaard 10
  leaveDays: number,        // uit leave_entries count
  overheadPct: number,      // standaard 15
  bugReservePct: number     // standaard 20
): number {
  const afterLeave = sprintDays - leaveDays;
  const afterOverhead = afterLeave * (1 - overheadPct / 100);
  const afterBugReserve = afterOverhead * (1 - bugReservePct / 100);
  return Math.round(afterBugReserve * 10) / 10; // 1 decimaal
}
```

### 2. Netto capaciteit per rol per sprint (teamniveau)

```sql
-- Efficient met een enkele query:
SELECT
  tm.role,
  s.id as sprint_id,
  COUNT(tm.id) as member_count,
  SUM(t.sprint_days) as bruto_total,
  COALESCE(SUM(leave_counts.days), 0) as total_leave
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
CROSS JOIN sprints s
LEFT JOIN (
  SELECT member_id, sprint_id, COUNT(*) as days
  FROM leave_entries
  GROUP BY member_id, sprint_id
) leave_counts ON leave_counts.member_id = tm.id AND leave_counts.sprint_id = s.id
WHERE tm.team_id = $1 AND tm.active = true
GROUP BY tm.role, s.id
ORDER BY s.id, tm.role;
```

Daarna in TypeScript de overhead en bug reserve toepassen.

### 3. Project rolverdeling

```typescript
function calculateRoleDistribution(project: Project, team: Team) {
  return {
    dev_mandays:      project.it_mandays * team.dev_percentage,
    test_mandays:     project.it_mandays * team.test_percentage,
    analysis_mandays: project.it_mandays * team.analysis_percentage,
    po_mandays:       project.it_mandays * team.po_percentage,
  };
}
```

### 4. Geschatte doorlooptijd (sprints) voor een project

```typescript
function estimateProjectDuration(
  roleDistribution: RoleDistribution,
  capacityPerRole: Map<MemberRole, number>,  // netto per sprint
  capacitySplit: number                       // 1.0 = 100%, 0.6 = 60%
): { totalSprints: number; bottleneckRole: MemberRole } {

  let maxSprints = 0;
  let bottleneck: MemberRole = 'DEV';

  for (const [role, mandays] of Object.entries(roleDistribution)) {
    const roleCapacity = capacityPerRole.get(role) * capacitySplit;
    if (roleCapacity <= 0) continue;

    const sprintsNeeded = mandays / roleCapacity;
    if (sprintsNeeded > maxSprints) {
      maxSprints = sprintsNeeded;
      bottleneck = role;
    }
  }

  return {
    totalSprints: Math.ceil(maxSprints),
    bottleneckRole: bottleneck
  };
}
```

### 5. Bezettingsgraad per team per sprint

```typescript
// bezetting = (geplande_mandagen / netto_capaciteit) × 100
// Per rol berekenen, dan gewogen gemiddelde of max (voor bottleneck view)
```

### 6. Bottleneck detectie

```typescript
// Als voor een sprint + rol:
//   geplande_mandagen > netto_capaciteit
// → return { type: 'BOTTLENECK', role, sprint, overage }
```

### 7. Roadmap berekening

```typescript
// Per project op een team:
// 1. Bepaal start_sprint (eerste sprint waar team capaciteit heeft)
// 2. Bereken doorlooptijd in sprints (zie punt 4)
// 3. End sprint = start + doorlooptijd
// 4. Als meerdere projecten op zelfde team:
//    - Sorteer op priority (A eerst)
//    - Prio A krijgt capacity_split, rest deelt de overige capaciteit
//    - Of: sequentieel plannen (A eerst, dan B als A klaar is)
```

---

## Frontend Pagina's & Componenten

### Design Systeem

Donker thema, exact zoals het wireframe:

```typescript
// tailwind.config.ts — extend colors:
colors: {
  bg:        '#0f1117',
  surface:   '#1a1d27',
  'surface-2': '#232735',
  'surface-3': '#2c3040',
  border:    '#333847',
  accent:    '#6c8cff',
  'accent-light': '#8ba5ff',
  'cap-green':  '#4ade80',
  'cap-orange': '#fb923c',
  'cap-red':    '#f87171',
  purple:    '#a78bfa',
}
// Fonts: DM Sans (body), Space Mono (cijfers/codes)
// Importeer via Google Fonts
```

### Pagina's

#### 1. Login Pagina (`/login`)
- Email + wachtwoord formulier, donker thema
- JWT token opslaan in localStorage
- Redirect naar `/` na succesvolle login
- Link naar registratie (voor eerste setup)
- Protected routes: redirect naar `/login` als geen token

#### 2. Roadmap / Dashboard (`/` — hoofdpagina)
- **4 KPI kaarten**: actieve projecten, prio A count, gem. bezetting %, bottleneck alerts
- **Gantt tijdlijn**: alle 5 teams verticaal, sprints horizontaal (gegroepeerd per maand)
  - Projectbalken met kleur op prio (A=rood, B=oranje, C=blauw)
  - Gestreepte/transparante balken voor geschatte uitloop na 2-maanden horizon
  - Team type badge (Java/Angular of APEX)
- **Legenda** en **filters** (team, prio, status)

#### 3. Sprint Planning (`/sprint-planning`)
- **Tab per team**
- **Sprint grid**: 6 kolommen (sprints) × rijen (dev/test/analyse/po/totaal)
  - Per cel: `geplande/netto` mandagen met kleurcode
  - Groen: <80%, Oranje: 80-95%, Rood: >95%
- **Bottleneck alert banner** bovenaan als een rol overbelast is
- **Projectverdeling tabel** onder het grid
- **Navigatie**: vorige/volgende 6 sprints

#### 4. Capaciteitsoverzicht (`/capacity`)
- **Heatmap grid**: teams × sprints, bezettings% met kleur
- **Beschikbare capaciteit tabel**: per team per rol, vrije mandagen komende 2 sprints
- **Beschikbaarheid tabel**: per team, vroegste sprint waar een nieuw project kan starten

#### 5. Projectenregister (`/projects`)
- **Verdeelsleutel kaarten**: Java/Angular vs APEX percentages (bewerkbaar)
- **Projecttabel**: PID, naam, prio badge, team, mandagen totaal/IT, automatisch berekende dev/test/analyse mandagen, status, geschatte sprints
- **CRUD**: modal voor toevoegen/bewerken, confirm dialog voor verwijderen
- **Formule uitleg box** onderaan

#### 6. Teamconfiguratie (`/teams`)
- **Tab per team**
- **Linker kolom — Teamleden**:
  - Avatar (initialen), naam, rol
  - **Verlofblokjes**: 10 blokjes per sprint per persoon, klikbaar
    - Klik = toggle verlof (rood), shift+klik = opleiding (paars), ctrl+klik = ziekte (grijs)
    - Of: klik opent mini-dropdown met type keuze
  - CRUD: teamlid toevoegen/bewerken/verwijderen
- **Rechter kolom — Capaciteitsberekening**:
  - Tabel per rol: bruto → verlof → opleiding → overhead → bug reserve → **netto**
  - Sprint selector bovenaan

#### 7. What-if Scenario's (`/scenarios`)
- **Linker kolom — Scenario Builder**:
  - Kaarten per scenario-wijziging
  - Types: prioriteit wijzigen (dropdown), afwezigheid (slider), project uitstellen (slider)
  - Meerdere wijzigingen stapelbaar
- **Rechter kolom — Impact**:
  - Vergelijkingstabel: project → huidige einde → scenario einde → delta
  - Kleur: groen=sneller, rood=trager
  - Netto effect samenvatting: gem. impact Prio A vs Prio B

---

## Mappenstructuur

```
pi-planner/
├── package.json
├── tsconfig.json
├── railway.toml
├── .env.example
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── server/
│   ├── index.ts                    # Express entry: API routes + static serve
│   ├── config/
│   │   └── database.ts             # Prisma client singleton
│   ├── middleware/
│   │   ├── auth.ts                 # JWT verificatie
│   │   └── error.ts                # Global error handler
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── teams.routes.ts
│   │   ├── members.routes.ts
│   │   ├── sprints.routes.ts
│   │   ├── leave.routes.ts
│   │   ├── projects.routes.ts
│   │   ├── capacity.routes.ts
│   │   ├── planning.routes.ts
│   │   └── scenarios.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── teams.service.ts
│   │   ├── members.service.ts
│   │   ├── sprints.service.ts
│   │   ├── leave.service.ts
│   │   ├── projects.service.ts
│   │   ├── capacity.service.ts      # ← ALLE berekeningen
│   │   ├── planning.service.ts      # ← roadmap + sprint planning
│   │   └── scenarios.service.ts
│   └── types/
│       └── index.ts
│
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                  # React Router setup
│   │   ├── api/
│   │   │   └── client.ts           # Axios instance + JWT interceptor
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useTeams.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useCapacity.ts
│   │   │   └── useSprints.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── PageHeader.tsx
│   │   │   │   └── StatCard.tsx
│   │   │   ├── Roadmap/
│   │   │   │   ├── GanttChart.tsx
│   │   │   │   └── ProjectBar.tsx
│   │   │   ├── SprintPlanning/
│   │   │   │   ├── SprintGrid.tsx
│   │   │   │   ├── CapacityCell.tsx
│   │   │   │   └── ProjectSplitTable.tsx
│   │   │   ├── Capacity/
│   │   │   │   ├── Heatmap.tsx
│   │   │   │   ├── AvailabilityTable.tsx
│   │   │   │   └── NextSlotTable.tsx
│   │   │   ├── Projects/
│   │   │   │   ├── ProjectTable.tsx
│   │   │   │   ├── ProjectForm.tsx
│   │   │   │   └── DistributionKeyCard.tsx
│   │   │   ├── Teams/
│   │   │   │   ├── MemberList.tsx
│   │   │   │   ├── LeaveGrid.tsx
│   │   │   │   ├── CapacityCalcTable.tsx
│   │   │   │   └── MemberForm.tsx
│   │   │   ├── Scenarios/
│   │   │   │   ├── ScenarioBuilder.tsx
│   │   │   │   ├── ImpactComparison.tsx
│   │   │   │   └── NetEffectSummary.tsx
│   │   │   └── shared/
│   │   │       ├── Badge.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── ConfirmDialog.tsx
│   │   │       ├── Toast.tsx
│   │   │       ├── TabBar.tsx
│   │   │       └── ProgressBar.tsx
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── RoadmapPage.tsx
│   │       ├── SprintPlanningPage.tsx
│   │       ├── CapacityPage.tsx
│   │       ├── ProjectsPage.tsx
│   │       ├── TeamsPage.tsx
│   │       └── ScenariosPage.tsx
│   └── public/
│       └── favicon.svg
│
└── shared/
    └── types.ts                     # Gedeelde types client ↔ server
```

---

## Railway Deployment

### railway.toml
```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/api/health"
```

### Environment Variables (Railway)
```env
DATABASE_URL=postgresql://user:pass@host:5432/pi_planner
JWT_SECRET=your-random-secret-min-32-chars
NODE_ENV=production
PORT=3000
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "cd client && vite",
    "build": "cd client && vite build && cd .. && tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

### Server static file serving (production)
```typescript
// server/index.ts
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}
```

### Railway setup
1. Maak een nieuw Railway project
2. Voeg een PostgreSQL database service toe (gratis bij Railway)
3. Koppel de DATABASE_URL automatisch
4. Deploy vanuit GitHub repo
5. Na deploy: `railway run npm run db:push && railway run npm run db:seed`

---

## Seed Data (`prisma/seed.ts`)

### Default admin user
```typescript
{
  email: 'admin@vlaanderen.be',
  password: 'admin123',  // hash met bcrypt
  name: 'Admin',
  role: 'ADMIN'
}
```

### 5 Teams

| Team | Type | Dev | Test | Analyse | PO |
|------|------|-----|------|---------|-----|
| Team Alpha | Java/Angular | 3 | 1 | 1 | 1 |
| Team Beta | Java/Angular | 2 | 2 | 1 | 1 |
| Team Gamma | Java/Angular | 3 | 1 | 1 | 1 |
| Team Delta | Oracle APEX | 2 | 1 | 1 | 1 |
| Team Epsilon | Oracle APEX | 3 | 1 | 1 | 1 |

### Verdeelsleutels
- **Java/Angular**: dev 50%, test 25%, analyse 15%, PO 10%
- **Oracle APEX**: dev 55%, test 25%, analyse 12%, PO 8%

### 12 Sprints
Sprint 1 t/m 12, startend vanaf maandag 2 maart 2026.
Elke sprint = 10 werkdagen (2 weken, ma-vr).

```typescript
// Genereer sprints automatisch:
function generateSprints(count: number, startDate: Date): Sprint[] {
  const sprints = [];
  let current = startDate;
  for (let i = 1; i <= count; i++) {
    const start = new Date(current);
    const end = addBusinessDays(start, 9); // 10 werkdagen inclusief start
    sprints.push({ name: `Sprint ${i}`, number: i, start_date: start, end_date: end });
    current = addBusinessDays(end, 1); // volgende werkdag
  }
  return sprints;
}
```

### 8 Projecten

| PID | Naam | Mandagen | IT | Prio | Team | Status |
|-----|------|----------|----|------|------|--------|
| 2024-031 | Portaal Redesign | 150 | 105 | A | Alpha | ACTIVE |
| 2024-028 | Data Migratie Platform | 200 | 160 | A | Beta | ACTIVE |
| 2024-039 | Workflow Engine | 180 | 140 | A | Delta | ACTIVE |
| 2024-045 | API Gateway | 100 | 75 | B | Alpha | PLANNED |
| 2024-048 | Rapportage Module | 60 | 45 | B | Epsilon | ACTIVE |
| 2024-050 | Digitale Handtekening | 80 | 60 | A | Gamma | ACTIVE |
| 2025-001 | SSO Integratie | 80 | 60 | B | Beta | PLANNED |
| 2025-004 | Management Dashboard | 120 | 90 | A | Epsilon | PLANNED |

### Verlof entries
Verspreid verlof en opleidingen over sprint 1-4 zodat capaciteitsberekeningen variatie tonen. Minimaal 2-3 verlof entries per team per sprint.

---

## Belangrijke Aandachtspunten

1. **Prisma als ORM**: Gebruik Prisma voor alle database queries. Gebruik `include` voor relaties, `where` voor filters. Vermijd raw SQL tenzij nodig voor complexe aggregaties.

2. **Berekeningen zijn backend-only**: Alle capaciteits- en planningsberekeningen in `capacity.service.ts` en `planning.service.ts`. De frontend toont alleen resultaten.

3. **TanStack Query**: Gebruik voor alle API calls op de frontend. Configureer `staleTime` en `invalidateQueries` na mutaties zodat data automatisch ververst.

4. **Nederlandse UI**: Alle labels, buttons, placeholders, foutmeldingen en toasts in het Nederlands. Code en variabelen in het Engels.

5. **Foutafhandeling**:
   - Backend: global error middleware, gestructureerde error responses `{ error: string, details?: any }`
   - Frontend: toast notifications (groen=succes, rood=fout) bij elke CRUD actie

6. **Bevestiging bij verwijderen**: Altijd `ConfirmDialog` component tonen bij delete acties.

7. **Verlofblokjes**: De 10 blokjes per sprint per persoon zijn klikbaar. Klik opent een mini-popover met type keuze (verlof/opleiding/ziekte). Nogmaals klikken op een gevuld blokje verwijdert de entry. Dit moet snel en responsief voelen — optimistic updates via TanStack Query.

8. **Bottleneck highlighting**: Wanneer geplande mandagen > netto capaciteit voor een rol in een sprint, toon een rood kader op die cel + een waarschuwingsbanner bovenaan de pagina.

9. **Responsive**: Desktop-first, maar tabletweergave moet bruikbaar zijn. Sidebar wordt een hamburger menu op tablet.

10. **Prisma migrations**: Gebruik `prisma migrate dev` lokaal, `prisma db push` voor Railway deployment.

---

## Bouw Volgorde

Bouw incrementeel in deze volgorde. Test elke stap voordat je doorgaat.

### Fase 1: Foundation
1. Project setup: monorepo, package.json, tsconfig, Vite config
2. Prisma schema + eerste migratie
3. Express server met health endpoint
4. Auth service + routes (register, login, JWT)
5. Seed script met admin user

### Fase 2: Core CRUD
6. Teams CRUD (service + routes + seed data)
7. Team Members CRUD + seed data
8. Sprints CRUD + bulk generate + seed data
9. Leave entries CRUD + seed data
10. Projects CRUD + seed data

### Fase 3: Berekeningen
11. `capacity.service.ts` — netto capaciteit per persoon/rol/sprint
12. `planning.service.ts` — rolverdeling, doorlooptijd, roadmap data
13. Capacity + Planning API endpoints
14. Test berekeningen met seed data (schrijf unit tests)

### Fase 4: Frontend
15. Vite + React + Tailwind setup + donker thema
16. Layout: Sidebar, routing, AuthContext
17. Login pagina + protected routes
18. Teams pagina (leden + verlofblokjes + capaciteitstabel)
19. Projecten pagina (tabel + CRUD modals + rolverdeling)
20. Sprint Planning pagina (grid met capaciteitscellen)
21. Capaciteitsoverzicht (heatmap + tabellen)
22. Roadmap (gantt chart)
23. What-if Scenario's

### Fase 5: Polish & Deploy
24. Error handling, loading states, empty states
25. Toast notifications
26. Responsive tweaks
27. Railway deployment
28. Smoke test op productie
