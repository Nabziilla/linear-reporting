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
  triage: 'Triage',
  backlog: 'Backlog',
  unstarted: 'Todo',
  started: 'In Progress',
  completed: 'Done',
  canceled: 'Cancelled',
  duplicate: 'Duplicate'
}

export const STATE_TYPE_COLORS: Record<StateType, string> = {
  triage: '#eab308',
  backlog: '#94a3b8',
  unstarted: '#3b82f6',
  started: '#f97316',
  completed: '#22c55e',
  canceled: '#ef4444',
  duplicate: '#a855f7'
}

export const ALL_STATE_TYPES: StateType[] = ['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled', 'duplicate']
export const ALL_PRIORITIES: Priority[] = [0, 1, 2, 3, 4]

// QA team, matched on the first word of a Linear user's display name
// (case-insensitive). Add or remove names here as the team changes.
export const QA_TEAM_FIRST_NAMES = [
  'himanshu',
  'anjali',
  'deepak',
  'akash',
  'onkar',
  'atul',
  'rajan',
  'mah'
] as const

const QA_FIRST_NAME_SET = new Set<string>(QA_TEAM_FIRST_NAMES)

// Linear identifies people inconsistently across sources: the GraphQL API
// returns a display name ("Himanshu Vashishtha"), while CSV exports carry the
// email ("himanshu.vashishtha@hapana.com"). Normalise both to a first name.
export const firstName = (value: string | undefined): string => {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const local = raw.includes('@') ? raw.split('@')[0] : raw
  // Emails split on dot/underscore, display names on whitespace.
  return local.split(/[\s._-]+/)[0]?.toLowerCase() ?? ''
}

// Checks name and email, so a match succeeds whichever field Linear populated.
export const isQATeamMember = (user: { name?: string; email?: string } | undefined): boolean => {
  if (!user) return false
  return QA_FIRST_NAME_SET.has(firstName(user.name)) || QA_FIRST_NAME_SET.has(firstName(user.email))
}

// The key a user groups under, preferring whichever field matched.
export const qaMemberKey = (user: { name?: string; email?: string } | undefined): string => {
  if (!user) return ''
  const byName = firstName(user.name)
  if (QA_FIRST_NAME_SET.has(byName)) return byName
  const byEmail = firstName(user.email)
  if (QA_FIRST_NAME_SET.has(byEmail)) return byEmail
  return ''
}

export const STORAGE_KEYS = {
  LINEAR_API_KEY: 'linear_api_key',
  ANTHROPIC_API_KEY: 'anthropic_api_key'
} as const

export const LINEAR_GRAPHQL_ENDPOINT = 'https://api.linear.app/graphql'
export const ISSUES_PER_PAGE = 250

export const NAV_ROUTES = {
  DASHBOARD: '/',
  TICKETS: '/tickets',
  REPORTS: '/reports',
  QA_REPORT: '/qa',
  SETTINGS: '/settings'
} as const

// --- QA reporting ---
// In this workspace, "QA" is a single workflow state named "In QA" (type: started),
// present on every team except the Internal Platform team. There is no separate QA
// team or label, so QA scope = issues whose current state is one of these names.
export const QA_STATE_NAMES = ['In QA'] as const

// A ticket that leaves "In QA" has either moved FORWARD (QA passed) or BOUNCED BACK
// (QA found problems). Classify the destination state name.
export const QA_FORWARD_EXIT_PATTERN = /ready for prod|ready for release|done|deployed|shipped|complete|release/i

// Age thresholds (in days) for how long a ticket has been sitting in QA.
export const QA_AGE_BUCKETS = [
  { key: 'lt1', label: '< 1 day', maxDays: 1, color: '#22c55e' },
  { key: 'd1to2', label: '1–2 days', maxDays: 3, color: '#eab308' },
  { key: 'd3to5', label: '3–5 days', maxDays: 6, color: '#f97316' },
  { key: 'gt5', label: '5+ days', maxDays: Infinity, color: '#ef4444' }
] as const

// A ticket in QA longer than this (days) is flagged as "aging" / a bottleneck.
export const QA_AGING_THRESHOLD_DAYS = 3

// The QA team roster (Linear assignee display names). Used for the "My QA Team"
// filter and per-person breakdowns in Reports.
export const QA_TEAM_MEMBERS = [
  'Anjali Rajput',
  'Himanshu Vashishtha',
  'Akash Sharma',
  'Deepak Aswal',
  'Atul Roy',
  'Onkar Pathak',
  'Rajan Kanwat'
] as const
