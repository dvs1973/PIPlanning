import { prisma } from '../config/database.js'
import { MemberRole } from '@prisma/client'

export async function getByTeam(teamId: string) {
  return prisma.teamMember.findMany({
    where: { team_id: teamId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
}

export async function create(teamId: string, data: { name: string; role: MemberRole; initials: string }) {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) throw new Error('Team niet gevonden')
  return prisma.teamMember.create({ data: { ...data, team_id: teamId } })
}

export async function update(id: string, data: Partial<{ name: string; role: MemberRole; initials: string; active: boolean }>) {
  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) throw new Error('Teamlid niet gevonden')
  return prisma.teamMember.update({ where: { id }, data })
}

export async function remove(id: string) {
  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) throw new Error('Teamlid niet gevonden')
  await prisma.teamMember.delete({ where: { id } })
  return { success: true }
}
