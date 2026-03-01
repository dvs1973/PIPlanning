import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import * as teamsService from '../services/teams.service.js'

const router = Router()
router.use(authenticate)

router.get('/', async (_req, res: Response) => {
  try { res.json(await teamsService.getAll()) }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/:id', async (req, res: Response) => {
  try { res.json(await teamsService.getById(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try { res.status(201).json(await teamsService.create(req.body)) }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.put('/:id', async (req, res: Response) => {
  try { res.json(await teamsService.update(req.params.id, req.body)) }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.delete('/:id', async (req, res: Response) => {
  try { res.json(await teamsService.remove(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

export default router
