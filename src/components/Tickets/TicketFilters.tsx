import { Box, Typography, FormGroup, FormControlLabel, Checkbox, TextField, InputAdornment, Autocomplete, Button, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useMemo } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import { useAppStore } from '../../stores/useAppStore'
import { useLinearTeams, useLinearMembers, useLinearIssues } from '../../hooks/useLinearData'
import { ALL_STATE_TYPES, ALL_PRIORITIES, STATE_TYPE_LABELS, PRIORITY_LABELS } from '../../constants'
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
  const { data: allMembers = [] } = useLinearMembers()
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
    filters.priorities.length > 0 ||
    filters.teamIds.length > 0 ||
    filters.creatorIds.length > 0 ||
    filters.labelNames.length > 0 ||
    !!filters.searchQuery

  const assigneeOptions = useMemo(() => {
    if (!hasOtherFilter) return allMembers

    const wantedLabels = new Set(filters.labelNames.map((n) => n.trim().toLowerCase()))
    const q = filters.searchQuery.toLowerCase()

    const matchingAssigneeIds = new Set<string>()
    for (const issue of issues) {
      if (filters.stateTypes.length > 0 && !filters.stateTypes.includes(issue.state.type)) continue
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
      if (issue.assignee?.id) matchingAssigneeIds.add(issue.assignee.id)
    }
    return allMembers.filter((m) => matchingAssigneeIds.has(m.id))
  }, [hasOtherFilter, issues, filters.stateTypes, filters.priorities, filters.teamIds, filters.creatorIds, filters.labelNames, filters.searchQuery, allMembers])

  const toggleStateType = (type: StateType) => {
    const next = filters.stateTypes.includes(type)
      ? filters.stateTypes.filter((t) => t !== type)
      : [...filters.stateTypes, type]
    updateFilters({ stateTypes: next })
  }

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
          {ALL_STATE_TYPES.filter((type) => type !== 'backlog').map((type) => (
            <FormControlLabel
              key={type}
              control={<Checkbox size="small" checked={filters.stateTypes.includes(type)} onChange={() => toggleStateType(type)} />}
              label={<Typography variant="body2">{STATE_TYPE_LABELS[type]}</Typography>}
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
          value={allMembers.filter((m) => filters.assigneeIds.includes(m.id))}
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
