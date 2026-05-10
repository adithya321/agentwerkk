import OpenAI from 'openai'
import type { ClodUsage } from '@/types'

const DIRECT_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 0.000003, output: 0.000015 },
}
const CLOD_SAVINGS_PCT = 60

export class ClodClient {
  private client: OpenAI
  private model: string
  private usageLogs: Array<{ prompt: number; completion: number }> = []

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.CLOD_API_KEY,
      baseURL: process.env.CLOD_BASE_URL,
    })
    this.model = process.env.CLOD_MODEL ?? 'claude-sonnet-4-6'
  }

  async complete(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
    })
    const usage = response.usage!
    this.usageLogs.push({ prompt: usage.prompt_tokens, completion: usage.completion_tokens })
    return response.choices[0].message.content ?? ''
  }

  getTotalUsage(): ClodUsage {
    const totalPrompt = this.usageLogs.reduce((s, u) => s + u.prompt, 0)
    const totalCompletion = this.usageLogs.reduce((s, u) => s + u.completion, 0)
    const totalTokens = totalPrompt + totalCompletion
    const costs = DIRECT_COSTS[this.model] ?? { input: 0.000003, output: 0.000015 }
    const directCost = totalPrompt * costs.input + totalCompletion * costs.output
    const clodCost = directCost * (1 - CLOD_SAVINGS_PCT / 100)
    return {
      model: this.model,
      totalTokens,
      clodCost,
      directCost,
      savings: directCost - clodCost,
      savingsPct: CLOD_SAVINGS_PCT,
    }
  }
}
