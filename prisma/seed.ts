import { PrismaClient, TeamType, MemberRole, Priority, ProjectStatus, LeaveType } from '@prisma/client'
import bcrypt from 'bcrypt'
import { addDays, isWeekend } from 'date-fns'

const prisma = new PrismaClient()

function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date)
  let added = 0
  while (added < days) {
    result = addDays(result, 1)
    if (!isWeekend(result)) added++
  }
  return result
}

function generateSprints(count: number, startDate: Date) {
  const sprints = []
  let current = new Date(startDate)
  for (let i = 1; i <= count; i++) {
    const start = new Date(current)
    const end = addBusinessDays(start, 9) // 10 werkdagen incl. start
    sprints.push({
      name: `Sprint ${i}`,
      number: i,
      start_date: start,
      end_date: end,
    })
    current = addBusinessDays(end, 1)
  }
  return sprints
}

async function main() {
  console.log('Seeding database...')

  // ── Admin user ──
  const adminHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vlaanderen.be' },
    update: {},
    create: {
      email: 'admin@vlaanderen.be',
      password_hash: adminHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  })
  console.log('Admin user aangemaakt:', admin.email)

  // ── Teams ──
  const teamsData = [
    { name: 'Team Alpha', type: 'JAVA_ANGULAR' as TeamType, dev_percentage: 0.50, test_percentage: 0.25, analysis_percentage: 0.15, po_percentage: 0.10 },
    { name: 'Team Beta',  type: 'JAVA_ANGULAR' as TeamType, dev_percentage: 0.50, test_percentage: 0.25, analysis_percentage: 0.15, po_percentage: 0.10 },
    { name: 'Team Gamma', type: 'JAVA_ANGULAR' as TeamType, dev_percentage: 0.50, test_percentage: 0.25, analysis_percentage: 0.15, po_percentage: 0.10 },
    { name: 'Team Delta', type: 'ORACLE_APEX'  as TeamType, dev_percentage: 0.55, test_percentage: 0.25, analysis_percentage: 0.12, po_percentage: 0.08 },
    { name: 'Team Epsilon', type: 'ORACLE_APEX' as TeamType, dev_percentage: 0.55, test_percentage: 0.25, analysis_percentage: 0.12, po_percentage: 0.08 },
  ]

  const teams: Record<string, string> = {}
  for (const t of teamsData) {
    const team = await prisma.team.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    })
    teams[t.name] = team.id
    console.log('Team aangemaakt:', t.name)
  }

  // ── Team Members ──
  const membersData: Array<{ team: string; name: string; role: MemberRole; initials: string }[]> = [
    // Alpha: 3 dev, 1 test, 1 analyst, 1 po
    [
      { team: 'Team Alpha', name: 'Lars Janssen',    role: 'DEV',     initials: 'LJ' },
      { team: 'Team Alpha', name: 'Sofie Peeters',   role: 'DEV',     initials: 'SP' },
      { team: 'Team Alpha', name: 'Pieter Claes',    role: 'DEV',     initials: 'PC' },
      { team: 'Team Alpha', name: 'An Desmet',        role: 'TEST',    initials: 'AD' },
      { team: 'Team Alpha', name: 'Jonas Maes',       role: 'ANALYST', initials: 'JM' },
      { team: 'Team Alpha', name: 'Eva Willems',      role: 'PO',      initials: 'EW' },
    ],
    // Beta: 2 dev, 2 test, 1 analyst, 1 po
    [
      { team: 'Team Beta', name: 'Tom Hermans',      role: 'DEV',     initials: 'TH' },
      { team: 'Team Beta', name: 'Nathalie Leclercq',role: 'DEV',     initials: 'NL' },
      { team: 'Team Beta', name: 'Wout Dubois',      role: 'TEST',    initials: 'WD' },
      { team: 'Team Beta', name: 'Julie Martin',     role: 'TEST',    initials: 'JM' },
      { team: 'Team Beta', name: 'Bart Simon',       role: 'ANALYST', initials: 'BS' },
      { team: 'Team Beta', name: 'Ines Thomas',      role: 'PO',      initials: 'IT' },
    ],
    // Gamma: 3 dev, 1 test, 1 analyst, 1 po
    [
      { team: 'Team Gamma', name: 'Alexis Renard',   role: 'DEV',     initials: 'AR' },
      { team: 'Team Gamma', name: 'Hanne Wouters',   role: 'DEV',     initials: 'HW' },
      { team: 'Team Gamma', name: 'Niels Goossens',  role: 'DEV',     initials: 'NG' },
      { team: 'Team Gamma', name: 'Sara Puts',        role: 'TEST',    initials: 'SP' },
      { team: 'Team Gamma', name: 'Dries Jacobs',    role: 'ANALYST', initials: 'DJ' },
      { team: 'Team Gamma', name: 'Lies Nijs',        role: 'PO',      initials: 'LN' },
    ],
    // Delta: 2 dev, 1 test, 1 analyst, 1 po
    [
      { team: 'Team Delta', name: 'Kevin Pieters',   role: 'DEV',     initials: 'KP' },
      { team: 'Team Delta', name: 'Amélie Laurent',  role: 'DEV',     initials: 'AL' },
      { team: 'Team Delta', name: 'Ruben Stevens',   role: 'TEST',    initials: 'RS' },
      { team: 'Team Delta', name: 'Laura Bogaert',   role: 'ANALYST', initials: 'LB' },
      { team: 'Team Delta', name: 'Dirk Cools',      role: 'PO',      initials: 'DC' },
    ],
    // Epsilon: 3 dev, 1 test, 1 analyst, 1 po
    [
      { team: 'Team Epsilon', name: 'Mohamed Aziz',  role: 'DEV',     initials: 'MA' },
      { team: 'Team Epsilon', name: 'Amber Declercq',role: 'DEV',     initials: 'AD' },
      { team: 'Team Epsilon', name: 'Gianni Rossi',  role: 'DEV',     initials: 'GR' },
      { team: 'Team Epsilon', name: 'Lotte Baert',   role: 'TEST',    initials: 'LB' },
      { team: 'Team Epsilon', name: 'Cedric Moons',  role: 'ANALYST', initials: 'CM' },
      { team: 'Team Epsilon', name: 'Fien Verschaeve',role: 'PO',     initials: 'FV' },
    ],
  ]

  const memberIds: Record<string, string> = {}
  for (const group of membersData) {
    for (const m of group) {
      const member = await prisma.teamMember.create({
        data: {
          team_id: teams[m.team],
          name: m.name,
          role: m.role,
          initials: m.initials,
        },
      })
      memberIds[`${m.team}-${m.name}`] = member.id
    }
  }
  console.log('Teamleden aangemaakt')

  // ── Sprints ──
  const sprintDate = new Date('2026-03-02') // maandag 2 maart 2026
  const sprintsData = generateSprints(12, sprintDate)
  const sprintIds: string[] = []

  for (const s of sprintsData) {
    const sprint = await prisma.sprint.upsert({
      where: { number: s.number },
      update: {},
      create: s,
    })
    sprintIds.push(sprint.id)
  }
  console.log('12 sprints aangemaakt')

  // ── Projects ──
  const projectsData = [
    { pid: '2024-031', name: 'Portaal Redesign',        total_mandays: 150, it_mandays: 105, business_mandays: 45, priority: 'A' as Priority, status: 'ACTIVE'   as ProjectStatus, team: 'Team Alpha' },
    { pid: '2024-028', name: 'Data Migratie Platform',  total_mandays: 200, it_mandays: 160, business_mandays: 40, priority: 'A' as Priority, status: 'ACTIVE'   as ProjectStatus, team: 'Team Beta' },
    { pid: '2024-039', name: 'Workflow Engine',          total_mandays: 180, it_mandays: 140, business_mandays: 40, priority: 'A' as Priority, status: 'ACTIVE'   as ProjectStatus, team: 'Team Delta' },
    { pid: '2024-045', name: 'API Gateway',              total_mandays: 100, it_mandays: 75,  business_mandays: 25, priority: 'B' as Priority, status: 'PLANNED'  as ProjectStatus, team: 'Team Alpha' },
    { pid: '2024-048', name: 'Rapportage Module',        total_mandays: 60,  it_mandays: 45,  business_mandays: 15, priority: 'B' as Priority, status: 'ACTIVE'   as ProjectStatus, team: 'Team Epsilon' },
    { pid: '2024-050', name: 'Digitale Handtekening',   total_mandays: 80,  it_mandays: 60,  business_mandays: 20, priority: 'A' as Priority, status: 'ACTIVE'   as ProjectStatus, team: 'Team Gamma' },
    { pid: '2025-001', name: 'SSO Integratie',           total_mandays: 80,  it_mandays: 60,  business_mandays: 20, priority: 'B' as Priority, status: 'PLANNED'  as ProjectStatus, team: 'Team Beta' },
    { pid: '2025-004', name: 'Management Dashboard',     total_mandays: 120, it_mandays: 90,  business_mandays: 30, priority: 'A' as Priority, status: 'PLANNED'  as ProjectStatus, team: 'Team Epsilon' },
  ]

  for (const p of projectsData) {
    await prisma.project.upsert({
      where: { pid: p.pid },
      update: {},
      create: {
        pid: p.pid,
        name: p.name,
        priority: p.priority,
        status: p.status,
        total_mandays: p.total_mandays,
        it_mandays: p.it_mandays,
        business_mandays: p.business_mandays,
        assigned_team_id: teams[p.team],
        start_sprint_id: sprintIds[0],
      },
    })
  }
  console.log('8 projecten aangemaakt')

  // ── Leave entries (verspreide verlof/opleiding over sprint 1-4) ──
  // Sprint 1-4 datums: sprint 1 start 2026-03-02
  const leaveEntries: Array<{ member_key: string; sprint_index: number; day_offset: number; type: LeaveType }> = [
    // Alpha
    { member_key: 'Team Alpha-Lars Janssen',   sprint_index: 0, day_offset: 2, type: 'VERLOF' },
    { member_key: 'Team Alpha-Lars Janssen',   sprint_index: 0, day_offset: 3, type: 'VERLOF' },
    { member_key: 'Team Alpha-Sofie Peeters',  sprint_index: 1, day_offset: 0, type: 'OPLEIDING' },
    { member_key: 'Team Alpha-An Desmet',       sprint_index: 2, day_offset: 4, type: 'VERLOF' },
    { member_key: 'Team Alpha-Jonas Maes',     sprint_index: 3, day_offset: 1, type: 'VERLOF' },
    { member_key: 'Team Alpha-Jonas Maes',     sprint_index: 3, day_offset: 2, type: 'VERLOF' },
    // Beta
    { member_key: 'Team Beta-Tom Hermans',     sprint_index: 0, day_offset: 1, type: 'VERLOF' },
    { member_key: 'Team Beta-Wout Dubois',     sprint_index: 1, day_offset: 3, type: 'OPLEIDING' },
    { member_key: 'Team Beta-Wout Dubois',     sprint_index: 1, day_offset: 4, type: 'OPLEIDING' },
    { member_key: 'Team Beta-Bart Simon',      sprint_index: 2, day_offset: 0, type: 'VERLOF' },
    { member_key: 'Team Beta-Julie Martin',    sprint_index: 3, day_offset: 2, type: 'ZIEKTE' },
    // Gamma
    { member_key: 'Team Gamma-Hanne Wouters',  sprint_index: 0, day_offset: 4, type: 'VERLOF' },
    { member_key: 'Team Gamma-Niels Goossens', sprint_index: 1, day_offset: 2, type: 'VERLOF' },
    { member_key: 'Team Gamma-Dries Jacobs',   sprint_index: 2, day_offset: 1, type: 'OPLEIDING' },
    { member_key: 'Team Gamma-Sara Puts',       sprint_index: 3, day_offset: 0, type: 'VERLOF' },
    // Delta
    { member_key: 'Team Delta-Kevin Pieters',  sprint_index: 0, day_offset: 3, type: 'VERLOF' },
    { member_key: 'Team Delta-Amélie Laurent', sprint_index: 1, day_offset: 1, type: 'VERLOF' },
    { member_key: 'Team Delta-Ruben Stevens',  sprint_index: 2, day_offset: 4, type: 'OPLEIDING' },
    { member_key: 'Team Delta-Laura Bogaert',  sprint_index: 3, day_offset: 2, type: 'VERLOF' },
    // Epsilon
    { member_key: 'Team Epsilon-Mohamed Aziz', sprint_index: 0, day_offset: 0, type: 'VERLOF' },
    { member_key: 'Team Epsilon-Lotte Baert',  sprint_index: 1, day_offset: 3, type: 'VERLOF' },
    { member_key: 'Team Epsilon-Cedric Moons', sprint_index: 2, day_offset: 2, type: 'OPLEIDING' },
    { member_key: 'Team Epsilon-Gianni Rossi', sprint_index: 3, day_offset: 1, type: 'ZIEKTE' },
  ]

  // Load actual sprint start dates
  const sprints = await prisma.sprint.findMany({ orderBy: { number: 'asc' } })

  for (const entry of leaveEntries) {
    const memberId = memberIds[entry.member_key]
    if (!memberId) { console.warn('Lid niet gevonden:', entry.member_key); continue }

    const sprint = sprints[entry.sprint_index]
    if (!sprint) continue

    // Calculate working day from sprint start + offset
    let date = new Date(sprint.start_date)
    let offset = entry.day_offset
    while (offset > 0) {
      date = addDays(date, 1)
      if (!isWeekend(date)) offset--
    }

    try {
      await prisma.leaveEntry.create({
        data: {
          member_id: memberId,
          sprint_id: sprint.id,
          date,
          type: entry.type,
        },
      })
    } catch {
      // skip duplicate (unique constraint on member_id + date)
    }
  }
  console.log('Verlof entries aangemaakt')
  console.log('✓ Seeding voltooid!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
