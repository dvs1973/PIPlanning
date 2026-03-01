import { useState } from 'react'
import { useTeams, useTeam, useUpdateTeam } from '../hooks/useTeams'
import { useMembers, useCreateMember, useDeleteMember, useLeave, useCreateLeave, useDeleteLeave } from '../hooks/useMembers'
import { useCapacityByTeam } from '../hooks/useCapacity'
import { useSprints } from '../hooks/useSprints'
import PageHeader from '../components/Layout/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'
import { MemberRole, LeaveType, TeamMember } from '../../../shared/types'
import { format, eachDayOfInterval, isWeekend, getDay } from 'date-fns'

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

  const DAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

  return (
    <div className="flex gap-0.5">
      {workDays.map((day, idx) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const entry = leave?.find((l) => l.date.startsWith(dateStr))
        const color = entry ? LEAVE_COLORS[entry.type] : 'bg-surface-3 hover:bg-surface-2'
        // Add visual gap between week 1 and week 2 (after every 5 workdays)
        const weekGap = idx > 0 && idx % 5 === 0 ? 'ml-2' : ''
        return (
          <div key={day.getTime()} className={`relative ${weekGap}`}>
            <button
              onClick={() => handleClick(day)}
              title={format(day, 'dd-MM')}
              className={`w-6 h-6 rounded-sm transition-colors flex items-center justify-center text-[9px] font-medium ${color} ${entry ? 'text-white' : 'text-gray-500'}`}
            >
              {DAY_LABELS[getDay(day)]}
            </button>
            {popover === day.getTime() && (
              <div className="absolute z-20 top-7 left-0 bg-surface-2 border border-border rounded-lg p-2 space-y-1 shadow-xl">
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
  const { data: team } = useTeam(teamId)
  const { data: members } = useMembers(teamId)
  const { data: sprints } = useSprints()
  const [selectedSprint, setSelectedSprint] = useState(0)
  const sprint = sprints?.[selectedSprint]
  const { data: capacity } = useCapacityByTeam(teamId, sprint ? [sprint.id] : [])
  const updateTeam = useUpdateTeam()

  const createMember = useCreateMember(teamId)
  const deleteMember = useDeleteMember(teamId)
  const { showToast } = useToast()

  const [memberModal, setMemberModal] = useState(false)
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<TeamMember | null>(null)
  const [memberForm, setMemberForm] = useState({ name: '', role: 'DEV' as MemberRole, initials: '' })

  // Inline editing state for scrum_events_days and bug_reserve_percentage
  const [editingField, setEditingField] = useState<'scrum_events' | 'bug_reserve' | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const handleStartInlineEdit = (field: 'scrum_events' | 'bug_reserve') => {
    setEditingField(field)
    setEditingValue(
      field === 'scrum_events'
        ? String(team?.scrum_events_days ?? 1.5)
        : String(team?.bug_reserve_percentage ?? 20)
    )
  }

  const handleSaveInlineEdit = async () => {
    if (!editingField) return
    const val = parseFloat(editingValue)
    if (isNaN(val) || val < 0) { setEditingField(null); return }
    try {
      const data = editingField === 'scrum_events'
        ? { scrum_events_days: val }
        : { bug_reserve_percentage: val }
      await updateTeam.mutateAsync({ id: teamId, ...data })
      showToast(editingField === 'scrum_events' ? 'Scrum events bijgewerkt' : 'Bug reserve bijgewerkt')
    } catch { showToast('Opslaan mislukt', 'error') }
    setEditingField(null)
  }

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveInlineEdit()
    if (e.key === 'Escape') setEditingField(null)
  }

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMember.mutateAsync(memberForm)
      showToast('Teamlid toegevoegd')
      setMemberModal(false)
      setMemberForm({ name: '', role: 'DEV', initials: '' })
    } catch { showToast('Toevoegen mislukt', 'error') }
  }

  // Compute totals for the capacity table
  const totals = capacity?.reduce(
    (acc, c) => ({
      count: acc.count + (c.count ?? 0),
      bruto: acc.bruto + c.bruto,
      verlof: acc.verlof + (c.verlof ?? 0),
      opleiding: acc.opleiding + (c.opleiding ?? 0),
      ziekte: acc.ziekte + (c.ziekte ?? 0),
      scrum_events: Math.round((acc.scrum_events + (c.scrum_events ?? 0)) * 10) / 10,
      overhead: Math.round((acc.overhead + (c.overhead ?? 0)) * 10) / 10,
      bug_reserve: Math.round((acc.bug_reserve + (c.bug_reserve ?? 0)) * 10) / 10,
      net: Math.round((acc.net + c.net) * 10) / 10,
    }),
    { count: 0, bruto: 0, verlof: 0, opleiding: 0, ziekte: 0, scrum_events: 0, overhead: 0, bug_reserve: 0, net: 0 }
  )

  return (
    <div className="mt-4 space-y-6">
      {/* Teamleden + verlof */}
      <div>
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
                  <div key={m.id} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-surface-2/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium shrink-0">{m.initials}</div>
                      <span className="text-sm text-white truncate">{m.name}</span>
                    </div>
                    <div className="flex justify-end">
                      {sprint && (
                        <LeaveGrid
                          member={m}
                          sprintId={sprint.id}
                          sprintStart={sprint.start_date}
                          sprintEnd={sprint.end_date}
                        />
                      )}
                    </div>
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

      {/* Capaciteitsberekening — full-width onder teamleden */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Capaciteitsberekening</h3>
        <div className="bg-surface border border-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-center px-3 py-2.5 text-gray-400">Rol</th>
                <th className="text-center px-3 py-2.5 text-gray-400">Leden</th>
                <th className="text-center px-3 py-2.5 text-gray-400">Bruto</th>
                <th className="text-center px-3 py-2.5 text-cap-red">Verlof</th>
                <th className="text-center px-3 py-2.5 text-purple">Opleiding</th>
                <th className="text-center px-3 py-2.5 text-gray-400">Ziekte</th>
                <th className="text-center px-3 py-2.5 text-gray-400">
                  Scrum Events
                  <span className="block text-[10px] text-gray-500 font-normal cursor-pointer hover:text-accent" onClick={() => handleStartInlineEdit('scrum_events')}>
                    ({team?.scrum_events_days ?? 1.5}d/pers)
                  </span>
                </th>
                <th className="text-center px-3 py-2.5 text-gray-400">
                  Overhead
                  <span className="block text-[10px] text-gray-500 font-normal">({team?.overhead_percentage ?? 15}%)</span>
                </th>
                <th className="text-center px-3 py-2.5 text-gray-400">
                  Bug Reserve
                  <span className="block text-[10px] text-gray-500 font-normal cursor-pointer hover:text-accent" onClick={() => handleStartInlineEdit('bug_reserve')}>
                    ({team?.bug_reserve_percentage ?? 20}%)
                  </span>
                </th>
                <th className="text-center px-3 py-2.5 text-accent font-semibold">Netto</th>
              </tr>
            </thead>
            <tbody>
              {/* Inline edit row */}
              {editingField && (
                <tr className="border-b border-accent/30 bg-accent/5">
                  <td colSpan={10} className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-gray-300 text-xs">
                        {editingField === 'scrum_events' ? 'Scrum events (dagen/persoon):' : 'Bug reserve (%):'}
                      </span>
                      <input
                        autoFocus
                        type="number"
                        step="0.5"
                        min="0"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={handleSaveInlineEdit}
                        onKeyDown={handleInlineKeyDown}
                        className="w-20 px-2 py-1 text-xs bg-surface-2 border border-border rounded text-white text-center font-mono"
                      />
                      <button onClick={handleSaveInlineEdit} className="text-xs px-2 py-1 bg-accent hover:bg-accent-light text-white rounded">Opslaan</button>
                      <button onClick={() => setEditingField(null)} className="text-xs px-2 py-1 text-gray-400 hover:text-white">Annuleren</button>
                    </div>
                  </td>
                </tr>
              )}
              {ROLES.map((role) => {
                const cap = capacity?.find((c) => c.role === role)
                if (!cap) return null
                return (
                  <tr key={role} className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-center"><Badge role={role} /></td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{cap.count ?? '—'}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{cap.bruto}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-cap-red">{cap.verlof ?? 0}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-purple">{cap.opleiding ?? 0}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{cap.ziekte ?? 0}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{cap.scrum_events ?? 0}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{cap.overhead ?? 0}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{cap.bug_reserve ?? 0}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-accent font-semibold">{cap.net}</td>
                  </tr>
                )
              })}
              {totals && (
                <tr className="border-t-2 border-border bg-surface-2/50 font-semibold">
                  <td className="px-3 py-2.5 text-center text-gray-300">Totaal</td>
                  <td className="px-3 py-2.5 text-center font-mono text-gray-300">{totals.count}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-gray-300">{totals.bruto}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-cap-red">{totals.verlof}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-purple">{totals.opleiding}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-gray-300">{totals.ziekte}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-gray-300">{totals.scrum_events}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-gray-300">{totals.overhead}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-gray-300">{totals.bug_reserve}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-accent font-semibold">{totals.net}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">Netto = bruto − verlof − opleiding − ziekte − scrum events − overhead − bug reserve</p>
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
