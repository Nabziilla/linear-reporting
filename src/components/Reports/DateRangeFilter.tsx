import {
  Box, Divider, ListItemText, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { LinearIssue } from '../../types'
import { FilterDropdown } from './FilterDropdown'
import dayjs from 'dayjs'

export type RangeKey = '7d' | '30d' | '90d' | 'all' | 'custom'
export type DateBasis = 'created' | 'updated'

export interface DateRange {
  key: RangeKey
  basis: DateBasis
  /** Inclusive start, YYYY-MM-DD. Only meaningful when key === 'custom'. */
  from?: string
  /** Inclusive end, YYYY-MM-DD. Only meaningful when key === 'custom'. */
  to?: string
}

export const DEFAULT_RANGE: DateRange = { key: 'all', basis: 'created' }

const PRESET_DAYS: Record<Exclude<RangeKey, 'all' | 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90
}

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  all: 'All time',
  custom: 'Custom'
}

const issueDate = (issue: LinearIssue, basis: DateBasis): string | undefined =>
  basis === 'created' ? issue.createdAt : issue.updatedAt

/**
 * Filters issues to the selected range. Presets are relative to now and count
 * back N days; custom uses whole local days so both endpoints are inclusive.
 * An issue missing the relevant date is dropped from any bounded range, since
 * it can't be placed in the window.
 */
export const filterByDateRange = (issues: LinearIssue[], range: DateRange): LinearIssue[] => {
  if (range.key === 'all') return issues

  let start: dayjs.Dayjs | undefined
  let end: dayjs.Dayjs | undefined

  if (range.key === 'custom') {
    if (range.from) start = dayjs(range.from).startOf('day')
    if (range.to) end = dayjs(range.to).endOf('day')
    // A custom range with neither bound set is the same as no filter.
    if (!start && !end) return issues
  } else {
    start = dayjs().subtract(PRESET_DAYS[range.key], 'day').startOf('day')
  }

  return issues.filter((issue) => {
    const raw = issueDate(issue, range.basis)
    if (!raw) return false
    const d = dayjs(raw)
    if (!d.isValid()) return false
    if (start && d.isBefore(start)) return false
    if (end && d.isAfter(end)) return false
    return true
  })
}

/** Human-readable summary of the active range, for section headings. */
export const describeRange = (range: DateRange): string => {
  if (range.key === 'all') return 'All time'
  if (range.key === 'custom') {
    const f = range.from ? dayjs(range.from).format('MMM D, YYYY') : '…'
    const t = range.to ? dayjs(range.to).format('MMM D, YYYY') : 'today'
    return `${f} – ${t}`
  }
  return `Last ${RANGE_LABELS[range.key]}`
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export const DateRangeFilter = ({ value, onChange }: DateRangeFilterProps) => {
  const today = dayjs().format('YYYY-MM-DD')

  const setKey = (key: RangeKey | null) => {
    if (!key) return
    if (key === 'custom') {
      // Seed custom with the last 30 days so the pickers open somewhere useful
      // rather than empty.
      onChange({
        ...value,
        key,
        from: value.from ?? dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        to: value.to ?? today
      })
      return
    }
    onChange({ ...value, key })
  }

  const RANGE_KEYS: RangeKey[] = ['7d', '30d', '90d', 'all', 'custom']

  return (
    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
      <FilterDropdown
        label={`${describeRange(value)} · ${value.basis}`}
        active={value.key !== DEFAULT_RANGE.key || value.basis !== DEFAULT_RANGE.basis}
        minWidth={220}
      >
        {(close) => [
          ...RANGE_KEYS.map((k) => (
            <MenuItem
              key={k}
              dense
              selected={value.key === k}
              onClick={() => {
                setKey(k)
                // Custom keeps the menu open so the date inputs can be reached.
                if (k !== 'custom') close()
              }}
            >
              <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                {value.key === k && <CheckIcon sx={{ fontSize: 16 }} />}
              </Box>
              <ListItemText
                primary={k === 'all' ? 'All time' : k === 'custom' ? 'Custom range…' : `Last ${RANGE_LABELS[k]}`}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </MenuItem>
          )),
          <Divider key="__div" />,
          <Box key="__basis" sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
              Filter on
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              fullWidth
              value={value.basis}
              onChange={(_, basis: DateBasis | null) => basis && onChange({ ...value, basis })}
            >
              <ToggleButton value="created">Created</ToggleButton>
              <ToggleButton value="updated">Updated</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        ]}
      </FilterDropdown>

      {value.key === 'custom' && (
        <Box display="flex" alignItems="center" gap={0.75}>
          <TextField
            type="date"
            size="small"
            value={value.from ?? ''}
            inputProps={{ max: value.to ?? today, 'aria-label': 'From date' }}
            onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
            sx={{ width: 140, '& input': { fontSize: '0.8rem', py: 0.75 } }}
          />
          <Typography variant="caption" color="text.secondary">to</Typography>
          <TextField
            type="date"
            size="small"
            value={value.to ?? ''}
            inputProps={{ min: value.from, max: today, 'aria-label': 'To date' }}
            onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
            sx={{ width: 140, '& input': { fontSize: '0.8rem', py: 0.75 } }}
          />
        </Box>
      )}
    </Box>
  )
}
