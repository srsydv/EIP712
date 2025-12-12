# Deployment Guide

This guide explains how to deploy the EIP712Voting contract using Hardhat.

## Current Deployment (Sepolia)

- **Proxy Address**: `0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291` (use this in frontend)
- **Implementation Address**: `0x8996E502CF6c6f657296BB80c3e1902eF64F3b65`
- **Network**: Sepolia Testnet
- **Status**: ✅ Verified on Etherscan

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MetaMask** or another wallet with testnet ETH
3. **RPC Provider** (Alchemy, Infura, or QuickNode) for testnet/mainnet deployment

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp example.env .env
```

Edit `.env` and fill in your values:

- **PRIVATE_KEY**: Your deployer wallet's private key (starts with `0x`)
- **SEPOLIA_RPC_URL**: Your Sepolia testnet RPC endpoint
- **MAINNET_RPC_URL**: Your mainnet RPC endpoint (for production)
- **ELECTION_NAME**: Name of your election
- **CANDIDATES**: Comma-separated candidate names
- **VOTING_DURATION_SECONDS**: Duration in seconds (604800 = 7 days)

### 3. Compile the Contract

```bash
npm run compile
```

## Deployment

### Local Network (for testing)

1. Start a local Hardhat node:
   ```bash
   npm run node
   ```

2. In a new terminal, deploy:
   ```bash
   npm run deploy:local
   ```

### Sepolia Testnet

1. Make sure you have:
   - Sepolia ETH in your deployer wallet
   - `.env` configured with `SEPOLIA_RPC_URL` and `PRIVATE_KEY`

2. Deploy:
   ```bash
   npm run deploy:sepolia
   ```

### Upgradeable Deployment (Recommended)

For upgradeable contracts using UUPS proxy:

```bash
# Sepolia
npm run deploy:upgradeable:sepolia

# Mainnet
npm run deploy:upgradeable:mainnet
```

This deploys:
1. Implementation contract
2. UUPS proxy contract
3. Initializes the contract

**Use the PROXY address in your frontend** - it never changes even after upgrades.

### Mainnet (Production)

⚠️ **Warning**: Deploying to mainnet costs real ETH!

1. Double-check your `.env` configuration
2. Ensure you have sufficient ETH for gas
3. Deploy:
   ```bash
   npm run deploy:upgradeable:mainnet
   ```

## Deployment Script Details

The deployment script (`scripts/deploy.js`) will:

1. Read configuration from `.env` or use defaults
2. Deploy the contract with your specified parameters
3. Verify the deployment by checking contract state
4. Save deployment information to `deployments/` directory
5. Display the contract address for use in your frontend

## After Deployment

1. **Copy the PROXY address** from the deployment output (not implementation)
2. **Verify contracts** on Etherscan:
   ```bash
   npm run verify:upgradeable
   ```
3. **Setup relayer** (optional, for gasless voting):
   - See [RELAYER_SETUP.md](RELAYER_SETUP.md) for details
   - Add `RELAYER_PRIVATE_KEY` to `.env`
   - Run `npm run relayer:start`
4. **Update frontend** with proxy address (already pre-filled)
5. **Open `index.html`** in your browser
6. **Connect MetaMask** to the same network
7. **Start voting!** 🗳️

## Gasless Voting Setup

To enable gasless voting (users don't pay gas):

1. **Create relayer wallet**: Generate a new wallet for your bot
2. **Fund relayer wallet**: Send ETH for gas fees
3. **Configure `.env`**:
   ```env
   RELAYER_PRIVATE_KEY=0xYourRelayerPrivateKey
   CONTRACT_ADDRESS=0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291
   ```
4. **Start relayer server**:
   ```bash
   npm run relayer:start
   ```
5. **Update frontend relayer URL** (if deploying to server)

See [RELAYER_SETUP.md](RELAYER_SETUP.md) for complete guide.

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PRIVATE_KEY` | Yes | Deployer wallet private key | `0x123...abc` |
| `SEPOLIA_RPC_URL` | For Sepolia | RPC endpoint URL | `https://eth-sepolia...` |
| `MAINNET_RPC_URL` | For Mainnet | RPC endpoint URL | `https://eth-mainnet...` |
| `ELECTION_NAME` | No | Election name (default: "MyElection2025") | `Presidential Election 2025` |
| `CANDIDATES` | No | Comma-separated names (default: Alice,Bob,Carol) | `Alice,Bob,Carol` |
| `VOTING_DURATION_SECONDS` | No | Duration in seconds (default: 604800 = 7 days) | `604800` |
| `ELECTION_ID` | No | Election ID (default: 1) | `1` |
| `OWNER_ADDRESS` | No | Owner address (default: deployer) | `0x123...abc` |
| `RELAYER_PRIVATE_KEY` | For gasless | Relayer bot private key | `0x123...abc` |
| `CONTRACT_ADDRESS` | For relayer | Proxy contract address | `0x123...abc` |
| `ETHERSCAN_API_KEY` | For verification | Etherscan API key | `YourKey` |

## Troubleshooting

### "Insufficient funds"
- Make sure your deployer wallet has enough ETH for gas fees

### "Nonce too high"
- Your wallet's transaction nonce is out of sync
- Try resetting MetaMask or waiting a few minutes

### "Contract deployment failed"
- Check your RPC URL is correct and accessible
- Verify your private key is correct
- Ensure you have enough ETH for gas

### Import errors during compilation
- Run `npm install` to ensure @openzeppelin/contracts is installed
- The contract should work with OpenZeppelin v5.x

## Security Notes

⚠️ **Never commit your `.env` file to git!**
⚠️ **Never share your private key!**
⚠️ **Use a dedicated wallet for deployment, not your main wallet**

The `.gitignore` file is configured to ignore `.env` files automatically.

