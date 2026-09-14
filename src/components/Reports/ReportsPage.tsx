import { useMemo, useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, CircularProgress, Button,
  Stack, Divider, ToggleButton, ToggleButtonGroup, Avatar, TextField, Tooltip
} from '@mui/material'
import { styled } from '@mui/material/styles'
import ScienceIcon from '@mui/icons-material/Science'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import InsightsIcon from '@mui/icons-material/Insights'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonIcon from '@mui/icons-material/Person'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import TimelineIcon from '@mui/icons-material/Timeline'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { useQaReport } from '../../hooks/useQaReport'
import { LinearConnectionNotice } from '../LinearConnectionNotice'
import { LinearIssue, StateType, QaPeriod, QaExitItem } from '../../types'
import {
  ALL_STATE_TYPES, STATE_TYPE_LABELS, STATE_TYPE_COLORS,
  ALL_PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS,
  NAV_ROUTES, QA_AGING_THRESHOLD_DAYS, QA_AGE_BUCKETS, QA_TEAM_MEMBERS
} from '../../constants'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const ALL_TEAMS = '__all__'
const DAY_MS = 24 * 60 * 60 * 1000
const OPEN_EXCLUDED: StateType[] = ['completed', 'canceled', 'duplicate']
const ROSTER = QA_TEAM_MEMBERS as readonly string[]
const QA_SET = new Set(ROSTER)
const firstName = (n: string) => n.split(' ')[0]
const isQaMember = (n?: string | null) => !!n && QA_SET.has(n)

const GRID = '#eef1f6'
const AXIS = '#94a3b8'
const TOOLTIP_STYLE = { borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', fontSize: 12 }

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
  return Object.values(counts).sort((a, b) => b.total - a.total)
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

const bucketIndex = (days: number) => {
  for (let i = 0; i < QA_AGE_BUCKETS.length; i += 1) if (days < QA_AGE_BUCKETS[i].maxDays) return i
  return QA_AGE_BUCKETS.length - 1
}

const LoadingBox = styled(Box)({ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 })

const PanelCard = styled(Card)(({ theme }) => ({
  borderRadius: 14,
  border: '1px solid #e6e9f0',
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
  height: '100%',
  '& .MuiCardContent-root': { padding: theme.spacing(2.5) }
}))

// KPI tile with a coloured accent bar.
const Kpi = ({ label, value, hint, color = '#2563eb' }: { label: string; value: string | number; hint?: string; color?: string }) => (
  <Box sx={{
    position: 'relative', p: 1.75, pl: 2.25, borderRadius: 3, bgcolor: '#fff',
    border: '1px solid #e6e9f0', boxShadow: '0 1px 2px rgba(16,24,40,0.04)', overflow: 'hidden'
  }}>
    <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: color }} />
    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, color, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
    {hint && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{hint}</Typography>}
  </Box>
)

const KpiGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
  gap: theme.spacing(1.5)
}))

const SectionHeader = ({ icon, color, title, subtitle, action }: {
  icon: React.ReactNode; color: string; title: string; subtitle?: string; action?: React.ReactNode
}) => (
  <Box display="flex" alignItems="center" gap={1.5} mb={2} mt={0.5}>
    <Avatar variant="rounded" sx={{ bgcolor: `${color}1a`, color, width: 34, height: 34, borderRadius: 2 }}>
      {icon}
    </Avatar>
    <Box flex={1} minWidth={0}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
    {action}
  </Box>
)

const ChartTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{children}</Typography>
)

// A scrollable list of tickets that left QA (passed forward or bounced back).
const ExitList = ({ title, color, items, emptyText }: { title: string; color: string; items: QaExitItem[]; emptyText: string }) => (
  <PanelCard><CardContent>
    <Box display="flex" alignItems="center" gap={1} mb={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
      <Chip size="small" label={items.length} sx={{ bgcolor: `${color}1a`, color, fontWeight: 700, height: 20 }} />
    </Box>
    {items.length === 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{emptyText}</Typography>
    ) : (
      <Stack spacing={0.5} sx={{ maxHeight: 340, overflowY: 'auto', pr: 0.5 }}>
        {items.map((e) => (
          <Box key={e.id + e.at} onClick={() => window.open(e.url, '_blank', 'noopener')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' } }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#5E6AD2', minWidth: 62 }}>{e.identifier}</Typography>
            <Tooltip title={e.title}><Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{e.title}</Typography></Tooltip>
            <Chip size="small" label={e.toState} sx={{ height: 18, fontSize: 10, bgcolor: `${color}14`, color, '& .MuiChip-label': { px: 0.75 } }} />
            <Box sx={{ minWidth: 96, textAlign: 'right', whiteSpace: 'nowrap' }}>
              <Typography component="span" variant="caption" color="text.secondary">
                {e.assigneeName ? firstName(e.assigneeName) : '—'}
              </Typography>
              {e.assigneeName && !isQaMember(e.assigneeName) && (
                <Box component="span" sx={{ ml: 0.5, px: 0.5, py: '1px', borderRadius: 0.75, bgcolor: '#fef3c7', color: '#92400e', fontSize: 9, fontWeight: 700 }}>
                  non-QA
                </Box>
              )}
              <Typography component="span" variant="caption" color="text.secondary"> · {dayjs(e.at).format('D MMM')}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    )}
  </CardContent></PanelCard>
)

export const ReportsPage = () => {
  const navigate = useNavigate()
  const { allIssues, isLoading, isError, error, hasApiKey, hasUploadedData } = useFilteredIssues()
  const [selectedTeam, setSelectedTeam] = useState<string>(ALL_TEAMS)
  const [qaPeriod, setQaPeriod] = useState<QaPeriod>('week')
  const [people, setPeople] = useState<string[]>([])
  const [range, setRange] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [qaDim, setQaDim] = useState<'assignee' | 'team'>('assignee')

  const peopleSet = useMemo(() => new Set(people), [people])
  const dateActive = !!(range.from || range.to)
  // When a date range is chosen, it drives the QA activity window; otherwise the period toggle does.
  const activitySince = range.from ? dayjs(range.from).startOf('day').toISOString() : undefined
  const qa = useQaReport(qaPeriod, activitySince)

  const scopedIssues = useMemo(() => {
    const from = range.from ? dayjs(range.from).startOf('day') : null
    const to = range.to ? dayjs(range.to).endOf('day') : null
    return allIssues.filter((i) => {
      if (selectedTeam !== ALL_TEAMS && i.team?.name !== selectedTeam) return false
      if (peopleSet.size && !(i.assignee && peopleSet.has(i.assignee.name))) return false
      if (from || to) {
        if (!i.createdAt) return false
        const c = dayjs(i.createdAt)
        if (from && c.isBefore(from)) return false
        if (to && c.isAfter(to)) return false
      }
      return true
    })
  }, [allIssues, selectedTeam, peopleSet, range])

  const teamCounts = useMemo(() => buildTeamData(allIssues), [allIssues])
  const teamData = useMemo(() => buildTeamData(scopedIssues), [scopedIssues])
  const weeklyData = useMemo(() => buildWeeklyData(scopedIssues), [scopedIssues])

  const overview = useMemo(() => {
    const now = dayjs()
    const weekAgo = now.subtract(7, 'day')
    const staleCutoff = now.subtract(14, 'day')
    const typeCounts: Record<string, number> = {}
    const priorityCounts: Record<number, number> = {}
    let open = 0, completed = 0, createdThisWeek = 0, completedThisWeek = 0, staleOpen = 0

    for (const i of scopedIssues) {
      const t = i.state?.type as StateType
      typeCounts[t] = (typeCounts[t] ?? 0) + 1
      priorityCounts[i.priority] = (priorityCounts[i.priority] ?? 0) + 1
      const isOpen = !OPEN_EXCLUDED.includes(t)
      if (isOpen) open += 1
      if (t === 'completed') completed += 1
      if (i.createdAt && dayjs(i.createdAt).isAfter(weekAgo)) createdThisWeek += 1
      if (i.completedAt && dayjs(i.completedAt).isAfter(weekAgo)) completedThisWeek += 1
      if (isOpen && i.updatedAt && dayjs(i.updatedAt).isBefore(staleCutoff)) staleOpen += 1
    }

    const total = scopedIssues.length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const inProgress = typeCounts['started'] ?? 0
    const statusData = ALL_STATE_TYPES
      .map((t) => ({ name: STATE_TYPE_LABELS[t], type: t, value: typeCounts[t] ?? 0, color: STATE_TYPE_COLORS[t] }))
      .filter((d) => d.value > 0)
    const priorityData = ALL_PRIORITIES
      .map((p) => ({ name: PRIORITY_LABELS[p], value: priorityCounts[p] ?? 0, color: PRIORITY_COLORS[p] }))
      .filter((d) => d.value > 0)

    return { total, open, completed, completionRate, inProgress, createdThisWeek, completedThisWeek, staleOpen, statusData, priorityData }
  }, [scopedIssues])

  // QA data, scoped to the selected team + people.
  const qaView = useMemo(() => {
    const queue = qa.queue.filter((i) =>
      (selectedTeam === ALL_TEAMS || i.teamName === selectedTeam) &&
      (peopleSet.size === 0 || peopleSet.has(i.assigneeName ?? ''))
    )
    const total = queue.length
    const ages = queue.map((i) => i.qaAgeMs / DAY_MS)
    const avgAge = total ? ages.reduce((a, b) => a + b, 0) / total : 0
    const sorted = [...ages].sort((a, b) => a - b)
    const medianAge = total ? (total % 2 ? sorted[(total - 1) / 2] : (sorted[total / 2 - 1] + sorted[total / 2]) / 2) : 0
    const aging = ages.filter((d) => d >= QA_AGING_THRESHOLD_DAYS).length
    const oldest = queue.reduce<typeof queue[number] | null>((m, i) => (!m || i.qaAgeMs > m.qaAgeMs ? i : m), null)

    const buckets = QA_AGE_BUCKETS.map((b) => ({ label: b.label, color: b.color, count: 0 }))
    for (const d of ages) buckets[bucketIndex(d)].count += 1

    const group = (keyOf: (i: typeof queue[number]) => string) => {
      const map = new Map<string, { name: string; fresh: number; aging: number; count: number }>()
      for (const i of queue) {
        const name = keyOf(i)
        const row = map.get(name) ?? { name, fresh: 0, aging: 0, count: 0 }
        const isAging = i.qaAgeMs / DAY_MS >= QA_AGING_THRESHOLD_DAYS
        row.count += 1
        if (isAging) row.aging += 1; else row.fresh += 1
        map.set(name, row)
      }
      return Array.from(map.values()).sort((a, b) => b.count - a.count)
    }
    const byTeam = group((i) => i.teamName)
    const byAssignee = group((i) => {
      const n = i.assigneeName
      if (!n) return 'Unassigned'
      return isQaMember(n) ? firstName(n) : 'Others (non-QA)'
    })

    return { total, avgAge, medianAge, aging, oldest, buckets, byTeam, byAssignee }
  }, [qa.queue, selectedTeam, peopleSet])

  // Tickets that LEFT "In QA" within the selected window — passed forward vs bounced back to a dev.
  const exits = useMemo(() => {
    const items = qa.activity?.exitedItems ?? []
    const from = range.from ? dayjs(range.from).startOf('day') : (qa.sinceISO ? dayjs(qa.sinceISO) : null)
    const to = range.to ? dayjs(range.to).endOf('day') : dayjs()
    const teamKey = selectedTeam === ALL_TEAMS
      ? null
      : (qa.queue.find((i) => i.teamName === selectedTeam)?.teamKey ?? '__none__')
    const filtered = items.filter((e) => {
      const t = dayjs(e.at)
      if (from && t.isBefore(from)) return false
      if (t.isAfter(to)) return false
      if (teamKey && e.teamKey !== teamKey) return false
      if (peopleSet.size && !peopleSet.has(e.assigneeName ?? '')) return false
      return true
    }).sort((a, b) => (a.at < b.at ? 1 : -1))
    return { passed: filtered.filter((e) => e.passed), bounced: filtered.filter((e) => !e.passed) }
  }, [qa.activity, qa.sinceISO, qa.queue, range, selectedTeam, peopleSet])

  if (isLoading) return <LoadingBox><CircularProgress /></LoadingBox>

  if (isError || allIssues.length === 0) {
    return (
      <Box>
        <Typography variant="h5" mb={2}>Reports</Typography>
        <LinearConnectionNotice
          hasApiKey={hasApiKey} hasUploadedData={hasUploadedData}
          isError={isError} error={error} isEmpty={allIssues.length === 0}
        />
      </Box>
    )
  }

  const heading = selectedTeam === ALL_TEAMS ? 'All Teams' : selectedTeam
  const periodLabel = qaPeriod === 'day' ? 'today' : qaPeriod === 'week' ? 'this week' : 'this month'
  const windowLabel = dateActive ? 'in range' : periodLabel
  const passedN = exits.passed.length
  const bouncedN = exits.bounced.length
  const exitTotal = passedN + bouncedN
  const bounceRate = exitTotal ? Math.round((bouncedN / exitTotal) * 100) : 0

  const allRosterSelected = ROSTER.every((n) => peopleSet.has(n))
  const toggleMyTeam = () => setPeople(allRosterSelected ? [] : [...ROSTER])
  const togglePerson = (n: string) => setPeople((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]))
  const setPreset = (v: number | 'month' | 'all') => {
    if (v === 'all') return setRange({ from: '', to: '' })
    if (v === 'month') return setRange({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') })
    setRange({ from: dayjs().subtract(v, 'day').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') })
  }
  const peopleLabel = people.length ? (allRosterSelected ? 'My QA Team' : people.map(firstName).join(', ')) : null
  const dateLabel = dateActive ? `${range.from || '…'} → ${range.to || 'now'}` : null

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto', pb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={2.5} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Reports</Typography>
          <Typography variant="body2" color="text.secondary">
            {heading}{peopleLabel ? ` · ${peopleLabel}` : ''}{dateLabel ? ` · ${dateLabel}` : ''} · {overview.total} tickets · {overview.completionRate}% completion
          </Typography>
        </Box>
      </Box>

      {/* Team filter */}
      <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #eef1f6', mb: 3 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
          Filter by team
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            label={`All teams · ${allIssues.length}`} size="small"
            color={selectedTeam === ALL_TEAMS ? 'primary' : 'default'}
            variant={selectedTeam === ALL_TEAMS ? 'filled' : 'outlined'}
            onClick={() => setSelectedTeam(ALL_TEAMS)}
          />
          {teamCounts.map(({ name, total }) => (
            <Chip
              key={name} label={`${name} · ${total}`} size="small"
              color={selectedTeam === name ? 'primary' : 'default'}
              variant={selectedTeam === name ? 'filled' : 'outlined'}
              onClick={() => setSelectedTeam(name)}
            />
          ))}
        </Box>
      </Box>

      {/* People filter */}
      <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #eef1f6', mb: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            People
          </Typography>
          {people.length > 0 && (
            <Chip size="small" label={`Clear (${people.length})`} variant="outlined" onClick={() => setPeople([])} />
          )}
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            icon={<GroupsIcon />} label="My QA Team" size="small"
            color={allRosterSelected ? 'primary' : 'default'} variant={allRosterSelected ? 'filled' : 'outlined'}
            onClick={toggleMyTeam}
          />
          {ROSTER.map((n) => (
            <Chip
              key={n} label={firstName(n)} size="small"
              color={peopleSet.has(n) ? 'primary' : 'default'} variant={peopleSet.has(n) ? 'filled' : 'outlined'}
              onClick={() => togglePerson(n)}
            />
          ))}
        </Box>
      </Box>

      {/* Date range filter */}
      <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #eef1f6', mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Created between
          </Typography>
          <TextField type="date" size="small" value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            sx={{ bgcolor: '#fff', '& input': { py: 0.75, fontSize: 13 } }} />
          <Typography variant="body2" color="text.secondary">→</Typography>
          <TextField type="date" size="small" value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            sx={{ bgcolor: '#fff', '& input': { py: 0.75, fontSize: 13 } }} />
          <Box sx={{ flex: 1 }} />
          {([['7d', 7], ['30d', 30], ['90d', 90], ['Month', 'month'], ['All', 'all']] as const).map(([label, v]) => (
            <Chip key={label} label={label} size="small" variant="outlined" onClick={() => setPreset(v)} />
          ))}
        </Box>
      </Box>

      {/* Overview */}
      <SectionHeader icon={<InsightsIcon fontSize="small" />} color="#2563eb" title="Overview" subtitle={`Ticket health for ${heading}`} />
      <KpiGrid sx={{ mb: 3.5 }}>
        <Kpi label="Total" value={overview.total} color="#2563eb" />
        <Kpi label="Open" value={overview.open} hint="not done / cancelled" color="#0ea5e9" />
        <Kpi label="In progress" value={overview.inProgress} color="#f97316" />
        <Kpi label="Completed" value={overview.completed} hint={`${overview.completionRate}% completion`} color="#16a34a" />
        <Kpi label="Created (7d)" value={overview.createdThisWeek} color="#0891b2" />
        <Kpi label="Completed (7d)" value={overview.completedThisWeek} color="#16a34a" />
        <Kpi label="Stale open" value={overview.staleOpen} hint="no update 14d+" color={overview.staleOpen > 0 ? '#ea580c' : '#64748b'} />
      </KpiGrid>

      {/* Distributions & activity */}
      <SectionHeader icon={<DonutLargeIcon fontSize="small" />} color="#7c3aed" title="Breakdowns & activity" subtitle="Where the work sits and how it flows" />
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} md={6}>
          <PanelCard><CardContent>
            <ChartTitle>Status distribution</ChartTitle>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={overview.statusData} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: AXIS }} width={92} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Tickets" radius={[0, 5, 5, 0]} barSize={16}>
                  {overview.statusData.map((d) => <Cell key={d.type} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent></PanelCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <PanelCard><CardContent>
            <ChartTitle>Priority distribution</ChartTitle>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={overview.priorityData} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: AXIS }} width={92} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Tickets" radius={[0, 5, 5, 0]} barSize={16}>
                  {overview.priorityData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent></PanelCard>
        </Grid>

        <Grid item xs={12}>
          <PanelCard><CardContent>
            <ChartTitle>Weekly activity — last 12 weeks</ChartTitle>
            <ResponsiveContainer width="100%" height={270}>
              <LineChart data={weeklyData} margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="created" stroke="#5E6AD2" strokeWidth={2.5} name="Created" dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={2.5} name="Completed" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent></PanelCard>
        </Grid>

        <Grid item xs={12}>
          <PanelCard><CardContent>
            <ChartTitle>{selectedTeam === ALL_TEAMS ? 'Team workload by status' : `${heading} — status breakdown`}</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamData} margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {ALL_STATE_TYPES.map((t) => (
                  <Bar key={t} dataKey={t} stackId="s" fill={STATE_TYPE_COLORS[t]} name={STATE_TYPE_LABELS[t]} maxBarSize={54} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent></PanelCard>
        </Grid>
      </Grid>

      {/* Quality Assurance */}
      <Box sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, bgcolor: '#faf9ff', border: '1px solid #e7e2fb' }}>
        <SectionHeader
          icon={<ScienceIcon fontSize="small" />} color="#7c3aed"
          title="Quality Assurance"
          subtitle={`Tickets in the "In QA" state · ${heading}`}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <ToggleButtonGroup
                size="small" exclusive value={qaPeriod}
                onChange={(_e, v) => v && setQaPeriod(v)}
                sx={{ bgcolor: '#fff', '& .MuiToggleButton-root': { px: 1.25, py: 0.5, textTransform: 'none', fontSize: 12, border: '1px solid #e7e2fb' } }}
              >
                <ToggleButton value="day">Day</ToggleButton>
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
              </ToggleButtonGroup>
              <Button size="small" variant="contained" disableElevation endIcon={<ArrowForwardIcon />}
                onClick={() => navigate(NAV_ROUTES.QA_REPORT)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                Full QA Report
              </Button>
            </Stack>
          }
        />

        {qa.isLoading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress size={26} /></Box>
        ) : (
          <>
            <KpiGrid sx={{ mb: 2.5 }}>
              <Kpi label="In QA now" value={qaView.total} color="#7c3aed" />
              <Kpi label={`Aging ≥ ${QA_AGING_THRESHOLD_DAYS}d`} value={qaView.aging} hint="need attention" color={qaView.aging > 0 ? '#dc2626' : '#64748b'} />
              <Kpi label="Avg age" value={`${qaView.avgAge.toFixed(1)}d`} color="#0891b2" />
              <Kpi label="Median age" value={`${qaView.medianAge.toFixed(1)}d`} color="#0891b2" />
              <Kpi label="Oldest" value={qaView.oldest ? `${(qaView.oldest.qaAgeMs / DAY_MS).toFixed(1)}d` : '—'} hint={qaView.oldest?.identifier ?? ''} color={qaView.oldest && qaView.oldest.qaAgeMs / DAY_MS >= 5 ? '#dc2626' : '#64748b'} />
              <Kpi label={`Passed (${windowLabel})`} value={passedN} hint="to next stage" color="#16a34a" />
              <Kpi label={`Bounced (${windowLabel})`} value={`${bouncedN}${bounceRate ? ` · ${bounceRate}%` : ''}`} hint="back to dev" color={bounceRate >= 30 ? '#dc2626' : '#64748b'} />
            </KpiGrid>

            <Grid container spacing={2.5}>
              <Grid item xs={12} md={7}>
                <PanelCard><CardContent>
                  <Box display="flex" alignItems="center" mb={1.5} gap={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>In QA breakdown</Typography>
                    <ToggleButtonGroup size="small" exclusive value={qaDim} onChange={(_e, v) => v && setQaDim(v)}
                      sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.25, textTransform: 'none', fontSize: 11, border: '1px solid #e7e2fb' } }}>
                      <ToggleButton value="assignee"><PersonIcon sx={{ fontSize: 14, mr: 0.5 }} />By person</ToggleButton>
                      <ToggleButton value="team"><GroupsIcon sx={{ fontSize: 14, mr: 0.5 }} />By team</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  {(() => {
                    const data = qaDim === 'assignee' ? qaView.byAssignee : qaView.byTeam
                    if (!data.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>Nothing in QA right now.</Typography>
                    return (
                      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
                        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: AXIS }} width={110} axisLine={false} tickLine={false} />
                          <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="fresh" stackId="q" name={`< ${QA_AGING_THRESHOLD_DAYS}d`} fill="#a78bfa" radius={[5, 0, 0, 5]} barSize={16} />
                          <Bar dataKey="aging" stackId="q" name={`aging ≥ ${QA_AGING_THRESHOLD_DAYS}d`} fill="#dc2626" radius={[0, 5, 5, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })()}
                </CardContent></PanelCard>
              </Grid>

              <Grid item xs={12} md={5}>
                <PanelCard><CardContent>
                  <ChartTitle><Box component={TimelineIcon} sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5, color: '#7c3aed' }} />Time in QA</ChartTitle>
                  {qaView.total === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>Nothing in QA right now.</Typography>
                  ) : (
                    <Stack spacing={1.25} sx={{ mt: 0.5 }}>
                      {qaView.buckets.map((b) => {
                        const pct = qaView.total ? Math.round((b.count / qaView.total) * 100) : 0
                        return (
                          <Box key={b.label}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>{b.label}</Typography>
                              <Typography variant="caption" color="text.secondary">{b.count} · {pct}%</Typography>
                            </Box>
                            <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#eef1f6', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: b.color, borderRadius: 4, transition: 'width .3s' }} />
                            </Box>
                          </Box>
                        )
                      })}
                    </Stack>
                  )}
                </CardContent></PanelCard>
              </Grid>
            </Grid>

            <Box mt={3} mb={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Left QA {dateActive ? `· ${range.from || '…'} → ${range.to || 'now'}` : `· ${periodLabel}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tickets that moved to the next stage or bounced back to a dev — click to open in Linear
              </Typography>
            </Box>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <ExitList title="Bounced back to dev" color="#dc2626" items={exits.bounced} emptyText="None bounced back in this window." />
              </Grid>
              <Grid item xs={12} md={6}>
                <ExitList title="Moved to next stage" color="#16a34a" items={exits.passed} emptyText="None moved forward in this window." />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              {exitTotal} QA exit{exitTotal === 1 ? '' : 's'} shown for {heading}{peopleLabel ? ` · ${peopleLabel}` : ''} — {passedN} forward, {bouncedN} back to dev.
              Open the full QA Report for per-ticket detail.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  )
}
