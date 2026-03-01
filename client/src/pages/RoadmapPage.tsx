import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import PageHeader from '../components/Layout/PageHeader'
import StatCard from '../components/Layout/StatCard'
import Badge from '../components/shared/Badge'
import { RoadmapData } from '../../../shared/types'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function RoadmapPage() {
  const { data, isLoading } = useQuery<RoadmapData>({
    queryKey: ['roadmap'],
    queryFn: () => api.get('/planning/roadmap?months=6').then((r) => r.data),
  })

  if (isLoading) return <div className="text-gray-400 p-6">Laden...</div>
  if (!data) return null

  const allProjects = data.teams.flatMap((t) => t.projects)
  const activeCount = allProjects.filter((p) => p.project.status === 'ACTIVE').length
  const prioACount = allProjects.filter((p) => p.project.priority === 'A').length
  const avgSprints = allProjects.length ? Math.round(allProjects.reduce((a, p) => a + p.estimated_sprints, 0) / allProjects.length) : 0

  return (
    <div>
      <PageHeader title="Roadmap" subtitle="PI Planning overzicht voor alle teams" />

      {/* KPI kaarten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Actieve projecten" value={activeCount} />
        <StatCard label="Prio A projecten" value={prioACount} warning={prioACount > 3} />
        <StatCard label="Gem. looptijd" value={`${avgSprints} sprints`} accent />
        <StatCard label="Teams actief" value={data.teams.length} />
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mb-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cap-red/70" /> Prio A</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cap-orange/70" /> Prio B</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent/70" /> Prio C</span>
      </div>

      {/* Gantt tijdlijn */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Sprint header */}
        <div className="flex border-b border-border">
          <div className="w-40 flex-shrink-0 px-4 py-2.5 text-xs text-gray-400 border-r border-border">Team</div>
          <div className="flex-1 flex overflow-x-auto">
            {data.sprints.map((s) => (
              <div key={s.id} className="flex-1 min-w-[80px] text-center py-2.5 text-xs text-gray-400 border-r border-border last:border-r-0">
                <div className="font-mono font-medium text-white">{s.name}</div>
                <div>{format(new Date(s.start_date), 'd MMM', { locale: nl })}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team rijen */}
        {data.teams.map((teamData) => (
          <div key={teamData.team.id} className="flex border-b border-border last:border-b-0 hover:bg-surface-2/30 transition-colors">
            <div className="w-40 flex-shrink-0 px-4 py-3 border-r border-border">
              <p className="text-sm font-medium text-white">{teamData.team.name}</p>
              <Badge teamType={teamData.team.type} className="mt-1" />
            </div>
            <div className="flex-1 flex relative overflow-x-auto">
              {/* Sprint grid lijnen */}
              {data.sprints.map((s) => (
                <div key={s.id} className="flex-1 min-w-[80px] border-r border-border/50 last:border-r-0" />
              ))}
              {/* Project balken (overlay) */}
              <div className="absolute inset-0 py-2 px-1">
                {teamData.projects.map((p) => {
                  const startIdx = data.sprints.findIndex((s) => s.id === p.start_sprint?.id)
                  const endIdx = data.sprints.findIndex((s) => s.id === p.end_sprint?.id)
                  if (startIdx < 0) return null
                  const totalCols = data.sprints.length
                  const left = (startIdx / totalCols) * 100
                  const width = ((endIdx - startIdx + 1) / totalCols) * 100

                  const barColor = p.project.priority === 'A' ? 'bg-cap-red/70' : p.project.priority === 'B' ? 'bg-cap-orange/70' : 'bg-accent/70'

                  return (
                    <div
                      key={p.project.id}
                      className={`absolute h-7 rounded ${barColor} flex items-center px-2 overflow-hidden`}
                      style={{ left: `${left}%`, width: `${width}%`, top: '4px' }}
                      title={`${p.project.name} — ${p.estimated_sprints} sprints`}
                    >
                      <span className="text-xs text-white font-medium truncate">{p.project.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
