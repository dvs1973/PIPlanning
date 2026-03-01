import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as membersService from '../services/members.service.js'

interface TeamParams { teamId: string }

const router = Router({ mergeParams: true })
router.use(authenticate)

// GET /api/teams/:teamId/members
router.get('/', async (req: Request<TeamParams>, res: Response) => {
  try { res.json(await membersService.getByTeam(req.params.teamId)) }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

// POST /api/teams/:teamId/members
router.post('/', async (req: Request<TeamParams>, res: Response) => {
  try { res.status(201).json(await membersService.create(req.params.teamId, req.body)) }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

export default router
