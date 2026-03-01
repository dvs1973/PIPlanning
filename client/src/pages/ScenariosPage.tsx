import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useProjects } from '../hooks/useProjects'
import { useMembers } from '../hooks/useMembers'
import { useTeams } from '../hooks/useTeams'
import PageHeader from '../components/Layout/PageHeader'
import Badge from '../components/shared/Badge'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'
import { Scenario, SimulationResult, ChangeType } from '../../../shared/types'

const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  PRIORITY_CHANGE: 'Prioriteit wijzigen',
  MEMBER_ABSENCE: 'Afwezigheid lid',
  PROJECT_DELAY: 'Project uitstellen',
  CAPACITY_SPLIT: 'Capaciteitsaandeel',
}

interface Change {
  change_type: ChangeType
  project_id?: string
  member_id?: string
  parameters: Record<string, unknown>
}

export default function ScenariosPage() {
  const { data: scenarios } = useQuery<Scenario[]>({ queryKey: ['scenarios'], queryFn: () => api.get('/scenarios').then((r) => r.data) })
  const { data: projects } = useProjects()
  const { data: teams } = useTeams()
  const { showToast } = useToast()
  const qc = useQueryClient()

  const [scenarioName, setScenarioName] = useState('')
  const [changes, setChanges] = useState<Change[]>([])
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null)
  const firstTeamId = teams?.[0]?.id ?? ''
  const { data: members } = useMembers(firstTeamId)

  const createScenario = useMutation({
    mutationFn: (data: { name: string; changes: Change[] }) => api.post('/scenarios', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scenarios'] }); showToast('Scenario opgeslagen') },
  })

  const deleteScenario = useMutation({
    mutationFn: (id: string) => api.delete(`/scenarios/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scenarios'] }); showToast('Scenario verwijderd') },
  })

  const simulate = useMutation({
    mutationFn: (id: string) => api.post(`/scenarios/${id}/simulate`).then((r) => r.data),
    onSuccess: (data) => setSimulation(data),
  })

  const addChange = () => setChanges([...changes, { change_type: 'PRIORITY_CHANGE', parameters: { from: 'B', to: 'A' } }])
  const removeChange = (i: number) => setChanges(changes.filter((_, idx) => idx !== i))
  const updateChange = (i: number, patch: Partial<Change>) => setChanges(changes.map((c, idx) => idx === i ? { ...c, ...patch } : c))

  const handleSave = async () => {
    if (!scenarioName || changes.length === 0) { showToast('Vul naam en minimaal 1 wijziging in', 'error'); return }
    await createScenario.mutateAsync({ name: scenarioName, changes })
    setScenarioName('')
    setChanges([])
  }

  return (
    <div>
      <PageHeader title="What-if Scenario's" subtitle="Simuleer de impact van wijzigingen op de planning" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario Builder */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Nieuw scenario</h3>
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Naam</label>
              <input className="input w-full" placeholder="Bijv. Prio A versneld" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
            </div>

            {changes.map((c, i) => (
              <div key={i} className="bg-surface-2 rounded-lg p-3 space-y-2 relative">
                <button onClick={() => removeChange(i)} className="absolute top-2 right-2 text-gray-500 hover:text-cap-red text-xs">✕</button>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type wijziging</label>
                  <select className="input w-full" value={c.change_type} onChange={(e) => updateChange(i, { change_type: e.target.value as ChangeType, parameters: {} })}>
                    {(Object.keys(CHANGE_TYPE_LABELS) as ChangeType[]).map((t) => (
                      <option key={t} value={t}>{CHANGE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                {(c.change_type === 'PRIORITY_CHANGE' || c.change_type === 'PROJECT_DELAY' || c.change_type === 'CAPACITY_SPLIT') && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Project</label>
                    <select className="input w-full" value={c.project_id ?? ''} onChange={(e) => updateChange(i, { project_id: e.target.value })}>
                      <option value="">— Kies project —</option>
                      {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}

                {c.change_type === 'PRIORITY_CHANGE' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Van</label>
                      <select className="input w-full" value={(c.parameters.from as string) ?? 'B'} onChange={(e) => updateChange(i, { parameters: { ...c.parameters, from: e.target.value } })}>
                        <option>A</option><option>B</option><option>C</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Naar</label>
                      <select className="input w-full" value={(c.parameters.to as string) ?? 'A'} onChange={(e) => updateChange(i, { parameters: { ...c.parameters, to: e.target.value } })}>
                        <option>A</option><option>B</option><option>C</option>
                      </select>
                    </div>
                  </div>
                )}

                {c.change_type === 'MEMBER_ABSENCE' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Lid</label>
                      <select className="input w-full" value={c.member_id ?? ''} onChange={(e) => updateChange(i, { member_id: e.target.value })}>
                        <option value="">— Kies lid —</option>
                        {members?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Aantal sprints afwezig: {(c.parameters.sprints as number) ?? 1}</label>
                      <input type="range" min={1} max={12} value={(c.parameters.sprints as number) ?? 1} onChange={(e) => updateChange(i, { parameters: { ...c.parameters, sprints: Number(e.target.value) } })} className="w-full" />
                    </div>
                  </div>
                )}

                {c.change_type === 'PROJECT_DELAY' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Uitstel in sprints: {(c.parameters.delay_sprints as number) ?? 1}</label>
                    <input type="range" min={1} max={6} value={(c.parameters.delay_sprints as number) ?? 1} onChange={(e) => updateChange(i, { parameters: { ...c.parameters, delay_sprints: Number(e.target.value) } })} className="w-full" />
                  </div>
                )}

                {c.change_type === 'CAPACITY_SPLIT' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nieuw aandeel: {Math.round(((c.parameters.new_split as number) ?? 0.6) * 100)}%</label>
                    <input type="range" min={10} max={100} step={10} value={Math.round(((c.parameters.new_split as number) ?? 0.6) * 100)} onChange={(e) => updateChange(i, { parameters: { ...c.parameters, new_split: Number(e.target.value) / 100 } })} className="w-full" />
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <button onClick={addChange} className="flex-1 py-2 text-sm border border-dashed border-border rounded-lg text-gray-400 hover:text-white hover:border-accent transition-colors">+ Wijziging toevoegen</button>
              <button onClick={handleSave} disabled={createScenario.isPending} className="px-4 py-2 text-sm bg-accent hover:bg-accent-light text-white rounded-lg transition-colors disabled:opacity-50">Opslaan</button>
            </div>
          </div>

          {/* Opgeslagen scenarios */}
          <h3 className="text-sm font-semibold text-white mt-5 mb-3">Opgeslagen scenario's</h3>
          <div className="space-y-2">
            {scenarios?.map((s) => (
              <div key={s.id} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-white">{s.name}</p>
                <div className="flex gap-2">
                  <button onClick={() => simulate.mutate(s.id)} disabled={simulate.isPending} className="text-xs px-2.5 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded transition-colors">Simuleer</button>
                  <button onClick={() => setDeleteTarget(s)} className="text-xs px-2.5 py-1 text-gray-400 hover:text-cap-red transition-colors">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Impact */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Impact</h3>
          {simulation ? (
            <div className="space-y-4">
              {/* Samenvatting */}
              <div className="bg-surface border border-border rounded-xl p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Gem. impact Prio A</p>
                  <p className={`text-2xl font-bold font-mono ${simulation.summary.avg_impact_prio_a > 0 ? 'text-cap-red' : simulation.summary.avg_impact_prio_a < 0 ? 'text-cap-green' : 'text-white'}`}>
                    {simulation.summary.avg_impact_prio_a > 0 ? '+' : ''}{Math.round(simulation.summary.avg_impact_prio_a * 10) / 10} sprints
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Gem. impact Prio B</p>
                  <p className={`text-2xl font-bold font-mono ${simulation.summary.avg_impact_prio_b > 0 ? 'text-cap-red' : simulation.summary.avg_impact_prio_b < 0 ? 'text-cap-green' : 'text-white'}`}>
                    {simulation.summary.avg_impact_prio_b > 0 ? '+' : ''}{Math.round(simulation.summary.avg_impact_prio_b * 10) / 10} sprints
                  </p>
                </div>
              </div>

              {/* Impact tabel */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs text-gray-400">Project</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400">Huidig einde</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400">Scenario einde</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.impact.map((item) => (
                      <tr key={item.project.id} className="border-b border-border/50 last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white">{item.project.name}</span>
                            <Badge priority={item.project.priority} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{item.current_end_sprint?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{item.scenario_end_sprint?.name ?? '—'}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${item.delta_sprints > 0 ? 'text-cap-red' : item.delta_sprints < 0 ? 'text-cap-green' : 'text-gray-400'}`}>
                          {item.delta_sprints > 0 ? '+' : ''}{item.delta_sprints}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-gray-500 text-sm">
              Kies een scenario en klik op "Simuleer" om de impact te zien.
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Scenario verwijderen"
          message={`Verwijder scenario "${deleteTarget.name}"?`}
          onConfirm={async () => { await deleteScenario.mutateAsync(deleteTarget.id); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteScenario.isPending}
        />
      )}
    </div>
  )
}
