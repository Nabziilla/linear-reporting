import { useState } from 'react'
import {
  Box, Button, Checkbox, Chip, Divider, ListItemText, Menu, MenuItem, Typography
} from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
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
  // Keyed case-insensitively: teams configure the same status with different
  // capitalisation ("To do" vs "To Do"), which would otherwise split one
  // status into two entries. The first spelling seen wins as the label.
  const byKey = new Map<string, StatusOption>()
  for (const i of issues) {
    const name = i.state?.name
    if (!name) continue
    const key = name.trim().toLowerCase()
    const existing = byKey.get(key)
    if (existing) {
      existing.count += 1
    } else {
      byKey.set(key, { name, type: i.state?.type as StateType | undefined, count: 1 })
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export const filterByStatus = (
  issues: LinearIssue[],
  selected: StatusSelection
): LinearIssue[] => {
  if (selected.length === 0) return issues
  // Case-insensitive to match how options are grouped, so selecting "To Do"
  // also captures tickets a team spelled "To do".
  const wanted = new Set(selected.map((s) => s.trim().toLowerCase()))
  return issues.filter((i) => {
    const name = i.state?.name
    return !!name && wanted.has(name.trim().toLowerCase())
  })
}

export const describeStatuses = (selected: StatusSelection): string =>
  selected.length === 0 ? 'All statuses' : selected.join(', ')

interface StatusFilterProps {
  value: StatusSelection
  onChange: (next: StatusSelection) => void
  options: StatusOption[]
}

/**
 * A dropdown rather than a chip row: workspaces accumulate many workflow
 * states (17 here, 7 of which cover under 2% of tickets), and rendering them
 * all inline wraps into an unreadable wall. Selected statuses surface as
 * removable chips so the active filter stays visible without opening the menu.
 */
export const StatusFilter = ({ value, onChange, options }: StatusFilterProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((x) => x !== name) : [...value, name])
  }

  // Statuses selected but absent from the current scope: keep them removable so
  // a selection can't become invisible yet still active.
  const optionNames = new Set(options.map((o) => o.name))
  const orphaned = value.filter((v) => !optionNames.has(v))
  const selected = [...value].sort((a, b) => a.localeCompare(b))

  return (
    <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          borderColor: 'divider',
          color: value.length > 0 ? 'primary.main' : 'text.secondary'
        }}
      >
        {value.length === 0 ? 'All statuses' : `${value.length} selected`}
      </Button>

      {selected.map((name) => {
        const opt = options.find((o) => o.name === name)
        const color = opt?.type ? STATE_TYPE_COLORS[opt.type] : '#94a3b8'
        const missing = orphaned.includes(name)
        return (
          <Chip
            key={name}
            size="small"
            label={missing ? `${name} 0` : `${name} ${opt?.count ?? 0}`}
            onDelete={() => toggle(name)}
            sx={{
              fontWeight: 600,
              bgcolor: missing ? 'action.hover' : `${color}25`,
              color: missing ? 'text.disabled' : color,
              border: `1px solid ${missing ? 'transparent' : `${color}40`}`
            }}
          />
        )
      })}

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { maxHeight: 420, minWidth: 260 } } }}
      >
        <MenuItem
          onClick={() => { onChange([]); setAnchor(null) }}
          disabled={value.length === 0}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Clear selection</Typography>
        </MenuItem>
        <Divider />
        {options.map(({ name, type, count }) => {
          const color = type ? STATE_TYPE_COLORS[type] : '#94a3b8'
          return (
            <MenuItem key={name} onClick={() => toggle(name)} dense>
              <Checkbox size="small" checked={value.includes(name)} sx={{ py: 0, mr: 1 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, mr: 1.25, flexShrink: 0 }} />
              <ListItemText
                primary={name}
                primaryTypographyProps={{ variant: 'body2' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {count}
              </Typography>
            </MenuItem>
          )
        })}
      </Menu>
    </Box>
  )
}
