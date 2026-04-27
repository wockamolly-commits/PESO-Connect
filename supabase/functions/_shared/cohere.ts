const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY')!
const COHERE_EMBED_URL = 'https://api.cohere.com/v2/embed'
const COHERE_CHAT_URL = 'https://api.cohere.com/v2/chat'
const COHERE_EMBED_MODEL = 'embed-v4.0'
const COHERE_OUTPUT_DIMENSION = 512
const COHERE_CHAT_MODEL = 'command-a-03-2025'

export type CohereInputType = 'search_document' | 'search_query'

export const ensureCohereConfigured = () => {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY is not configured')
  }
}

export const embedTexts = async (
  texts: string[],
  inputType: CohereInputType = 'search_document',
) => {
  ensureCohereConfigured()

  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('At least one text is required for embedding')
  }

  if (texts.length > 96) {
    throw new Error('Cohere embed supports a maximum of 96 texts per request')
  }

  const response = await fetch(COHERE_EMBED_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${COHERE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Client-Name': 'peso-connect-supabase-functions',
    },
    body: JSON.stringify({
      model: COHERE_EMBED_MODEL,
      input_type: inputType,
      texts,
      embedding_types: ['float'],
      output_dimension: COHERE_OUTPUT_DIMENSION,
      truncate: 'END',
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Cohere embed request failed (${response.status})`
    throw new Error(message)
  }

  const embeddings = payload?.embeddings?.float
  if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
    throw new Error('Cohere embed response did not include float embeddings')
  }

  return {
    embeddings,
    model: COHERE_EMBED_MODEL,
    dimension: COHERE_OUTPUT_DIMENSION,
    raw: payload,
  }
}

export const chatJSON = async (
  prompt: string,
  {
    maxTokens = 1200,
    temperature = 0.1,
  }: {
    maxTokens?: number
    temperature?: number
  } = {},
) => {
  ensureCohereConfigured()

  const response = await fetch(COHERE_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${COHERE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Client-Name': 'peso-connect-supabase-functions',
    },
    body: JSON.stringify({
      model: COHERE_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that always responds with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Cohere chat request failed (${response.status})`
    throw new Error(message)
  }

  const text = payload?.message?.content?.[0]?.text
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Cohere chat response did not include JSON text')
  }

  return {
    text,
    raw: payload,
    model: COHERE_CHAT_MODEL,
  }
}
