import { useMemo, useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Avatar, Tooltip as MuiTooltip, Link, Button, MenuItem, ListItemText } from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import CheckIcon from '@mui/icons-material/Check'
import { FilterDropdown } from './FilterDropdown'
import { styled } from '@mui/material/styles'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { QATeamReport } from './QATeamReport'
import { DateRangeFilter, DateRange, DEFAULT_RANGE, filterByDateRange, describeRange } from './DateRangeFilter'
import { PriorityFilter, PrioritySelection, filterByPriority, describePriorities } from './PriorityFilter'
import { StatusFilter, StatusSelection, filterByStatus, describeStatuses, buildStatusOptions } from './StatusFilter'
import { LinearIssue, Priority, StateType } from '../../types'
import { ALL_STATE_TYPES, STATE_TYPE_LABELS, STATE_TYPE_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const ALL_TEAMS = '__all__'
const PRIORITY_ORDER: Priority[] = [1, 2, 3, 4, 0]

const CLOSED_TYPES: StateType[] = ['completed', 'canceled', 'duplicate']
const isOpen = (issue: LinearIssue) => !CLOSED_TYPES.includes(issue.state?.type as StateType)
const isQAIssue = (issue: LinearIssue) => /\bqa\b/i.test(issue.state?.name ?? '')

const sortByPriority = (issues: LinearIssue[]) =>
  [...issues].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))

type TeamRow = { name: string; total: number } & Partial<Record<StateType, number>>

const buildTeamData = (issues: LinearIssue[]): TeamRow[] => {
  const counts: Record<string, TeamRow> = {}
  const initRow = (name: string): TeamRow => {
    const row: TeamRow = { name, total: 0 }
    for (const t of ALL_STATE_TYPES) row[t] = 0
    return row
  }
  for (const i of issues) {
    const team = i.team?.name ?? 'Unknown'
    if (!counts[team]) counts[team] = initRow(team)
    const t = i.state?.type as StateType | undefined
    if (t && ALL_STATE_TYPES.includes(t)) counts[team][t] = (counts[team][t] ?? 0) + 1
    counts[team].total += 1
  }
  return Object.values(counts)
}

const buildWeeklyData = (issues: LinearIssue[]) => {
  const weeks: Record<string, { created: number; completed: number }> = {}
  issues.forEach((i) => {
    if (!i.createdAt) return
    const week = dayjs(i.createdAt).startOf('isoWeek').format('YYYY-MM-DD')
    if (!weeks[week]) weeks[week] = { created: 0, completed: 0 }
    weeks[week].created++
    if (i.completedAt) {
      const cWeek = dayjs(i.completedAt).startOf('isoWeek').format('YYYY-MM-DD')
      if (!weeks[cWeek]) weeks[cWeek] = { created: 0, completed: 0 }
      weeks[cWeek].completed++
    }
  })
  return Object.entries(weeks)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-12)
    .map(([week, v]) => ({ week: dayjs(week).format('MMM D'), ...v }))
}

const FilterTile = ({
  count, label, color, active, onClick, disabled,
}: {
  count: number; label: string; color?: string; active: boolean; onClick: () => void; disabled?: boolean
}) => (
  <Box
    onClick={disabled ? undefined : onClick}
    sx={{
      cursor: disabled ? 'default' : 'pointer',
      px: 2, py: 1,
      borderRadius: 1.5,
      border: active ? `2px solid ${color ?? '#5E6AD2'}` : '1px solid',
      borderColor: active ? (color ?? '#5E6AD2') : 'divider',
      bgcolor: active ? (color ?? '#5E6AD2') + '18' : 'background.paper',
      minWidth: 80, textAlign: 'center',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 0.15s',
      '&:hover': disabled ? {} : { borderColor: color ?? '#5E6AD2', opacity: 0.85 },
    }}
  >
    <Typography variant="h6" fontWeight={700} sx={{ color: active ? (color ?? '#5E6AD2') : 'text.primary' }}>
      {count}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 110 }}>
      {label}
    </Typography>
  </Box>
)

const LoadingBox = styled(Box)({ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 })

/** Row label in the filter grid. Fixed width so the controls line up. */
const FilterLabel = styled(Typography)(({ theme }) => ({
  ...theme.typography.overline,
  color: theme.palette.text.secondary,
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: 'nowrap'
})) as typeof Typography

export const ReportsPage = () => {
  const { allIssues, isLoading } = useFilteredIssues()
  const [selectedTeam] = useState<string>(ALL_TEAMS)
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [qaTeam, setQaTeam] = useState<string>(ALL_TEAMS)
  const [showClosed, setShowClosed] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE)
  const [priorities, setPriorities] = useState<PrioritySelection>([])
  const [statuses, setStatuses] = useState<StatusSelection>([])

  // Date range is the outermost filter: every downstream count, including the
  // completion rate, is scoped to the selected window.
  const dateFiltered = useMemo(() => filterByDateRange(allIssues, dateRange), [allIssues, dateRange])

  // Priority counts are taken before the priority filter is applied, so the
  // chips keep showing the full picture rather than collapsing to the selection.
  const priorityCounts = useMemo(() => {
    const counts: Partial<Record<Priority, number>> = {}
    for (const i of dateFiltered) counts[i.priority] = (counts[i.priority] ?? 0) + 1
    return counts
  }, [dateFiltered])

  const priorityFiltered = useMemo(
    () => filterByPriority(dateFiltered, priorities),
    [dateFiltered, priorities]
  )

  // Status options reflect the date + priority scope, so counts stay meaningful
  // as those filters change, but are taken before the status filter itself.
  const statusOptions = useMemo(() => buildStatusOptions(priorityFiltered), [priorityFiltered])

  const scopeFiltered = useMemo(
    () => filterByStatus(priorityFiltered, statuses),
    [priorityFiltered, statuses]
  )

  const visibleIssues = useMemo(
    () => showClosed ? scopeFiltered : scopeFiltered.filter(isOpen),
    [scopeFiltered, showClosed]
  )

  // A closed status picked while "Open only" is active yields a silently empty
  // result. Name the conflicting statuses rather than showing an empty page.
  // "Active" means the filter departs from its default, so the badge and the
  // Clear all button only appear when there is something to clear.
  const activeFilterCount =
    (dateRange.key !== DEFAULT_RANGE.key ? 1 : 0) +
    (priorities.length > 0 ? 1 : 0) +
    (statuses.length > 0 ? 1 : 0) +
    (showClosed ? 1 : 0)

  const resetFilters = () => {
    setDateRange(DEFAULT_RANGE)
    setPriorities([])
    setStatuses([])
    setShowClosed(false)
  }

  const hiddenByOpenOnly = useMemo(() => {
    if (showClosed || statuses.length === 0) return []
    return statusOptions
      .filter((o) => statuses.includes(o.name) && CLOSED_TYPES.includes(o.type as StateType))
      .map((o) => o.name)
  }, [showClosed, statuses, statusOptions])

  const scopedIssues = useMemo(() => {
    if (selectedTeam === ALL_TEAMS) return visibleIssues
    return visibleIssues.filter((i) => i.team?.name === selectedTeam)
  }, [visibleIssues, selectedTeam])


  const teamData = useMemo(() => buildTeamData(scopedIssues), [scopedIssues])
  const weeklyData = useMemo(() => buildWeeklyData(scopedIssues), [scopedIssues])

  // All QA issues scoped to the top-level team filter
  const qaIssues = useMemo(() => sortByPriority(scopedIssues.filter(isQAIssue)), [scopedIssues])

  // Team summary within QA (only teams that have QA tickets)
  const qaTeamSummary = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const i of qaIssues) {
      const t = i.team?.name ?? 'Unknown'
      counts[t] = (counts[t] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [qaIssues])

  // Priority summary within QA (only priorities that appear)
  const qaPrioritySummary = useMemo(() =>
    PRIORITY_ORDER
      .map((p) => ({ priority: p, count: qaIssues.filter((i) => i.priority === p).length }))
      .filter((r) => r.count > 0),
    [qaIssues]
  )

  // Apply both QA filters (team + priority) and reset priority when team changes
  const qaFiltered = useMemo(() => {
    let result = qaIssues
    if (qaTeam !== ALL_TEAMS) result = result.filter((i) => i.team?.name === qaTeam)
    if (selectedPriority !== 'all') result = result.filter((i) => String(i.priority) === selectedPriority)
    return result
  }, [qaIssues, qaTeam, selectedPriority])

  // Completion rate must measure against every ticket, not the visible subset:
  // under "Open only" the completed tickets are filtered out, which would force
  // the rate to 0%. Scope to the selected team, but ignore the open/closed toggle.
  const ratePool = useMemo(() => {
    if (selectedTeam === ALL_TEAMS) return scopeFiltered
    return scopeFiltered.filter((i) => i.team?.name === selectedTeam)
  }, [scopeFiltered, selectedTeam])

  const completedCount = ratePool.filter((i) => i.state?.type === 'completed').length
  const completionRate = ratePool.length > 0
    ? Math.round((completedCount / ratePool.length) * 100)
    : 0

  if (isLoading) return <LoadingBox><CircularProgress /></LoadingBox>

  const heading = selectedTeam === ALL_TEAMS ? 'All Teams' : selectedTeam

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1.5}>
        <Typography variant="h5">QA Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>{heading}</strong> · Completion rate: <strong>{completionRate}%</strong> · {scopedIssues.length} shown of {ratePool.length} total
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterListIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Filters</Typography>
              {activeFilterCount > 0 && (
                <Chip
                  size="small"
                  label={`${activeFilterCount} active`}
                  sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                />
              )}
            </Box>
            {activeFilterCount > 0 && (
              <Button size="small" onClick={resetFilters} sx={{ minWidth: 0 }}>
                Clear all
              </Button>
            )}
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'auto 1fr' }} columnGap={2.5} rowGap={1.5} alignItems="center">
            <FilterLabel>Period</FilterLabel>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
              <FilterDropdown
                label={showClosed ? 'Open and closed' : 'Open only'}
                active={showClosed}
                minWidth={180}
              >
                {(close) => [
                  <MenuItem
                    key="open"
                    dense
                    selected={!showClosed}
                    onClick={() => { setShowClosed(false); close() }}
                  >
                    <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                      {!showClosed && <CheckIcon sx={{ fontSize: 16 }} />}
                    </Box>
                    <ListItemText primary="Open only" primaryTypographyProps={{ variant: 'body2' }} />
                  </MenuItem>,
                  <MenuItem
                    key="all"
                    dense
                    selected={showClosed}
                    onClick={() => { setShowClosed(true); close() }}
                  >
                    <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                      {showClosed && <CheckIcon sx={{ fontSize: 16 }} />}
                    </Box>
                    <ListItemText primary="Open and closed" primaryTypographyProps={{ variant: 'body2' }} />
                  </MenuItem>
                ]}
              </FilterDropdown>
            </Box>

            <FilterLabel>Priority</FilterLabel>
            <PriorityFilter value={priorities} onChange={setPriorities} counts={priorityCounts} />

            <FilterLabel>Status</FilterLabel>
            <StatusFilter value={statuses} onChange={setStatuses} options={statusOptions} />
          </Box>

          {hiddenByOpenOnly.length > 0 && (
            <Typography variant="caption" sx={{ color: '#f97316', display: 'block', mt: 1.5 }}>
              “Open only” is hiding {hiddenByOpenOnly.join(', ')} — switch to “Include closed” to see them.
            </Typography>
          )}
        </CardContent>
      </Card>


      {/* Per-person QA team reporting. Uses scopedIssues so it honours the
          open/closed toggle and top-level team filter. */}
      <QATeamReport
        issues={scopedIssues}
        heading={[
          heading,
          describeRange(dateRange),
          priorities.length > 0 ? describePriorities(priorities) : null,
          statuses.length > 0 ? describeStatuses(statuses) : null
        ].filter(Boolean).join(' · ')}
      />

      {/* QA Snapshot */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
            <Typography variant="h6">QA Snapshot — {heading}</Typography>
            <Chip
              label={`${qaIssues.length} ticket${qaIssues.length !== 1 ? 's' : ''} in QA`}
              size="small"
              sx={{ bgcolor: '#f97316', color: '#fff', fontWeight: 600 }}
            />
          </Box>

          {qaIssues.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No tickets currently in QA{selectedTeam !== ALL_TEAMS ? ` for ${selectedTeam}` : ''}.
            </Typography>
          ) : (
            <>
              {/* Team tiles (only when viewing all teams and there are multiple QA teams) */}
              {selectedTeam === ALL_TEAMS && qaTeamSummary.length > 1 && (
                <Box mb={2.5}>
                  <Typography variant="overline" color="text.secondary" display="block" mb={1}>
                    By team
                  </Typography>
                  <Box display="flex" gap={1.5} flexWrap="wrap">
                    <FilterTile
                      count={qaIssues.length}
                      label="All Teams"
                      active={qaTeam === ALL_TEAMS}
                      onClick={() => setQaTeam(ALL_TEAMS)}
                    />
                    {qaTeamSummary.map(({ name, count }) => (
                      <FilterTile
                        key={name}
                        count={count}
                        label={name}
                        active={qaTeam === name}
                        onClick={() => setQaTeam(name)}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Priority tiles */}
              <Box mb={2.5}>
                <Typography variant="overline" color="text.secondary" display="block" mb={1}>
                  By priority
                </Typography>
                <Box display="flex" gap={1.5} flexWrap="wrap">
                  <FilterTile
                    count={qaTeam === ALL_TEAMS ? qaIssues.length : (qaTeamSummary.find(t => t.name === qaTeam)?.count ?? 0)}
                    label="All"
                    active={selectedPriority === 'all'}
                    onClick={() => setSelectedPriority('all')}
                  />
                  {qaPrioritySummary.map(({ priority, count }) => (
                    <FilterTile
                      key={priority}
                      count={count}
                      label={PRIORITY_LABELS[priority]}
                      color={PRIORITY_COLORS[priority]}
                      active={selectedPriority === String(priority)}
                      onClick={() => setSelectedPriority(String(priority))}
                    />
                  ))}
                </Box>
              </Box>

              {/* Table */}
              {qaFiltered.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No tickets match the selected filters.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 100 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 110 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 130 }}>Team</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 150 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 140 }}>Assignee</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 110 }}>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {qaFiltered.map((issue) => (
                      <TableRow key={issue.id} hover>
                        <TableCell>
                          <Chip
                            label={PRIORITY_LABELS[issue.priority]}
                            size="small"
                            sx={{
                              bgcolor: PRIORITY_COLORS[issue.priority] + '22',
                              color: PRIORITY_COLORS[issue.priority],
                              fontWeight: 600,
                              fontSize: 11,
                              border: `1px solid ${PRIORITY_COLORS[issue.priority]}44`,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Link href={issue.url} target="_blank" rel="noopener" underline="hover" sx={{ fontSize: 13, fontFamily: 'monospace' }}>
                            {issue.identifier}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <MuiTooltip title={issue.description ?? ''} placement="top-start" enterDelay={500}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 380 }}>
                              {issue.title}
                            </Typography>
                          </MuiTooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" noWrap>{issue.team?.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={issue.state?.name}
                            size="small"
                            sx={{ bgcolor: (issue.state?.color ?? '#94a3b8') + '33', color: issue.state?.color ?? '#94a3b8', fontSize: 11, fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          {issue.assignee ? (
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <Avatar src={issue.assignee.avatarUrl} sx={{ width: 22, height: 22, fontSize: 11 }}>
                                {issue.assignee.name.charAt(0)}
                              </Avatar>
                              <Typography variant="body2" noWrap>{issue.assignee.name}</Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.disabled">Unassigned</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {dayjs(issue.updatedAt).format('MMM D, YYYY')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Ticket Activity — {heading} (last 12 weeks)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="#5E6AD2" strokeWidth={2} name="Created" dot={false} />
                  <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedTeam === ALL_TEAMS ? 'Team Workload by Status' : `${heading} — Status Breakdown`}
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={teamData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {ALL_STATE_TYPES.map((t) => (
                    <Bar key={t} dataKey={t} stackId="status" fill={STATE_TYPE_COLORS[t]} name={STATE_TYPE_LABELS[t]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
