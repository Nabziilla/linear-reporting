import { Box, Chip } from '@mui/material'
import { LinearIssue, Priority } from '../../types'
import { ALL_PRIORITIES, PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants'

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

  const allActive = value.length === 0

  return (
    <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
      <Chip
        label="All"
        size="small"
        onClick={() => onChange([])}
        variant={allActive ? 'filled' : 'outlined'}
        sx={{
          fontWeight: 600,
          bgcolor: allActive ? 'primary.main' : 'transparent',
          color: allActive ? 'primary.contrastText' : 'text.secondary',
          '&:hover': { bgcolor: allActive ? 'primary.dark' : 'action.hover' }
        }}
      />
      {ALL_PRIORITIES.map((p) => {
        const active = value.includes(p)
        const color = PRIORITY_COLORS[p]
        const count = counts?.[p]
        return (
          <Chip
            key={p}
            size="small"
            onClick={() => toggle(p)}
            variant={active ? 'filled' : 'outlined'}
            label={
              count === undefined ? PRIORITY_LABELS[p] : (
                <>
                  {PRIORITY_LABELS[p]}
                  <Box component="span" sx={{ opacity: 0.6, ml: 0.6, fontWeight: 500 }}>{count}</Box>
                </>
              )
            }
            sx={{
              fontWeight: 600,
              borderColor: active ? color : 'divider',
              bgcolor: active ? `${color}25` : 'transparent',
              color: active ? color : 'text.secondary',
              '&:hover': { bgcolor: active ? `${color}35` : 'action.hover' }
            }}
          />
        )
      })}
    </Box>
  )
}
