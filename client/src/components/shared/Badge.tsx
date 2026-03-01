interface BadgeProps {
  priority?: 'A' | 'B' | 'C'
  status?: 'ACTIVE' | 'PLANNED' | 'DONE'
  role?: 'DEV' | 'TEST' | 'ANALYST' | 'PO'
  teamType?: 'JAVA_ANGULAR' | 'ORACLE_APEX'
  children?: React.ReactNode
  className?: string
}

const PRIORITY_STYLES = { A: 'bg-cap-red/20 text-cap-red', B: 'bg-cap-orange/20 text-cap-orange', C: 'bg-accent/20 text-accent' }
const STATUS_STYLES = { ACTIVE: 'bg-cap-green/20 text-cap-green', PLANNED: 'bg-purple/20 text-purple', DONE: 'bg-border text-gray-400' }
const ROLE_LABELS = { DEV: 'Dev', TEST: 'Test', ANALYST: 'Analyse', PO: 'PO' }
const TEAM_TYPE_STYLES = { JAVA_ANGULAR: 'bg-accent/20 text-accent', ORACLE_APEX: 'bg-purple/20 text-purple' }
const TEAM_TYPE_LABELS = { JAVA_ANGULAR: 'Java/Angular', ORACLE_APEX: 'APEX' }

export default function Badge({ priority, status, role, teamType, children, className = '' }: BadgeProps) {
  let style = ''
  let label: React.ReactNode = children

  if (priority) { style = PRIORITY_STYLES[priority]; label = `Prio ${priority}` }
  else if (status) { style = STATUS_STYLES[status]; label = status === 'ACTIVE' ? 'Actief' : status === 'PLANNED' ? 'Gepland' : 'Klaar' }
  else if (role) { style = 'bg-surface-3 text-gray-300'; label = ROLE_LABELS[role] }
  else if (teamType) { style = TEAM_TYPE_STYLES[teamType]; label = TEAM_TYPE_LABELS[teamType] }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style} ${className}`}>
      {label}
    </span>
  )
}
