import { Box, Typography, Grid, Alert, Button, CircularProgress } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/useAppStore'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { StatsCards } from './StatsCards'
import { StatusChart } from './StatusChart'
import { PriorityChart } from './PriorityChart'
import { RecentTickets } from './RecentTickets'
import { NAV_ROUTES } from '../../constants'
import { LinearLoginButton } from '../LinearLogin'
import { LinearDataUpload } from '../LinearDataUpload'
import { useState, useEffect } from 'react'

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
  const navigate = useNavigate()
  const { issues, allIssues, isLoading } = useFilteredIssues()

  const [uploadedIssues, setUploadedIssues] = useState<any[] | null>(null)

  // Always read uploaded issues from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('linear-upload-data')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUploadedIssues(parsed)
        }
      }
    } catch {}
  }, [])

  if (isLoading && !uploadedIssues) {
    return (
      <LoadingCenter>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" ml={2}>Loading tickets…</Typography>
      </LoadingCenter>
    )
  }

  // Prefer uploaded issues if present
  const dashboardIssues = uploadedIssues && uploadedIssues.length > 0 ? uploadedIssues : allIssues

  // Debug: check for required fields in uploaded issues
  let uploadError = null
  if (uploadedIssues && uploadedIssues.length > 0) {
    // Check first issue for required fields
    const requiredFields = ['id', 'identifier', 'title', 'state', 'team']
    const first = uploadedIssues[0]
    for (const field of requiredFields) {
      if (!(field in first)) {
        uploadError = `Uploaded data is missing required field: ${field}`
        break
      }
    }
    // Check nested fields
    if (!uploadError) {
      if (!first.state || typeof first.state !== 'object' || !('name' in first.state)) {
        uploadError = 'Uploaded data: missing or invalid state field'
      }
      if (!first.team || typeof first.team !== 'object' || !('name' in first.team)) {
        uploadError = 'Uploaded data: missing or invalid team field'
      }
    }
    // Debug log
    // eslint-disable-next-line no-console
    console.log('Uploaded issues:', uploadedIssues)
  }

  return (
    <Box>
      <PageHeader>
        <Typography variant="h5">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          {dashboardIssues.length} total tickets
        </Typography>
        <LinearLoginButton />
      </PageHeader>

      <LinearDataUpload onData={setUploadedIssues} />

      {uploadError && (
        <Alert severity="error" sx={{ my: 2 }}>{uploadError}</Alert>
      )}

      <Box mb={3}>
        <StatsCards issues={dashboardIssues} />
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <StatusChart issues={dashboardIssues} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PriorityChart issues={dashboardIssues} />
        </Grid>
      </Grid>

      <RecentTickets issues={dashboardIssues} />
    </Box>
  )
}
