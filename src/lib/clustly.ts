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

  const tasks = [
    { title: `[AgentWork] Repo Scout: ${issueTitle}`, reward: +(bountyUsdc * 0.2).toFixed(4) },
    { title: `[AgentWork] Docs Scout: ${issueTitle}`, reward: +(bountyUsdc * 0.2).toFixed(4) },
    { title: `[AgentWork] Fix Agent: ${issueTitle}`, reward: +(bountyUsdc * 0.6).toFixed(4) },
  ]

  const results = await Promise.all(
    tasks.map((task) =>
      fetch('https://api.clustly.ai/v1/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLUSTLY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...task, currency: 'USDC' }),
      }).then((r) => r.json())
    )
  )
  return results as ClustlyTask[]
}
