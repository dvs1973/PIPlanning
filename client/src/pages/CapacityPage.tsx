import { useCapacityOverview, useAvailability } from '../hooks/useCapacity'
import { useSprints } from '../hooks/useSprints'
import PageHeader from '../components/Layout/PageHeader'
import Badge from '../components/shared/Badge'

function heatColor(pct: number) {
  if (pct < 70) return 'bg-cap-green/20 text-cap-green'
  if (pct < 90) return 'bg-cap-orange/20 text-cap-orange'
  return 'bg-cap-red/20 text-cap-red'
}

export default function CapacityPage() {
  const { data: overview, isLoading } = useCapacityOverview()
  const { data: availability } = useAvailability()
  const { data: sprints } = useSprints()

  if (isLoading) return <div className="text-gray-400 p-6">Laden...</div>

  const displaySprints = sprints?.slice(0, 8) ?? []

  return (
    <div>
      <PageHeader title="Capaciteitsoverzicht" subtitle="Bezettingsgraad per team en beschikbaarheid" />

      {/* Heatmap */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium w-36">Team</th>
              {displaySprints.map((s) => (
                <th key={s.id} className="text-center px-2 py-3 text-xs text-gray-400 font-medium min-w-[70px]">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {overview?.teams.map((teamData) => (
              <tr key={teamData.team.id} className="border-b border-border/50 last:border-b-0">
                <td className="px-4 py-3">
                  <p className="text-white text-xs font-medium">{teamData.team.name}</p>
                  <Badge teamType={teamData.team.type} className="mt-0.5" />
                </td>
                {displaySprints.map((s) => {
                  const sprintData = teamData.sprints.find((sd) => sd.sprint.id === s.id)
                  const pct = 100 - (sprintData?.percentage ?? 0)
                  return (
                    <td key={s.id} className="px-2 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-mono font-medium ${heatColor(pct)}`}>
                        {Math.round(pct)}%
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mb-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cap-green/50" /> &lt;70% bezet</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cap-orange/50" /> 70–90% bezet</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cap-red/50" /> &gt;90% bezet</span>
      </div>

      {/* Beschikbaarheid */}
      <h2 className="text-sm font-semibold text-white mb-3">Beschikbaarheid per team</h2>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-gray-400">Team</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400">Vroegste vrije sprint</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400">Vrij capacity %</th>
            </tr>
          </thead>
          <tbody>
            {availability?.map((a) => (
              <tr key={a.team.id} className="border-b border-border/50 last:border-b-0 hover:bg-surface-2/30">
                <td className="px-4 py-3">
                  <p className="text-white text-sm">{a.team.name}</p>
                  <Badge teamType={a.team.type} />
                </td>
                <td className="px-4 py-3 text-gray-300">{a.earliest_sprint?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={a.free_percentage > 30 ? 'text-cap-green' : a.free_percentage > 10 ? 'text-cap-orange' : 'text-cap-red'}>
                    {a.free_percentage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
