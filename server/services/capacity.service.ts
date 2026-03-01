import { prisma } from '../config/database.js'
import { MemberRole } from '@prisma/client'

// 1. Netto capaciteit per persoon per sprint
export function calculateMemberCapacity(
  sprintDays: number,
  leaveDays: number,
  overheadPct: number,
  bugReservePct: number
): number {
  const afterLeave = sprintDays - leaveDays
  const afterOverhead = afterLeave * (1 - overheadPct / 100)
  const afterBugReserve = afterOverhead * (1 - bugReservePct / 100)
  return Math.round(afterBugReserve * 10) / 10
}

// 2. Netto capaciteit per rol per sprint voor een team
export async function getCapacityByTeam(teamId: string, sprintIds?: string[]) {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) throw new Error('Team niet gevonden')

  const sprintFilter = sprintIds?.length ? { id: { in: sprintIds } } : {}
  const sprints = await prisma.sprint.findMany({ where: sprintFilter, orderBy: { number: 'asc' } })
  const members = await prisma.teamMember.findMany({ where: { team_id: teamId, active: true } })

  // Load all leave entries for these members + sprints in one query
  const leaveEntries = await prisma.leaveEntry.findMany({
    where: {
      member_id: { in: members.map((m) => m.id) },
      ...(sprintIds?.length ? { sprint_id: { in: sprintIds } } : {}),
    },
  })

  // Build leave count map: memberId -> sprintId -> count
  const leaveMap = new Map<string, Map<string, number>>()
  for (const e of leaveEntries) {
    if (!leaveMap.has(e.member_id)) leaveMap.set(e.member_id, new Map())
    const sprintMap = leaveMap.get(e.member_id)!
    sprintMap.set(e.sprint_id, (sprintMap.get(e.sprint_id) ?? 0) + 1)
  }

  const results = []
  for (const sprint of sprints) {
    const roleMap = new Map<MemberRole, { bruto: number; leave: number; net: number; count: number }>()

    for (const member of members) {
      const leaveDays = leaveMap.get(member.id)?.get(sprint.id) ?? 0
      const net = calculateMemberCapacity(team.sprint_days, leaveDays, team.overhead_percentage, team.bug_reserve_percentage)

      const existing = roleMap.get(member.role) ?? { bruto: 0, leave: 0, net: 0, count: 0 }
      roleMap.set(member.role, {
        bruto: existing.bruto + team.sprint_days,
        leave: existing.leave + leaveDays,
        net: Math.round((existing.net + net) * 10) / 10,
        count: existing.count + 1,
      })
    }

    for (const [role, data] of roleMap) {
      results.push({ sprint_id: sprint.id, sprint, role, ...data })
    }
  }

  return results
}

// 3. Capaciteitsoverzicht voor alle teams
export async function getCapacityOverview() {
  const teams = await prisma.team.findMany()
  const sprints = await prisma.sprint.findMany({ orderBy: { number: 'asc' } })

  const result = []
  for (const team of teams) {
    const capacity = await getCapacityByTeam(team.id)

    const sprintData = sprints.map((sprint) => {
      const roles = capacity.filter((c) => c.sprint_id === sprint.id)
      const totalNet = roles.reduce((sum, r) => sum + r.net, 0)
      const totalBruto = roles.reduce((sum, r) => sum + r.bruto, 0)
      const percentage = totalBruto > 0 ? Math.round((totalNet / totalBruto) * 100) : 0

      return { sprint, percentage, roles }
    })

    result.push({ team, sprints: sprintData })
  }

  return { teams: result }
}

// 4. Geschatte doorlooptijd in sprints voor een project
export function estimateProjectDuration(
  roleDistribution: { dev_mandays: number; test_mandays: number; analysis_mandays: number; po_mandays: number },
  capacityPerRole: Map<MemberRole, number>,
  capacitySplit: number
): { totalSprints: number; bottleneckRole: MemberRole } {
  const roleMapping: Record<string, MemberRole> = {
    dev_mandays:      'DEV',
    test_mandays:     'TEST',
    analysis_mandays: 'ANALYST',
    po_mandays:       'PO',
  }

  let maxSprints = 0
  let bottleneck: MemberRole = 'DEV'

  for (const [key, mandays] of Object.entries(roleDistribution)) {
    const role = roleMapping[key] as MemberRole
    const roleCapacity = (capacityPerRole.get(role) ?? 0) * capacitySplit
    if (roleCapacity <= 0) continue

    const sprintsNeeded = mandays / roleCapacity
    if (sprintsNeeded > maxSprints) {
      maxSprints = sprintsNeeded
      bottleneck = role
    }
  }

  return { totalSprints: Math.ceil(maxSprints), bottleneckRole: bottleneck }
}

// 5. Bottleneck detectie per sprint voor een team
export async function detectBottlenecks(teamId: string, sprintIds?: string[]) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { projects: { where: { status: { not: 'DONE' } } } },
  })
  if (!team) throw new Error('Team niet gevonden')

  const capacity = await getCapacityByTeam(teamId, sprintIds)
  const bottlenecks = []

  for (const cap of capacity) {
    // Total planned mandays for this role in this sprint
    const roleKey = cap.role.toLowerCase() + '_percentage'
    const rolePct = (team as Record<string, unknown>)[roleKey] as number ?? 0

    const plannedDays = team.projects.reduce((sum, p) => {
      return sum + p.it_mandays * rolePct * p.capacity_split / 10
    }, 0)

    if (plannedDays > cap.net) {
      bottlenecks.push({
        role: cap.role,
        sprint_id: cap.sprint_id,
        planned_days: Math.round(plannedDays * 10) / 10,
        net_capacity: cap.net,
        overage: Math.round((plannedDays - cap.net) * 10) / 10,
      })
    }
  }

  return bottlenecks
}

// 6. Beschikbaarheid per team (vroegste vrije sprint)
export async function getAvailability() {
  const teams = await prisma.team.findMany()
  const sprints = await prisma.sprint.findMany({ orderBy: { number: 'asc' } })

  const result = []
  for (const team of teams) {
    const capacity = await getCapacityByTeam(team.id)

    // Find first sprint with <80% average occupancy
    let earliestSprint = sprints[0]
    let freePercentage = 100

    for (const sprint of sprints) {
      const roles = capacity.filter((c) => c.sprint_id === sprint.id)
      const totalNet = roles.reduce((sum, r) => sum + r.net, 0)
      const totalBruto = roles.reduce((sum, r) => sum + r.bruto, 0)
      const occupancy = totalBruto > 0 ? (1 - totalNet / totalBruto) * 100 : 0

      if (occupancy < 80) {
        earliestSprint = sprint
        freePercentage = Math.round(100 - occupancy)
        break
      }
    }

    result.push({ team, earliest_sprint: earliestSprint, free_percentage: freePercentage })
  }

  return result
}
