
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../stores/useAppStore'
import { fetchViewer, fetchAllIssues, fetchTeams, fetchMembers } from '../services/linearService'

export const useLinearViewer = () => {
  const apiKey = useAppStore((s) => s.settings.linearApiKey)
  return useQuery({
    queryKey: ['linear-viewer', apiKey],
    queryFn: () => fetchViewer(apiKey),
    enabled: !!apiKey,
    retry: 1
  })
}

const readUploadedIssues = (): any[] => {
  try {
    const raw = sessionStorage.getItem('linear-upload-data')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

// Custom hook: prefer uploaded data from sessionStorage if present
export const useLinearIssues = () => {
  const apiKey = useAppStore((s) => s.settings.linearApiKey)
  const uploadedIssues = readUploadedIssues()
  const hasUploaded = uploadedIssues.length > 0

  const query = useQuery({
    queryKey: ['linear-issues', apiKey],
    queryFn: () => fetchAllIssues(apiKey),
    enabled: !!apiKey && !hasUploaded,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })

  if (hasUploaded) {
    return { ...query, data: uploadedIssues, isLoading: false }
  }
  return query
}

export const useLinearTeams = () => {
  const apiKey = useAppStore((s) => s.settings.linearApiKey)
  return useQuery({
    queryKey: ['linear-teams', apiKey],
    queryFn: () => fetchTeams(apiKey),
    enabled: !!apiKey,
    staleTime: 30 * 60 * 1000
  })
}

export const useLinearMembers = () => {
  const apiKey = useAppStore((s) => s.settings.linearApiKey)
  const uploadedIssues = readUploadedIssues()
  const hasUploaded = uploadedIssues.length > 0

  const query = useQuery({
    queryKey: ['linear-members', apiKey],
    queryFn: () => fetchMembers(apiKey),
    enabled: !!apiKey && !hasUploaded,
    staleTime: 30 * 60 * 1000
  })

  if (hasUploaded) {
    const seen = new Map<string, { id: string; name: string; email: string }>()
    for (const issue of uploadedIssues) {
      const a = issue?.assignee
      if (!a) continue
      const id = a.id || a.email || a.name
      if (!id || seen.has(id)) continue
      seen.set(id, { id, name: a.name || id, email: a.email || '' })
    }
    const derived = Array.from(seen.values()).sort((x, y) => x.name.localeCompare(y.name))
    return { ...query, data: derived, isLoading: false }
  }
  return query
}
