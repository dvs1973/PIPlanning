import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { errorHandler } from './middleware/error.js'
import authRoutes from './routes/auth.routes.js'
import teamsRoutes from './routes/teams.routes.js'
import membersRoutes from './routes/members.routes.js'
import memberRoutes from './routes/member.routes.js'
import sprintsRoutes from './routes/sprints.routes.js'
import leaveRoutes from './routes/leave.routes.js'
import projectsRoutes from './routes/projects.routes.js'
import capacityRoutes from './routes/capacity.routes.js'
import planningRoutes from './routes/planning.routes.js'
import scenariosRoutes from './routes/scenarios.routes.js'

const app = express()
const PORT = Number(process.env.PORT) || 3000

// Middleware
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth',      authRoutes)
app.use('/api/teams',     teamsRoutes)
app.use('/api/teams/:teamId/members', membersRoutes)
app.use('/api/members',   memberRoutes)
app.use('/api/sprints',   sprintsRoutes)
app.use('/api/leave',     leaveRoutes)
app.use('/api/projects',  projectsRoutes)
app.use('/api/capacity',  capacityRoutes)
app.use('/api/planning',  planningRoutes)
app.use('/api/scenarios', scenariosRoutes)

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  // When compiled: dist/server/index.js → ../../client/dist
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Global error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`)
})

export default app
