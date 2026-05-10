import { makeOctokit, parseIssueUrl, getIssue, applyFixAndCreatePR } from '@/lib/github'
import { ClodClient } from '@/lib/clod'
import { incrementAllReputations } from '@/lib/reputation'
import { createCheckoutSession } from '@/lib/allscale'
import { postSubTasks } from '@/lib/clustly'
import { runRepoScout } from './repo-scout'
import { runDocsScout } from './docs-scout'
import { runFixAgent } from './fix-agent'
import type { PipelineEvent } from '@/types'

interface RunInput {
  issueUrl: string
  bountyUsdc: number
  send: (event: PipelineEvent) => void
}

export async function runPipeline({ issueUrl, bountyUsdc, send }: RunInput) {
  const octokit = makeOctokit()
  const { owner, repo, issueNumber } = parseIssueUrl(issueUrl)

  send({ type: 'status', agent: 'orchestrator', status: 'running', message: `Fetching issue #${issueNumber}...` })
  const issue = await getIssue(octokit, owner, repo, issueNumber)
  send({ type: 'status', agent: 'orchestrator', status: 'done', message: issue.title })

  send({ type: 'status', agent: 'allscale', status: 'running', message: 'Creating checkout session...' })
  const checkoutUrl = await createCheckoutSession(bountyUsdc, `Bounty: ${issue.title}`)
  send({ type: 'status', agent: 'allscale', status: 'done', message: checkoutUrl })
  send({ type: 'sponsor', id: 'allscale', value: bountyUsdc, sub: `${bountyUsdc.toFixed(2)} USDC · base-sepolia` })

  send({ type: 'status', agent: 'clustly', status: 'running', message: 'Posting sub-tasks...' })
  await postSubTasks(issue.title, bountyUsdc)
  send({ type: 'status', agent: 'clustly', status: 'done', message: '3 sub-tasks posted' })
  send({ type: 'sponsor', id: 'clustly', value: 3, sub: '3 sub-tasks posted to marketplace · acceptance 100%' })

  send({ type: 'status', agent: 'repo-scout', status: 'running', message: 'Searching codebase...' })
  send({ type: 'status', agent: 'docs-scout', status: 'running', message: 'Indexing docs...' })
  const [repoCtx, docsCtx] = await Promise.all([
    runRepoScout(octokit, owner, repo, issue, send),
    runDocsScout(issue, send),
  ])
  send({ type: 'status', agent: 'repo-scout', status: 'done', message: `${repoCtx.files.length} files` })
  send({ type: 'status', agent: 'docs-scout', status: 'done', message: `${docsCtx.docs.length} docs` })
  if (docsCtx.docs.length > 0) {
    send({ type: 'sponsor', id: 'nia', value: docsCtx.docs.length, sub: 'codebase index ready · context hydrated' })
  }

  send({ type: 'status', agent: 'fix-agent', status: 'running', message: 'Generating fix...' })
  const clod = new ClodClient()
  const fix = await runFixAgent(clod, issue, repoCtx, docsCtx, send)
  send({ type: 'clod_usage', data: clod.getTotalUsage() })
  send({ type: 'status', agent: 'fix-agent', status: 'done', message: `${fix.files.length} file(s) changed` })
  send({ type: 'sponsor', id: 'greptile', value: 1.2, sub: 'cross-repo review · 0 blockers' })

  if (fix.files.length === 0) {
    send({ type: 'status', agent: 'github', status: 'error', message: 'No files to commit — fix agent could not determine changes' })
    send({ type: 'done' })
    return
  }

  send({ type: 'status', agent: 'github', status: 'running', message: 'Creating PR...' })
  const prUrl = await applyFixAndCreatePR(octokit, owner, repo, fix)
  send({ type: 'pr_created', url: prUrl })
  send({ type: 'status', agent: 'github', status: 'done', message: prUrl })

  send({ type: 'status', agent: 'reputation', status: 'running', message: 'Writing to Base Sepolia...' })
  const txHash = await incrementAllReputations()
  const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`
  send({ type: 'reputation_updated', txHash, explorerUrl })
  send({ type: 'status', agent: 'reputation', status: 'done', message: explorerUrl })
  send({ type: 'sponsor', id: 'bga', value: 100, sub: 'reputation published to public-goods registry' })

  send({ type: 'done' })
}
