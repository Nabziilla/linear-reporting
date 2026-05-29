import { useMemo } from 'react'
import { Box, Typography, Chip, Stack, Divider, Tooltip } from '@mui/material'
import { styled } from '@mui/material/styles'
import BugReportIcon from '@mui/icons-material/BugReport'
import ScienceIcon from '@mui/icons-material/Science'
import RateReviewIcon from '@mui/icons-material/RateReview'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { LinearIssue, Priority } from '../../types'

dayjs.extend(relativeTime)
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants'

interface QASummaryProps {
  issues: LinearIssue[]
  onSelectIssue: (issue: LinearIssue) => void
}

const Panel = styled(Box)(({ theme }) => ({
  borderTop: '1px solid #e2e8f0',
  padding: theme.spacing(2, 3),
  backgroundColor: '#0b1220',
  color: '#e2e8f0'
}))

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1.5)
}))

const KpiRow = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2)
}))

const KpiCard = styled(Box)(({ theme }) => ({
  border: '1px solid #1e293b',
  borderRadius: 8,
  padding: theme.spacing(1.25, 1.5),
  backgroundColor: '#111827'
}))

const KpiLabel = styled(Typography)({
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#94a3b8',
  display: 'flex',
  alignItems: 'center',
  gap: 6
})

const KpiValue = styled(Typography)({
  fontSize: '1.5rem',
  fontWeight: 700,
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums'
})

const KpiHint = styled(Typography)({
  fontSize: '0.72rem',
  color: '#94a3b8',
  marginTop: 2
})

const FocusList = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 6
})

const FocusRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  padding: theme.spacing(0.75, 1),
  borderRadius: 6,
  cursor: 'pointer',
  '&:hover': { backgroundColor: '#1e293b' }
}))

const IdentifierTag = styled(Typography)({
  fontFamily: 'monospace',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#93c5fd',
  width: 80,
  flexShrink: 0
})

const PriorityDot = styled(Box)<{ priority: Priority }>(({ priority }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: PRIORITY_COLORS[priority],
  flexShrink: 0
}))

const isQaState = (name: string) => /\b(qa|test)\b/i.test(name)
const isReviewState = (name: string) => /review/i.test(name)
const isReadyForQa = (name: string) => /ready.*(qa|test)/i.test(name)
const isDoneState = (type: string) => type === 'completed'

export const QASummary = ({ issues, onSelectIssue }: QASummaryProps) => {
  const stats = useMemo(() => {
    const inQa: LinearIssue[] = []
    const inReview: LinearIssue[] = []
    const readyForQa: LinearIssue[] = []
    const recentlyDone: LinearIssue[] = []
    const stale: LinearIssue[] = []
    let urgentOpen = 0
    let highOpen = 0
    const teamCounts = new Map<string, number>()
    const sevenDaysAgo = dayjs().subtract(7, 'day')
    const fiveDaysAgo = dayjs().subtract(5, 'day')

    for (const issue of issues) {
      const stateName = issue.state.name
      const stateType = issue.state.type

      if (isReadyForQa(stateName)) readyForQa.push(issue)
      else if (isQaState(stateName)) inQa.push(issue)
      else if (isReviewState(stateName)) inReview.push(issue)

      if (isDoneState(stateType) && issue.completedAt && dayjs(issue.completedAt).isAfter(sevenDaysAgo)) {
        recentlyDone.push(issue)
      }

      if ((isQaState(stateName) || isReviewState(stateName)) && dayjs(issue.updatedAt).isBefore(fiveDaysAgo)) {
        stale.push(issue)
      }

      if (stateType !== 'completed' && stateType !== 'canceled' && stateType !== 'duplicate') {
        if (issue.priority === 1) urgentOpen += 1
        else if (issue.priority === 2) highOpen += 1
      }

      teamCounts.set(issue.team.name, (teamCounts.get(issue.team.name) ?? 0) + 1)
    }

    const focus = [...inQa, ...inReview, ...readyForQa]
      .sort((a, b) => {
        const pa = a.priority === 0 ? 99 : a.priority
        const pb = b.priority === 0 ? 99 : b.priority
        if (pa !== pb) return pa - pb
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
      .slice(0, 5)

    const topTeams = Array.from(teamCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    return { inQa, inReview, readyForQa, recentlyDone, stale, urgentOpen, highOpen, focus, topTeams }
  }, [issues])

  if (issues.length === 0) return null

  const total = issues.length
  const testingWorkload = stats.inQa.length + stats.inReview.length + stats.readyForQa.length

  return (
    <Panel>
      <Header>
        <ScienceIcon fontSize="small" sx={{ color: '#60a5fa' }} />
        <Typography variant="subtitle1" fontWeight={700}>QA Snapshot</Typography>
        <Chip
          size="small"
          label={`${total} ticket${total === 1 ? '' : 's'} in view`}
          sx={{ backgroundColor: '#1e293b', color: '#cbd5e1', height: 22 }}
        />
        {stats.topTeams.length > 0 && (
          <Typography variant="caption" sx={{ color: '#94a3b8', ml: 'auto' }}>
            Top teams: {stats.topTeams.map(([name, count]) => `${name} (${count})`).join(' · ')}
          </Typography>
        )}
      </Header>

      <KpiRow>
        <KpiCard>
          <KpiLabel><ScienceIcon sx={{ fontSize: 14 }} /> In QA</KpiLabel>
          <KpiValue sx={{ color: '#60a5fa' }}>{stats.inQa.length}</KpiValue>
          <KpiHint>Currently being tested</KpiHint>
        </KpiCard>

        <KpiCard>
          <KpiLabel><RateReviewIcon sx={{ fontSize: 14 }} /> In Review</KpiLabel>
          <KpiValue sx={{ color: '#fbbf24' }}>{stats.inReview.length}</KpiValue>
          <KpiHint>Awaiting code review</KpiHint>
        </KpiCard>

        <KpiCard>
          <KpiLabel><BugReportIcon sx={{ fontSize: 14 }} /> Ready for QA</KpiLabel>
          <KpiValue sx={{ color: '#a78bfa' }}>{stats.readyForQa.length}</KpiValue>
          <KpiHint>Queued for test pickup</KpiHint>
        </KpiCard>

        <KpiCard>
          <KpiLabel><WarningAmberIcon sx={{ fontSize: 14 }} /> Open Urgent / High</KpiLabel>
          <KpiValue sx={{ color: '#f87171' }}>{stats.urgentOpen + stats.highOpen}</KpiValue>
          <KpiHint>{stats.urgentOpen} urgent · {stats.highOpen} high</KpiHint>
        </KpiCard>

        <KpiCard>
          <KpiLabel><AccessTimeIcon sx={{ fontSize: 14 }} /> Stale in QA/Review</KpiLabel>
          <KpiValue sx={{ color: stats.stale.length > 0 ? '#fb923c' : '#94a3b8' }}>{stats.stale.length}</KpiValue>
          <KpiHint>No update in 5+ days</KpiHint>
        </KpiCard>

        <KpiCard>
          <KpiLabel><VerifiedIcon sx={{ fontSize: 14 }} /> Done (7d)</KpiLabel>
          <KpiValue sx={{ color: '#34d399' }}>{stats.recentlyDone.length}</KpiValue>
          <KpiHint>Verify in latest release</KpiHint>
        </KpiCard>
      </KpiRow>

      <Divider sx={{ borderColor: '#1e293b', mb: 1.5 }} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Box flex={1} minWidth={0}>
          <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Top focus for QA ({testingWorkload} in pipeline)
          </Typography>
          <FocusList sx={{ mt: 1 }}>
            {stats.focus.length === 0 && (
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                No tickets currently in QA, review, or ready-for-QA states.
              </Typography>
            )}
            {stats.focus.map((issue) => (
              <FocusRow key={issue.id} onClick={() => onSelectIssue(issue)}>
                <PriorityDot priority={issue.priority} />
                <IdentifierTag>{issue.identifier}</IdentifierTag>
                <Tooltip title={issue.title}>
                  <Typography
                    variant="body2"
                    sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0' }}
                  >
                    {issue.title}
                  </Typography>
                </Tooltip>
                <Chip
                  size="small"
                  label={issue.state.name}
                  sx={{ height: 20, backgroundColor: '#1e293b', color: '#cbd5e1', fontSize: '0.7rem' }}
                />
                <Typography variant="caption" sx={{ color: '#94a3b8', width: 70, textAlign: 'right' }}>
                  {dayjs(issue.updatedAt).fromNow()}
                </Typography>
              </FocusRow>
            ))}
          </FocusList>
        </Box>

        <Box flex={1} minWidth={0}>
          <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            QA recommendations
          </Typography>
          <Stack spacing={0.75} mt={1}>
            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              {stats.urgentOpen > 0
                ? `Prioritise ${stats.urgentOpen} urgent ticket${stats.urgentOpen === 1 ? '' : 's'} still open — confirm reproduction and coverage.`
                : 'No urgent items open in this view.'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              {stats.stale.length > 0
                ? `Re-poke ${stats.stale.length} ticket${stats.stale.length === 1 ? '' : 's'} stuck in QA/Review for 5+ days.`
                : 'No stale QA/Review items — pipeline is moving.'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              {stats.recentlyDone.length > 0
                ? `Schedule regression on ${stats.recentlyDone.length} ticket${stats.recentlyDone.length === 1 ? '' : 's'} closed in the last 7 days.`
                : 'No completions in the last 7 days for this view.'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              {stats.readyForQa.length > 0
                ? `Pick up ${stats.readyForQa.length} Ready-for-QA ticket${stats.readyForQa.length === 1 ? '' : 's'} before they age.`
                : 'Backlog of Ready-for-QA is clear.'}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Panel>
  )
}
