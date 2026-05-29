import { Box, Typography, FormGroup, FormControlLabel, Checkbox, TextField, InputAdornment, Autocomplete, Button, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useMemo } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import { useAppStore } from '../../stores/useAppStore'
import { useLinearTeams, useLinearIssues } from '../../hooks/useLinearData'
import { ALL_STATE_TYPES, ALL_PRIORITIES, STATE_TYPE_COLORS, PRIORITY_LABELS } from '../../constants'
import { StateType, Priority } from '../../types'

const FilterSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2)
}))

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5)
}))

export const TicketFilters = () => {
  const { filters, updateFilters, resetFilters } = useAppStore()
  const { data: teams = [] } = useLinearTeams()
  const { data: issues = [] } = useLinearIssues()

  // Derive creators from issues
  const creatorOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; email?: string }>()
    for (const issue of issues) {
      const c = issue.creator
      if (!c) continue
      const id = c.id || c.email || c.name
      if (!id || seen.has(id)) continue
      seen.set(id, { id, name: c.name || id, email: c.email || '' })
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [issues])

  const labelOptions = useMemo(() => {
    const set = new Set<string>()
    for (const issue of issues) {
      if (!issue.labels || !Array.isArray(issue.labels)) continue
      for (const l of issue.labels) {
        const name = typeof l === 'string' ? l : l?.name
        if (name && name.trim()) set.add(name.trim())
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [issues])

  const hasOtherFilter =
    filters.stateTypes.length > 0 ||
    filters.stateNames.length > 0 ||
    filters.priorities.length > 0 ||
    filters.teamIds.length > 0 ||
    filters.creatorIds.length > 0 ||
    filters.labelNames.length > 0 ||
    !!filters.searchQuery

  const assigneeOptions = useMemo(() => {
    const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
    const wantedLabels = new Set(filters.labelNames.map((n) => n.trim().toLowerCase()))
    const q = filters.searchQuery.toLowerCase()

    const seen = new Map<string, { id: string; name: string; email?: string }>()
    for (const issue of issues) {
      if (hasOtherFilter) {
        if (filters.stateTypes.length > 0 && !filters.stateTypes.includes(issue.state.type)) continue
        if (filters.stateNames.length > 0 && !filters.stateNames.includes(issue.state.name)) continue
        if (filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) continue
        if (filters.teamIds.length > 0 && !filters.teamIds.includes(issue.team.id)) continue
        if (filters.creatorIds.length > 0 && (!issue.creator || !filters.creatorIds.includes(issue.creator.id))) continue
        if (filters.labelNames.length > 0) {
          const names = (issue.labels || []).map((l: any) => {
            const n = typeof l === 'string' ? l : l?.name
            return (n || '').trim().toLowerCase()
          })
          if (!names.some((n: string) => wantedLabels.has(n))) continue
        }
        if (q && !issue.title.toLowerCase().includes(q) && !issue.identifier.toLowerCase().includes(q)) continue
      }
      const a = issue.assignee
      if (!a) continue
      const id = a.id || a.email || a.name
      if (!id || seen.has(id)) continue
      seen.set(id, { id, name: a.name || id, email: a.email || '' })
    }
    return Array.from(seen.values()).sort(sortByName)
  }, [hasOtherFilter, issues, filters.stateTypes, filters.stateNames, filters.priorities, filters.teamIds, filters.creatorIds, filters.labelNames, filters.searchQuery])

  const toggleStateName = (name: string) => {
    const next = filters.stateNames.includes(name)
      ? filters.stateNames.filter((n) => n !== name)
      : [...filters.stateNames, name]
    updateFilters({ stateNames: next })
  }

  const statusOptions = useMemo(() => {
    const byName = new Map<string, { name: string; type: StateType; count: number }>()
    for (const issue of issues) {
      const name = issue.state?.name
      const type = issue.state?.type as StateType | undefined
      if (!name || !type || !ALL_STATE_TYPES.includes(type)) continue
      const existing = byName.get(name)
      if (existing) existing.count += 1
      else byName.set(name, { name, type, count: 1 })
    }
    const typeOrder: Record<StateType, number> = {
      triage: 0, backlog: 1, unstarted: 2, started: 3, completed: 4, canceled: 5, duplicate: 6
    }
    return Array.from(byName.values()).sort((a, b) => {
      const t = typeOrder[a.type] - typeOrder[b.type]
      return t !== 0 ? t : a.name.localeCompare(b.name)
    })
  }, [issues])

  const togglePriority = (p: Priority) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p]
    updateFilters({ priorities: next })
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2" fontWeight={700}>Filters</Typography>
        <Button size="small" onClick={resetFilters}>Reset</Button>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="Search tickets…"
        value={filters.searchQuery}
        onChange={(e) => updateFilters({ searchQuery: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      <Divider sx={{ my: 2 }} />

      <FilterSection>
        <SectionLabel>Status</SectionLabel>
        <FormGroup>
          {statusOptions.map(({ name, type, count }) => (
            <FormControlLabel
              key={name}
              control={
                <Checkbox
                  size="small"
                  checked={filters.stateNames.includes(name)}
                  onChange={() => toggleStateName(name)}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: STATE_TYPE_COLORS[type],
                      flexShrink: 0
                    }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {count}
                  </Typography>
                </Box>
              }
              sx={{ mr: 0, width: '100%', '& .MuiFormControlLabel-label': { width: '100%' } }}
            />
          ))}
        </FormGroup>
      </FilterSection>

      <FilterSection>
        <SectionLabel>Priority</SectionLabel>
        <FormGroup>
          {ALL_PRIORITIES.map((p) => (
            <FormControlLabel
              key={p}
              control={<Checkbox size="small" checked={filters.priorities.includes(p)} onChange={() => togglePriority(p)} />}
              label={<Typography variant="body2">{PRIORITY_LABELS[p]}</Typography>}
            />
          ))}
        </FormGroup>
      </FilterSection>

      <FilterSection>
        <SectionLabel>Team</SectionLabel>
        <Autocomplete
          multiple
          size="small"
          options={teams}
          getOptionLabel={(t) => t.name}
          value={teams.filter((t) => filters.teamIds.includes(t.id))}
          onChange={(_, selected) => updateFilters({ teamIds: selected.map((t) => t.id) })}
          renderInput={(params) => <TextField {...params} placeholder="All teams" />}
          limitTags={2}
        />
      </FilterSection>

      <FilterSection>
        <SectionLabel>Assignee</SectionLabel>
        <Autocomplete
          multiple
          size="small"
          options={assigneeOptions}
          getOptionLabel={(m) => m.name}
          value={assigneeOptions.filter((m) => filters.assigneeIds.includes(m.id))}
          onChange={(_, selected) => updateFilters({ assigneeIds: selected.map((m) => m.id) })}
          renderInput={(params) => <TextField {...params} placeholder="All assignees" />}
          noOptionsText={hasOtherFilter ? 'No assignees match' : 'No assignees'}
          limitTags={2}
        />
      </FilterSection>

      <FilterSection>
        <SectionLabel>Creator</SectionLabel>
        <Autocomplete
          multiple
          size="small"
          options={creatorOptions}
          getOptionLabel={(c) => c.name}
          value={creatorOptions.filter((c) => filters.creatorIds.includes(c.id))}
          onChange={(_, selected) => updateFilters({ creatorIds: selected.map((c) => c.id) })}
          renderInput={(params) => <TextField {...params} placeholder="All creators" />}
          limitTags={2}
        />
      </FilterSection>

      <FilterSection>
        <SectionLabel>Labels</SectionLabel>
        <Autocomplete
          multiple
          size="small"
          options={labelOptions}
          getOptionLabel={(l) => l}
          value={filters.labelNames}
          onChange={(_, selected) => updateFilters({ labelNames: selected })}
          renderInput={(params) => <TextField {...params} placeholder="All labels" />}
          limitTags={2}
        />
      </FilterSection>

    </Box>
  )
}
