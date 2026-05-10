import type { DocsContext } from '@/types'

const NIA_BASE = 'https://apigcp.trynia.ai/v2'

export async function runDocsScout(issue: { title: string; body: string }): Promise<DocsContext> {
  const apiKey = process.env.NIA_API_KEY
  if (!apiKey) {
    console.warn('[Nia] NIA_API_KEY not set — returning empty docs context')
    return { docs: [] }
  }

  const query = `${issue.title} ${issue.body.slice(0, 200)}`

  try {
    const response = await fetch(`${NIA_BASE}/search`, {
      method: 'POST',
      signal: AbortSignal.timeout(8_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'query',
        messages: [{ role: 'user', content: query }],
      }),
    })

    if (!response.ok) {
      console.warn('[Nia] Search failed:', response.status)
      return { docs: [] }
    }

    const data = await response.json() as { content?: string; text?: string; results?: Array<{ content?: string; text?: string }> }

    const text =
      data.content ??
      data.text ??
      data.results?.map((r) => r.content ?? r.text ?? '').join('\n\n') ??
      ''

    if (!text) return { docs: [] }

    return {
      docs: [{ source: 'Nia', content: text.slice(0, 3000) }],
    }
  } catch (err) {
    console.warn('[Nia] Search request failed:', err)
    return { docs: [] }
  }
}
