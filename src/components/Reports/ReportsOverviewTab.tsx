import { useMemo } from 'react'
import { Box, Typography, Grid, Card, CardContent, Avatar } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import InsightsIcon from '@mui/icons-material/Insights'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell
} from 'recharts'
import { LinearIssue, StateType } from '../../types'
import {
  ALL_STATE_TYPES, STATE_TYPE_LABELS, STATE_TYPE_COLORS,
  ALL_PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS
} from '../../constants'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const ALL_TEAMS = '__all__'
const OPEN_EXCLUDED: StateType[] = ['completed', 'canceled', 'duplicate']

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

const PanelCard = styled(Card)(({ theme }) => ({
  borderRadius: 14,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
  height: '100%',
  background: theme.palette.background.paper,
  '& .MuiCardContent-root': { padding: theme.spacing(2.5) }
}))

const Kpi = ({ label, value, hint, color = '#2563eb' }: { label: string; value: string | number; hint?: string; color?: string }) => (
  <Box sx={{
    position: 'relative', p: 1.75, pl: 2.25, borderRadius: 3, bgcolor: 'background.paper',
    border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px rgba(16,24,40,0.04)', overflow: 'hidden'
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

const SectionHeader = ({ icon, color, title, subtitle }: {
  icon: React.ReactNode; color: string; title: string; subtitle?: string
}) => (
  <Box display="flex" alignItems="center" gap={1.5} mb={2} mt={0.5}>
    <Avatar variant="rounded" sx={{ bgcolor: `${color}1a`, color, width: 34, height: 34, borderRadius: 2 }}>
      {icon}
    </Avatar>
    <Box flex={1} minWidth={0}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
  </Box>
)

const ChartTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{children}</Typography>
)

interface ReportsOverviewTabProps {
  scopedIssues: LinearIssue[]
  selectedTeam: string
  heading: string
}

export const ReportsOverviewTab = ({ scopedIssues, selectedTeam, heading }: ReportsOverviewTabProps) => {
  const theme = useTheme()
  const GRID = theme.palette.divider
  const AXIS = theme.palette.text.secondary
  const TOOLTIP_STYLE = {
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
    fontSize: 12,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary
  }

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

  return (
    <Box>
      {/* KPIs and charts share one scrolling view: seven cards did not justify
          a sub-tab of their own, and splitting them left the landing view
          almost empty. */}
      <SectionHeader icon={<InsightsIcon fontSize="small" />} color="#2563eb" title="Overview" subtitle={`Ticket health for ${heading}`} />
      <KpiGrid>
        <Kpi label="Total" value={overview.total} color="#2563eb" />
        <Kpi label="Open" value={overview.open} hint="not done / cancelled" color="#0ea5e9" />
        <Kpi label="In progress" value={overview.inProgress} color="#f97316" />
        <Kpi label="Completed" value={overview.completed} hint={`${overview.completionRate}% completion`} color="#16a34a" />
        <Kpi label="Created (7d)" value={overview.createdThisWeek} color="#0891b2" />
        <Kpi label="Completed (7d)" value={overview.completedThisWeek} color="#16a34a" />
        <Kpi label="Stale open" value={overview.staleOpen} hint="no update 14d+" color={overview.staleOpen > 0 ? '#ea580c' : '#64748b'} />
      </KpiGrid>

      <Box mt={3.5}>
      <SectionHeader icon={<DonutLargeIcon fontSize="small" />} color="#7c3aed" title="Breakdowns & activity" subtitle="Where the work sits and how it flows" />
      <Grid container spacing={2.5}>
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
      </Box>
    </Box>
  )
}
