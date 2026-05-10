import { NextRequest } from 'next/server'
import { runPipeline } from '@/agents/orchestrator'
import type { PipelineEvent } from '@/types'

export async function POST(req: NextRequest) {
  const { issueUrl, bountyUsdc } = (await req.json()) as { issueUrl: string; bountyUsdc: number }

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
