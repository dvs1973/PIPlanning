import { Router, Request, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import * as authService from '../services/auth.service.js'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, wachtwoord en naam zijn verplicht' })
      return
    }
    const result = await authService.register(email, password, name, role)
    res.status(201).json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registratie mislukt'
    res.status(400).json({ error: message })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' })
      return
    }
    const result = await authService.login(email, password)
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Inloggen mislukt'
    res.status(401).json({ error: message })
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.getMe(req.userId!)
    res.json(user)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ophalen mislukt'
    res.status(404).json({ error: message })
  }
})

export default router
