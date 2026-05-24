import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TablePagination, Chip, Typography, Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useEffect, useMemo, useState } from 'react'
import { LinearIssue } from '../../types'
import { STATE_TYPE_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants'
import dayjs from 'dayjs'

type SortKey = 'identifier' | 'title' | 'state' | 'priority' | 'team' | 'assignee' | 'creator' | 'labels' | 'createdAt' | 'updatedAt' | 'timeInStatus'
type SortDir = 'asc' | 'desc'

const IdentifierCell = styled(TableCell)({ width: 90, fontFamily: 'monospace', fontSize: '0.78rem', color: '#5E6AD2', fontWeight: 700 })
const StyledTableRow = styled(TableRow)({ cursor: 'pointer', '&:hover': { backgroundColor: '#f8fafc' } })
const TruncatedCell = styled(TableCell)({ minWidth: 360, whiteSpace: 'normal', wordBreak: 'break-word' })

const computeStatusDays = (issue: LinearIssue): number | null => {
  if (!issue.createdAt) return null
  const isDone = issue.state?.type === 'completed'
  const end = isDone ? dayjs(issue.updatedAt) : dayjs()
  const days = end.diff(dayjs(issue.createdAt), 'day')
  if (!Number.isFinite(days) || days < 0) return null
  return days
}

const formatStatusTime = (issue: LinearIssue): string => {
  const days = computeStatusDays(issue)
  return days === null ? '—' : `${days}d`
}

const sortIssues = (issues: LinearIssue[], key: SortKey, dir: SortDir) => {
  return [...issues].sort((a, b) => {
    let av: string | number = ''
    let bv: string | number = ''
    if (key === 'identifier') { av = a.identifier; bv = b.identifier }
    else if (key === 'title') { av = a.title; bv = b.title }
    else if (key === 'state') { av = a.state.name; bv = b.state.name }
    else if (key === 'priority') { av = a.priority; bv = b.priority }
    else if (key === 'team') { av = a.team.name; bv = b.team.name }
    else if (key === 'assignee') { av = a.assignee?.name ?? ''; bv = b.assignee?.name ?? '' }
    else if (key === 'creator') { av = a.creator?.name ?? ''; bv = b.creator?.name ?? '' }
    else if (key === 'labels') { av = (a.labels?.map(l => l.name).join(',') ?? ''); bv = (b.labels?.map(l => l.name).join(',') ?? '') }
    else if (key === 'createdAt') { av = a.createdAt; bv = b.createdAt }
    else if (key === 'updatedAt') { av = a.updatedAt; bv = b.updatedAt }
    else if (key === 'timeInStatus') {
      av = computeStatusDays(a) ?? -1
      bv = computeStatusDays(b) ?? -1
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })
}

interface TicketTableProps {
  issues: LinearIssue[]
  onSelectIssue: (issue: LinearIssue) => void
}

const COLUMNS: { id: SortKey; label: string }[] = [
  { id: 'identifier', label: 'ID' },
  { id: 'title', label: 'Title' },
  { id: 'state', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'team', label: 'Team' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'creator', label: 'Creator' },
  { id: 'labels', label: 'Labels' },
  { id: 'createdAt', label: 'Created' },
  { id: 'updatedAt', label: 'Updated' },
  { id: 'timeInStatus', label: 'Status Time' }
]

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, { label: 'All', value: -1 }]

export const TicketTable = ({ issues, onSelectIssue }: TicketTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => sortIssues(issues, sortKey, sortDir), [issues, sortKey, sortDir])

  useEffect(() => {
    setPage(0)
  }, [issues, sortKey, sortDir, rowsPerPage])

  const pageStart = page * rowsPerPage
  const visible = rowsPerPage === -1 ? sorted : sorted.slice(pageStart, pageStart + rowsPerPage)

  return (
    <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {COLUMNS.map(({ id, label }) => (
              <TableCell key={id} sortDirection={sortKey === id ? sortDir : false} sx={{ whiteSpace: 'nowrap' }}>
                <TableSortLabel active={sortKey === id} direction={sortKey === id ? sortDir : 'asc'} onClick={() => handleSort(id)}>
                  {label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.map((issue) => (
            <StyledTableRow key={issue.id} onClick={() => onSelectIssue(issue)} hover>
              <IdentifierCell>{issue.identifier || issue.id || '—'}</IdentifierCell>
              <TruncatedCell>
                <Typography variant="body2" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{issue.title}</Typography>
              </TruncatedCell>
              <TableCell>
                <Chip label={issue.state.name} size="small"
                  sx={{ backgroundColor: STATE_TYPE_COLORS[issue.state.type] + '22', color: STATE_TYPE_COLORS[issue.state.type], fontWeight: 600, height: 20 }} />
              </TableCell>
              <TableCell>
                <Chip label={PRIORITY_LABELS[issue.priority]} size="small"
                  sx={{ backgroundColor: PRIORITY_COLORS[issue.priority] + '22', color: PRIORITY_COLORS[issue.priority], fontWeight: 600, height: 20 }} />
              </TableCell>
              <TableCell><Typography variant="body2">{issue.team.name}</Typography></TableCell>
              <TableCell>
                <Typography variant="body2">{issue.assignee?.name ?? '—'}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{issue.creator?.name ?? '—'}</Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {issue.labels && issue.labels.length > 0 ? issue.labels.map((l) => (
                    <Chip key={l.name} label={l.name} size="small" sx={{ backgroundColor: l.color + '33', color: l.color, fontWeight: 600, height: 20 }} />
                  )) : '—'}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">{dayjs(issue.createdAt).format('D MMM YY')}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">{dayjs(issue.updatedAt).format('D MMM YY')}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatStatusTime(issue)}</Typography>
              </TableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      />
    </TableContainer>
  )
}
