import { LinearHistoryEntry } from '../types'

/**
 * Rework analysis for a single ticket, derived from its state history.
 *
 * A "QA round" is one entry into a QA state. A "bounce" is a ticket leaving QA
 * for active development work and later returning — the signal that QA rejected
 * it. Rounds therefore equal bounces + 1 for any ticket that reached QA.
 */
export interface QARoundSummary {
  /** Times the ticket entered a QA state. */
  rounds: number
  /** Times it left QA for dev work and came back. */
  bounces: number
  /** True when the ticket is in a QA state as of the latest transition. */
  currentlyInQA: boolean
  /** Ordered transitions between QA and dev, for display. */
  path: string[]
  /**
   * Milliseconds spent in QA states, summed across every round that has ended.
   * Undefined when the ticket has never left QA.
   */
  totalDwellMs?: number
  /**
   * Milliseconds in the current QA state, for tickets sitting in QA right now.
   * This is the "still waiting" figure and grows until the ticket moves.
   */
  currentWaitMs?: number
  /** When the ticket last entered a QA state. */
  lastEnteredQAAt?: string
}

export const EMPTY_QA_SUMMARY: QARoundSummary = {
  rounds: 0,
  bounces: 0,
  currentlyInQA: false,
  path: []
}

/** Matches "QA", "In QA", "QA Review" — but not "Quality" or "Squad". */
export const isQAState = (name: string | undefined): boolean => /\bqa\b/i.test(name ?? '')

/**
 * States that represent work going back to a developer. Deliberately excludes
 * terminal states: a ticket moving QA -> Done -> QA is a reopen, not a
 * rejection, and shouldn't inflate the rework count.
 */
const DEV_STATE_TYPES = new Set(['started', 'unstarted', 'backlog', 'triage'])

export const isDevState = (
  name: string | undefined,
  type: string | undefined
): boolean => {
  if (isQAState(name)) return false
  return DEV_STATE_TYPES.has(type ?? '')
}

/**
 * Walks a ticket's history oldest-first and counts QA entries and bounces.
 *
 * Only transitions that actually change state are considered; Linear records
 * history entries for assignee, priority and label changes too, and those carry
 * no fromState/toState.
 */
export const analyseQARounds = (entries: LinearHistoryEntry[]): QARoundSummary => {
  const stateChanges = entries.filter((e) => e.toState?.name)

  let rounds = 0
  let bounces = 0
  let inQA = false
  let hasBeenInQA = false
  // Tracked separately from `inQA`: leaving QA for a terminal state (Done)
  // stops the clock, but a later return is a reopen rather than a rejection,
  // so only a departure to dev work arms the bounce counter.
  let leftQAForDev = false
  const path: string[] = []

  let enteredAt: number | undefined
  let lastEnteredQAAt: string | undefined
  let completedDwellMs = 0
  let hasCompletedRound = false

  for (const entry of stateChanges) {
    const toName = entry.toState?.name
    const toType = entry.toState?.type
    const at = entry.createdAt ? Date.parse(entry.createdAt) : NaN

    if (isQAState(toName)) {
      // Re-entering QA after dev work is a bounce; the first entry is not, and
      // neither is a reopen from a terminal state.
      if (!inQA) {
        rounds += 1
        if (hasBeenInQA && leftQAForDev) bounces += 1
        hasBeenInQA = true
        inQA = true
        leftQAForDev = false
        path.push(toName as string)
        if (!Number.isNaN(at)) {
          enteredAt = at
          lastEnteredQAAt = entry.createdAt
        }
      }
      continue
    }

    // Any move out of QA stops the clock — leaving for Done ends the wait just
    // as much as leaving for dev — but only a dev destination counts as a
    // rejection for bounce purposes.
    if (inQA) {
      inQA = false
      if (enteredAt !== undefined && !Number.isNaN(at) && at >= enteredAt) {
        completedDwellMs += at - enteredAt
        hasCompletedRound = true
      }
      enteredAt = undefined
      if (isDevState(toName, toType)) {
        leftQAForDev = true
        path.push(toName as string)
      }
    }
  }

  const currentWaitMs =
    inQA && enteredAt !== undefined ? Math.max(0, Date.now() - enteredAt) : undefined

  return {
    rounds,
    bounces,
    currentlyInQA: inQA,
    path,
    totalDwellMs: hasCompletedRound ? completedDwellMs : undefined,
    currentWaitMs,
    lastEnteredQAAt
  }
}

/** Compact duration, e.g. "3d 4h", "5h", "12m". */
export const formatDuration = (ms: number | undefined): string => {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return '—'
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    const m = mins % 60
    return m > 0 ? `${hours}h ${m}m` : `${hours}h`
  }
  const days = Math.floor(hours / 24)
  const h = hours % 24
  return h > 0 ? `${days}d ${h}h` : `${days}d`
}

/** Short label for the rework column, e.g. "3rd QA pass" or "passed first time". */
export const describeQARounds = (s: QARoundSummary): string => {
  if (s.rounds === 0) return 'never in QA'
  if (s.bounces === 0) return 'first pass'
  return `${s.bounces} bounce${s.bounces === 1 ? '' : 's'}`
}
