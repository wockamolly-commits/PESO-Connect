const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY')!
const VOYAGE_EMBED_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_EMBED_MODEL = 'voyage-3'
const VOYAGE_OUTPUT_DIMENSION = 1024

export type VoyageInputType = 'document' | 'query'

export const ensureVoyageConfigured = () => {
  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is not configured')
  }
}

export const embedTexts = async (
  texts: string[],
  inputType: VoyageInputType = 'document',
) => {
  ensureVoyageConfigured()

  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('At least one text is required for embedding')
  }

  if (texts.length > 128) {
    throw new Error('Voyage embed supports a maximum of 128 texts per request')
  }

  const response = await fetch(VOYAGE_EMBED_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VOYAGE_EMBED_MODEL,
      input: texts,
      input_type: inputType,
      truncation: true,
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      payload?.error ||
      `Voyage embed request failed (${response.status})`
    throw new Error(message)
  }

  const data = payload?.data
  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error('Voyage embed response did not include embeddings')
  }

  const embeddings = data.map((item: { embedding: number[] }) => item.embedding)

  return {
    embeddings,
    model: VOYAGE_EMBED_MODEL,
    dimension: VOYAGE_OUTPUT_DIMENSION,
    raw: payload,
  }
}
