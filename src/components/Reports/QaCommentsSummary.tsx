import { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody, TableCell, TableHead,
  TableRow, Link, Tooltip, CircularProgress, Alert
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useAppStore } from '../../stores/useAppStore'
import { summarizeQaComments, QaCommentSummaryItem } from '../../services/aiService'
import { LinearIssue } from '../../types'

dayjs.extend(relativeTime)

const MAX_TICKETS = 100

interface QaCommentsSummaryProps {
  issues: LinearIssue[]
}

export const QaCommentsSummary = ({ issues }: QaCommentsSummaryProps) => {
  const anthropicApiKey = useAppStore((s) => s.settings.anthropicApiKey)
  const [summaries, setSummaries] = useState<Map<string, string> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const commented = useMemo(
    () => issues.filter((i) => (i.comments?.length ?? 0) > 0),
    [issues]
  )

  const handleSummarize = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const scoped = commented.slice(0, MAX_TICKETS)
      const items = scoped.map((i) => ({
        identifier: i.identifier,
        title: i.title,
        comment: i.comments![0].body,
        commentAuthor: i.comments![0].user?.name
      }))
      const results: QaCommentSummaryItem[] = await summarizeQaComments(anthropicApiKey, items)
      setSummaries(new Map(results.map((r) => [r.identifier, r.summary])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to summarize comments')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>QA ticket comments — high level</Typography>
            <Typography variant="caption" color="text.secondary">
              {commented.length} of {issues.length} in-QA ticket{issues.length === 1 ? '' : 's'} have a comment
              {commented.length > MAX_TICKETS ? ` (showing first ${MAX_TICKETS})` : ''}.
            </Typography>
          </Box>
          <Button
            size="small" variant="contained" disableElevation startIcon={<AutoAwesomeIcon />}
            onClick={handleSummarize}
            disabled={isLoading || !anthropicApiKey || commented.length === 0}
          >
            {isLoading ? 'Summarizing…' : summaries ? 'Re-summarize' : 'Summarize with AI'}
          </Button>
        </Box>

        {!anthropicApiKey && (
          <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
            Add an Anthropic API key in Settings to enable AI summaries.
          </Alert>
        )}
        {error && <Alert severity="error" variant="outlined" sx={{ mb: 1.5 }}>{error}</Alert>}
        {isLoading && <Box display="flex" justifyContent="center" py={3}><CircularProgress size={22} /></Box>}

        {!isLoading && commented.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No comments on any ticket in the current scope.
          </Typography>
        )}

        {!isLoading && commented.length > 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>{summaries ? 'AI summary' : 'Latest comment'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Commented</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commented.slice(0, MAX_TICKETS).map((i) => {
                  const comment = i.comments![0]
                  const summary = summaries?.get(i.identifier)
                  return (
                    <TableRow key={i.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <Link href={i.url} target="_blank" rel="noreferrer" underline="hover">{i.identifier}</Link>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Tooltip title={i.title}>
                          <Typography variant="body2" noWrap>{i.title}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 420 }}>
                        <Tooltip title={comment.body}>
                          <Typography
                            variant="body2"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {summary ?? comment.body}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {comment.user?.name ? `${comment.user.name} · ` : ''}{dayjs(comment.createdAt).fromNow()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
