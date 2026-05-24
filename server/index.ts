import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

app.post('/api/ai/chat', async (req, res) => {
  const { apiKey, messages, systemPrompt } = req.body

  if (!apiKey) {
    res.status(400).json({ error: 'Anthropic API key is required' })
    return
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages
    })
    res.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

const PORT = 4000
app.listen(PORT, () => {
  console.log(`AI server running at http://localhost:${PORT}`)
})
