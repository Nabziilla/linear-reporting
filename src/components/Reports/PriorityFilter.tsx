import { Box, Checkbox, Chip, Divider, ListItemText, MenuItem, Typography } from '@mui/material'
import { LinearIssue, Priority } from '../../types'
import { ALL_PRIORITIES, PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants'
import { FilterDropdown } from './FilterDropdown'

/** Empty set means "no filter" — every priority is included. */
export type PrioritySelection = Priority[]

export const filterByPriority = (
  issues: LinearIssue[],
  selected: PrioritySelection
): LinearIssue[] => {
  if (selected.length === 0) return issues
  const wanted = new Set<Priority>(selected)
  return issues.filter((i) => wanted.has(i.priority))
}

export const describePriorities = (selected: PrioritySelection): string => {
  if (selected.length === 0) return 'All priorities'
  return selected.map((p) => PRIORITY_LABELS[p]).join(', ')
}

interface PriorityFilterProps {
  value: PrioritySelection
  onChange: (next: PrioritySelection) => void
  /** Per-priority counts for the current scope, shown on each chip. */
  counts?: Partial<Record<Priority, number>>
}

export const PriorityFilter = ({ value, onChange, counts }: PriorityFilterProps) => {
  const toggle = (p: Priority) => {
    onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p])
  }

  const selected = [...value].sort(
    (a, b) => ALL_PRIORITIES.indexOf(a) - ALL_PRIORITIES.indexOf(b)
  )

  return (
    <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
      <FilterDropdown
        label={value.length === 0 ? 'All priorities' : `${value.length} selected`}
        active={value.length > 0}
      >
        {(close) => [
          <MenuItem
            key="__clear"
            onClick={() => { onChange([]); close() }}
            disabled={value.length === 0}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Clear selection</Typography>
          </MenuItem>,
          <Divider key="__div" />,
          ...ALL_PRIORITIES.map((p) => (
            <MenuItem key={p} onClick={() => toggle(p)} dense>
              <Checkbox size="small" checked={value.includes(p)} sx={{ py: 0, mr: 1 }} />
              <Box
                sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: PRIORITY_COLORS[p], mr: 1.25, flexShrink: 0
                }}
              />
              <ListItemText primary={PRIORITY_LABELS[p]} primaryTypographyProps={{ variant: 'body2' }} />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {counts?.[p] ?? 0}
              </Typography>
            </MenuItem>
          ))
        ]}
      </FilterDropdown>

      {selected.map((p) => (
        <Chip
          key={p}
          size="small"
          label={`${PRIORITY_LABELS[p]} ${counts?.[p] ?? 0}`}
          onDelete={() => toggle(p)}
          sx={{
            fontWeight: 600,
            bgcolor: `${PRIORITY_COLORS[p]}25`,
            color: PRIORITY_COLORS[p],
            border: `1px solid ${PRIORITY_COLORS[p]}40`
          }}
        />
      ))}
    </Box>
  )
}
