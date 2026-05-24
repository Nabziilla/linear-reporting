import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip, Link, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { LinearIssue } from '../../types'
import { STATE_TYPE_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants'
import dayjs from 'dayjs'

const MetaGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: theme.spacing(1, 2),
  alignItems: 'start'
}))

const MetaLabel = styled(Typography)({
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#64748b',
  paddingTop: 2
})

const MetaValue = styled(Typography)({ fontSize: '0.85rem' })

interface TicketDetailProps {
  issue: LinearIssue | null
  onClose: () => void
}

export const TicketDetail = ({ issue, onClose }: TicketDetailProps) => {
  if (!issue) return null

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" fontFamily="monospace" color="primary" fontWeight={700}>
            {issue.identifier}
          </Typography>
          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
            {issue.title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <MetaGrid>
          <MetaLabel>Status</MetaLabel>
          <Chip
            label={issue.state.name}
            size="small"
            sx={{ backgroundColor: STATE_TYPE_COLORS[issue.state.type] + '22', color: STATE_TYPE_COLORS[issue.state.type], fontWeight: 600 }}
          />

          <MetaLabel>Priority</MetaLabel>
          <Chip
            label={PRIORITY_LABELS[issue.priority]}
            size="small"
            sx={{ backgroundColor: PRIORITY_COLORS[issue.priority] + '22', color: PRIORITY_COLORS[issue.priority], fontWeight: 600 }}
          />

          <MetaLabel>Team</MetaLabel>
          <MetaValue>{issue.team.name}</MetaValue>


          <MetaLabel>Assignee</MetaLabel>
          <MetaValue>{issue.assignee?.name ?? 'Unassigned'}</MetaValue>

          <MetaLabel>Creator</MetaLabel>
          <MetaValue>{issue.creator?.name ?? '—'}</MetaValue>

          {issue.project && (
            <>
              <MetaLabel>Project</MetaLabel>
              <MetaValue>{issue.project.name}</MetaValue>
            </>
          )}

          {issue.dueDate && (
            <>
              <MetaLabel>Due</MetaLabel>
              <MetaValue>{dayjs(issue.dueDate).format('D MMM YYYY')}</MetaValue>
            </>
          )}

          <MetaLabel>Created</MetaLabel>
          <MetaValue>{dayjs(issue.createdAt).format('D MMM YYYY')}</MetaValue>

          <MetaLabel>Updated</MetaLabel>
          <MetaValue>{dayjs(issue.updatedAt).format('D MMM YYYY HH:mm')}</MetaValue>
        </MetaGrid>

        {issue.labels.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">Labels:</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {issue.labels.map((l) => (
                <Chip key={l.name} label={l.name} size="small" sx={{ backgroundColor: l.color + '33', color: l.color, fontWeight: 600 }} />
              ))}
            </Box>
          </>
        )}

        {issue.timeInStatus !== undefined && issue.timeInStatus !== '' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">Time in Status:</Typography>
            <Typography variant="body2">{issue.timeInStatus}</Typography>
          </>
        )}

        {issue.description && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{issue.description}</Typography>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button component={Link} href={issue.url} target="_blank" rel="noreferrer" startIcon={<OpenInNewIcon />} size="small">
          Open in Linear
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
