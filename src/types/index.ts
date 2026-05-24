export type StateType = 'backlog' | 'unstarted' | 'started' | 'review' | 'qa' | 'completed' | 'cancelled'
export type Priority = 0 | 1 | 2 | 3 | 4

export interface LinearState {
  id: string
  name: string
  type: StateType
  color: string
}

export interface LinearUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface LinearTeam {
  id: string
  name: string
  key: string
  states?: LinearState[]
}

export interface LinearLabel {
  name: string
  color: string
}

export interface LinearProject {
  id: string
  name: string
}

export interface LinearIssue {
  id: string
  identifier: string
  title: string
  description?: string
  priority: Priority
  priorityLabel: string
  state: LinearState
  assignee?: LinearUser
  creator?: LinearUser
  team: LinearTeam
  createdAt: string
  updatedAt: string
  completedAt?: string
  dueDate?: string
  estimate?: number
  labels: LinearLabel[]
  project?: LinearProject
  url: string
  timeInStatus?: number | string
}

export interface TicketFilters {
  stateTypes: StateType[]
  priorities: Priority[]
  teamIds: string[]
  assigneeIds: string[]
  creatorIds: string[]
  labelNames: string[]
  createdAfter?: string
  createdBefore?: string
  updatedAfter?: string
  updatedBefore?: string
  minTimeInStatus?: number
  maxTimeInStatus?: number
  searchQuery: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AppSettings {
  linearApiKey: string
  anthropicApiKey: string
}
