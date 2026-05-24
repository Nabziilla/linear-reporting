import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Box, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import { LinearIssue } from '../../types'
import { STATE_TYPE_COLORS } from '../../constants'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const formatTimeInStatus = (raw: number | string): string => {
  const mins = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(mins) || mins <= 0) return String(raw)
  const days = mins / 1440
  return `${days < 10 ? days.toFixed(1) : Math.round(days)}d`
}

const TicketIdentifier = styled(Typography)({
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#5E6AD2',
  fontFamily: 'monospace'
})

const MetaRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(0.5),
  flexWrap: 'wrap'
}))

interface RecentTicketsProps {
  issues: LinearIssue[]
}

export const RecentTickets = ({ issues }: RecentTicketsProps) => {
  const recent = [...issues]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Recently Updated</Typography>
        <List disablePadding>
          {recent.map((issue, idx) => (
            <Box key={issue.id}>
              {idx > 0 && <Divider />}
              <ListItem disableGutters alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <TicketIdentifier>{issue.identifier}</TicketIdentifier>
                      <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'normal', wordBreak: 'break-word' }}>{issue.title}</Typography>
                    </Box>
                  }
                  secondary={
                    <MetaRow>
                      <Chip
                        label={issue.state.name}
                        size="small"
                        sx={{ backgroundColor: STATE_TYPE_COLORS[issue.state.type] + '22', color: STATE_TYPE_COLORS[issue.state.type], fontWeight: 600, height: 20 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {issue.assignee?.name ?? 'Unassigned'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(issue.updatedAt).fromNow()}
                      </Typography>
                      {issue.timeInStatus !== undefined && issue.timeInStatus !== '' && (
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeInStatus(issue.timeInStatus)} in status
                        </Typography>
                      )}
                    </MetaRow>
                  }
                />
              </ListItem>
            </Box>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}
