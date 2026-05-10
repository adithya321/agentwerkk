import { ClodClient } from '@/lib/clod'
import type { RepoContext, DocsContext, FixOutput, PipelineEvent } from '@/types'

export async function runFixAgent(
  clod: ClodClient,
  issue: { title: string; body: string },
  repoCtx: RepoContext,
  docsCtx: DocsContext,
  send: (event: PipelineEvent) => void
): Promise<FixOutput> {
  const log = (message: string, level?: 'info' | 'warn' | 'error') =>
    send({ type: 'log', agent: 'fix-agent', message, level })
  log(`Building prompt — ${repoCtx.files.length} repo file(s), ${docsCtx.docs.length} doc(s)`)

  const filesSection = repoCtx.files
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\``)
    .join('\n\n')

  const docsSection = docsCtx.docs
    .map((d) => `### ${d.source}\n${d.content.slice(0, 1000)}`)
    .join('\n\n')

  const prompt = `You are an expert software engineer fixing a GitHub issue.

## Issue: ${issue.title}
${issue.body.slice(0, 1000)}

## Relevant Repository Files
${filesSection || '(none found)'}

## External Documentation Context
${docsSection || '(none found)'}

## Task
You MUST produce a code fix. Even if the issue is ambiguous, make your best judgment and implement a reasonable fix based on the files provided. Do NOT return an empty files array.

Return ONLY a valid JSON object with this exact shape (no markdown, no preamble):
{
  "files": [
    { "path": "path/to/file.ts", "content": "...complete file content..." }
  ],
  "explanation": "One paragraph explaining what was wrong and what you changed.",
  "prTitle": "fix: short description of the fix",
  "prBody": "## What\\nDescribe the change.\\n\\n## Why\\nDescribe the root cause.\\n\\n## How tested\\nDescribe how to verify the fix."
}

Rules:
- You MUST include at least one file in the files array.
- Write the COMPLETE new file content, not a diff.
- If the fix is small, still write the entire file.
- Base your fix on the repository files shown above.`

  log(`Prompt length: ${prompt.length} chars — sending to CLōD`)

  const parse = (raw: string): FixOutput | null => {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      const parsed = JSON.parse(match[0]) as Partial<FixOutput>
      if (!Array.isArray(parsed.files)) return null
      return parsed as FixOutput
    } catch {
      return null
    }
  }

  let raw = await clod.complete([{ role: 'user', content: prompt }])
  log(`CLōD responded with ${raw.length} chars`)

  let result = parse(raw)

  if (result) {
    log(`Parsed fix: ${result.files.length} file(s) — "${result.prTitle}"`)
  } else {
    log('Parse failed or files array empty — attempting retry', 'warn')
  }

  if (!result || result.files.length === 0) {
    const firstFile = repoCtx.files[0]
    if (firstFile) {
      log(`Retry: targeting "${firstFile.path}" directly`)
      const retryPrompt = `Fix this GitHub issue by modifying the file below. Return ONLY JSON.

Issue: ${issue.title}
${issue.body.slice(0, 500)}

File to fix: ${firstFile.path}
\`\`\`
${firstFile.content.slice(0, 4000)}
\`\`\`

Return JSON: {"files":[{"path":"${firstFile.path}","content":"...complete fixed file..."}],"explanation":"...","prTitle":"fix: ...","prBody":"..."}`
      raw = await clod.complete([{ role: 'user', content: retryPrompt }])
      log(`Retry CLōD response: ${raw.length} chars`)
      result = parse(raw)
      if (result) {
        log(`Retry parsed fix: ${result.files.length} file(s) — "${result.prTitle}"`)
      } else {
        log('Retry parse also failed', 'error')
      }
    }
  }

  if (!result) throw new Error('Fix Agent returned no parseable JSON after retry')
  return result
}
