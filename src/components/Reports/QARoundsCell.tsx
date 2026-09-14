import { useMemo } from 'react'
import { Box, Chip, Skeleton, Tooltip, Typography } from '@mui/material'
import { useIssueHistory } from '../../hooks/useLinearData'
import { analyseQARounds, EMPTY_QA_SUMMARY } from '../../utils/qaRounds'

interface QARoundsCellProps {
  issueId: string
  /** Gate the request so rows only fetch when their section is expanded. */
  enabled?: boolean
}

/**
 * Shows how many times a ticket bounced back from QA to development.
 *
 * Each cell issues its own history request, which is why this is only used in
 * drill-down tables: fetching history across the whole workspace would be far
 * too expensive against Linear's query complexity budget.
 */
export const QARoundsCell = ({ issueId, enabled = true }: QARoundsCellProps) => {
  const { data, isLoading, isError } = useIssueHistory(issueId, enabled)

  const summary = useMemo(
    () => (data?.entries ? analyseQARounds(data.entries) : EMPTY_QA_SUMMARY),
    [data]
  )

  if (!enabled) return <Typography variant="caption" color="text.disabled">—</Typography>
  if (isLoading) return <Skeleton variant="text" width={64} />
  if (isError) {
    return (
      <Tooltip title="Could not load this ticket's history" arrow>
        <Typography variant="caption" color="text.disabled">n/a</Typography>
      </Tooltip>
    )
  }

  if (summary.rounds === 0) {
    return <Typography variant="caption" color="text.disabled">—</Typography>
  }

  const { bounces, rounds, path } = summary
  const clean = bounces === 0
  const color = clean ? '#22c55e' : bounces === 1 ? '#f97316' : '#f43f5e'

  return (
    <Tooltip
      arrow
      title={
        <Box>
          <Typography variant="caption" display="block" sx={{ fontWeight: 700 }}>
            {rounds} QA round{rounds === 1 ? '' : 's'}
            {data?.hasMore ? ' (partial history)' : ''}
          </Typography>
          {path.length > 0 && (
            <Typography variant="caption" display="block">
              {path.join(' → ')}
            </Typography>
          )}
        </Box>
      }
    >
      <Chip
        size="small"
        label={clean ? 'first pass' : `${bounces}× back`}
        sx={{
          height: 20,
          fontSize: '0.68rem',
          fontWeight: 700,
          bgcolor: `${color}20`,
          color,
          border: `1px solid ${color}40`
        }}
      />
    </Tooltip>
  )
}
