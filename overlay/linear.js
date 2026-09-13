// Node-side Linear fetching for the overlay. Runs in Electron's main process,
// so it talks to the Linear GraphQL API directly with no CORS/CSP constraints.
const fs = require('fs')
const path = require('path')

const ENDPOINT = 'https://api.linear.app/graphql'
const OPEN_EXCLUDED = new Set(['completed', 'canceled', 'duplicate'])
const QA_STATE = 'In QA'
const IN_PROGRESS_STATE = 'In Progress'
const DAY_MS = 24 * 60 * 60 * 1000
const AGING_DAYS = 3

function loadApiKey() {
  if (process.env.LINEAR_API_KEY) return process.env.LINEAR_API_KEY.trim()
  const envPath = path.join(__dirname, '..', '.env.local')
  try {
    const txt = fs.readFileSync(envPath, 'utf8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*VITE_LINEAR_API_KEY\s*=\s*(.+?)\s*$/)
      if (m) return m[1].replace(/^["']|["']$/g, '').trim()
    }
  } catch { /* no .env.local */ }
  return ''
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Retry transient network hiccups (the "fetch failed" case); never retry auth errors.
async function gql(apiKey, query, variables, attempt = 0) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(25000)
    })
    if (res.status === 429 || res.status >= 500) throw Object.assign(new Error(`Linear API ${res.status}`), { transient: true })
    if (!res.ok) throw new Error(`Linear API ${res.status}`)
    const json = await res.json()
    if (json.errors && json.errors.length) throw new Error(json.errors[0].message)
    return json.data
  } catch (e) {
    const transient = e.transient || e.name === 'TimeoutError' || /fetch failed|ECONN|ETIMEDOUT|network|socket/i.test(e.message || '')
    if (transient && attempt < 2) { await sleep(600 * (attempt + 1)); return gql(apiKey, query, variables, attempt + 1) }
    throw e
  }
}

function toArr(v) { return v == null ? [] : Array.isArray(v) ? v : [v] }

// Turn the overlay filter into a server-side Linear IssueFilter (facets AND'd, values OR'd).
function buildFilterClauses(filter) {
  const clauses = []
  const teams = toArr(filter.teams).concat(toArr(filter.team))
  const prios = toArr(filter.priorities).concat(toArr(filter.priority))
  const labels = toArr(filter.labels).concat(toArr(filter.label))
  if (teams.length) clauses.push({ team: { key: { in: teams } } })
  if (prios.length) clauses.push({ priority: { in: prios } })
  if (labels.length) clauses.push({ labels: { name: { in: labels } } })
  return clauses
}

const COUNTS_QUERY = `
  query Counts($after: String, $filter: IssueFilter) {
    issues(first: 250, after: $after, filter: $filter) {
      nodes { priority completedAt state { name type } labels(first: 20) { nodes { name color } } }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const QA_HISTORY_QUERY = `
  query QaHistory($after: String, $filter: IssueFilter) {
    issues(first: 100, after: $after, filter: $filter) {
      nodes { createdAt history(first: 50) { nodes { createdAt toState { name } } } }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const UNIVERSE_QUERY = `
  query Universe($after: String) {
    issues(first: 250, after: $after) {
      nodes { state { type } team { key name } labels(first: 20) { nodes { name color } } }
      pageInfo { hasNextPage endCursor }
    }
  }
`

// Fast: server-side filtered counts for the active filter only.
async function fetchMetrics(filter = {}) {
  const apiKey = loadApiKey()
  if (!apiKey) throw new Error('No Linear key — set VITE_LINEAR_API_KEY in .env.local')

  const clauses = buildFilterClauses(filter)
  const baseFilter = clauses.length ? { and: clauses } : {}
  const weekAgo = Date.now() - 7 * DAY_MS

  let total = 0, open = 0, inProgress = 0, inQa = 0, inReview = 0, triage = 0, backlog = 0, urgent = 0, high = 0, doneWeek = 0
  const labelStats = new Map()
  let after, hasNext = true
  while (hasNext) {
    const d = await gql(apiKey, COUNTS_QUERY, { after, filter: baseFilter })
    for (const n of d.issues.nodes) {
      const type = n.state && n.state.type
      const name = n.state && n.state.name
      const isOpen = !OPEN_EXCLUDED.has(type)
      total += 1
      if (isOpen) open += 1
      if (name === IN_PROGRESS_STATE) inProgress += 1
      if (name === QA_STATE) inQa += 1
      if (name === 'In Review') inReview += 1
      if (type === 'triage') triage += 1
      if (type === 'backlog') backlog += 1
      if (isOpen && n.priority === 1) urgent += 1
      if (isOpen && n.priority === 2) high += 1
      if (n.completedAt && new Date(n.completedAt).getTime() >= weekAgo) doneWeek += 1
      for (const l of (n.labels && n.labels.nodes) || []) {
        const s = labelStats.get(l.name) || { open: 0, total: 0, color: l.color }
        s.total += 1; if (isOpen) s.open += 1; labelStats.set(l.name, s)
      }
    }
    hasNext = d.issues.pageInfo.hasNextPage
    after = d.issues.pageInfo.endCursor
  }

  // Aging: In QA + active filter, using history for QA-entry time.
  const qaFilter = { and: [{ state: { name: { eq: QA_STATE } } }, ...clauses] }
  let aging = 0
  after = undefined; hasNext = true
  const now = Date.now()
  while (hasNext) {
    const d = await gql(apiKey, QA_HISTORY_QUERY, { after, filter: qaFilter })
    for (const n of d.issues.nodes) {
      let enteredAt = null
      for (const h of (n.history && n.history.nodes) || []) {
        if (h.toState && h.toState.name === QA_STATE) { enteredAt = h.createdAt; break }
      }
      if (now - new Date(enteredAt || n.createdAt).getTime() >= AGING_DAYS * DAY_MS) aging += 1
    }
    hasNext = d.issues.pageInfo.hasNextPage
    after = d.issues.pageInfo.endCursor
  }

  const labels = Array.from(labelStats.entries())
    .map(([name, s]) => ({ name, open: s.open, total: s.total, color: s.color }))
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))

  return { total, open, inProgress, inQa, inReview, triage, backlog, urgent, urgentHigh: urgent + high, doneWeek, aging, labels, agingThresholdDays: AGING_DAYS, updatedAt: new Date().toISOString() }
}

// Slow but cached: the full label/team universe for the filter pickers.
async function fetchUniverse() {
  const apiKey = loadApiKey()
  if (!apiKey) throw new Error('No Linear key — set VITE_LINEAR_API_KEY in .env.local')
  const labelStats = new Map()
  const teamStats = new Map()
  let after, hasNext = true
  while (hasNext) {
    const d = await gql(apiKey, UNIVERSE_QUERY, { after })
    for (const n of d.issues.nodes) {
      const isOpen = !OPEN_EXCLUDED.has(n.state && n.state.type)
      const teamKey = n.team && n.team.key
      if (teamKey) {
        const t = teamStats.get(teamKey) || { name: (n.team && n.team.name) || teamKey, open: 0 }
        if (isOpen) t.open += 1; teamStats.set(teamKey, t)
      }
      for (const l of (n.labels && n.labels.nodes) || []) {
        const s = labelStats.get(l.name) || { open: 0, total: 0, color: l.color }
        s.total += 1; if (isOpen) s.open += 1; labelStats.set(l.name, s)
      }
    }
    hasNext = d.issues.pageInfo.hasNextPage
    after = d.issues.pageInfo.endCursor
  }
  const allLabels = Array.from(labelStats.entries())
    .map(([name, s]) => ({ name, open: s.open, total: s.total, color: s.color }))
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))
  const teams = Array.from(teamStats.entries())
    .map(([key, t]) => ({ key, name: t.name, open: t.open }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { allLabels, teams }
}

module.exports = { fetchMetrics, fetchUniverse }
