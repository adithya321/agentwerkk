import { expect } from 'chai'
import hre from 'hardhat'
import type { Address } from 'viem'

describe('AgentReputation', () => {
  it('starts at 0', async () => {
    const [, agent] = await hre.viem.getWalletClients()
    const contract = await hre.viem.deployContract('AgentReputation')
    expect(await contract.read.getScore([agent.account.address])).to.equal(0n)
  })

  it('increments score', async () => {
    const [, agent] = await hre.viem.getWalletClients()
    const contract = await hre.viem.deployContract('AgentReputation')
    await contract.write.increment([agent.account.address])
    expect(await contract.read.getScore([agent.account.address])).to.equal(1n)
  })

  it('emits ScoreUpdated', async () => {
    const [, agent] = await hre.viem.getWalletClients()
    const contract = await hre.viem.deployContract('AgentReputation')
    await contract.write.increment([agent.account.address])
    const logs = await contract.getEvents.ScoreUpdated()
    expect(logs.length).to.be.greaterThan(0)
    const args = logs[0].args as { agent: Address; newScore: bigint }
    expect(args.agent.toLowerCase()).to.equal(
      agent.account.address.toLowerCase()
    )
    expect(args.newScore).to.equal(1n)
  })
})
