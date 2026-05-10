import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { AGENT_WALLETS } from '@/types'

const ABI = parseAbi([
  'function increment(address agent) external',
  'function getScore(address agent) external view returns (uint256)',
  'event ScoreUpdated(address indexed agent, uint256 newScore)',
])

const CONTRACT = process.env.REPUTATION_CONTRACT_ADDRESS as `0x${string}`
const RPC = process.env.BASE_SEPOLIA_RPC ?? 'https://sepolia.base.org'

export async function incrementAllReputations(): Promise<string> {
  const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`)
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) })

  let lastHash = '' as `0x${string}`
  for (const wallet of Object.values(AGENT_WALLETS)) {
    lastHash = await walletClient.writeContract({
      address: CONTRACT,
      abi: ABI,
      functionName: 'increment',
      args: [wallet],
    })
  }
  return lastHash
}

export async function getReputation(agentAddress: `0x${string}`): Promise<bigint> {
  const client = createPublicClient({ chain: baseSepolia, transport: http(RPC) })
  return client.readContract({ address: CONTRACT, abi: ABI, functionName: 'getScore', args: [agentAddress] })
}
