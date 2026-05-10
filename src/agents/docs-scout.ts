import type { DocsContext, PipelineEvent } from '@/types'

const NIA_BASE = 'https://apigcp.trynia.ai/v2'

export async function runDocsScout(
  issue: { title: string; body: string },
  send: (event: PipelineEvent) => void
): Promise<DocsContext> {
  const log = (message: string, level?: 'info' | 'warn' | 'error') =>
    send({ type: 'log', agent: 'docs-scout', message, level })

  const apiKey = process.env.NIA_API_KEY
  if (!apiKey) {
    log('NIA_API_KEY not set — skipping docs search', 'warn')
    return { docs: [] }
  }

  const query = `${issue.title} ${issue.body.slice(0, 200)}`
  log(`Query: "${query.slice(0, 120)}${query.length > 120 ? '…' : ''}"`)
  log(`POST ${NIA_BASE}/search`)

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

    log(`Nia responded with HTTP ${response.status}`)

    if (!response.ok) {
      log(`Search failed (${response.status}) — returning empty docs`, 'warn')
      return { docs: [] }
    }

    const data = await response.json() as { content?: string; text?: string; results?: Array<{ content?: string; text?: string }> }

    const text =
      data.content ??
      data.text ??
      data.results?.map((r) => r.content ?? r.text ?? '').join('\n\n') ??
      ''

    if (!text) {
      log('Response contained no usable text — returning empty docs', 'warn')
      return { docs: [] }
    }

    log(`Retrieved ${text.length} chars from Nia; capping at 3000`)
    return {
      docs: [{ source: 'Nia', content: text.slice(0, 3000) }],
    }
  } catch (err) {
    log(`Search request failed: ${err instanceof Error ? err.message : String(err)}`, 'warn')
    return { docs: [] }
  }
}
