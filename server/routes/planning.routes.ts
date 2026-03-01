import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as planningService from '../services/planning.service.js'

const router = Router()
router.use(authenticate)

router.get('/roadmap', async (req: Request, res: Response) => {
  try {
    const months = Number(req.query.months) || 4
    res.json(await planningService.getRoadmap(months))
  }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/availability', async (_req, res: Response) => {
  try {
    const { getAvailability } = await import('../services/capacity.service.js')
    res.json(await getAvailability())
  }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/sprint/:teamId', async (req: Request, res: Response) => {
  try {
    const fromSprint = Number(String(req.query.from_sprint || '1'))
    const count = Number(String(req.query.count || '6'))
    res.json(await planningService.getSprintPlanning(String(req.params.teamId), fromSprint, count))
  }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

export default router
