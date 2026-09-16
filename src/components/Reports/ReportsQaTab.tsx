import { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, ToggleButton, ToggleButtonGroup, Button, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, Tooltip, Snackbar,
  LinearProgress, Link, Stack, Divider, Tabs, Tab
} from '@mui/material'
import { styled, alpha, useTheme } from '@mui/material/styles'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useQaReport } from '../../hooks/useQaReport'
import { LinearConnectionNotice } from '../LinearConnectionNotice'
import {
  QA_AGING_THRESHOLD_DAYS, PRIORITY_COLORS, PRIORITY_LABELS,
  QA_BACKWARD_EXIT_STATES, QA_FORWARD_EXIT_STATES
} from '../../constants'
import { QaPeriod, QaQueueItem, QaExitItem, Priority, LinearIssue } from '../../types'
import { buildQaSummary } from './buildQaSummary'
import { QaCommentsSummary } from './QaCommentsSummary'

dayjs.extend(relativeTime)

const DAY_MS = 24 * 60 * 60 * 1000

const PERIOD_LABEL: Record<QaPeriod, string> = {
  day: 'Today',
  week: 'This week',
  month: 'This month'
}

const formatAge = (ms: number): string => {
  const totalHours = Math.floor(ms / (60 * 60 * 1000))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days === 0) return `${hours}h`
  if (days < 3) return `${days}d ${hours}h`
  return `${days}d`
}

const normalizeStateName = (name: string) => name.trim().toLowerCase()
const isBackwardExit = (name: string) => (QA_BACKWARD_EXIT_STATES as readonly string[]).includes(normalizeStateName(name))
const isListedForwardExit = (name: string) => (QA_FORWARD_EXIT_STATES as readonly string[]).includes(normalizeStateName(name))

const KpiGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(1)
}))

const Kpi = ({ label, value, hint, color }: { label: string; value: string | number; hint?: string; color?: string }) => (
  <Card variant="outlined">
    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </CardContent>
  </Card>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="overline" color="text.secondary" display="block" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>
    {children}
  </Typography>
)

const PriorityChip = ({ priority }: { priority: Priority }) => (
  <Chip
    size="small"
    label={PRIORITY_LABELS[priority]}
    sx={{ height: 20, fontSize: '0.68rem', bgcolor: `${PRIORITY_COLORS[priority]}22`, color: PRIORITY_COLORS[priority], fontWeight: 600 }}
  />
)

const QueueTable = ({ items, emptyText }: { items: QaQueueItem[]; emptyText: string }) => {
  if (items.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{emptyText}</Typography>
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Team</TableCell>
            <TableCell>Assignee</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell align="right">Age in QA</TableCell>
            <TableCell>Entered QA</TableCell>
            <TableCell align="center">Bounces</TableCell>
            <TableCell>Last update</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((i) => {
            const aging = i.qaAgeMs / DAY_MS >= QA_AGING_THRESHOLD_DAYS
            return (
              <TableRow key={i.id} hover sx={aging ? { bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) } : undefined}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <Link href={i.url} target="_blank" rel="noreferrer" underline="hover">{i.identifier}</Link>
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Tooltip title={i.title}>
                    <Typography variant="body2" noWrap>{i.title}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell><Chip size="small" variant="outlined" label={i.teamKey} sx={{ height: 20, fontSize: '0.68rem' }} /></TableCell>
                <TableCell><Typography variant="body2" noWrap>{i.assigneeName ?? '—'}</Typography></TableCell>
                <TableCell><PriorityChip priority={i.priority} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: aging ? 700 : 400, color: aging ? '#c2410c' : undefined, fontVariantNumeric: 'tabular-nums' }}>
                  {aging && <WarningAmberIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom', mr: 0.5 }} />}
                  {formatAge(i.qaAgeMs)}
                  {i.qaEnteredApprox && <Tooltip title="No explicit QA-entry event found; age measured from ticket creation."><span> *</span></Tooltip>}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title={dayjs(i.qaEnteredAt).format('DD MMM YYYY, HH:mm')}>
                    <span>{dayjs(i.qaEnteredAt).fromNow()}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  {i.qaBounceCount > 1
                    ? <Chip size="small" label={i.qaBounceCount - 1} sx={{ height: 20, fontSize: '0.68rem', bgcolor: (theme) => alpha(theme.palette.error.main, 0.16), color: 'error.main', fontWeight: 700 }} />
                    : <Typography variant="caption" color="text.secondary">0</Typography>}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="caption" color={i.updatedInLast24h ? 'success.main' : 'text.secondary'}>
                    {dayjs(i.updatedAt).fromNow()}
                  </Typography>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  )
}

const ExitTable = ({ items, emptyText }: { items: QaExitItem[]; emptyText: string }) => {
  if (items.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{emptyText}</Typography>
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 600 }}>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Team</TableCell>
            <TableCell>Assignee</TableCell>
            <TableCell>Moved to</TableCell>
            <TableCell>When</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((e) => (
            <TableRow key={e.id + e.at} hover>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <Link href={e.url} target="_blank" rel="noreferrer" underline="hover">{e.identifier}</Link>
              </TableCell>
              <TableCell sx={{ maxWidth: 320 }}>
                <Tooltip title={e.title}>
                  <Typography variant="body2" noWrap>{e.title}</Typography>
                </Tooltip>
              </TableCell>
              <TableCell><Chip size="small" variant="outlined" label={e.teamKey} sx={{ height: 20, fontSize: '0.68rem' }} /></TableCell>
              <TableCell><Typography variant="body2" noWrap>{e.assigneeName ?? '—'}</Typography></TableCell>
              <TableCell><Chip size="small" label={e.toState} sx={{ height: 20, fontSize: '0.68rem' }} /></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title={dayjs(e.at).format('DD MMM YYYY, HH:mm')}>
                  <span>{dayjs(e.at).fromNow()}</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

const BreakdownList = ({ title, rows }: { title: string; rows: { name: string; count: number; aging: number }[] }) => (
  <Card variant="outlined" sx={{ flex: 1, minWidth: 240 }}>
    <CardContent>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>{title}</Typography>
      {rows.length === 0 && <Typography variant="body2" color="text.secondary">No data.</Typography>}
      <Stack spacing={1}>
        {rows.map((r) => (
          <Box key={r.name}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{r.name}</Typography>
              <Typography variant="body2" fontWeight={700}>
                {r.count}
                {r.aging > 0 && <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 0.5 }}>({r.aging} aging)</Typography>}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </CardContent>
  </Card>
)

interface ReportsQaTabProps {
  heading: string
  teamKey: string | null
  people: Set<string>
  allIssues: LinearIssue[]
}

type SubTab = 'snapshot' | 'exits' | 'activity' | 'comments' | 'details'

export const ReportsQaTab = ({ heading, teamKey, people, allIssues }: ReportsQaTabProps) => {
  const theme = useTheme()
  const [period, setPeriod] = useState<QaPeriod>('week')
  const [copied, setCopied] = useState(false)
  const [subTab, setSubTab] = useState<SubTab>('snapshot')
  const scope = useMemo(() => ({ teamKey, people }), [teamKey, people])
  const report = useQaReport(period, undefined, scope)
  const { metrics, activity } = report

  const now = dayjs()
  const bounceRate = activity && activity.exited > 0 ? Math.round((activity.bounced / activity.exited) * 100) : 0

  const exitedItems = activity?.exitedItems ?? []
  const backToEarlierStage = useMemo(
    () => exitedItems.filter((e) => isBackwardExit(e.toState)),
    [exitedItems]
  )
  const outToLaterStage = useMemo(
    () => exitedItems.filter((e) => isListedForwardExit(e.toState)),
    [exitedItems]
  )

  const summaryText = useMemo(
    () => buildQaSummary({ period, metrics, activity, generatedAt: now.format('DD MMM YYYY, HH:mm') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, metrics, activity]
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const maxBucket = Math.max(1, ...metrics.buckets.map((b) => b.count))

  const qaIssueIds = useMemo(() => new Set(report.queue.map((q) => q.id)), [report.queue])
  const qaIssuesForComments = useMemo(
    () => allIssues.filter((i) => qaIssueIds.has(i.id)),
    [allIssues, qaIssueIds]
  )

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" mb={2}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {heading} · tickets in the &quot;In QA&quot; state
        </Typography>
        <ToggleButtonGroup size="small" exclusive value={period} onChange={(_, v) => v && setPeriod(v)}>
          <ToggleButton value="day">End of Day</ToggleButton>
          <ToggleButton value="week">End of Week</ToggleButton>
          <ToggleButton value="month">End of Month</ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => report.refetch()} disabled={report.isFetching}>
          Refresh
        </Button>
        <Button size="small" variant="contained" disableElevation startIcon={<ContentCopyIcon />} onClick={handleCopy} disabled={report.isLoading || metrics.total === 0}>
          Copy SLT summary
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Generated {now.format('DD MMM YYYY, HH:mm')} · throughput window: <strong>{PERIOD_LABEL[period]}</strong> (since {dayjs(report.sinceISO).format('DD MMM')})
      </Typography>

      {report.isFetching && <LinearProgress sx={{ mb: 2 }} />}

      {report.isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : report.isError || metrics.total === 0 ? (
        <LinearConnectionNotice
          hasApiKey={report.hasApiKey}
          hasUploadedData={false}
          isError={report.isError}
          error={report.error}
          isEmpty={metrics.total === 0}
        />
      ) : (
        <>
          <Tabs
            value={subTab} onChange={(_e, v) => setSubTab(v)}
            sx={{ mb: 2.5, minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 } }}
          >
            <Tab label="Snapshot" value="snapshot" />
            <Tab label={`Exits (${backToEarlierStage.length + outToLaterStage.length})`} value="exits" />
            <Tab label="Activity" value="activity" />
            <Tab label="Comments" value="comments" />
            <Tab label="Details" value="details" />
          </Tabs>

          {subTab === 'snapshot' && (
            <>
              <SectionTitle>Current QA queue (right now)</SectionTitle>
              <KpiGrid>
                <Kpi label="In QA now" value={metrics.total} hint="tickets awaiting/under test" color="#2563eb" />
                <Kpi label={`Aging > ${QA_AGING_THRESHOLD_DAYS}d`} value={metrics.agingCount} hint="need attention" color={metrics.agingCount > 0 ? '#ea580c' : undefined} />
                <Kpi label="Avg age in QA" value={`${metrics.avgAgeDays.toFixed(1)}d`} hint={`median ${metrics.medianAgeDays.toFixed(1)}d`} />
                <Kpi label="Oldest in QA" value={`${metrics.maxAgeDays.toFixed(1)}d`} hint={metrics.oldest?.identifier ?? '—'} color={metrics.maxAgeDays >= 5 ? '#dc2626' : undefined} />
              </KpiGrid>

              <SectionTitle>Age distribution (time in QA)</SectionTitle>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1.25}>
                    {metrics.buckets.map((b) => (
                      <Box key={b.key} display="flex" alignItems="center" gap={1.5}>
                        <Typography variant="body2" sx={{ width: 80, flexShrink: 0 }}>{b.label}</Typography>
                        <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 1, height: 20, position: 'relative' }}>
                          <Box sx={{ width: `${(b.count / maxBucket) * 100}%`, bgcolor: b.color, height: '100%', borderRadius: 1, minWidth: b.count > 0 ? 4 : 0, transition: 'width .2s' }} />
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ width: 32, textAlign: 'right' }}>{b.count}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </>
          )}

          {subTab === 'exits' && (
            <>
              <SectionTitle>Throughput — {PERIOD_LABEL[period]}</SectionTitle>
              <KpiGrid>
                <Kpi label="Entered QA" value={activity?.entered ?? 0} hint="moved into QA" color="#0891b2" />
                <Kpi label="Cleared QA" value={activity?.exited ?? 0} hint="left the QA state" />
                <Kpi label="Passed forward" value={activity?.passed ?? 0} hint="→ Ready for Prod / Done" color="#16a34a" />
                <Kpi label="Bounced back" value={activity?.bounced ?? 0} hint={`${bounceRate}% of cleared`} color={bounceRate >= 30 ? '#dc2626' : undefined} />
              </KpiGrid>

              <SectionTitle>Bounced back to an earlier stage — {PERIOD_LABEL[period]} ({backToEarlierStage.length})</SectionTitle>
              <Card variant="outlined">
                <CardContent>
                  <ExitTable
                    items={backToEarlierStage}
                    emptyText="No tickets bounced back to Backlog, Triage, Ready for Eng, To Do, or Blocked in this window."
                  />
                </CardContent>
              </Card>

              <SectionTitle>Passed forward — {PERIOD_LABEL[period]} ({outToLaterStage.length})</SectionTitle>
              <Card variant="outlined">
                <CardContent>
                  <ExitTable
                    items={outToLaterStage}
                    emptyText="No tickets moved to In Review, On Pause, Done, or Ready for Prod in this window."
                  />
                </CardContent>
              </Card>
            </>
          )}

          {subTab === 'activity' && (
            <>
              <SectionTitle>Worked on in the last 24 hours ({metrics.last24h.length}) — sorted by age in QA</SectionTitle>
              <Card variant="outlined">
                <CardContent>
                  <QueueTable items={metrics.last24h} emptyText="No QA tickets had activity or entered QA in the last 24 hours." />
                </CardContent>
              </Card>

              {activity && activity.perDay.length > 0 && (
                <>
                  <SectionTitle>Daily QA flow — {PERIOD_LABEL[period]}</SectionTitle>
                  <Card variant="outlined">
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={activity.perDay.map((d) => ({ ...d, date: dayjs(d.date).format('MMM D') }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                          <RTooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, color: theme.palette.text.primary }} />
                          <Legend />
                          <Bar dataKey="entered" fill="#0891b2" name="Entered QA" />
                          <Bar dataKey="passed" fill="#16a34a" name="Passed" />
                          <Bar dataKey="bounced" fill="#dc2626" name="Bounced" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}

          {subTab === 'comments' && (
            <>
              <SectionTitle>QA ticket comments</SectionTitle>
              <QaCommentsSummary issues={qaIssuesForComments} />
            </>
          )}

          {subTab === 'details' && (
            <>
              <SectionTitle>Workload breakdown</SectionTitle>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <BreakdownList title="By team" rows={metrics.byTeam} />
                <BreakdownList title="By assignee" rows={metrics.byAssignee} />
                <BreakdownList
                  title="By priority"
                  rows={metrics.byPriority.map((p) => ({ name: PRIORITY_LABELS[p.priority], count: p.count, aging: 0 }))}
                />
              </Stack>

              <SectionTitle>Full QA queue ({metrics.total}) — oldest first</SectionTitle>
              <Card variant="outlined">
                <CardContent>
                  <QueueTable items={report.queue} emptyText="No tickets currently in QA." />
                </CardContent>
              </Card>

              <Divider sx={{ my: 3 }} />
              <Typography variant="caption" color="text.secondary">
                &quot;QA&quot; = tickets in the <strong>In QA</strong> workflow state. Age measured from the last time each ticket entered QA (from Linear history).
                &quot;Passed forward&quot; = moved to Ready for Prod / Done; &quot;Bounced back&quot; = returned to an earlier state. Rows marked * had no explicit QA-entry event (age from creation).
              </Typography>
            </>
          )}
        </>
      )}

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        message="QA summary copied to clipboard"
      />
    </Box>
  )
}
