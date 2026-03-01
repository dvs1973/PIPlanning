import { prisma } from '../config/database.js'
import { Priority, ProjectStatus } from '@prisma/client'

function calcRoleDistribution(it_mandays: number, team: { dev_percentage: number; test_percentage: number; analysis_percentage: number; po_percentage: number }) {
  return {
    dev_mandays:      Math.round(it_mandays * team.dev_percentage * 10) / 10,
    test_mandays:     Math.round(it_mandays * team.test_percentage * 10) / 10,
    analysis_mandays: Math.round(it_mandays * team.analysis_percentage * 10) / 10,
    po_mandays:       Math.round(it_mandays * team.po_percentage * 10) / 10,
  }
}

export async function getAll() {
  const projects = await prisma.project.findMany({
    include: { assigned_team: true, start_sprint: true },
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
  })

  return projects.map((p) => ({
    ...p,
    role_distribution: p.assigned_team ? calcRoleDistribution(p.it_mandays, p.assigned_team) : null,
  }))
}

export async function getById(id: string) {
  const p = await prisma.project.findUnique({
    where: { id },
    include: { assigned_team: true, start_sprint: true, assignments: { include: { sprint: true } } },
  })
  if (!p) throw new Error('Project niet gevonden')

  return {
    ...p,
    role_distribution: p.assigned_team ? calcRoleDistribution(p.it_mandays, p.assigned_team) : null,
  }
}

export async function create(data: {
  pid: string
  name: string
  priority?: Priority
  status?: ProjectStatus
  total_mandays: number
  it_mandays: number
  business_mandays: number
  assigned_team_id?: string
  capacity_split?: number
  start_sprint_id?: string
}) {
  return prisma.project.create({
    data,
    include: { assigned_team: true, start_sprint: true },
  })
}

export async function update(id: string, data: Partial<{
  pid: string
  name: string
  priority: Priority
  status: ProjectStatus
  total_mandays: number
  it_mandays: number
  business_mandays: number
  assigned_team_id: string | null
  capacity_split: number
  start_sprint_id: string | null
}>) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) throw new Error('Project niet gevonden')
  return prisma.project.update({ where: { id }, data, include: { assigned_team: true, start_sprint: true } })
}

export async function remove(id: string) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) throw new Error('Project niet gevonden')
  await prisma.project.delete({ where: { id } })
  return { success: true }
}
