import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { DocsContext } from '@/types'

export async function runDocsScout(issue: { title: string; body: string }): Promise<DocsContext> {
  if (!process.env.NIA_MCP_URL) {
    console.warn('[Nia] NIA_MCP_URL not set — returning empty docs context')
    return { docs: [] }
  }

  const transport = new SSEClientTransport(new URL(process.env.NIA_MCP_URL))
  const client = new Client(
    { name: 'agentwerkk-docs-scout', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)

  const query = `${issue.title} ${issue.body.slice(0, 200)}`
  const result = await client.callTool({
    name: 'search',
    arguments: { query },
  })

  await client.close()

  const content = result.content as Array<{ type: string; text: string }>
  return {
    docs: content
      .filter((c) => c.type === 'text' && c.text.length > 0)
      .slice(0, 3)
      .map((c) => ({ source: 'Nia', content: c.text })),
  }
}
