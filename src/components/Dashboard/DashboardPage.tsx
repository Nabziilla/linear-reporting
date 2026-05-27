import { useMemo, useState } from 'react'
import { Box, Typography, Grid, CircularProgress, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { StatsCards } from './StatsCards'
import { StatusChart } from './StatusChart'
import { PriorityChart } from './PriorityChart'
import { RecentTickets } from './RecentTickets'
import { TeamSummaryCards, ALL_TEAMS_KEY } from './TeamSummaryCards'

const PageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(3)
}))

const LoadingCenter = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: 200
})

export const DashboardPage = () => {
  const { allIssues, isLoading } = useFilteredIssues()
  const [selectedTeam, setSelectedTeam] = useState<string>(ALL_TEAMS_KEY)

  const scopedIssues = useMemo(() => {
    if (selectedTeam === ALL_TEAMS_KEY) return allIssues
    return allIssues.filter((i) => i.team?.name === selectedTeam)
  }, [allIssues, selectedTeam])

  if (isLoading) {
    return (
      <LoadingCenter>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" ml={2}>Loading tickets…</Typography>
      </LoadingCenter>
    )
  }

  const lowerLabel = selectedTeam === ALL_TEAMS_KEY ? 'All Teams Overview' : `${selectedTeam} Details`

  return (
    <Box>
      <PageHeader>
        <Typography variant="h5">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          {allIssues.length} total tickets
        </Typography>
      </PageHeader>

      <Typography variant="overline" color="text.secondary" display="block" mb={1}>
        By Team — click a card to drill down
      </Typography>
      <Box mb={3}>
        <TeamSummaryCards
          issues={allIssues}
          selectedTeam={selectedTeam}
          onSelectTeam={setSelectedTeam}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="overline" color="text.secondary" display="block" mb={1}>
        {lowerLabel} · {scopedIssues.length} tickets
      </Typography>
      <Box mb={3}>
        <StatsCards issues={scopedIssues} />
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <StatusChart issues={scopedIssues} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PriorityChart issues={scopedIssues} />
        </Grid>
      </Grid>

      <RecentTickets issues={scopedIssues} />
    </Box>
  )
}
