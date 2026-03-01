import { prisma } from '../config/database.js'
import { MemberRole } from '@prisma/client'
import { getCapacityByTeam, estimateProjectDuration } from './capacity.service.js'

// Roadmap data voor alle teams
export async function getRoadmap(months = 4) {
  const teams = await prisma.team.findMany({
    include: {
      projects: {
        where: { status: { not: 'DONE' } },
        orderBy: { priority: 'asc' },
        include: { start_sprint: true },
      },
    },
  })

  const sprints = await prisma.sprint.findMany({ orderBy: { number: 'asc' } })

  // Limit to ~months * 2 sprints (2 sprints per maand)
  const horizonSprints = sprints.slice(0, months * 2)
  const sprintIds = horizonSprints.map((s) => s.id)

  const roadmapTeams = []

  for (const team of teams) {
    const capacity = await getCapacityByTeam(team.id, sprintIds)

    // Gemiddelde netto capaciteit per rol over alle sprints
    const avgCapacityPerRole = new Map<MemberRole, number>()
    const roleGroups = new Map<MemberRole, number[]>()

    for (const c of capacity) {
      if (!roleGroups.has(c.role)) roleGroups.set(c.role, [])
      roleGroups.get(c.role)!.push(c.net)
    }
    for (const [role, values] of roleGroups) {
      avgCapacityPerRole.set(role, values.reduce((a, b) => a + b, 0) / values.length)
    }

    const projectsWithDuration = []
    for (const project of team.projects) {
      const roleDistribution = {
        dev_mandays:      project.it_mandays * team.dev_percentage,
        test_mandays:     project.it_mandays * team.test_percentage,
        analysis_mandays: project.it_mandays * team.analysis_percentage,
        po_mandays:       project.it_mandays * team.po_percentage,
      }

      const { totalSprints, bottleneckRole } = estimateProjectDuration(
        roleDistribution,
        avgCapacityPerRole,
        project.capacity_split
      )

      const startSprint = project.start_sprint ?? sprints[0]
      const startIndex = sprints.findIndex((s) => s.id === startSprint?.id)
      const endIndex = Math.min(startIndex + totalSprints - 1, sprints.length - 1)
      const endSprint = sprints[endIndex] ?? sprints[sprints.length - 1]

      projectsWithDuration.push({
        project,
        start_sprint: startSprint,
        end_sprint: endSprint,
        estimated_sprints: totalSprints,
        bottleneck_role: bottleneckRole,
      })
    }

    roadmapTeams.push({ team, projects: projectsWithDuration })
  }

  return { teams: roadmapTeams, sprints: horizonSprints }
}

// Sprint planning data voor een team
export async function getSprintPlanning(teamId: string, fromSprintNumber = 1, count = 6) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      projects: {
        where: { status: { not: 'DONE' } },
        orderBy: { priority: 'asc' },
        include: { start_sprint: true },
      },
    },
  })
  if (!team) throw new Error('Team niet gevonden')

  const sprints = await prisma.sprint.findMany({
    where: { number: { gte: fromSprintNumber, lt: fromSprintNumber + count } },
    orderBy: { number: 'asc' },
  })

  const sprintIds = sprints.map((s) => s.id)
  const capacity = await getCapacityByTeam(teamId, sprintIds)

  // Bottleneck: planned per sprint = netto_cap × Σ(capacity_split)
  // capacity_split = fractie van teamcapaciteit die een project per sprint claimt
  const totalSplit = team.projects.reduce((sum, p) => sum + p.capacity_split, 0)

  const bottlenecks = []
  for (const sprint of sprints) {
    const roles: MemberRole[] = ['DEV', 'TEST', 'ANALYST', 'PO']
    for (const role of roles) {
      const cap = capacity.find((c) => c.sprint_id === sprint.id && c.role === role)
      const netCap = cap?.net ?? 0
      const plannedDays = Math.round(netCap * totalSplit * 10) / 10

      if (cap && totalSplit > 1.0) {
        bottlenecks.push({
          role,
          sprint_id: sprint.id,
          planned_days: plannedDays,
          net_capacity: cap.net,
          overage: Math.round((plannedDays - cap.net) * 10) / 10,
        })
      }
    }
  }

  return { team, sprints, capacity, projects: team.projects, bottlenecks }
}
