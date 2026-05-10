import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox-viem'
import 'dotenv/config'

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    baseSepolia: {
      url: 'https://sepolia.base.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : []
    }
  }
}
export default config
