import { prisma } from '../config/database.js'
import { LeaveType } from '@prisma/client'

export async function getAll(filters: { member_id?: string; sprint_id?: string }) {
  return prisma.leaveEntry.findMany({
    where: {
      ...(filters.member_id && { member_id: filters.member_id }),
      ...(filters.sprint_id && { sprint_id: filters.sprint_id }),
    },
    include: { member: true, sprint: true },
    orderBy: { date: 'asc' },
  })
}

export async function create(data: { member_id: string; sprint_id: string; date: Date; type: LeaveType }) {
  return prisma.leaveEntry.create({
    data,
    include: { member: true, sprint: true },
  })
}

export async function createBulk(entries: Array<{ member_id: string; sprint_id: string; date: Date; type: LeaveType }>) {
  return prisma.$transaction(
    entries.map((e) => prisma.leaveEntry.upsert({
      where: { member_id_date: { member_id: e.member_id, date: e.date } },
      update: { type: e.type, sprint_id: e.sprint_id },
      create: e,
    }))
  )
}

export async function remove(id: string) {
  const entry = await prisma.leaveEntry.findUnique({ where: { id } })
  if (!entry) throw new Error('Verlofentry niet gevonden')
  await prisma.leaveEntry.delete({ where: { id } })
  return { success: true }
}
