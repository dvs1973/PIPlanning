import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database.js'

const SALT_ROUNDS = 12

export async function register(email: string, password: string, name: string, role: 'ADMIN' | 'TEAM_LEAD' | 'VIEWER' = 'VIEWER') {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('E-mailadres is al in gebruik')

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { email, password_hash, name, role },
    select: { id: true, email: true, name: true, role: true, team_id: true, created_at: true, updated_at: true },
  })
  const token = signToken(user.id, user.role)
  return { token, user }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('Ongeldige inloggegevens')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('Ongeldige inloggegevens')

  const { password_hash: _, ...safeUser } = user
  const token = signToken(user.id, user.role)
  return { token, user: safeUser }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, team_id: true, created_at: true, updated_at: true },
  })
  if (!user) throw new Error('Gebruiker niet gevonden')
  return user
}

function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '7d' })
}
