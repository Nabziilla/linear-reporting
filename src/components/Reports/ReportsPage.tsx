import { Box, Typography, Grid, Card, CardContent, Alert, Button, CircularProgress } from '@mui/material'
import { styled } from '@mui/material/styles'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { useAppStore } from '../../stores/useAppStore'
import { LinearIssue } from '../../types'
import { NAV_ROUTES } from '../../constants'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const buildTeamData = (issues: LinearIssue[]) => {
  const counts: Record<string, { open: number; done: number }> = {}
  issues.forEach((i) => {
    const team = i.team.name
    if (!counts[team]) counts[team] = { open: 0, done: 0 }
    if (i.state.type === 'completed') counts[team].done++
    else if (i.state.type !== 'cancelled') counts[team].open++
  })
  return Object.entries(counts).map(([name, v]) => ({ name, ...v }))
}

const buildWeeklyData = (issues: LinearIssue[]) => {
  const weeks: Record<string, { created: number; completed: number }> = {}
  issues.forEach((i) => {
    const week = dayjs(i.createdAt).startOf('isoWeek').format('MMM D')
    if (!weeks[week]) weeks[week] = { created: 0, completed: 0 }
    weeks[week].created++
    if (i.completedAt) {
      const cWeek = dayjs(i.completedAt).startOf('isoWeek').format('MMM D')
      if (!weeks[cWeek]) weeks[cWeek] = { created: 0, completed: 0 }
      weeks[cWeek].completed++
    }
  })
  return Object.entries(weeks)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-12)
    .map(([week, v]) => ({ week, ...v }))
}

const LoadingBox = styled(Box)({ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 })

export const ReportsPage = () => {
  const navigate = useNavigate()
  // No longer require Linear API key for reports
  const { issues, allIssues, isLoading } = useFilteredIssues()

  if (isLoading) {
    return <LoadingBox><CircularProgress /></LoadingBox>
  }

  const teamData = buildTeamData(allIssues)
  const weeklyData = buildWeeklyData(allIssues)
  const completionRate = allIssues.length > 0
    ? Math.round((allIssues.filter((i) => i.state.type === 'completed').length / allIssues.length) * 100)
    : 0

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          Completion rate: <strong>{completionRate}%</strong> · {issues.length} filtered of {allIssues.length} total
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Weekly Ticket Activity (last 12 weeks)</Typography>
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
              <Typography variant="h6" gutterBottom>Team Workload</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={teamData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" fill="#5E6AD2" name="Open" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="done" fill="#22c55e" name="Done" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
