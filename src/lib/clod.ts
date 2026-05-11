import OpenAI from 'openai'
import type { ClodUsage } from '@/types'

const DIRECT_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 0.000003, output: 0.000015 },
}
const CLOD_SAVINGS_PCT = 60

function requireEnv(name: 'CLOD_API_KEY' | 'CLOD_BASE_URL'): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export class ClodClient {
  private client: OpenAI
  private model: string
  private actualModel: string
  private usageLogs: Array<{ prompt: number; completion: number }> = []

  constructor(modelOverride?: string) {
    this.client = new OpenAI({
      apiKey: requireEnv('CLOD_API_KEY'),
      baseURL: requireEnv('CLOD_BASE_URL'),
      timeout: 180_000,
    })
    this.model = modelOverride?.trim() || (process.env.CLOD_MODEL ?? 'claude-sonnet-4-6').trim()
    this.actualModel = this.model
  }

  async complete(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    const maxTokens = parseInt(process.env.CLOD_MAX_TOKENS ?? '8192', 10)
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: maxTokens,
    })
    const choice = response.choices[0]
    if (choice?.finish_reason === 'length') {
      throw new Error(`CLōD response truncated at ${maxTokens} tokens — set CLOD_MAX_TOKENS higher`)
    }
    const usage = response.usage
    if (!usage) throw new Error('No usage data in response')
    this.usageLogs.push({ prompt: usage.prompt_tokens, completion: usage.completion_tokens })
    this.actualModel = response.model ?? this.model
    return choice?.message.content ?? ''
  }

  getTotalUsage(): ClodUsage {
    const totalPrompt = this.usageLogs.reduce((s, u) => s + u.prompt, 0)
    const totalCompletion = this.usageLogs.reduce((s, u) => s + u.completion, 0)
    const totalTokens = totalPrompt + totalCompletion
    const costs = DIRECT_COSTS[this.model] ?? { input: 0.000003, output: 0.000015 }
    const directCost = totalPrompt * costs.input + totalCompletion * costs.output
    const clodCost = directCost * (1 - CLOD_SAVINGS_PCT / 100)
    return {
      model: this.actualModel,
      totalTokens,
      clodCost,
      directCost,
      savings: directCost - clodCost,
      savingsPct: CLOD_SAVINGS_PCT,
    }
  }
}
