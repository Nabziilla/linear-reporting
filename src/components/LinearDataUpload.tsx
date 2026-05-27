
import { useState } from 'react'
import { Box, Button, Typography, Alert, Paper } from '@mui/material'
import Papa from 'papaparse'

// Map CSV columns to expected dashboard fields

const deriveStateTypeFromText = (raw: string): string | null => {
  const key = raw.trim().toLowerCase()
  if (!key) return null
  if (key.includes('duplicate')) return 'duplicate'
  if (key.includes('cancel')) return 'canceled'
  if (key.includes('triage')) return 'triage'
  if (
    key.includes('review') ||
    key.includes('qa') ||
    key.includes('testing') ||
    key.includes('progress') ||
    key.includes('started') ||
    key.includes('doing') ||
    key.includes('ready for prod')
  ) return 'started'
  if (key.includes('done') || key.includes('complete') || key.includes('closed') || key.includes('resolved')) return 'completed'
  if (key.includes('backlog') || key.includes('shaping') || key.includes('discovery') || key.includes('ready for engg')) return 'backlog'
  if (key.includes('todo') || key.includes('to do') || key.includes('open') || key.includes('unstarted') || key.includes('new')) return 'unstarted'
  return null
}

const PRIORITY_FROM_NAME: Record<string, number> = {
  'no priority': 0,
  'none': 0,
  '': 0,
  'urgent': 1,
  'high': 2,
  'medium': 3,
  'normal': 3,
  'low': 4
}

const deriveStateType = (name: string, fallback: string): string => {
  return deriveStateTypeFromText(name) || deriveStateTypeFromText(fallback) || 'unstarted'
}

const derivePriority = (raw: string): number => {
  const trimmed = (raw || '').trim()
  if (!trimmed) return 0
  const asNum = Number(trimmed)
  if (!Number.isNaN(asNum) && asNum >= 0 && asNum <= 4) return asNum
  return PRIORITY_FROM_NAME[trimmed.toLowerCase()] ?? 0
}

function mapCsvRow(row: Record<string, string>): Record<string, any> {
  // Helper to extract name from email
  const nameFromEmail = (email: string) => {
    const beforeAt = email.split('@')[0];
    const name = beforeAt
      .split(/[._-]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
    return name.trim() || email;
  };

  // Assignee
  let assigneeObj = undefined;
  const rawAssignee = (row.assigneeemail || row.assignee || '').trim();
  if (rawAssignee) {
    const isEmail = rawAssignee.includes('@');
    const email = isEmail ? rawAssignee : '';
    const name = isEmail ? nameFromEmail(rawAssignee) : rawAssignee;
    assigneeObj = { id: rawAssignee, name, email };
  }

  // Creator
  let creatorObj = undefined;
  const rawCreator = (row.creator || row.creatorname || row.creatorid || row.creator_email || '').trim();
  if (rawCreator) {
    const isEmail = rawCreator.includes('@');
    const email = isEmail ? rawCreator : '';
    const name = isEmail ? nameFromEmail(rawCreator) : rawCreator;
    creatorObj = { id: rawCreator, name, email };
  }

  // Labels (try to parse as comma-separated, or JSON array if present)
  let labelsArr = [];
  if (row.labels) {
    try {
      if (row.labels.trim().startsWith('[')) {
        // JSON array
        labelsArr = JSON.parse(row.labels).map((l: any) => typeof l === 'string' ? { name: l, color: '' } : l);
      } else {
        labelsArr = row.labels.split(',').map(l => ({ name: l.trim(), color: '' })).filter(l => l.name);
      }
    } catch {
      labelsArr = row.labels.split(',').map(l => ({ name: l.trim(), color: '' })).filter(l => l.name);
    }
  }

  let timeInStatus: number | string = row['timeinstatus(minutes)']
    || row['timeinstatusminutes']
    || row.timeinstatus
    || row['time_in_status']
    || ''
  if (typeof timeInStatus === 'string' && timeInStatus.trim() !== '') {
    const num = Number(timeInStatus)
    if (!Number.isNaN(num)) timeInStatus = num
  }

  return {
    id: row.id || row.issueid || row.identifier || '',
    identifier: row.identifier || row.issueid || row.id || '',
    title: row.title || row.issuetitle || '',
    description: row.description || '',
    priority: derivePriority(row.priority || row.prioritylabel || ''),
    priorityLabel: row.prioritylabel || row.priority || '',
    state: {
      id: row.stateid || '',
      name: row.state || row.status || '',
      type: deriveStateType(row.state || row.status || '', row.statetype || ''),
      color: row.statecolor || '#888'
    },
    assignee: assigneeObj,
    creator: creatorObj,
    team: { id: row.teamid || '', name: row.team || row.team || '', key: row.teamkey || '' },
    createdAt: row.createdat || row.created || '',
    updatedAt: row.updatedat || row.updated || '',
    completedAt: row.completedat || row.completed || '',
    dueDate: row.duedate || '',
    estimate: row.estimate || '',
    labels: labelsArr,
    project: row.project ? { id: '', name: row.project } : undefined,
    url: row.url || '',
    timeInStatus
  }
}

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
    reader.readAsText(file)
  })

const parseFile = async (file: File): Promise<any[]> => {
  const text = await readFileAsText(file)
  if (file.name.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) throw new Error(`${file.name}: JSON root must be an array`)
    return parsed
  }
  if (file.name.toLowerCase().endsWith('.csv')) {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
    if (parsed.errors.length > 0) {
      throw new Error(`${file.name}: ${parsed.errors.map((err: any) => err.message).join('; ')}`)
    }
    const rows = parsed.data as Record<string, string>[]
    const normKey = (k: string) => k.trim().toLowerCase().replace(/\s+|_+/g, '')
    return rows.map((row) => {
      const raw = Object.fromEntries(Object.entries(row).map(([k, v]) => [normKey(k), v ?? '']))
      return mapCsvRow(raw)
    })
  }
  throw new Error(`${file.name}: unsupported file type`)
}

const dedupeIssues = (issues: any[]): { merged: any[]; duplicates: number } => {
  const seen = new Map<string, any>()
  let duplicates = 0
  for (const issue of issues) {
    const key = (issue?.id || issue?.identifier || issue?.url || issue?.title || '').toString().trim()
    if (!key) {
      seen.set(`__no-key-${seen.size}`, issue)
      continue
    }
    if (seen.has(key)) {
      duplicates++
      continue
    }
    seen.set(key, issue)
  }
  return { merged: Array.from(seen.values()), duplicates }
}

const readExistingIssues = (): any[] => {
  try {
    const raw = sessionStorage.getItem('linear-upload-data')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function LinearDataUpload({ onData }: { onData: (data: any[]) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [sampleOpen, setSampleOpen] = useState(false)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setError(null)
    setInfo(null)

    try {
      const parsedPerFile = await Promise.all(files.map(parseFile))
      const incoming = parsedPerFile.flat()
      if (incoming.length === 0) throw new Error('No rows found in uploaded files')

      const existing = readExistingIssues()
      const { merged, duplicates } = dedupeIssues([...existing, ...incoming])

      const added = merged.length - existing.length
      sessionStorage.setItem('linear-upload-data', JSON.stringify(merged))
      onData(merged)

      const fileLabel = files.length === 1 ? files[0].name : `${files.length} files`
      setInfo(`${fileLabel}: added ${added} new, skipped ${duplicates} duplicate${duplicates === 1 ? '' : 's'}. Total ${merged.length}.`)
    } catch (err: any) {
      setError('Could not parse file: ' + (err?.message ?? String(err)))
    }
  }

  const handleClear = () => {
    sessionStorage.removeItem('linear-upload-data')
    onData([])
    setInfo(null)
    setError(null)
  }

  return (
    <Box my={2}>
      <Typography variant="subtitle1" gutterBottom>Upload Linear Issues Export (CSV or JSON)</Typography>
      <Button variant="contained" component="label">
        Upload File(s)
        <input type="file" accept=".csv,.json" hidden multiple onChange={handleFiles} />
      </Button>
      <Button size="small" sx={{ ml: 2 }} onClick={handleClear}>Clear</Button>
      <Button size="small" sx={{ ml: 1 }} onClick={() => setSampleOpen((v) => !v)}>
        {sampleOpen ? 'Hide Sample Format' : 'Show Sample Format'}
      </Button>
      {sampleOpen && (
        <Paper sx={{ mt: 2, p: 2, background: '#f8fafc', fontFamily: 'monospace', fontSize: 13 }}>
          <Typography variant="caption">Sample CSV columns:</Typography>
          <pre style={{ margin: 0 }}>
            {`id,identifier,title,description,priority,priorityLabel,state,assignee,team,createdAt,updatedAt,completedAt,dueDate,estimate,project,url`}
          </pre>
          <Typography variant="caption">Minimal required: <b>title, state, team</b></Typography>
        </Paper>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {info && !error && <Alert severity="success" sx={{ mt: 2 }}>{info}</Alert>}
    </Box>
  )
}
