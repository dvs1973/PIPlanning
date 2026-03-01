import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as capacityService from '../services/capacity.service.js'

const router = Router()
router.use(authenticate)

router.get('/overview', async (_req, res: Response) => {
  try { res.json(await capacityService.getCapacityOverview()) }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/availability', async (_req, res: Response) => {
  try { res.json(await capacityService.getAvailability()) }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/:teamId', async (req: Request, res: Response) => {
  try {
    const sprintIds = req.query.sprint_ids ? String(req.query.sprint_ids).split(',') : undefined
    res.json(await capacityService.getCapacityByTeam(String(req.params.teamId), sprintIds))
  }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

export default router
