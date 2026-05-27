import { useMemo, useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, CircularProgress } from '@mui/material'
import { styled } from '@mui/material/styles'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { LinearIssue, StateType } from '../../types'
import { ALL_STATE_TYPES, STATE_TYPE_LABELS, STATE_TYPE_COLORS } from '../../constants'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const ALL_TEAMS = '__all__'
const EXPECTED_TEAMS = ['CORE', 'Operator Core', 'Member Core', 'Member App', 'Operator Intelligence']

type TeamRow = { name: string; total: number } & Partial<Record<StateType, number>>

const buildTeamData = (issues: LinearIssue[]): TeamRow[] => {
  const counts: Record<string, TeamRow> = {}
  const initRow = (name: string): TeamRow => {
    const row: TeamRow = { name, total: 0 }
    for (const t of ALL_STATE_TYPES) row[t] = 0
    return row
  }
  EXPECTED_TEAMS.forEach((name) => { counts[name] = initRow(name) })
  for (const i of issues) {
    const team = i.team?.name ?? 'Unknown'
    if (!counts[team]) counts[team] = initRow(team)
    const t = i.state?.type as StateType | undefined
    if (t && ALL_STATE_TYPES.includes(t)) {
      counts[team][t] = (counts[team][t] ?? 0) + 1
    }
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

const LoadingBox = styled(Box)({ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 })

export const ReportsPage = () => {
  const { issues, allIssues, isLoading } = useFilteredIssues()
  const [selectedTeam, setSelectedTeam] = useState<string>(ALL_TEAMS)

  const scopedIssues = useMemo(() => {
    if (selectedTeam === ALL_TEAMS) return allIssues
    return allIssues.filter((i) => i.team?.name === selectedTeam)
  }, [allIssues, selectedTeam])

  const teamCounts = useMemo(() => buildTeamData(allIssues), [allIssues])
  const teamData = useMemo(() => buildTeamData(scopedIssues), [scopedIssues])
  const weeklyData = useMemo(() => buildWeeklyData(scopedIssues), [scopedIssues])
  const completedCount = scopedIssues.filter((i) => i.state?.type === 'completed').length
  const completionRate = scopedIssues.length > 0
    ? Math.round((completedCount / scopedIssues.length) * 100)
    : 0

  if (isLoading) {
    return <LoadingBox><CircularProgress /></LoadingBox>
  }

  const heading = selectedTeam === ALL_TEAMS ? 'All Teams' : selectedTeam

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>{heading}</strong> · Completion rate: <strong>{completionRate}%</strong> · {issues.length} filtered of {scopedIssues.length} total
        </Typography>
      </Box>

      <Typography variant="overline" color="text.secondary" display="block" mb={1}>
        Filter by team
      </Typography>
      <Box display="flex" gap={1} flexWrap="wrap" mb={3}>
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
              color={isSelected ? 'primary' : total === 0 ? 'default' : 'primary'}
              variant={isSelected ? 'filled' : 'outlined'}
              onClick={() => setSelectedTeam(name)}
              disabled={total === 0}
            />
          )
        })}
      </Box>

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
    </Box>
  )
}
