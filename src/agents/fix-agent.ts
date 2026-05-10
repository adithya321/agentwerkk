import { ClodClient } from '@/lib/clod'
import type { RepoContext, DocsContext, FixOutput } from '@/types'

export async function runFixAgent(
  clod: ClodClient,
  issue: { title: string; body: string },
  repoCtx: RepoContext,
  docsCtx: DocsContext
): Promise<FixOutput> {
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
Analyze the issue and produce a fix. Return ONLY a JSON object with this exact shape:
{
  "files": [
    { "path": "path/to/file.ts", "content": "...complete file content..." }
  ],
  "explanation": "One paragraph explaining what was wrong and what you changed.",
  "prTitle": "fix: short description of the fix",
  "prBody": "## What\\nDescribe the change.\\n\\n## Why\\nDescribe the root cause.\\n\\n## How tested\\nDescribe how to verify the fix."
}

Rules:
- Include ONLY files you modify.
- Write the COMPLETE new file content, not a diff.
- If you cannot determine a fix, return valid JSON with an empty files array and an honest explanation.`

  const raw = await clod.complete([{ role: 'user', content: prompt }])

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Fix Agent returned no parseable JSON')

  const parsed = JSON.parse(jsonMatch[0]) as Partial<FixOutput>
  if (!Array.isArray(parsed.files)) {
    throw new Error('Fix Agent returned malformed JSON: missing "files" array')
  }
  return parsed as FixOutput
}
