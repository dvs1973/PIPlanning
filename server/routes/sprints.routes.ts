import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as sprintsService from '../services/sprints.service.js'

const router = Router()
router.use(authenticate)

router.get('/', async (_req, res: Response) => {
  try { res.json(await sprintsService.getAll()) }
  catch (e: unknown) { res.status(500).json({ error: (e as Error).message }) }
})

router.post('/generate', async (req, res: Response) => {
  try {
    const { count, start_date } = req.body
    if (!count || !start_date) { res.status(400).json({ error: 'count en start_date zijn verplicht' }); return }
    res.status(201).json(await sprintsService.generate(Number(count), new Date(start_date)))
  }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.post('/', async (req, res: Response) => {
  try {
    const { name, number, start_date, end_date } = req.body
    res.status(201).json(await sprintsService.create({ name, number, start_date: new Date(start_date), end_date: new Date(end_date) }))
  }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.put('/:id', async (req, res: Response) => {
  try {
    const data = { ...req.body }
    if (data.start_date) data.start_date = new Date(data.start_date)
    if (data.end_date) data.end_date = new Date(data.end_date)
    res.json(await sprintsService.update(req.params.id, data))
  }
  catch (e: unknown) { res.status(400).json({ error: (e as Error).message }) }
})

router.delete('/:id', async (req, res: Response) => {
  try { res.json(await sprintsService.remove(req.params.id)) }
  catch (e: unknown) { res.status(404).json({ error: (e as Error).message }) }
})

export default router
