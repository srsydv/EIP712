# EIP-712 Voting DApp

A decentralized voting application using EIP-712 typed data signing for secure, gasless voting on Ethereum.

## 🎯 Features

- ✅ **EIP-712 Typed Data Signing** - Human-readable signatures in MetaMask
- ✅ **Gasless Voting** - Users sign votes (free), relayer pays gas fees
- ✅ **Upgradeable Contract** - UUPS proxy pattern for future upgrades
- ✅ **Replay Protection** - Nonce-based system prevents signature reuse
- ✅ **One Vote Per User** - Cryptographic guarantee of one vote per address
- ✅ **Owner Controls** - Adjustable voting periods and finalization
- ✅ **Modern Frontend** - Beautiful, responsive UI with real-time updates

## 🏗️ Architecture

### Contract Structure

- **Proxy Contract** (`0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291`): User-facing address (never changes)
- **Implementation Contract**: Upgradeable logic contract
- **Relayer Server**: Backend service that submits votes and pays gas

### Voting Flow

```
User → Signs EIP-712 Vote (Free) → Frontend → Relayer Server → Blockchain
                                                              (Relayer Pays Gas)
```

1. User selects candidate and signs vote (no gas cost)
2. Frontend sends signed vote to relayer API
3. Relayer submits transaction to blockchain (relayer pays gas)
4. Vote is recorded under **user's address**, not relayer's

## 📁 Project Structure

```
EIP712/
├── contracts/
│   ├── EIP712Voting.sol      # Main voting contract (upgradeable)
│   └── Proxy.sol              # UUPS proxy wrapper
├── scripts/
│   ├── deploy.js              # Standard deployment
│   ├── deploy-upgradeable.js  # Upgradeable deployment
│   └── verify-upgradeable.js # Contract verification
├── test/
│   └── EIP712Voting.t.sol     # Foundry tests
├── relayer-server.js          # Gasless voting relayer
├── index.html                 # Frontend DApp
├── package.json
├── hardhat.config.js
└── foundry.toml
```

## 🚀 Quick Start

### Prerequisites

- Node.js v16+
- MetaMask browser extension
- RPC provider (Alchemy, Infura, etc.)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd EIP712

# Install dependencies
npm install

# Copy environment file
cp example.env .env

# Edit .env with your configuration
```

### Deployment

#### 1. Deploy Upgradeable Contract

```bash
# Deploy to Sepolia
npm run deploy:upgradeable:sepolia

# Or deploy to mainnet
npm run deploy:upgradeable:mainnet
```

#### 2. Verify Contracts

```bash
npm run verify:upgradeable
```

#### 3. Setup Relayer (for gasless voting)

```bash
# Add to .env
RELAYER_PRIVATE_KEY=0xYourBotWalletPrivateKey
CONTRACT_ADDRESS=0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291

# Start relayer server
npm run relayer:start
```

#### 4. Run Frontend

```bash
# Option 1: Simple HTTP server
python3 -m http.server 8080

# Option 2: Use any web server
# Open index.html in browser
```

Visit `http://localhost:8080` and start voting!

## 📖 Documentation

- **[Deployment Guide](README_DEPLOYMENT.md)** - Detailed deployment instructions
- **[User Guide](USER_GUIDE.md)** - How users interact with the DApp
- **[Relayer Setup](RELAYER_SETUP.md)** - Gasless voting relayer configuration

## 🔧 Configuration

### Environment Variables

```env
# Network
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Deployment
PRIVATE_KEY=0xYourDeployerPrivateKey
ELECTION_NAME=MyElection2025
CANDIDATES=Alice,Bob,Carol
VOTING_DURATION_SECONDS=604800
ELECTION_ID=1

# Relayer (for gasless voting)
RELAYER_PRIVATE_KEY=0xYourRelayerPrivateKey
CONTRACT_ADDRESS=0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291

# Verification
ETHERSCAN_API_KEY=YourEtherscanAPIKey
```

## 🎮 Usage

### For Users

1. **Connect Wallet**: Click "Connect MetaMask"
2. **Select Candidate**: Click on a candidate card
3. **Vote**: Click "Vote" button
4. **Sign**: Approve signature in MetaMask (no gas cost!)
5. **Done**: Relayer submits your vote automatically

### For Administrators

- **Change Voting Period**: Call `setVotingEnd(newTimestamp)` (owner only)
- **Finalize Election**: Call `finalizeWinner()` after voting ends
- **Upgrade Contract**: Deploy new implementation and call `upgradeTo()`

## 🔒 Security Features

- **EIP-712 Signatures**: Cryptographically secure, human-readable
- **Nonce Protection**: Prevents signature replay attacks
- **Election ID Binding**: Votes tied to specific election
- **Deadline Enforcement**: Signatures expire after set time
- **One Vote Per User**: Enforced on-chain
- **Owner Controls**: Only owner can finalize and adjust timing

## 🧪 Testing

```bash
# Run Foundry tests
forge test

# Run with verbose output
forge test -vvv
```

## 📊 Contract Addresses (Sepolia)

- **Proxy**: `0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291` (use this in frontend)
- **Implementation**: `0x8996E502CF6c6f657296BB80c3e1902eF64F3b65`
- **Etherscan**: 
  - [Proxy](https://sepolia.etherscan.io/address/0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291)
  - [Implementation](https://sepolia.etherscan.io/address/0x8996E502CF6c6f657296BB80c3e1902eF64F3b65)

## 🛠️ Development

### Compile Contracts

```bash
# Hardhat
npm run compile

# Foundry
forge build
```

### Deploy Locally

```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy
npm run deploy:upgradeable:local
```

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile contracts |
| `npm run deploy:upgradeable:sepolia` | Deploy to Sepolia |
| `npm run verify:upgradeable` | Verify on Etherscan |
| `npm run relayer:start` | Start gasless voting relayer |
| `forge test` | Run Foundry tests |

## 🔄 Upgrade Process

1. Deploy new implementation contract
2. Call `upgradeTo(newImplementation)` on proxy (owner only)
3. All state and votes are preserved
4. Users continue using the same proxy address

## 💡 Key Concepts

### EIP-712 Typed Data

Instead of signing raw hex data, users sign structured, human-readable data:
- MetaMask shows: "You are voting for Bob in election #1"
- Cryptographically secure
- Prevents phishing attacks

### Gasless Voting

- Users sign votes (free, no gas)
- Relayer bot submits transactions (relayer pays gas)
- Votes are attributed to the signer, not relayer
- Users get gasless experience, you control costs

### Upgradeable Contracts

- Proxy address never changes
- Implementation can be upgraded
- All state preserved during upgrades
- Users don't need to know about upgrades

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenZeppelin for upgradeable contracts
- EIP-712 standard for typed data signing
- Foundry for testing framework

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation files
- Review the code comments

---

**Built with ❤️ using Solidity, Hardhat, and EIP-712**
