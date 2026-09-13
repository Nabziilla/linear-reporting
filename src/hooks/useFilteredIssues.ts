import { useMemo } from 'react'
import { useLinearIssues } from './useLinearData'
import { useAppStore } from '../stores/useAppStore'

const hasUploadedData = (): boolean => {
  try {
    const raw = sessionStorage.getItem('linear-upload-data')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

export const useFilteredIssues = () => {
  const { data: issues = [], isLoading, isError, error, refetch } = useLinearIssues()
  const filters = useAppStore((s) => s.filters)
  const hasApiKey = useAppStore((s) => !!s.settings.linearApiKey)

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (filters.stateTypes.length > 0 && !filters.stateTypes.includes(issue.state.type)) {
        return false
      }
      if (filters.stateNames.length > 0 && !filters.stateNames.includes(issue.state.name)) {
        return false
      }
      if (filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) {
        return false
      }
      if (filters.teamIds.length > 0 && !filters.teamIds.includes(issue.team.id)) {
        return false
      }
      if (
        filters.assigneeIds.length > 0 &&
        (!issue.assignee || !filters.assigneeIds.includes(issue.assignee.id))
      ) {
        return false
      }
      if (
        filters.creatorIds && filters.creatorIds.length > 0 &&
        (!issue.creator || !filters.creatorIds.includes(issue.creator.id))
      ) {
        return false
      }
      if (filters.labelNames && filters.labelNames.length > 0) {
        const wanted = new Set(filters.labelNames.map((n) => n.trim().toLowerCase()))
        const issueLabelNames = (issue.labels || []).map((l: any) => {
          const name = typeof l === 'string' ? l : l?.name
          return (name || '').trim().toLowerCase()
        })
        if (!issueLabelNames.some((n: string) => wanted.has(n))) return false
      }
      if (
        filters.createdAfter && issue.createdAt && new Date(issue.createdAt) < new Date(filters.createdAfter)
      ) {
        return false
      }
      if (
        filters.createdBefore && issue.createdAt && new Date(issue.createdAt) > new Date(filters.createdBefore)
      ) {
        return false
      }
      if (
        filters.updatedAfter && issue.updatedAt && new Date(issue.updatedAt) < new Date(filters.updatedAfter)
      ) {
        return false
      }
      if (
        filters.updatedBefore && issue.updatedAt && new Date(issue.updatedAt) > new Date(filters.updatedBefore)
      ) {
        return false
      }
      if (
        filters.minTimeInStatus !== undefined && issue.timeInStatus !== undefined && Number(issue.timeInStatus) < filters.minTimeInStatus
      ) {
        return false
      }
      if (
        filters.maxTimeInStatus !== undefined && issue.timeInStatus !== undefined && Number(issue.timeInStatus) > filters.maxTimeInStatus
      ) {
        return false
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        if (
          !issue.title.toLowerCase().includes(q) &&
          !issue.identifier.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [issues, filters])

  return {
    issues: filtered,
    allIssues: issues,
    isLoading,
    isError,
    error,
    refetch,
    hasApiKey,
    hasUploadedData: hasUploadedData()
  }
}
