const BASE = 'https://clustly.ai/api/v1'
const SIMULATE = process.env.SIMULATE_CLUSTLY === 'true'

interface ClustlyTask {
  id: string
  title: string
  status: string
}

export async function postSubTasks(
  issueTitle: string,
  bountyUsdc: number
): Promise<ClustlyTask[]> {
  if (SIMULATE) {
    console.log('[Clustly] Simulating sub-task posting')
    return [
      { id: 'sim-repo-scout', title: `Repo Scout: ${issueTitle}`, status: 'posted' },
      { id: 'sim-docs-scout', title: `Docs Scout: ${issueTitle}`, status: 'posted' },
      { id: 'sim-fix-agent', title: `Fix Agent: ${issueTitle}`, status: 'posted' },
    ]
  }

  const repoScoutReward = +(bountyUsdc * 0.2).toFixed(4)
  const docsScoutReward = +(bountyUsdc * 0.2).toFixed(4)
  const fixAgentReward = +(bountyUsdc - repoScoutReward - docsScoutReward).toFixed(4)

  const tasks = [
    {
      title: `[Agentwerkk] Repo Scout: ${issueTitle}`,
      description: `Search the repository and identify relevant files for the issue: "${issueTitle}". Return file paths and content excerpts.`,
      bounty_amount: repoScoutReward,
      max_slots: 1,
    },
    {
      title: `[Agentwerkk] Docs Scout: ${issueTitle}`,
      description: `Search external documentation for context relevant to: "${issueTitle}". Return useful excerpts and sources.`,
      bounty_amount: docsScoutReward,
      max_slots: 1,
    },
    {
      title: `[Agentwerkk] Fix Agent: ${issueTitle}`,
      description: `Produce a code fix for the GitHub issue: "${issueTitle}". Return modified file paths and complete new file contents as JSON.`,
      bounty_amount: fixAgentReward,
      max_slots: 1,
    },
  ]

  const fallbacks: ClustlyTask[] = [
    { id: 'degraded-repo-scout', title: tasks[0]!.title, status: 'posted' },
    { id: 'degraded-docs-scout', title: tasks[1]!.title, status: 'posted' },
    { id: 'degraded-fix-agent', title: tasks[2]!.title, status: 'posted' },
  ]

  const results = await Promise.all(
    tasks.map(async (task, i) => {
      const fallback = fallbacks[i]!
      try {
        const response = await fetch(`${BASE}/tasks`, {
          method: 'POST',
          headers: {
            'x-agent-key': process.env.CLUSTLY_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(task),
        })
        if (!response.ok) {
          console.warn('[Clustly] API error, degrading sub-task', fallback.id, response.status)
          return fallback
        }
        return (await response.json()) as ClustlyTask
      } catch {
        console.warn('[Clustly] Network error, degrading sub-task', fallback.id)
        return fallback
      }
    })
  )
  return results
}
