import { executeQuery } from './linearService'
import { QA_STATE_NAMES, QA_FORWARD_EXIT_PATTERN } from '../constants'
import { QaQueueItem, QaActivity, QaExitItem, Priority } from '../types'

const QA_NAME_SET = new Set(QA_STATE_NAMES.map((n) => n.toLowerCase()))
const isQaName = (name?: string | null) => !!name && QA_NAME_SET.has(name.toLowerCase())
const isForwardExit = (name?: string | null) => !!name && QA_FORWARD_EXIT_PATTERN.test(name)

const DAY_MS = 24 * 60 * 60 * 1000

interface HistoryNode {
  createdAt: string
  fromState?: { name: string } | null
  toState?: { name: string } | null
}

const QA_QUEUE_QUERY = `
  query QaQueue($after: String, $names: [String!]) {
    issues(first: 100, after: $after, filter: { state: { name: { in: $names } } }) {
      nodes {
        id identifier title url priority priorityLabel
        state { name }
        team { key name }
        assignee { name }
        createdAt updatedAt
        history(first: 50) {
          nodes { createdAt fromState { name } toState { name } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const QA_ACTIVITY_QUERY = `
  query QaActivity($after: String, $since: DateTimeOrDuration!) {
    issues(first: 100, after: $after, filter: { updatedAt: { gt: $since } }) {
      nodes {
        id identifier title url
        team { key }
        assignee { name }
        history(first: 60) {
          nodes { createdAt fromState { name } toState { name } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

/**
 * Fetch every ticket currently sitting in a QA state, enriched from its history so
 * we know exactly when it entered QA (its age) and how many times it has bounced.
 */
export const fetchQaQueue = async (apiKey: string): Promise<QaQueueItem[]> => {
  const items: QaQueueItem[] = []
  const now = Date.now()
  let after: string | undefined
  let hasNext = true

  while (hasNext) {
    const data = await executeQuery(apiKey, QA_QUEUE_QUERY, {
      after,
      names: QA_STATE_NAMES as unknown as string[]
    })
    const conn = data.issues
    for (const node of conn.nodes) {
      const history: HistoryNode[] = node.history?.nodes ?? []
      // History comes back newest-first, so the first QA entry we hit is the current stint.
      let qaEnteredAt: string | null = null
      let enteredFromState: string | null = null
      let bounceCount = 0
      for (const h of history) {
        if (isQaName(h.toState?.name)) {
          bounceCount += 1
          if (!qaEnteredAt) {
            qaEnteredAt = h.createdAt
            enteredFromState = h.fromState?.name ?? null
          }
        }
      }

      const approx = !qaEnteredAt
      const enteredAt = qaEnteredAt ?? node.createdAt
      const enteredMs = new Date(enteredAt).getTime()

      items.push({
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        url: node.url,
        priority: (node.priority ?? 0) as Priority,
        priorityLabel: node.priorityLabel ?? 'No Priority',
        teamKey: node.team?.key ?? '—',
        teamName: node.team?.name ?? 'Unknown',
        assigneeName: node.assignee?.name ?? null,
        stateName: node.state?.name ?? 'In QA',
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        qaEnteredAt: enteredAt,
        qaEnteredApprox: approx,
        qaAgeMs: Math.max(0, now - enteredMs),
        qaBounceCount: bounceCount,
        enteredFromState,
        updatedInLast24h: now - new Date(node.updatedAt).getTime() <= DAY_MS,
        enteredQaInLast24h: now - enteredMs <= DAY_MS
      })
    }
    hasNext = conn.pageInfo.hasNextPage
    after = conn.pageInfo.endCursor
  }

  return items.sort((a, b) => b.qaAgeMs - a.qaAgeMs)
}

/**
 * Scan history of every issue touched since `sinceISO` for QA transitions, producing
 * period throughput: how many entered QA, how many left, and pass vs bounce.
 */
export const fetchQaActivity = async (apiKey: string, sinceISO: string): Promise<QaActivity> => {
  const sinceMs = new Date(sinceISO).getTime()
  const exitedItems: QaExitItem[] = []
  const perDayMap = new Map<string, { entered: number; passed: number; bounced: number }>()
  let entered = 0
  let after: string | undefined
  let hasNext = true

  const dayKey = (iso: string) => iso.slice(0, 10)
  const bump = (iso: string, field: 'entered' | 'passed' | 'bounced') => {
    const k = dayKey(iso)
    const row = perDayMap.get(k) ?? { entered: 0, passed: 0, bounced: 0 }
    row[field] += 1
    perDayMap.set(k, row)
  }

  while (hasNext) {
    const data = await executeQuery(apiKey, QA_ACTIVITY_QUERY, { after, since: sinceISO })
    const conn = data.issues
    for (const node of conn.nodes) {
      const history: HistoryNode[] = node.history?.nodes ?? []
      for (const h of history) {
        const at = new Date(h.createdAt).getTime()
        if (at < sinceMs) continue
        const to = h.toState?.name
        const from = h.fromState?.name
        if (isQaName(to)) {
          entered += 1
          bump(h.createdAt, 'entered')
        }
        if (isQaName(from) && !isQaName(to)) {
          const passed = isForwardExit(to)
          exitedItems.push({
            id: node.id,
            identifier: node.identifier,
            title: node.title,
            url: node.url,
            teamKey: node.team?.key ?? '—',
            assigneeName: node.assignee?.name ?? null,
            at: h.createdAt,
            toState: to ?? 'Unknown',
            passed
          })
          bump(h.createdAt, passed ? 'passed' : 'bounced')
        }
      }
    }
    hasNext = conn.pageInfo.hasNextPage
    after = conn.pageInfo.endCursor
  }

  const passed = exitedItems.filter((e) => e.passed).length
  const bounced = exitedItems.length - passed
  const perDay = Array.from(perDayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }))

  exitedItems.sort((a, b) => (a.at < b.at ? 1 : -1))

  return { entered, exited: exitedItems.length, passed, bounced, exitedItems, perDay }
}
