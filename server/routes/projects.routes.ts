import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as projectsService from '../services/projects.service.js'

const router = Router()
router.use(authenticate)

router.get('/', async (_req, res: Response) => {
  try { res.json(await projectsService.getAll()) }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/:id', async (req, res: Response) => {
  try { res.json(await projectsService.getById(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

router.post('/', async (req, res: Response) => {
  try { res.status(201).json(await projectsService.create(req.body)) }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.put('/:id', async (req, res: Response) => {
  try { res.json(await projectsService.update(req.params.id, req.body)) }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.delete('/:id', async (req, res: Response) => {
  try { res.json(await projectsService.remove(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

export default router
