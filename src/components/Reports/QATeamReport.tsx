import { useMemo, useState } from 'react'
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Table, TableBody, TableCell,
  TableHead, TableRow, Link, LinearProgress, Tooltip
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import { LinearIssue, Priority, StateType } from '../../types'
import {
  QA_TEAM_FIRST_NAMES, qaMemberKey,
  PRIORITY_COLORS, PRIORITY_LABELS, STATE_TYPE_COLORS
} from '../../constants'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const CLOSED_TYPES: StateType[] = ['completed', 'canceled', 'duplicate']
const isOpen = (i: LinearIssue) => !CLOSED_TYPES.includes(i.state?.type as StateType)
const PRIORITY_ORDER: Priority[] = [1, 2, 3, 4, 0]

// Stale = open and untouched for a week. Surfaces tickets quietly rotting in
// someone's queue, which a raw open-count hides.
const STALE_DAYS = 7

export interface QAMemberStats {
  key: string
  name: string
  avatarUrl?: string
  found: boolean
  raised: number
  assigned: number
  openAssigned: number
  completed: number
  urgent: number
  stale: number
  issues: LinearIssue[]
}

const buildMemberStats = (issues: LinearIssue[]): QAMemberStats[] => {
  const byMember = new Map<string, QAMemberStats>()

  // Seed every configured name so an inactive member shows as zero rather than
  // silently dropping out of the report.
  for (const n of QA_TEAM_FIRST_NAMES) {
    byMember.set(n, {
      key: n,
      name: n.charAt(0).toUpperCase() + n.slice(1),
      found: false,
      raised: 0, assigned: 0, openAssigned: 0, completed: 0, urgent: 0, stale: 0,
      issues: []
    })
  }

  const staleCutoff = dayjs().subtract(STALE_DAYS, 'day')

  const identify = (m: QAMemberStats, user?: { name?: string; avatarUrl?: string }) => {
    if (m.found || !user?.name) return
    m.found = true
    m.name = user.name
    m.avatarUrl = user.avatarUrl
  }

  for (const issue of issues) {
    // QA here is mostly bug-raising work: a member reports an issue that
    // someone else fixes. Counting only assignees misses the bulk of it, so
    // raised and assigned are tracked separately.
    const creatorKey = qaMemberKey(issue.creator)
    const assigneeKey = qaMemberKey(issue.assignee)

    if (creatorKey) {
      const m = byMember.get(creatorKey)
      if (m) {
        identify(m, issue.creator)
        m.raised += 1
        m.issues.push(issue)
      }
    }

    if (assigneeKey) {
      const m = byMember.get(assigneeKey)
      if (m) {
        identify(m, issue.assignee)
        m.assigned += 1
        // Avoid double-listing a ticket a member both raised and owns.
        if (assigneeKey !== creatorKey) m.issues.push(issue)

        const open = isOpen(issue)
        if (open) m.openAssigned += 1
        if (issue.state?.type === 'completed') m.completed += 1
        if (issue.priority === 1 && open) m.urgent += 1
        if (open && issue.updatedAt && dayjs(issue.updatedAt).isBefore(staleCutoff)) m.stale += 1
      }
    }
  }

  return Array.from(byMember.values()).sort(
    (a, b) => b.raised - a.raised || b.assigned - a.assigned || a.name.localeCompare(b.name)
  )
}

const MetricCell = ({ value, color, dim }: { value: number; color?: string; dim?: boolean }) => (
  <TableCell align="center">
    <Typography
      sx={{
        fontWeight: value > 0 ? 700 : 400,
        fontSize: '0.9rem',
        color: value === 0 || dim ? 'text.disabled' : color ?? 'text.primary'
      }}
    >
      {value}
    </Typography>
  </TableCell>
)

interface QATeamReportProps {
  issues: LinearIssue[]
  heading: string
}

export const QATeamReport = ({ issues, heading }: QATeamReportProps) => {
  const [selected, setSelected] = useState<string | null>(null)

  const members = useMemo(() => buildMemberStats(issues), [issues])

  const totals = useMemo(() => ({
    raised: members.reduce((s, m) => s + m.raised, 0),
    assigned: members.reduce((s, m) => s + m.assigned, 0),
    completed: members.reduce((s, m) => s + m.completed, 0),
    urgent: members.reduce((s, m) => s + m.urgent, 0),
    stale: members.reduce((s, m) => s + m.stale, 0)
  }), [members])

  const missing = members.filter((m) => !m.found)
  const maxRaised = Math.max(1, ...members.map((m) => m.raised))
  const grandTotal = totals.raised + totals.assigned

  const selectedMember = selected ? members.find((m) => m.key === selected) ?? null : null
  const drilldown = useMemo(() => {
    if (!selectedMember) return []
    return [...selectedMember.issues]
      .sort((a, b) => {
        const ao = isOpen(a) ? 0 : 1
        const bo = isOpen(b) ? 0 : 1
        if (ao !== bo) return ao - bo
        return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
      })
      .slice(0, 50)
  }, [selectedMember])

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <GroupsIcon sx={{ color: '#6875F5', fontSize: 20 }} />
            <Typography variant="h6">QA Team — {heading}</Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Chip
              size="small"
              label={`${totals.raised} raised`}
              sx={{ bgcolor: '#6875F520', color: '#6875F5', fontWeight: 600 }}
            />
            <Chip size="small" label={`${totals.assigned} assigned`} sx={{ fontWeight: 600 }} />
            {totals.urgent > 0 && (
              <Chip
                size="small"
                label={`${totals.urgent} urgent`}
                sx={{ bgcolor: '#f43f5e20', color: '#f43f5e', fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        {grandTotal === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No tickets assigned to the QA team in this scope. Check the name list in
            <code style={{ margin: '0 4px' }}>constants/index.ts</code>
            if you expect results here.
          </Typography>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Member</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 150 }}>Tickets raised</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">
                    <Tooltip title="Tickets this member created" arrow>
                      <span>Raised</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">
                    <Tooltip title="Tickets assigned to this member" arrow>
                      <span>Assigned</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">
                    <Tooltip title="Assigned and still open" arrow>
                      <span>Open</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">Urgent</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">
                    <Tooltip title={`Assigned, open, not updated in ${STALE_DAYS}+ days`} arrow>
                      <span>Stale</span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((m) => (
                  <TableRow
                    key={m.key}
                    hover
                    onClick={() => setSelected(selected === m.key ? null : m.key)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: selected === m.key ? 'action.selected' : undefined
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar src={m.avatarUrl} sx={{ width: 26, height: 26, fontSize: 12 }}>
                          {m.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: m.found ? 'text.primary' : 'text.disabled' }}
                          >
                            {m.name}
                          </Typography>
                          {!m.found && (
                            <Typography variant="caption" color="text.disabled">
                              no Linear match
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <LinearProgress
                        variant="determinate"
                        value={(m.raised / maxRaised) * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: m.urgent > 0 ? '#f43f5e' : '#6875F5'
                          }
                        }}
                      />
                    </TableCell>
                    <MetricCell value={m.raised} color="#6875F5" />
                    <MetricCell value={m.assigned} color={STATE_TYPE_COLORS.completed} />
                    <MetricCell value={m.openAssigned} />
                    <MetricCell value={m.urgent} color="#f43f5e" />
                    <MetricCell value={m.stale} color="#f97316" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {missing.length > 0 && (
              <Typography variant="caption" color="text.disabled" display="block" mt={1.5}>
                No Linear user matched: {missing.map((m) => m.name).join(', ')}. Names are matched
                on the first word of the Linear display name.
              </Typography>
            )}

            {selectedMember && (
              <Box mt={3}>
                <Typography variant="overline" color="text.secondary" display="block" mb={1}>
                  {selectedMember.name} · {selectedMember.raised} raised, {selectedMember.assigned} assigned
                  {selectedMember.issues.length > drilldown.length ? ' · showing first 50' : ''}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 100 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 110 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 90 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 130 }}>Team</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 150 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 110 }}>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {drilldown.map((issue) => (
                      <TableRow key={issue.id} hover>
                        <TableCell>
                          <Chip
                            label={PRIORITY_LABELS[issue.priority]}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              bgcolor: `${PRIORITY_COLORS[issue.priority]}20`,
                              color: PRIORITY_COLORS[issue.priority],
                              border: `1px solid ${PRIORITY_COLORS[issue.priority]}40`
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={issue.url}
                            target="_blank"
                            rel="noopener"
                            underline="hover"
                            sx={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700 }}
                          >
                            {issue.identifier}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 420 }}>
                            {issue.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {[
                              qaMemberKey(issue.creator) === selectedMember.key ? 'raised' : null,
                              qaMemberKey(issue.assignee) === selectedMember.key ? 'assigned' : null
                            ].filter(Boolean).join(' + ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {issue.team?.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: issue.state?.color }}>
                            {issue.state?.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {issue.updatedAt ? dayjs(issue.updatedAt).fromNow() : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
