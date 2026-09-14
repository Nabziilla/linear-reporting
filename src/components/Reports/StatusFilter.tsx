import { Box, Chip } from '@mui/material'
import { LinearIssue, StateType } from '../../types'
import { STATE_TYPE_COLORS } from '../../constants'

/** Empty set means "no filter" — every status is included. */
export type StatusSelection = string[]

export interface StatusOption {
  name: string
  type: StateType | undefined
  count: number
}

/**
 * Statuses are taken from the data rather than a fixed list, because workflow
 * state names are per-workspace and differ between teams. Ordered
 * alphabetically so a given status sits in a predictable place.
 */
export const buildStatusOptions = (issues: LinearIssue[]): StatusOption[] => {
  const byName = new Map<string, StatusOption>()
  for (const i of issues) {
    const name = i.state?.name
    if (!name) continue
    const existing = byName.get(name)
    if (existing) {
      existing.count += 1
    } else {
      byName.set(name, { name, type: i.state?.type as StateType | undefined, count: 1 })
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export const filterByStatus = (
  issues: LinearIssue[],
  selected: StatusSelection
): LinearIssue[] => {
  if (selected.length === 0) return issues
  const wanted = new Set(selected)
  return issues.filter((i) => i.state?.name && wanted.has(i.state.name))
}

export const describeStatuses = (selected: StatusSelection): string =>
  selected.length === 0 ? 'All statuses' : selected.join(', ')

interface StatusFilterProps {
  value: StatusSelection
  onChange: (next: StatusSelection) => void
  options: StatusOption[]
}

export const StatusFilter = ({ value, onChange, options }: StatusFilterProps) => {
  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((x) => x !== name) : [...value, name])
  }

  const allActive = value.length === 0

  // Statuses that were selected but no longer exist in the current scope: keep
  // them visible so a selection can't become invisible-but-active.
  const optionNames = new Set(options.map((o) => o.name))
  const orphaned = value.filter((v) => !optionNames.has(v))

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
      {options.map(({ name, type, count }) => {
        const active = value.includes(name)
        const color = type ? STATE_TYPE_COLORS[type] : '#94a3b8'
        return (
          <Chip
            key={name}
            size="small"
            onClick={() => toggle(name)}
            variant={active ? 'filled' : 'outlined'}
            label={`${name} ${count}`}
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
      {orphaned.map((name) => (
        <Chip
          key={name}
          size="small"
          onClick={() => toggle(name)}
          variant="filled"
          label={`${name} 0`}
          sx={{ fontWeight: 600, bgcolor: 'action.hover', color: 'text.disabled' }}
        />
      ))}
    </Box>
  )
}
