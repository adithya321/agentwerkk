import { Octokit } from '@octokit/rest'
import type { FixOutput } from '@/types'

export function makeOctokit() {
  return new Octokit({ auth: process.env.GITHUB_TOKEN })
}

export function parseIssueUrl(url: string): { owner: string; repo: string; issueNumber: number } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/)
  if (!match) throw new Error(`Cannot parse GitHub issue URL: ${url}`)
  return { owner: match[1], repo: match[2], issueNumber: parseInt(match[3]) }
}

export async function getIssue(octokit: Octokit, owner: string, repo: string, issueNumber: number) {
  const { data } = await octokit.issues.get({ owner, repo, issue_number: issueNumber })
  return { title: data.title, body: data.body ?? '' }
}

export async function searchAndReadFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  query: string
): Promise<Array<{ path: string; content: string }>> {
  const { data } = await octokit.search.code({ q: `${query} repo:${owner}/${repo}` })
  const topFiles = data.items.slice(0, 5)

  const contents = await Promise.allSettled(
    topFiles.map(async (item) => {
      const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: item.path })
      if (!('content' in fileData)) return null
      return {
        path: item.path,
        content: Buffer.from(fileData.content as string, 'base64').toString('utf-8'),
      }
    })
  )

  return contents
    .filter((r): r is PromiseFulfilledResult<{ path: string; content: string } | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is { path: string; content: string } => v !== null)
}

export async function applyFixAndCreatePR(
  octokit: Octokit,
  owner: string,
  repo: string,
  fix: FixOutput,
  baseBranch = 'main'
): Promise<string> {
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` })
  const baseSha = ref.object.sha

  const { data: baseCommit } = await octokit.git.getCommit({ owner, repo, commit_sha: baseSha })
  const baseTreeSha = baseCommit.tree.sha

  const treeItems = await Promise.all(
    fix.files.map(async (f) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(f.content).toString('base64'),
        encoding: 'base64',
      })
      return { path: f.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha }
    })
  )

  const { data: newTree } = await octokit.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems })
  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo, message: fix.prTitle, tree: newTree.sha, parents: [baseSha],
  })
  const branchName = `agentwork/fix-${Date.now()}`
  await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: newCommit.sha })
  const { data: pr } = await octokit.pulls.create({
    owner, repo, title: fix.prTitle, body: fix.prBody, head: branchName, base: baseBranch,
  })
  return pr.html_url
}
