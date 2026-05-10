import { Octokit } from '@octokit/rest'
import { searchAndReadFiles } from '@/lib/github'
import type { RepoContext } from '@/types'

export async function runRepoScout(
  octokit: Octokit,
  owner: string,
  repo: string,
  issue: { title: string; body: string }
): Promise<RepoContext> {
  const keywords = `${issue.title} ${issue.body.slice(0, 100)}`
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter((w) => w.length > 3)
    .slice(0, 6)
    .join(' ')

  const files = await searchAndReadFiles(octokit, owner, repo, keywords)
  return { files }
}
