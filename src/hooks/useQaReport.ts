import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useAppStore } from '../stores/useAppStore'
import { fetchQaQueue, fetchQaActivity } from '../services/qaService'
import { QA_AGE_BUCKETS, QA_AGING_THRESHOLD_DAYS } from '../constants'
import { QaPeriod, QaQueueItem, Priority } from '../types'

dayjs.extend(isoWeek)

const DAY_MS = 24 * 60 * 60 * 1000

const startOfPeriod = (period: QaPeriod): string => {
  const unit = period === 'day' ? 'day' : period === 'week' ? 'isoWeek' : 'month'
  return dayjs().startOf(unit).toISOString()
}

const bucketIndexForDays = (days: number): number => {
  for (let i = 0; i < QA_AGE_BUCKETS.length; i += 1) {
    if (days < QA_AGE_BUCKETS[i].maxDays) return i
  }
  return QA_AGE_BUCKETS.length - 1
}

interface CountRow {
  name: string
  count: number
  aging: number
}

const tally = (
  items: QaQueueItem[],
  keyOf: (i: QaQueueItem) => string
): CountRow[] => {
  const map = new Map<string, CountRow>()
  for (const item of items) {
    const name = keyOf(item)
    const row = map.get(name) ?? { name, count: 0, aging: 0 }
    row.count += 1
    if (item.qaAgeMs / DAY_MS >= QA_AGING_THRESHOLD_DAYS) row.aging += 1
    map.set(name, row)
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

export const useQaReport = (period: QaPeriod) => {
  const apiKey = useAppStore((s) => s.settings.linearApiKey)
  const hasApiKey = !!apiKey
  const sinceISO = useMemo(() => startOfPeriod(period), [period])

  const queueQuery = useQuery({
    queryKey: ['qa-queue', apiKey],
    queryFn: () => fetchQaQueue(apiKey),
    enabled: hasApiKey,
    staleTime: 2 * 60 * 1000
  })

  const activityQuery = useQuery({
    queryKey: ['qa-activity', apiKey, sinceISO],
    queryFn: () => fetchQaActivity(apiKey, sinceISO),
    enabled: hasApiKey,
    staleTime: 2 * 60 * 1000
  })

  const queue = useMemo(() => queueQuery.data ?? [], [queueQuery.data])

  const metrics = useMemo(() => {
    const total = queue.length
    const ages = queue.map((i) => i.qaAgeMs / DAY_MS)
    const sum = ages.reduce((a, b) => a + b, 0)
    const avgAgeDays = total ? sum / total : 0
    const sorted = [...ages].sort((a, b) => a - b)
    const medianAgeDays = total
      ? total % 2
        ? sorted[(total - 1) / 2]
        : (sorted[total / 2 - 1] + sorted[total / 2]) / 2
      : 0
    const oldest = queue[0] ?? null // queue is sorted oldest-first by the service
    const maxAgeDays = oldest ? oldest.qaAgeMs / DAY_MS : 0
    const agingCount = queue.filter((i) => i.qaAgeMs / DAY_MS >= QA_AGING_THRESHOLD_DAYS).length

    const buckets = QA_AGE_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      color: b.color,
      count: 0
    }))
    for (const item of queue) {
      buckets[bucketIndexForDays(item.qaAgeMs / DAY_MS)].count += 1
    }

    const byTeam = tally(queue, (i) => i.teamKey)
    const byAssignee = tally(queue, (i) => i.assigneeName ?? 'Unassigned')

    const priorityMap = new Map<Priority, number>()
    for (const item of queue) priorityMap.set(item.priority, (priorityMap.get(item.priority) ?? 0) + 1)
    const byPriority = Array.from(priorityMap.entries())
      .map(([priority, count]) => ({ priority, count }))
      .sort((a, b) => (a.priority === 0 ? 99 : a.priority) - (b.priority === 0 ? 99 : b.priority))

    const last24h = queue
      .filter((i) => i.updatedInLast24h || i.enteredQaInLast24h)
      .sort((a, b) => b.qaAgeMs - a.qaAgeMs)

    return {
      total,
      avgAgeDays,
      medianAgeDays,
      maxAgeDays,
      oldest,
      agingCount,
      buckets,
      byTeam,
      byAssignee,
      byPriority,
      last24h
    }
  }, [queue])

  return {
    period,
    sinceISO,
    hasApiKey,
    isLoading: queueQuery.isLoading || activityQuery.isLoading,
    isError: queueQuery.isError || activityQuery.isError,
    error: queueQuery.error || activityQuery.error,
    isFetching: queueQuery.isFetching || activityQuery.isFetching,
    refetch: () => {
      queueQuery.refetch()
      activityQuery.refetch()
    },
    queue,
    activity: activityQuery.data,
    metrics
  }
}
