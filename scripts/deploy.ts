import hre from 'hardhat'

async function main() {
  const contract = await hre.viem.deployContract('AgentReputation')
  const address = contract.address
  console.log('AgentReputation deployed to:', address)
  console.log('Add to .env.local: REPUTATION_CONTRACT_ADDRESS=' + address)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
