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
  const fixAgentReward = bountyUsdc - repoScoutReward - docsScoutReward

  const tasks = [
    { title: `[AgentWork] Repo Scout: ${issueTitle}`, reward: repoScoutReward },
    { title: `[AgentWork] Docs Scout: ${issueTitle}`, reward: docsScoutReward },
    { title: `[AgentWork] Fix Agent: ${issueTitle}`, reward: fixAgentReward },
  ]

  const fallbacks: ClustlyTask[] = [
    { id: 'degraded-repo-scout', title: `Repo Scout: ${issueTitle}`, status: 'posted' },
    { id: 'degraded-docs-scout', title: `Docs Scout: ${issueTitle}`, status: 'posted' },
    { id: 'degraded-fix-agent', title: `Fix Agent: ${issueTitle}`, status: 'posted' },
  ]

  const results = await Promise.all(
    tasks.map(async (task, i) => {
      const fallback = fallbacks[i]!
      try {
        const response = await fetch('https://api.clustly.ai/v1/tasks', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.CLUSTLY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...task, currency: 'USDC' }),
        })
        if (!response.ok) {
          console.warn('[Clustly] API unavailable, degrading sub-task', fallback.id)
          return fallback
        }
        try {
          return (await response.json()) as ClustlyTask
        } catch {
          console.warn('[Clustly] Invalid JSON response, degrading sub-task', fallback.id)
          return fallback
        }
      } catch {
        console.warn('[Clustly] Network error, degrading sub-task', fallback.id)
        return fallback
      }
    })
  )
  return results
}
