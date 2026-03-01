import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import * as scenariosService from '../services/scenarios.service.js'

const router = Router()
router.use(authenticate)

router.get('/', async (_req, res: Response) => {
  try { res.json(await scenariosService.getAll()) }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/:id', async (req, res: Response) => {
  try { res.json(await scenariosService.getById(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try { res.status(201).json(await scenariosService.create(req.userId!, req.body)) }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.post('/:id/simulate', async (req, res: Response) => {
  try { res.json(await scenariosService.simulate(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

router.delete('/:id', async (req, res: Response) => {
  try { res.json(await scenariosService.remove(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

export default router
