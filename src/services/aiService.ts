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
