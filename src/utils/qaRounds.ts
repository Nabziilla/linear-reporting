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
  const path: string[] = []

  for (const entry of stateChanges) {
    const toName = entry.toState?.name
    const toType = entry.toState?.type

    if (isQAState(toName)) {
      // Re-entering QA after dev work is a bounce; the first entry is not.
      if (!inQA) {
        rounds += 1
        if (hasBeenInQA) bounces += 1
        hasBeenInQA = true
        inQA = true
        path.push(toName as string)
      }
      continue
    }

    if (inQA && isDevState(toName, toType)) {
      inQA = false
      path.push(toName as string)
    }
  }

  return { rounds, bounces, currentlyInQA: inQA, path }
}

/** Short label for the rework column, e.g. "3rd QA pass" or "passed first time". */
export const describeQARounds = (s: QARoundSummary): string => {
  if (s.rounds === 0) return 'never in QA'
  if (s.bounces === 0) return 'first pass'
  return `${s.bounces} bounce${s.bounces === 1 ? '' : 's'}`
}
