export type StateType = 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled' | 'duplicate'
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

export interface LinearComment {
  id: string
  body: string
  createdAt: string
  user?: { name: string; email?: string } | null
}

export interface LinearHistoryEntry {
  id: string
  createdAt: string
  fromState?: LinearState
  toState?: LinearState
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
  comments?: LinearComment[]
  commentCount?: number
  hasMoreComments?: boolean
}

export interface TicketFilters {
  stateTypes: StateType[]
  stateNames: string[]
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

export type QaPeriod = 'day' | 'week' | 'month'

// A ticket currently sitting in the QA state, enriched from its history.
export interface QaQueueItem {
  id: string
  identifier: string
  title: string
  url: string
  priority: Priority
  priorityLabel: string
  teamKey: string
  teamName: string
  assigneeName: string | null
  stateName: string
  createdAt: string
  updatedAt: string
  qaEnteredAt: string // ISO — when it last entered QA (falls back to createdAt)
  qaEnteredApprox: boolean // true when no explicit QA-entry transition was found
  qaAgeMs: number // now - qaEnteredAt
  qaBounceCount: number // how many times it has been sent to QA (>1 = bounced back before)
  enteredFromState: string | null
  updatedInLast24h: boolean
  enteredQaInLast24h: boolean
}

// A single QA transition (in or out) that happened within the reporting period.
export interface QaExitItem {
  id: string
  identifier: string
  title: string
  url: string
  teamKey: string
  assigneeName: string | null
  at: string
  toState: string
  passed: boolean // true = moved forward, false = bounced back
}

export interface QaActivity {
  entered: number
  exited: number
  passed: number
  bounced: number
  exitedItems: QaExitItem[]
  perDay: { date: string; entered: number; passed: number; bounced: number }[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AppSettings {
  linearApiKey: string
  anthropicApiKey: string
}
