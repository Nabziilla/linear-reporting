import { Priority, StateType } from '../types'

export const PRIORITY_LABELS: Record<Priority, string> = {
  0: 'No Priority',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low'
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  0: '#9e9e9e',
  1: '#e11d48',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e'
}

export const STATE_TYPE_LABELS: Record<StateType, string> = {
  backlog: 'Backlog',
  unstarted: 'Todo',
  started: 'In Progress',
  review: 'In Review',
  qa: 'In QA',
  completed: 'Done',
  cancelled: 'Cancelled'
}

export const STATE_TYPE_COLORS: Record<StateType, string> = {
  backlog: '#94a3b8',
  unstarted: '#3b82f6',
  started: '#f97316',
  review: '#8b5cf6',
  qa: '#ec4899',
  completed: '#22c55e',
  cancelled: '#ef4444'
}

export const ALL_STATE_TYPES: StateType[] = ['backlog', 'unstarted', 'started', 'review', 'qa', 'completed', 'cancelled']
export const ALL_PRIORITIES: Priority[] = [0, 1, 2, 3, 4]

export const STORAGE_KEYS = {
  LINEAR_API_KEY: 'linear_api_key',
  ANTHROPIC_API_KEY: 'anthropic_api_key'
} as const

export const LINEAR_GRAPHQL_ENDPOINT = 'https://api.linear.app/graphql'
export const ISSUES_PER_PAGE = 100

export const NAV_ROUTES = {
  DASHBOARD: '/',
  TICKETS: '/tickets',
  REPORTS: '/reports',
  SETTINGS: '/settings'
} as const
