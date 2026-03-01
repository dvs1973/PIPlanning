import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as membersService from '../services/members.service.js'

const router = Router()
router.use(authenticate)

// PUT /api/members/:id
router.put('/:id', async (req, res: Response) => {
  try { res.json(await membersService.update(req.params.id, req.body)) }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

// DELETE /api/members/:id
router.delete('/:id', async (req, res: Response) => {
  try { res.json(await membersService.remove(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

export default router
