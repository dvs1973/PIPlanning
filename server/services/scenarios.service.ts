import { prisma } from '../config/database.js'
import { ChangeType, Prisma } from '@prisma/client'
import { estimateProjectDuration } from './capacity.service.js'
import { MemberRole } from '@prisma/client'

export async function getAll() {
  return prisma.scenario.findMany({
    include: { creator: { select: { name: true, email: true } } },
    orderBy: { created_at: 'desc' },
  })
}

export async function getById(id: string) {
  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: { changes: true, creator: { select: { name: true, email: true } } },
  })
  if (!scenario) throw new Error('Scenario niet gevonden')
  return scenario
}

export async function create(userId: string, data: {
  name: string
  changes: Array<{
    change_type: ChangeType
    project_id?: string
    member_id?: string
    parameters: Record<string, unknown>
  }>
}) {
  return prisma.scenario.create({
    data: {
      name: data.name,
      created_by: userId,
      changes: {
        create: data.changes.map((c) => ({
          ...c,
          parameters: c.parameters as Prisma.InputJsonValue,
        })),
      },
    },
    include: { changes: true },
  })
}

export async function simulate(id: string) {
  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: { changes: true },
  })
  if (!scenario) throw new Error('Scenario niet gevonden')

  const projects = await prisma.project.findMany({
    where: { status: { not: 'DONE' } },
    include: { assigned_team: true, start_sprint: true },
  })

  const sprints = await prisma.sprint.findMany({ orderBy: { number: 'asc' } })

  // Build modified project state based on scenario changes
  const modifiedProjects = projects.map((p) => ({ ...p, priority: p.priority, capacity_split: p.capacity_split }))

  for (const change of scenario.changes) {
    if (change.change_type === 'PRIORITY_CHANGE' && change.project_id) {
      const proj = modifiedProjects.find((p) => p.id === change.project_id)
      if (proj) proj.priority = (change.parameters as { to: 'A' | 'B' | 'C' }).to
    }
    if (change.change_type === 'CAPACITY_SPLIT' && change.project_id) {
      const proj = modifiedProjects.find((p) => p.id === change.project_id)
      if (proj) proj.capacity_split = (change.parameters as { new_split: number }).new_split
    }
  }

  // Calculate impact
  const impact = []
  for (const project of projects) {
    if (!project.assigned_team) continue

    const team = project.assigned_team
    const baseRoleDist = {
      dev_mandays:      project.it_mandays * team.dev_percentage,
      test_mandays:     project.it_mandays * team.test_percentage,
      analysis_mandays: project.it_mandays * team.analysis_percentage,
      po_mandays:       project.it_mandays * team.po_percentage,
    }

    // Simplified avg capacity (without leave simulation)
    const avgCapacity = new Map<MemberRole, number>([
      ['DEV',     team.sprint_days * team.dev_percentage * (1 - team.overhead_percentage / 100) * (1 - team.bug_reserve_percentage / 100)],
      ['TEST',    team.sprint_days * team.test_percentage * (1 - team.overhead_percentage / 100) * (1 - team.bug_reserve_percentage / 100)],
      ['ANALYST', team.sprint_days * team.analysis_percentage * (1 - team.overhead_percentage / 100) * (1 - team.bug_reserve_percentage / 100)],
      ['PO',      team.sprint_days * team.po_percentage * (1 - team.overhead_percentage / 100) * (1 - team.bug_reserve_percentage / 100)],
    ])

    const { totalSprints: currentSprints } = estimateProjectDuration(baseRoleDist, avgCapacity, project.capacity_split)
    const modProject = modifiedProjects.find((p) => p.id === project.id)!
    const { totalSprints: scenarioSprints } = estimateProjectDuration(baseRoleDist, avgCapacity, modProject.capacity_split)

    const startIndex = sprints.findIndex((s) => s.id === project.start_sprint_id)
    const currentEndIndex = Math.min(startIndex + currentSprints - 1, sprints.length - 1)
    const scenarioEndIndex = Math.min(startIndex + scenarioSprints - 1, sprints.length - 1)

    impact.push({
      project,
      current_end_sprint: sprints[currentEndIndex],
      scenario_end_sprint: sprints[scenarioEndIndex],
      delta_sprints: scenarioSprints - currentSprints,
    })
  }

  const prioAImpact = impact.filter((i) => i.project.priority === 'A').map((i) => i.delta_sprints)
  const prioBImpact = impact.filter((i) => i.project.priority === 'B').map((i) => i.delta_sprints)

  return {
    scenario,
    impact,
    summary: {
      avg_impact_prio_a: prioAImpact.length ? prioAImpact.reduce((a, b) => a + b, 0) / prioAImpact.length : 0,
      avg_impact_prio_b: prioBImpact.length ? prioBImpact.reduce((a, b) => a + b, 0) / prioBImpact.length : 0,
    },
  }
}

export async function remove(id: string) {
  const scenario = await prisma.scenario.findUnique({ where: { id } })
  if (!scenario) throw new Error('Scenario niet gevonden')
  await prisma.scenario.delete({ where: { id } })
  return { success: true }
}
