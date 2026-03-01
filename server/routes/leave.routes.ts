import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as leaveService from '../services/leave.service.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try {
    const { member_id, sprint_id } = req.query as { member_id?: string; sprint_id?: string }
    res.json(await leaveService.getAll({ member_id, sprint_id }))
  }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.post('/', async (req, res: Response) => {
  try {
    const { member_id, sprint_id, date, type } = req.body
    res.status(201).json(await leaveService.create({ member_id, sprint_id, date: new Date(date), type }))
  }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.post('/bulk', async (req, res: Response) => {
  try {
    const entries = req.body.map((e: { member_id: string; sprint_id: string; date: string; type: string }) => ({
      ...e,
      date: new Date(e.date),
    }))
    res.status(201).json(await leaveService.createBulk(entries))
  }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.delete('/:id', async (req, res: Response) => {
  try { res.json(await leaveService.remove(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

export default router
