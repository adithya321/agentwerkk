import { Octokit } from '@octokit/rest'
import { searchAndReadFiles, listRepoFiles } from '@/lib/github'
import type { RepoContext, PipelineEvent } from '@/types'

export async function runRepoScout(
  octokit: Octokit,
  owner: string,
  repo: string,
  issue: { title: string; body: string },
  send: (event: PipelineEvent) => void
): Promise<RepoContext> {
  const log = (message: string, level?: 'info' | 'warn' | 'error') =>
    send({ type: 'log', agent: 'repo-scout', message, level })

  const keywords = `${issue.title} ${issue.body.slice(0, 100)}`
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter((w) => w.length > 3)
    .slice(0, 8)

  log(`Extracted keywords: [${keywords.join(', ')}]`)
  log(`Trying GitHub code search with query: "${keywords.slice(0, 6).join(' ')}"`)

  let files = await searchAndReadFiles(octokit, owner, repo, keywords.slice(0, 6).join(' '))

  if (files.length === 0) {
    log('Code search returned 0 results — falling back to full tree-walk', 'warn')
    files = await listRepoFiles(octokit, owner, repo, keywords)
    log(`Tree-walk matched ${files.length} file(s)`)
  } else {
    log(`Code search returned ${files.length} file(s)`)
  }

  files.forEach((f) => log(`  → ${f.path} (${f.content.length} chars)`))

  return { files }
}
