import { useMemo, useState } from 'react'
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Table, TableBody, TableCell,
  TableHead, TableRow, Link, LinearProgress, Tooltip
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import { LinearIssue, Priority, StateType } from '../../types'
import {
  QA_TEAM_FIRST_NAMES, isQATeamMember, firstName,
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
  total: number
  open: number
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
      total: 0, open: 0, completed: 0, urgent: 0, stale: 0,
      issues: []
    })
  }

  const staleCutoff = dayjs().subtract(STALE_DAYS, 'day')

  for (const issue of issues) {
    const assignee = issue.assignee
    if (!assignee || !isQATeamMember(assignee.name)) continue

    const key = firstName(assignee.name)
    const m = byMember.get(key)
    if (!m) continue

    // Prefer the real Linear display name and avatar over the seeded placeholder.
    if (!m.found) {
      m.found = true
      m.name = assignee.name
      m.avatarUrl = assignee.avatarUrl
    }

    m.total += 1
    m.issues.push(issue)

    const open = isOpen(issue)
    if (open) m.open += 1
    if (issue.state?.type === 'completed') m.completed += 1
    if (issue.priority === 1 && open) m.urgent += 1
    if (open && issue.updatedAt && dayjs(issue.updatedAt).isBefore(staleCutoff)) m.stale += 1
  }

  return Array.from(byMember.values()).sort(
    (a, b) => b.open - a.open || b.total - a.total || a.name.localeCompare(b.name)
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
    total: members.reduce((s, m) => s + m.total, 0),
    open: members.reduce((s, m) => s + m.open, 0),
    completed: members.reduce((s, m) => s + m.completed, 0),
    urgent: members.reduce((s, m) => s + m.urgent, 0),
    stale: members.reduce((s, m) => s + m.stale, 0)
  }), [members])

  const missing = members.filter((m) => !m.found)
  const maxOpen = Math.max(1, ...members.map((m) => m.open))

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
            <Chip size="small" label={`${totals.open} open`} sx={{ fontWeight: 600 }} />
            <Chip
              size="small"
              label={`${totals.completed} completed`}
              sx={{ bgcolor: '#22c55e20', color: '#22c55e', fontWeight: 600 }}
            />
            {totals.urgent > 0 && (
              <Chip
                size="small"
                label={`${totals.urgent} urgent`}
                sx={{ bgcolor: '#f43f5e20', color: '#f43f5e', fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        {totals.total === 0 ? (
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
                  <TableCell sx={{ fontWeight: 600, width: 160 }}>Workload</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">Open</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">Done</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">Urgent</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">
                    <Tooltip title={`Open and not updated in ${STALE_DAYS}+ days`} arrow>
                      <span>Stale</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">Total</TableCell>
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
                        value={(m.open / maxOpen) * 100}
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
                    <MetricCell value={m.open} />
                    <MetricCell value={m.completed} color={STATE_TYPE_COLORS.completed} />
                    <MetricCell value={m.urgent} color="#f43f5e" />
                    <MetricCell value={m.stale} color="#f97316" />
                    <MetricCell value={m.total} dim />
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
                  {selectedMember.name} · {drilldown.length} ticket{drilldown.length !== 1 ? 's' : ''}
                  {selectedMember.issues.length > drilldown.length ? ' (showing first 50)' : ''}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 100 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 110 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
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
