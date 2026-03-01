import { useState } from 'react'
import { useTeams } from '../hooks/useTeams'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import PageHeader from '../components/Layout/PageHeader'
import TabBar from '../components/shared/TabBar'
import Badge from '../components/shared/Badge'
import { SprintPlanningData, MemberRole } from '../../../shared/types'

const ROLES: MemberRole[] = ['DEV', 'TEST', 'ANALYST', 'PO']
const ROLE_LABELS: Record<MemberRole, string> = { DEV: 'Dev', TEST: 'Test', ANALYST: 'Analyse', PO: 'PO' }

function cellColor(pct: number) {
  if (pct < 80) return 'text-cap-green'
  if (pct < 95) return 'text-cap-orange'
  return 'text-cap-red border border-cap-red/50'
}

export default function SprintPlanningPage() {
  const { data: teams } = useTeams()
  const [activeTeam, setActiveTeam] = useState('')
  const [fromSprint, setFromSprint] = useState(1)

  const teamId = activeTeam || teams?.[0]?.id || ''

  const { data } = useQuery<SprintPlanningData>({
    queryKey: ['sprint-planning', teamId, fromSprint],
    queryFn: () => api.get(`/planning/sprint/${teamId}?from_sprint=${fromSprint}&count=6`).then((r) => r.data),
    enabled: !!teamId,
  })

  const tabs = teams?.map((t) => ({ id: t.id, label: t.name })) ?? []

  return (
    <div>
      <PageHeader title="Sprint Planning" subtitle="Capaciteit en bezetting per team per sprint" />

      {teams && (
        <TabBar tabs={tabs} activeTab={activeTeam || tabs[0]?.id} onChange={setActiveTeam} />
      )}

      {data && (
        <div className="mt-4">
          {/* Bottleneck banner */}
          {data.bottlenecks.length > 0 && (
            <div className="bg-cap-red/10 border border-cap-red/30 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
              <span className="text-cap-red">⚠</span>
              <span className="text-sm text-cap-red">
                Overbelasting gedetecteerd: {data.bottlenecks.map((b) => `${ROLE_LABELS[b.role]} (Sprint ${b.sprint_id.slice(0, 6)}…)`).join(', ')}
              </span>
            </div>
          )}

          {/* Navigatie */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setFromSprint(Math.max(1, fromSprint - 6))}
              disabled={fromSprint <= 1}
              className="px-3 py-1.5 text-sm border border-border rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              ← Vorige
            </button>
            <span className="text-sm text-gray-400">Sprints {fromSprint}–{fromSprint + 5}</span>
            <button
              onClick={() => setFromSprint(fromSprint + 6)}
              className="px-3 py-1.5 text-sm border border-border rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Volgende →
            </button>
          </div>

          {/* Capaciteits grid */}
          <div className="bg-surface border border-border rounded-xl overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium w-24">Rol</th>
                  {data.sprints.map((s) => (
                    <th key={s.id} className="text-center px-3 py-3 text-xs text-gray-400 font-medium">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) => (
                  <tr key={role} className="border-b border-border/50 last:border-b-0">
                    <td className="px-4 py-3"><Badge role={role} /></td>
                    {data.sprints.map((s) => {
                      const cap = data.capacity.find((c) => c.sprint_id === s.id && c.role === role)
                      const team = data.team
                      const pctKey = role === 'ANALYST' ? 'analysis_percentage' : `${role.toLowerCase()}_percentage`
                      const rolePct = (team as unknown as Record<string, number>)[pctKey] ?? 0
                      const planned = data.projects.reduce((sum, p) => sum + p.it_mandays * rolePct * p.capacity_split, 0)
                      const net = cap?.net ?? 0
                      const pct = net > 0 ? (planned / net) * 100 : 0
                      const isBottleneck = data.bottlenecks.some((b) => b.sprint_id === s.id && b.role === role)

                      return (
                        <td key={s.id} className={`text-center px-3 py-3 font-mono text-xs rounded ${isBottleneck ? 'bg-cap-red/10' : ''}`}>
                          <span className={cellColor(pct)}>
                            {Math.round(planned * 10) / 10}/{net}
                          </span>
                          <div className="text-gray-500 text-[10px] mt-0.5">{Math.round(pct)}%</div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Projectverdeling */}
          <h3 className="text-sm font-semibold text-white mb-3">Projectverdeling</h3>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs text-gray-400">Project</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400">Prio</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-400">IT mandagen</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-400">Capaciteitsaandeel</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-b-0 hover:bg-surface-2/30">
                    <td className="px-4 py-3 text-white">{p.name}</td>
                    <td className="px-4 py-3"><Badge priority={p.priority} /></td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">{p.it_mandays}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">{Math.round(p.capacity_split * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
