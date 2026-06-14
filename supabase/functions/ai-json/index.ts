import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'

const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY')!
const COHERE_API_URL = 'https://api.cohere.com/v2/chat'
const COHERE_MODEL = 'command-a-03-2025'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest()
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 })

  try {
    if (!COHERE_API_KEY) {
      return jsonResponse({ error: 'AI service is not configured' }, { status: 503 })
    }

    const body = await req.json()
    const prompt = String(body.prompt || '').trim()
    const maxTokens = Math.min(Math.max(Number(body.maxTokens) || 2048, 128), 4096)

    if (!prompt) return jsonResponse({ error: 'Missing prompt' }, { status: 400 })
    if (prompt.length > 24000) return jsonResponse({ error: 'Prompt is too large' }, { status: 413 })

    const response = await fetch(COHERE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${COHERE_API_KEY}`,
      },
      body: JSON.stringify({
        model: COHERE_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that always responds with valid JSON only. No markdown, no explanation, no code blocks, just raw JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = response.status === 429
        ? 'AI rate limit reached. Please wait a moment and try again.'
        : payload.message || `AI API request failed (${response.status})`
      return jsonResponse({ error: message }, { status: response.status })
    }

    const content = payload.message?.content?.[0]?.text
    if (!content) return jsonResponse({ error: 'AI returned an empty response.' }, { status: 502 })

    return jsonResponse({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed'
    const status = message.includes('authorization') || message.includes('token') ? 401 : 500
    return jsonResponse({ error: message }, { status })
  }
})
