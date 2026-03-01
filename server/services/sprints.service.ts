import { prisma } from '../config/database.js'
import { addDays, isWeekend } from 'date-fns'

function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date)
  let added = 0
  while (added < days) {
    result = addDays(result, 1)
    if (!isWeekend(result)) added++
  }
  return result
}

export async function getAll() {
  return prisma.sprint.findMany({ orderBy: { number: 'asc' } })
}

export async function getById(id: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id } })
  if (!sprint) throw new Error('Sprint niet gevonden')
  return sprint
}

export async function create(data: { name: string; number: number; start_date: Date; end_date: Date }) {
  return prisma.sprint.create({ data })
}

export async function generate(count: number, startDate: Date) {
  const sprints = []
  let current = new Date(startDate)

  // Find highest existing sprint number
  const last = await prisma.sprint.findFirst({ orderBy: { number: 'desc' } })
  let startNumber = (last?.number ?? 0) + 1

  for (let i = 0; i < count; i++) {
    const start = new Date(current)
    const end = addBusinessDays(start, 9)
    sprints.push({
      name: `Sprint ${startNumber + i}`,
      number: startNumber + i,
      start_date: start,
      end_date: end,
    })
    current = addBusinessDays(end, 1)
  }

  return prisma.$transaction(sprints.map((s) => prisma.sprint.create({ data: s })))
}

export async function update(id: string, data: Partial<{ name: string; start_date: Date; end_date: Date }>) {
  const sprint = await prisma.sprint.findUnique({ where: { id } })
  if (!sprint) throw new Error('Sprint niet gevonden')
  return prisma.sprint.update({ where: { id }, data })
}

export async function remove(id: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id } })
  if (!sprint) throw new Error('Sprint niet gevonden')
  await prisma.sprint.delete({ where: { id } })
  return { success: true }
}
