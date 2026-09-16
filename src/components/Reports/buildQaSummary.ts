import { QaActivity, QaPeriod } from '../../types'
import { QA_AGING_THRESHOLD_DAYS } from '../../constants'

const DAY_MS = 24 * 60 * 60 * 1000

const PERIOD_WORD: Record<QaPeriod, string> = {
  day: 'End of Day',
  week: 'End of Week',
  month: 'End of Month'
}

const PERIOD_WINDOW: Record<QaPeriod, string> = {
  day: 'today',
  week: 'this week',
  month: 'this month'
}

interface Metrics {
  total: number
  avgAgeDays: number
  medianAgeDays: number
  maxAgeDays: number
  agingCount: number
  oldest: { identifier: string; qaAgeMs: number; title: string } | null
  byTeam: { name: string; count: number; aging: number }[]
  byAssignee: { name: string; count: number; aging: number }[]
}

interface Args {
  period: QaPeriod
  metrics: Metrics
  activity?: QaActivity
  generatedAt: string
}

/**
 * Plain-text QA status brief a QA lead can paste straight into an email or Slack to SLT.
 */
export const buildQaSummary = ({ period, metrics, activity, generatedAt }: Args): string => {
  const lines: string[] = []
  const window = PERIOD_WINDOW[period]
  const bounceRate = activity && activity.exited > 0 ? Math.round((activity.bounced / activity.exited) * 100) : 0

  lines.push(`QA STATUS — ${PERIOD_WORD[period]} (${generatedAt})`)
  lines.push('')
  lines.push(`Currently in QA: ${metrics.total} ticket(s).`)
  lines.push(
    `Average time in QA ${metrics.avgAgeDays.toFixed(1)} days (median ${metrics.medianAgeDays.toFixed(1)}).`
  )

  if (activity) {
    lines.push(
      `Flow ${window}: ${activity.entered} entered QA, ${activity.exited} cleared ` +
        `(${activity.passed} passed forward, ${activity.bounced} bounced back — ${bounceRate}% bounce rate).`
    )
  }

  if (metrics.agingCount > 0 && metrics.oldest) {
    lines.push(
      `Attention: ${metrics.agingCount} ticket(s) have been in QA for more than ${QA_AGING_THRESHOLD_DAYS} days. ` +
        `Oldest is ${metrics.oldest.identifier} at ${(metrics.oldest.qaAgeMs / DAY_MS).toFixed(1)} days.`
    )
  } else {
    lines.push('No tickets aging beyond threshold — QA pipeline is healthy.')
  }

  if (metrics.byTeam.length > 0) {
    const top = metrics.byTeam.slice(0, 4).map((t) => `${t.name} ${t.count}`).join(', ')
    lines.push(`Load by team: ${top}.`)
  }

  if (bounceRate >= 30) {
    lines.push('')
    lines.push(`Risk flag: bounce rate of ${bounceRate}% is elevated — QA is finding a high share of defects on hand-off.`)
  }

  return lines.join('\n')
}
