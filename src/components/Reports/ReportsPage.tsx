import { useMemo, useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, CircularProgress, Button, Stack, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import ScienceIcon from '@mui/icons-material/Science'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { useQaReport } from '../../hooks/useQaReport'
import { LinearConnectionNotice } from '../LinearConnectionNotice'
import { LinearIssue, StateType } from '../../types'
import {
  ALL_STATE_TYPES, STATE_TYPE_LABELS, STATE_TYPE_COLORS,
  ALL_PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS,
  NAV_ROUTES, QA_AGING_THRESHOLD_DAYS
} from '../../constants'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const ALL_TEAMS = '__all__'
const DAY_MS = 24 * 60 * 60 * 1000
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
    if (t && ALL_STATE_TYPES.includes(t)) {
      counts[team][t] = (counts[team][t] ?? 0) + 1
    }
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

const LoadingBox = styled(Box)({ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 })

const StatCard = ({ label, value, hint, color }: { label: string; value: string | number; hint?: string; color?: string }) => (
  <Card variant="outlined">
    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.15, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </CardContent>
  </Card>
)

const KpiGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2)
}))

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="overline" color="text.secondary" display="block" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>
    {children}
  </Typography>
)

export const ReportsPage = () => {
  const navigate = useNavigate()
  const { allIssues, isLoading, isError, error, hasApiKey, hasUploadedData } = useFilteredIssues()
  const [selectedTeam, setSelectedTeam] = useState<string>(ALL_TEAMS)

  // Condensed QA summary (workspace-wide, weekly throughput) with a link to the deep-dive.
  const qa = useQaReport('week')

  const scopedIssues = useMemo(() => {
    if (selectedTeam === ALL_TEAMS) return allIssues
    return allIssues.filter((i) => i.team?.name === selectedTeam)
  }, [allIssues, selectedTeam])

  const teamCounts = useMemo(() => buildTeamData(allIssues), [allIssues])
  const teamData = useMemo(() => buildTeamData(scopedIssues), [scopedIssues])
  const weeklyData = useMemo(() => buildWeeklyData(scopedIssues), [scopedIssues])

  const overview = useMemo(() => {
    const now = dayjs()
    const weekAgo = now.subtract(7, 'day')
    const staleCutoff = now.subtract(14, 'day')
    const typeCounts: Record<string, number> = {}
    const priorityCounts: Record<number, number> = {}
    let open = 0
    let completed = 0
    let createdThisWeek = 0
    let completedThisWeek = 0
    let staleOpen = 0

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

  // QA numbers, scoped to the selected team when one is chosen.
  const qaScoped = useMemo(() => {
    const queue = selectedTeam === ALL_TEAMS ? qa.queue : qa.queue.filter((i) => i.teamName === selectedTeam)
    const total = queue.length
    const aging = queue.filter((i) => i.qaAgeMs / DAY_MS >= QA_AGING_THRESHOLD_DAYS).length
    const avgAge = total ? queue.reduce((s, i) => s + i.qaAgeMs / DAY_MS, 0) / total : 0
    const oldest = queue.reduce<typeof queue[number] | null>((m, i) => (!m || i.qaAgeMs > m.qaAgeMs ? i : m), null)
    return { total, aging, avgAge, oldest }
  }, [qa.queue, selectedTeam])

  if (isLoading) {
    return <LoadingBox><CircularProgress /></LoadingBox>
  }

  if (isError || allIssues.length === 0) {
    return (
      <Box>
        <Typography variant="h5" mb={2}>Reports</Typography>
        <LinearConnectionNotice
          hasApiKey={hasApiKey}
          hasUploadedData={hasUploadedData}
          isError={isError}
          error={error}
          isEmpty={allIssues.length === 0}
        />
      </Box>
    )
  }

  const heading = selectedTeam === ALL_TEAMS ? 'All Teams' : selectedTeam
  const qaBounceRate = qa.activity && qa.activity.exited > 0 ? Math.round((qa.activity.bounced / qa.activity.exited) * 100) : 0

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5">Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>{heading}</strong> · {overview.total} tickets · completion {overview.completionRate}%
        </Typography>
      </Box>

      <Typography variant="overline" color="text.secondary" display="block" mb={1}>
        Filter by team
      </Typography>
      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
        <Chip
          label={`All teams: ${allIssues.length}`}
          size="small"
          color={selectedTeam === ALL_TEAMS ? 'primary' : 'default'}
          variant={selectedTeam === ALL_TEAMS ? 'filled' : 'outlined'}
          onClick={() => setSelectedTeam(ALL_TEAMS)}
        />
        {teamCounts.map(({ name, total }) => {
          const isSelected = selectedTeam === name
          return (
            <Chip
              key={name}
              label={`${name}: ${total}`}
              size="small"
              color={isSelected ? 'primary' : 'default'}
              variant={isSelected ? 'filled' : 'outlined'}
              onClick={() => setSelectedTeam(name)}
            />
          )
        })}
      </Box>

      {/* Comprehensive ticket overview */}
      <SectionTitle>Overview — {heading}</SectionTitle>
      <KpiGrid>
        <StatCard label="Total tickets" value={overview.total} color="#2563eb" />
        <StatCard label="Open" value={overview.open} hint="not done/cancelled" />
        <StatCard label="In progress" value={overview.inProgress} color="#f97316" />
        <StatCard label="Completed" value={overview.completed} hint={`${overview.completionRate}% completion`} color="#16a34a" />
        <StatCard label="Created (7d)" value={overview.createdThisWeek} color="#0891b2" />
        <StatCard label="Completed (7d)" value={overview.completedThisWeek} color="#16a34a" />
        <StatCard label="Stale open" value={overview.staleOpen} hint="no update 14d+" color={overview.staleOpen > 0 ? '#ea580c' : undefined} />
      </KpiGrid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Status distribution — {heading}</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={overview.statusData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <RTooltip />
                  <Bar dataKey="value" name="Tickets">
                    {overview.statusData.map((d) => <Cell key={d.type} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Priority distribution — {heading}</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={overview.priorityData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <RTooltip />
                  <Bar dataKey="value" name="Tickets">
                    {overview.priorityData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Ticket Activity — {heading} (last 12 weeks)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="#5E6AD2" strokeWidth={2} name="Created" dot={false} />
                  <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedTeam === ALL_TEAMS ? 'Team Workload by Status' : `${heading} — Status Breakdown`}
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={teamData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Legend />
                  {ALL_STATE_TYPES.map((t) => (
                    <Bar
                      key={t}
                      dataKey={t}
                      stackId="status"
                      fill={STATE_TYPE_COLORS[t]}
                      name={STATE_TYPE_LABELS[t]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Condensed QA summary with a link to the full report */}
      <SectionTitle>QA summary — {heading}</SectionTitle>
      <Card variant="outlined" sx={{ borderColor: '#c7d2fe' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <ScienceIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>Quality Assurance (In QA state)</Typography>
            <Box flex={1} />
            <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(NAV_ROUTES.QA_REPORT)}>
              Open full QA Report
            </Button>
          </Box>

          {qa.isLoading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
          ) : (
            <>
              <KpiGrid sx={{ mb: 1 }}>
                <StatCard label="In QA now" value={qaScoped.total} color="#2563eb" />
                <StatCard label={`Aging > ${QA_AGING_THRESHOLD_DAYS}d`} value={qaScoped.aging} color={qaScoped.aging > 0 ? '#ea580c' : undefined} hint="need attention" />
                <StatCard label="Avg age in QA" value={`${qaScoped.avgAge.toFixed(1)}d`} />
                <StatCard label="Oldest in QA" value={qaScoped.oldest ? `${(qaScoped.oldest.qaAgeMs / DAY_MS).toFixed(1)}d` : '—'} hint={qaScoped.oldest?.identifier ?? ''} color={qaScoped.oldest && qaScoped.oldest.qaAgeMs / DAY_MS >= 5 ? '#dc2626' : undefined} />
              </KpiGrid>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Throughput this week (all teams)
              </Typography>
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`Entered QA: ${qa.activity?.entered ?? 0}`} sx={{ bgcolor: '#cffafe' }} />
                <Chip size="small" label={`Cleared: ${qa.activity?.exited ?? 0}`} />
                <Chip size="small" label={`Passed: ${qa.activity?.passed ?? 0}`} sx={{ bgcolor: '#dcfce7', color: '#166534' }} />
                <Chip
                  size="small"
                  icon={qaBounceRate >= 30 ? <WarningAmberIcon /> : undefined}
                  label={`Bounced: ${qa.activity?.bounced ?? 0} (${qaBounceRate}%)`}
                  sx={{ bgcolor: qaBounceRate >= 30 ? '#fee2e2' : '#f1f5f9', color: qaBounceRate >= 30 ? '#b91c1c' : undefined }}
                />
              </Stack>
              {selectedTeam !== ALL_TEAMS && (
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Queue metrics above are scoped to {heading}; weekly throughput is workspace-wide — see the full QA Report for per-ticket detail.
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Box sx={{ height: 24 }} />
    </Box>
  )
}
