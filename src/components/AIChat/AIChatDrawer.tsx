import { useState, useRef, useEffect } from 'react'
import { Drawer, Box, Typography, TextField, IconButton, CircularProgress, Paper, Divider, Alert } from '@mui/material'
import { styled } from '@mui/material/styles'
import SendIcon from '@mui/icons-material/Send'
import CloseIcon from '@mui/icons-material/Close'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'
import { useAppStore } from '../../stores/useAppStore'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { sendChatMessage, buildTicketContext } from '../../services/aiService'
import { ChatMessage } from '../../types'

const DRAWER_WIDTH = 420

const ChatRoot = styled(Box)({ display: 'flex', flexDirection: 'column', height: '100%', width: DRAWER_WIDTH })
const ChatHeader = styled(Box)(({ theme }) => ({ padding: theme.spacing(2), display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }))
const MessagesArea = styled(Box)(({ theme }) => ({ flex: 1, overflowY: 'auto', padding: theme.spacing(2), display: 'flex', flexDirection: 'column', gap: theme.spacing(1.5) }))
const InputArea = styled(Box)(({ theme }) => ({ padding: theme.spacing(2), borderTop: '1px solid #e2e8f0', display: 'flex', gap: theme.spacing(1), alignItems: 'flex-end' }))

const MessageBubble = styled(Paper)<{ isuser: string }>(({ theme, isuser }) => ({
  padding: theme.spacing(1, 1.5),
  maxWidth: '85%',
  alignSelf: isuser === 'true' ? 'flex-end' : 'flex-start',
  backgroundColor: isuser === 'true' ? theme.palette.primary.main : '#f1f5f9',
  color: isuser === 'true' ? '#fff' : 'inherit',
  borderRadius: isuser === 'true' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
}))

interface AIChatDrawerProps {
  open: boolean
  onClose: () => void
}

export const AIChatDrawer = ({ open, onClose }: AIChatDrawerProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const anthropicApiKey = useAppStore((s) => s.settings.anthropicApiKey)
  const { issues } = useFilteredIssues()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const context = buildTicketContext(issues)
      const reply = await sendChatMessage(anthropicApiKey, nextMessages, context)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: DRAWER_WIDTH } }}>
      <ChatRoot>
        <ChatHeader>
          <Box display="flex" alignItems="center" gap={1}>
            <SmartToyIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>AI Assistant</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary">{issues.length} tickets in context</Typography>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </ChatHeader>

        <MessagesArea>
          {messages.length === 0 && (
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
              Ask anything about your tickets.<br />
              e.g. "How many are overdue?" or "Summarise open bugs by team."
            </Typography>
          )}
          {messages.map((msg, idx) => (
            <Box key={idx} display="flex" alignItems="flex-end" gap={1} flexDirection={msg.role === 'user' ? 'row-reverse' : 'row'}>
              {msg.role === 'assistant' ? <SmartToyIcon fontSize="small" color="primary" /> : <PersonIcon fontSize="small" color="action" />}
              <MessageBubble elevation={0} isuser={String(msg.role === 'user')}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
              </MessageBubble>
            </Box>
          ))}
          {isLoading && (
            <Box display="flex" alignItems="center" gap={1}>
              <SmartToyIcon fontSize="small" color="primary" />
              <CircularProgress size={16} />
            </Box>
          )}
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <div ref={messagesEndRef} />
        </MessagesArea>

        <Divider />
        {!anthropicApiKey && (
          <Alert severity="warning" sx={{ m: 1, borderRadius: 1 }}>Add your Anthropic API key in Settings to use AI chat.</Alert>
        )}
        <InputArea>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Ask about your tickets…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!anthropicApiKey}
          />
          <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || isLoading || !anthropicApiKey}>
            <SendIcon />
          </IconButton>
        </InputArea>
      </ChatRoot>
    </Drawer>
  )
}
