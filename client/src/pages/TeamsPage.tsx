import { useState } from 'react'
import { useTeams, useUpdateTeam } from '../hooks/useTeams'
import { useMembers, useCreateMember, useDeleteMember, useLeave, useCreateLeave, useDeleteLeave } from '../hooks/useMembers'
import { useCapacityByTeam } from '../hooks/useCapacity'
import { useSprints } from '../hooks/useSprints'
import PageHeader from '../components/Layout/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'
import { MemberRole, LeaveType, TeamMember } from '../../../shared/types'
import { format, eachDayOfInterval, isWeekend } from 'date-fns'

const ROLES: MemberRole[] = ['DEV', 'TEST', 'ANALYST', 'PO']
const ROLE_LABELS: Record<MemberRole, string> = { DEV: 'Dev', TEST: 'Test', ANALYST: 'Analyse', PO: 'PO' }
const LEAVE_COLORS: Record<LeaveType, string> = { VERLOF: 'bg-cap-red', OPLEIDING: 'bg-purple', ZIEKTE: 'bg-gray-500' }

function LeaveGrid({ member, sprintId, sprintStart, sprintEnd }: { member: TeamMember; sprintId: string; sprintStart: string; sprintEnd: string }) {
  const { data: leave } = useLeave({ member_id: member.id, sprint_id: sprintId })
  const createLeave = useCreateLeave()
  const deleteLeave = useDeleteLeave()
  const [popover, setPopover] = useState<number | null>(null)

  const workDays = eachDayOfInterval({ start: new Date(sprintStart), end: new Date(sprintEnd) }).filter((d) => !isWeekend(d))

  const handleClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existing = leave?.find((l) => l.date.startsWith(dateStr))
    if (existing) {
      deleteLeave.mutate(existing.id)
    } else {
      setPopover(date.getTime())
    }
  }

  const handleLeaveType = (date: Date, type: LeaveType) => {
    createLeave.mutate({ member_id: member.id, sprint_id: sprintId, date: format(date, 'yyyy-MM-dd'), type })
    setPopover(null)
  }

  return (
    <div className="flex gap-0.5">
      {workDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const entry = leave?.find((l) => l.date.startsWith(dateStr))
        const color = entry ? LEAVE_COLORS[entry.type] : 'bg-surface-3 hover:bg-surface-2'
        return (
          <div key={day.getTime()} className="relative">
            <button
              onClick={() => handleClick(day)}
              title={format(day, 'dd-MM')}
              className={`w-4 h-4 rounded-sm transition-colors ${color}`}
            />
            {popover === day.getTime() && (
              <div className="absolute z-20 top-5 left-0 bg-surface-2 border border-border rounded-lg p-2 space-y-1 shadow-xl">
                {(['VERLOF', 'OPLEIDING', 'ZIEKTE'] as LeaveType[]).map((type) => (
                  <button key={type} onClick={() => handleLeaveType(day, type)} className={`block w-full text-left px-2 py-1 text-xs rounded hover:opacity-80 text-white ${LEAVE_COLORS[type]}`}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
                <button onClick={() => setPopover(null)} className="block w-full text-left px-2 py-1 text-xs text-gray-400 hover:text-white">Annuleer</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TeamContent({ teamId }: { teamId: string }) {
  const { data: members } = useMembers(teamId)
  const { data: sprints } = useSprints()
  const [selectedSprint, setSelectedSprint] = useState(0)
  const sprint = sprints?.[selectedSprint]
  const { data: capacity } = useCapacityByTeam(teamId, sprint ? [sprint.id] : [])

  const createMember = useCreateMember(teamId)
  const deleteMember = useDeleteMember(teamId)
  const { showToast } = useToast()

  const [memberModal, setMemberModal] = useState(false)
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<TeamMember | null>(null)
  const [memberForm, setMemberForm] = useState({ name: '', role: 'DEV' as MemberRole, initials: '' })

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMember.mutateAsync(memberForm)
      showToast('Teamlid toegevoegd')
      setMemberModal(false)
      setMemberForm({ name: '', role: 'DEV', initials: '' })
    } catch { showToast('Toevoegen mislukt', 'error') }
  }

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Linker kolom: Teamleden + verlof */}
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Teamleden</h3>
          <div className="flex items-center gap-3">
            {sprints && (
              <select
                className="text-xs bg-surface-2 border border-border rounded px-2 py-1 text-gray-300"
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(Number(e.target.value))}
              >
                {sprints.map((s, i) => <option key={s.id} value={i}>{s.name}</option>)}
              </select>
            )}
            <button onClick={() => setMemberModal(true)} className="text-xs px-3 py-1.5 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors">+ Lid</button>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {ROLES.map((role) => {
            const roleMembers = members?.filter((m) => m.role === role && m.active) ?? []
            if (roleMembers.length === 0) return null
            return (
              <div key={role}>
                <div className="px-4 py-2 bg-surface-2 border-b border-border">
                  <Badge role={role} />
                </div>
                {roleMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-surface-2/30">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">{m.initials}</div>
                      <span className="text-sm text-white">{m.name}</span>
                    </div>
                    {sprint && (
                      <LeaveGrid
                        member={m}
                        sprintId={sprint.id}
                        sprintStart={sprint.start_date}
                        sprintEnd={sprint.end_date}
                      />
                    )}
                    <button onClick={() => setDeleteMemberTarget(m)} className="text-xs text-gray-500 hover:text-cap-red ml-3 transition-colors">✕</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Legenda verlof */}
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-cap-red" /> Verlof</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple" /> Opleiding</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-500" /> Ziekte</span>
        </div>
      </div>

      {/* Rechter kolom: Capaciteitsberekening */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Capaciteitsberekening</h3>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2.5 text-gray-400">Rol</th>
                <th className="text-right px-3 py-2.5 text-gray-400">Bruto</th>
                <th className="text-right px-3 py-2.5 text-gray-400">Verlof</th>
                <th className="text-right px-3 py-2.5 text-gray-400 font-semibold text-accent">Netto</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => {
                const cap = capacity?.find((c) => c.role === role)
                return (
                  <tr key={role} className="border-b border-border/50 last:border-b-0">
                    <td className="px-3 py-2.5"><Badge role={role} /></td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-300">{cap?.bruto ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-cap-red">{cap?.leave ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-accent font-semibold">{cap?.net ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">Netto = bruto − verlof − overhead − bug reserve</p>
      </div>

      {/* Modals */}
      {memberModal && (
        <Modal title="Teamlid toevoegen" onClose={() => setMemberModal(false)} size="sm">
          <form onSubmit={handleCreateMember} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Naam</label>
              <input className="input w-full" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Initialen</label>
              <input className="input w-full" maxLength={4} value={memberForm.initials} onChange={(e) => setMemberForm({ ...memberForm, initials: e.target.value.toUpperCase() })} required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rol</label>
              <select className="input w-full" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as MemberRole })}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setMemberModal(false)} className="px-3 py-1.5 text-sm border border-border rounded-lg text-gray-300 hover:bg-surface-2">Annuleren</button>
              <button type="submit" className="px-3 py-1.5 text-sm bg-accent hover:bg-accent-light text-white rounded-lg">Toevoegen</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteMemberTarget && (
        <ConfirmDialog
          title="Teamlid verwijderen"
          message={`Verwijder "${deleteMemberTarget.name}"?`}
          onConfirm={async () => { await deleteMember.mutateAsync(deleteMemberTarget.id); showToast('Teamlid verwijderd'); setDeleteMemberTarget(null) }}
          onCancel={() => setDeleteMemberTarget(null)}
          loading={deleteMember.isPending}
        />
      )}
    </div>
  )
}

export default function TeamsPage() {
  const { data: teams } = useTeams()
  const updateTeam = useUpdateTeam()
  const { showToast } = useToast()
  const [activeTeam, setActiveTeam] = useState('')
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const teamId = activeTeam || teams?.[0]?.id || ''

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingTabId(id)
    setEditingName(currentName)
  }

  const handleSaveName = async () => {
    if (!editingTabId || !editingName.trim()) {
      setEditingTabId(null)
      return
    }
    try {
      await updateTeam.mutateAsync({ id: editingTabId, name: editingName.trim() })
      showToast('Teamnaam bijgewerkt')
    } catch { showToast('Opslaan mislukt', 'error') }
    setEditingTabId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName()
    if (e.key === 'Escape') setEditingTabId(null)
  }

  return (
    <div>
      <PageHeader
        title="Teamconfiguratie"
        subtitle="Leden, verlof en capaciteitsberekening per team — dubbelklik op een tab om de naam te wijzigen"
      />
      {teams && (
        <div className="flex border-b border-border">
          {teams.map((team) => (
            <div key={team.id} className="relative">
              {editingTabId === team.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDown}
                  className="px-4 py-2.5 text-sm font-medium bg-transparent border-b-2 border-accent text-accent outline-none w-36"
                />
              ) : (
                <button
                  onClick={() => setActiveTeam(team.id)}
                  onDoubleClick={() => handleStartEdit(team.id, team.name)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    teamId === team.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-border'
                  }`}
                >
                  {team.name}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {teamId && <TeamContent teamId={teamId} />}
    </div>
  )
}
