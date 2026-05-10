import { NextRequest } from 'next/server'
import { authorizePipelineRequest } from '@/lib/api-auth'
import { runPipeline } from '@/agents/orchestrator'
import type { PipelineEvent } from '@/types'

export async function POST(req: NextRequest) {
  const auth = authorizePipelineRequest(req)
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    body = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const issueUrl = body.issueUrl
  const bountyUsdc = body.bountyUsdc

  if (
    typeof issueUrl !== 'string' ||
    !issueUrl.trim() ||
    typeof bountyUsdc !== 'number' ||
    !Number.isFinite(bountyUsdc) ||
    bountyUsdc <= 0
  ) {
    return Response.json({ error: 'issueUrl and a positive bountyUsdc are required' }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        await runPipeline({ issueUrl, bountyUsdc, send })
      } catch (e) {
        send({ type: 'error', message: String(e) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
