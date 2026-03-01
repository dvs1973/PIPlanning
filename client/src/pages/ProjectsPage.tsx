import { useState } from 'react'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects'
import { useTeams } from '../hooks/useTeams'
import { useSprints } from '../hooks/useSprints'
import PageHeader from '../components/Layout/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'
import { Project, Priority, ProjectStatus } from '../../../shared/types'

interface ProjectFormData {
  pid: string; name: string; priority: Priority; status: ProjectStatus
  total_mandays: number; it_mandays: number; business_mandays: number
  assigned_team_id: string; capacity_split: number; start_sprint_id: string
}

const empty: ProjectFormData = { pid: '', name: '', priority: 'B', status: 'PLANNED', total_mandays: 0, it_mandays: 0, business_mandays: 0, assigned_team_id: '', capacity_split: 1.0, start_sprint_id: '' }

export default function ProjectsPage() {
  const { data: projects } = useProjects()
  const { data: teams } = useTeams()
  const { data: sprints } = useSprints()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const { showToast } = useToast()

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectFormData>(empty)

  const openCreate = () => { setForm(empty); setModal('create') }
  const openEdit = (p: Project) => {
    setEditProject(p)
    setForm({ pid: p.pid, name: p.name, priority: p.priority, status: p.status, total_mandays: p.total_mandays, it_mandays: p.it_mandays, business_mandays: p.business_mandays, assigned_team_id: p.assigned_team_id ?? '', capacity_split: p.capacity_split, start_sprint_id: p.start_sprint_id ?? '' })
    setModal('edit')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (modal === 'create') {
        await createProject.mutateAsync(form)
        showToast('Project aangemaakt')
      } else if (editProject) {
        await updateProject.mutateAsync({ id: editProject.id, ...form })
        showToast('Project bijgewerkt')
      }
      setModal(null)
    } catch { showToast('Er ging iets mis', 'error') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProject.mutateAsync(deleteTarget.id)
      showToast('Project verwijderd')
    } catch { showToast('Verwijderen mislukt', 'error') }
    finally { setDeleteTarget(null) }
  }

  return (
    <div>
      <PageHeader
        title="Projectenregister"
        subtitle="Alle projecten met mandagen en rolverdeling"
        actions={<button onClick={openCreate} className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-sm rounded-lg transition-colors">+ Nieuw project</button>}
      />

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['PID', 'Naam', 'Prio', 'Status', 'Team', 'Totaal', 'IT', 'Dev', 'Test', 'Analyse', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects?.map((p) => (
              <tr key={p.id} className="border-b border-border/50 last:border-b-0 hover:bg-surface-2/30">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.pid}</td>
                <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                <td className="px-4 py-3"><Badge priority={p.priority} /></td>
                <td className="px-4 py-3"><Badge status={p.status} /></td>
                <td className="px-4 py-3 text-gray-300 text-xs">{p.assigned_team?.name ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-gray-300">{p.total_mandays}</td>
                <td className="px-4 py-3 font-mono text-gray-300">{p.it_mandays}</td>
                <td className="px-4 py-3 font-mono text-gray-300">{p.role_distribution ? Math.round(p.role_distribution.dev_mandays * 10) / 10 : '—'}</td>
                <td className="px-4 py-3 font-mono text-gray-300">{p.role_distribution ? Math.round(p.role_distribution.test_mandays * 10) / 10 : '—'}</td>
                <td className="px-4 py-3 font-mono text-gray-300">{p.role_distribution ? Math.round(p.role_distribution.analysis_mandays * 10) / 10 : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-white transition-colors">Bewerk</button>
                    <button onClick={() => setDeleteTarget(p)} className="text-xs text-gray-400 hover:text-cap-red transition-colors">Verwijder</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formule uitleg */}
      <div className="mt-4 bg-surface-2 border border-border rounded-lg px-4 py-3 text-xs text-gray-400">
        <strong className="text-gray-300">Rolverdeling formule:</strong> IT mandagen × teampercentage (Dev/Test/Analyse/PO) = mandagen per rol
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Nieuw project' : 'Project bewerken'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">PID</label>
                <input className="input w-full" value={form.pid} onChange={(e) => setForm({ ...form, pid: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Naam</label>
                <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Prioriteit</label>
                <select className="input w-full" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select className="input w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                  <option value="PLANNED">Gepland</option><option value="ACTIVE">Actief</option><option value="DONE">Klaar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Totaal mandagen</label>
                <input type="number" className="input w-full" value={form.total_mandays} onChange={(e) => setForm({ ...form, total_mandays: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">IT mandagen</label>
                <input type="number" className="input w-full" value={form.it_mandays} onChange={(e) => setForm({ ...form, it_mandays: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Business mandagen</label>
                <input type="number" className="input w-full" value={form.business_mandays} onChange={(e) => setForm({ ...form, business_mandays: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Team</label>
                <select className="input w-full" value={form.assigned_team_id} onChange={(e) => setForm({ ...form, assigned_team_id: e.target.value })}>
                  <option value="">— Geen team —</option>
                  {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start sprint</label>
                <select className="input w-full" value={form.start_sprint_id} onChange={(e) => setForm({ ...form, start_sprint_id: e.target.value })}>
                  <option value="">— Geen sprint —</option>
                  {sprints?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Capaciteitsaandeel</label>
                <input type="number" step="0.1" min="0.1" max="1" className="input w-full" value={form.capacity_split} onChange={(e) => setForm({ ...form, capacity_split: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-border rounded-lg text-gray-300 hover:bg-surface-2 transition-colors">Annuleren</button>
              <button type="submit" className="px-4 py-2 text-sm bg-accent hover:bg-accent-light text-white rounded-lg transition-colors">Opslaan</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Project verwijderen"
          message={`Weet je zeker dat je "${deleteTarget.name}" wilt verwijderen?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteProject.isPending}
        />
      )}
    </div>
  )
}
