import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'
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

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) })

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
    await waitForTransactionReceipt(walletClient, { hash: lastHash })
  }
  return lastHash
}

export async function getReputation(agentAddress: `0x${string}`): Promise<bigint> {
  return publicClient.readContract({ address: CONTRACT, abi: ABI, functionName: 'getScore', args: [agentAddress] })
}
