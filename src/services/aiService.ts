import { ChatMessage, LinearIssue } from '../types'
import { PRIORITY_LABELS, STATE_TYPE_LABELS } from '../constants'

export const buildTicketContext = (issues: LinearIssue[]): string => {
  const summary = {
    total: issues.length,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byTeam: {} as Record<string, number>
  }

  issues.forEach((issue) => {
    const stateLabel = STATE_TYPE_LABELS[issue.state.type] ?? issue.state.name
    summary.byStatus[stateLabel] = (summary.byStatus[stateLabel] ?? 0) + 1
    const priorityLabel = PRIORITY_LABELS[issue.priority] ?? 'Unknown'
    summary.byPriority[priorityLabel] = (summary.byPriority[priorityLabel] ?? 0) + 1
    summary.byTeam[issue.team.name] = (summary.byTeam[issue.team.name] ?? 0) + 1
  })

  const ticketList = issues
    .slice(0, 200)
    .map(
      (i) =>
        `[${i.identifier}] ${i.title} | Status: ${i.state.name} | Priority: ${i.priorityLabel} | Team: ${i.team.name} | Assignee: ${i.assignee?.name ?? 'Unassigned'} | Updated: ${new Date(i.updatedAt).toLocaleDateString()}`
    )
    .join('\n')

  return `
TICKET SUMMARY (${issues.length} tickets):
By Status: ${JSON.stringify(summary.byStatus)}
By Priority: ${JSON.stringify(summary.byPriority)}
By Team: ${JSON.stringify(summary.byTeam)}

TICKET LIST (up to 200 shown):
${ticketList}
`.trim()
}

export const sendChatMessage = async (
  apiKey: string,
  messages: ChatMessage[],
  ticketContext: string
): Promise<string> => {
  const systemPrompt = `You are a helpful assistant for analysing Linear project management tickets.
You have access to the following ticket data:

${ticketContext}

Answer questions concisely and accurately based on this data. Use markdown for formatting when helpful.
If asked for counts, lists, or summaries, reference the actual ticket data provided.`

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, messages, systemPrompt })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? 'AI service error')
  }

  const data = await response.json()
  return data.content[0].text as string
}

export interface QaCommentSummaryInput {
  identifier: string
  title: string
  comment: string
  commentAuthor?: string
}

export interface QaCommentSummaryItem {
  identifier: string
  summary: string
}

// One line per ticket, "IDENTIFIER: summary", so per-ticket attribution survives
// even if the model reorders or drops a line — anything missing just falls back to '—'.
export const summarizeQaComments = async (
  apiKey: string,
  items: QaCommentSummaryInput[]
): Promise<QaCommentSummaryItem[]> => {
  const ticketBlock = items
    .map((i) => `[${i.identifier}] ${i.title}\nComment${i.commentAuthor ? ` (${i.commentAuthor})` : ''}: ${i.comment}`)
    .join('\n\n')

  const systemPrompt = `You summarize QA ticket comments into a very high-level, scannable brief for a QA lead.
For EVERY ticket given, output exactly one line in the form:
IDENTIFIER: <one short, plain-English sentence, 12 words or fewer>
Be blunt and concrete (what's broken, blocked, or confirmed) rather than vague ("has an issue").
Never merge multiple tickets into one line, never omit a ticket, never add commentary outside this format.`

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      messages: [{ role: 'user', content: ticketBlock }],
      systemPrompt
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? 'AI service error')
  }

  const data = await response.json()
  const text = data.content[0].text as string

  const byIdentifier = new Map<string, string>()
  text.split('\n').forEach((line) => {
    const match = line.match(/^\[?([A-Za-z][A-Za-z0-9]*-\d+)\]?:?\s*(.+)$/)
    if (match) byIdentifier.set(match[1], match[2].trim())
  })

  return items.map((i) => ({ identifier: i.identifier, summary: byIdentifier.get(i.identifier) ?? '—' }))
}
