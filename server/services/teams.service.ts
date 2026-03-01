import { prisma } from '../config/database.js'
import { TeamType } from '@prisma/client'

export async function getAll() {
  return prisma.team.findMany({
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getById(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: { where: { active: true }, orderBy: { role: 'asc' } },
      projects: { where: { status: { not: 'DONE' } }, orderBy: { priority: 'asc' } },
    },
  })
  if (!team) throw new Error('Team niet gevonden')
  return team
}

export async function create(data: {
  name: string
  type: TeamType
  dev_percentage?: number
  test_percentage?: number
  analysis_percentage?: number
  po_percentage?: number
  overhead_percentage?: number
  bug_reserve_percentage?: number
  sprint_days?: number
  scrum_events_days?: number
}) {
  return prisma.team.create({ data })
}

export async function update(id: string, data: Partial<{
  name: string
  type: TeamType
  dev_percentage: number
  test_percentage: number
  analysis_percentage: number
  po_percentage: number
  overhead_percentage: number
  bug_reserve_percentage: number
  sprint_days: number
  scrum_events_days: number
}>) {
  const team = await prisma.team.findUnique({ where: { id } })
  if (!team) throw new Error('Team niet gevonden')
  return prisma.team.update({ where: { id }, data })
}

export async function remove(id: string) {
  const team = await prisma.team.findUnique({ where: { id } })
  if (!team) throw new Error('Team niet gevonden')
  await prisma.team.delete({ where: { id } })
  return { success: true }
}
