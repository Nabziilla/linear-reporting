import { useMemo } from 'react'
import { Box, Card, CardContent, Typography, Chip, Avatar, Divider, Link } from '@mui/material'
import BugReportIcon from '@mui/icons-material/BugReport'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import MoveDownIcon from '@mui/icons-material/MoveDown'
import { LinearIssue, Priority } from '../../types'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const isQA = (i: LinearIssue) => /\bqa\b/i.test(i.state?.name ?? '')

const PRIORITY_ORDER: Priority[] = [1, 2, 3, 4, 0]

interface QAActivityProps {
  issues: LinearIssue[]
}

interface StatTileProps {
  icon: React.ReactNode
  label: string
  count: number
  color: string
}

const StatTile = ({ icon, label, count, color }: StatTileProps) => (
  <Box sx={{
    flex: 1,
    minWidth: 90,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
    py: 1.5,
    px: 1,
    borderRadius: 2,
    bgcolor: `${color}12`,
    border: `1px solid ${color}25`,
  }}>
    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1, color }}>{count}</Typography>
    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </Typography>
  </Box>
)

export const QAActivity = ({ issues }: QAActivityProps) => {
  const cutoff = useMemo(() => dayjs().subtract(24, 'hour'), [])

  const active = useMemo(
    () => issues.filter(isQA).sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)),
    [issues]
  )

  // Tickets touched in the last 24h: currently in QA OR moved out of QA within 24h
  const touched24h = useMemo(() =>
    issues.filter((i) => {
      const updated = dayjs(i.updatedAt)
      if (!updated.isAfter(cutoff)) return false
      return isQA(i) || /\bqa\b/i.test(i.state?.name ?? '')
    }),
    [issues, cutoff]
  )

  // Among all issues updated in 24h, bucket by movement
  const movedIn = useMemo(() =>
    touched24h.filter((i) => isQA(i) && dayjs(i.updatedAt).isAfter(cutoff)),
    [touched24h, cutoff]
  )

  const passed = useMemo(() =>
    issues.filter((i) => {
      if (!dayjs(i.updatedAt).isAfter(cutoff)) return false
      return i.state?.type === 'completed' && !isQA(i)
    }),
    [issues, cutoff]
  )

  const currentlyInQA = active.length
  const movedInCount = movedIn.length
  const passedCount = passed.length
  const blockedCount = active.filter((i) => i.priority === 1).length

  if (currentlyInQA === 0 && movedInCount === 0) return null

  return (
    <Card sx={{
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        background: 'linear-gradient(90deg, #6875F5, #26B5CE)',
      }
    }}>
      <CardContent sx={{ pt: 2.5 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <BugReportIcon sx={{ color: '#6875F5', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>QA Activity — Last 24h</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Updated {dayjs().format('h:mm A')}
          </Typography>
        </Box>

        {/* Stat tiles */}
        <Box display="flex" gap={1.5} flexWrap="wrap" mb={2.5}>
          <StatTile icon={<HourglassTopIcon sx={{ fontSize: 18 }} />} label="In QA now" count={currentlyInQA} color="#6875F5" />
          <StatTile icon={<MoveDownIcon sx={{ fontSize: 18 }} />} label="Entered QA" count={movedInCount} color="#26B5CE" />
          <StatTile icon={<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />} label="Passed QA" count={passedCount} color="#22c55e" />
          <StatTile icon={<BugReportIcon sx={{ fontSize: 18 }} />} label="Urgent" count={blockedCount} color="#f43f5e" />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Ticket list */}
        <Typography variant="overline" color="text.secondary" display="block" mb={1.5}>
          Currently in QA · {currentlyInQA} ticket{currentlyInQA !== 1 ? 's' : ''}
        </Typography>

        <Box display="flex" flexDirection="column" gap={1}>
          {active.map((issue) => (
            <Box
              key={issue.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              {/* Priority dot */}
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                bgcolor: PRIORITY_COLORS[issue.priority],
                boxShadow: `0 0 6px ${PRIORITY_COLORS[issue.priority]}`,
              }} />

              {/* ID */}
              <Link
                href={issue.url}
                target="_blank"
                rel="noopener"
                underline="hover"
                sx={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, color: '#6875F5', flexShrink: 0, minWidth: 72 }}
              >
                {issue.identifier}
              </Link>

              {/* Title */}
              <Typography variant="body2" noWrap sx={{ flex: 1, fontSize: '0.82rem' }}>
                {issue.title}
              </Typography>

              {/* Team */}
              <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
                {issue.team?.name}
              </Typography>

              {/* Priority chip */}
              <Chip
                label={PRIORITY_LABELS[issue.priority]}
                size="small"
                sx={{
                  flexShrink: 0,
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: `${PRIORITY_COLORS[issue.priority]}20`,
                  color: PRIORITY_COLORS[issue.priority],
                  border: `1px solid ${PRIORITY_COLORS[issue.priority]}40`,
                }}
              />

              {/* Assignee avatar */}
              {issue.assignee ? (
                <Avatar
                  src={issue.assignee.avatarUrl}
                  sx={{ width: 22, height: 22, fontSize: 10, flexShrink: 0 }}
                >
                  {issue.assignee.name.charAt(0)}
                </Avatar>
              ) : (
                <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
              )}

              {/* Updated time */}
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                {dayjs(issue.updatedAt).fromNow()}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}
