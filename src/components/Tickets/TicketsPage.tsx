import { useState } from 'react'
import { Box, Typography, Alert, Button, CircularProgress, Drawer } from '@mui/material'
import { styled } from '@mui/material/styles'
import FilterListIcon from '@mui/icons-material/FilterList'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/useAppStore'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { TicketFilters } from './TicketFilters'
import { TicketTable } from './TicketTable'
import { TicketDetail } from './TicketDetail'
import { QASummary } from './QASummary'
import { LinearIssue } from '../../types'
import { NAV_ROUTES } from '../../constants'

const FILTER_WIDTH = 260

const PageRoot = styled(Box)({ display: 'flex', height: '100%', gap: 0 })

const FilterPanel = styled(Box)(({ theme }) => ({
  width: FILTER_WIDTH,
  flexShrink: 0,
  padding: theme.spacing(2),
  borderRight: '1px solid #e2e8f0',
  overflowY: 'auto',
  display: 'none',
  '@media (min-width: 900px)': { display: 'block' }
}))

const TablePanel = styled(Box)({ flex: 1, overflow: 'auto' })

const PageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderBottom: '1px solid #e2e8f0'
}))

export const TicketsPage = () => {
  const navigate = useNavigate()

  const { issues, allIssues, isLoading } = useFilteredIssues()
  const [selectedIssue, setSelectedIssue] = useState<LinearIssue | null>(null)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  return (
    <Box display="flex" flexDirection="column" height="100%" sx={{ m: -3 }}>
      <PageHeader>
        <Box>
          <Typography variant="h6">Tickets</Typography>
          <Typography variant="caption" color="text.secondary">
            {isLoading ? 'Loading…' : `${issues.length} of ${allIssues.length} tickets`}
          </Typography>
        </Box>
        <Button startIcon={<FilterListIcon />} onClick={() => setMobileFilterOpen(true)} sx={{ display: { md: 'none' } }}>
          Filters
        </Button>
      </PageHeader>

      <PageRoot>
        <FilterPanel>
          <TicketFilters />
        </FilterPanel>

        <Drawer open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} anchor="left" PaperProps={{ sx: { width: FILTER_WIDTH, p: 2 } }}>
          <TicketFilters />
        </Drawer>

        <TablePanel>
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={300}>
              <CircularProgress />
            </Box>
          ) : issues.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={300}>
              <Typography color="text.secondary">No tickets match the current filters.</Typography>
            </Box>
          ) : (
            <>
              <TicketTable issues={issues} onSelectIssue={setSelectedIssue} />
              <QASummary issues={issues} onSelectIssue={setSelectedIssue} />
            </>
          )}
        </TablePanel>
      </PageRoot>

      <TicketDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </Box>
  )
}
