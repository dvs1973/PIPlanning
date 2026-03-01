// Gedeelde types tussen client en server

export type UserRole = 'ADMIN' | 'TEAM_LEAD' | 'VIEWER'
export type TeamType = 'JAVA_ANGULAR' | 'ORACLE_APEX'
export type MemberRole = 'DEV' | 'TEST' | 'ANALYST' | 'PO'
export type LeaveType = 'VERLOF' | 'OPLEIDING' | 'ZIEKTE'
export type Priority = 'A' | 'B' | 'C'
export type ProjectStatus = 'ACTIVE' | 'PLANNED' | 'DONE'
export type ChangeType = 'PRIORITY_CHANGE' | 'MEMBER_ABSENCE' | 'PROJECT_DELAY' | 'CAPACITY_SPLIT'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  team_id: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  type: TeamType
  dev_percentage: number
  test_percentage: number
  analysis_percentage: number
  po_percentage: number
  overhead_percentage: number
  bug_reserve_percentage: number
  sprint_days: number
  created_at: string
  updated_at: string
  members?: TeamMember[]
  _count?: { members: number }
}

export interface TeamMember {
  id: string
  team_id: string
  name: string
  role: MemberRole
  initials: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Sprint {
  id: string
  name: string
  number: number
  start_date: string
  end_date: string
  created_at: string
}

export interface LeaveEntry {
  id: string
  member_id: string
  sprint_id: string
  date: string
  type: LeaveType
  created_at: string
  member?: TeamMember
  sprint?: Sprint
}

export interface Project {
  id: string
  pid: string
  name: string
  priority: Priority
  status: ProjectStatus
  total_mandays: number
  it_mandays: number
  business_mandays: number
  assigned_team_id: string | null
  capacity_split: number
  start_sprint_id: string | null
  created_at: string
  updated_at: string
  assigned_team?: Team
  start_sprint?: Sprint
  role_distribution?: RoleDistribution
  estimated_sprints?: number
}

export interface RoleDistribution {
  dev_mandays: number
  test_mandays: number
  analysis_mandays: number
  po_mandays: number
}

export interface ProjectAssignment {
  id: string
  project_id: string
  sprint_id: string
  split: number
  created_at: string
}

export interface Scenario {
  id: string
  name: string
  created_by: string
  created_at: string
  changes?: ScenarioChange[]
}

export interface ScenarioChange {
  id: string
  scenario_id: string
  change_type: ChangeType
  project_id: string | null
  member_id: string | null
  parameters: Record<string, unknown>
}

// API response types
export interface AuthResponse {
  token: string
  user: User
}

export interface CapacityPerRole {
  role: MemberRole
  sprint_id: string
  sprint?: Sprint
  member_count?: number
  count?: number
  bruto_days?: number
  leave_days?: number
  net_days?: number
  // computed fields returned from API
  bruto: number
  leave: number
  net: number
}

export interface CapacityOverviewItem {
  team: Team
  sprints: Array<{
    sprint: Sprint
    percentage: number
    roles: CapacityPerRole[]
  }>
}

export interface SprintPlanningData {
  team: Team
  sprints: Sprint[]
  capacity: CapacityPerRole[]
  projects: Project[]
  bottlenecks: Bottleneck[]
}

export interface Bottleneck {
  role: MemberRole
  sprint_id: string
  planned_days: number
  net_capacity: number
  overage: number
}

export interface RoadmapData {
  teams: Array<{
    team: Team
    projects: Array<{
      project: Project
      start_sprint: Sprint
      end_sprint: Sprint
      estimated_sprints: number
      bottleneck_role: MemberRole
    }>
  }>
  sprints: Sprint[]
}

export interface AvailabilityItem {
  team: Team
  earliest_sprint: Sprint
  free_percentage: number
}

export interface SimulationResult {
  scenario: Scenario
  impact: Array<{
    project: Project
    current_end_sprint: Sprint
    scenario_end_sprint: Sprint
    delta_sprints: number
  }>
  summary: {
    avg_impact_prio_a: number
    avg_impact_prio_b: number
  }
}

export interface ApiError {
  error: string
  details?: unknown
}
