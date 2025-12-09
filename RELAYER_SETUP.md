# Relayer Setup Guide

## Overview

The relayer allows users to vote **without paying gas fees**. Here's how it works:

1. **User signs** the EIP-712 vote (free, no gas)
2. **Frontend sends** signed vote to relayer server
3. **Relayer bot** submits the transaction and pays gas
4. **Vote is recorded** under the user's address (not the relayer's)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Relayer Configuration
RELAYER_PRIVATE_KEY=0xYourRelayerPrivateKey  # Your bot's wallet (needs ETH for gas)
RELAYER_URL=http://localhost:3000            # Relayer server URL
CONTRACT_ADDRESS=0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291  # Your proxy address

# Network (already configured)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 3. Fund Your Relayer Wallet

Your relayer wallet needs ETH to pay for gas:
- **Sepolia**: Get testnet ETH from a faucet
- **Mainnet**: Send real ETH to your relayer wallet

### 4. Start the Relayer Server

```bash
npm run relayer:start
```

Or directly:
```bash
node relayer-server.js
```

The server will start on `http://localhost:3000`

### 5. Update Frontend (Optional)

The frontend is already configured to use the relayer. Just make sure:
- Relayer server is running
- `RELAYER_URL` in frontend matches your server URL

## How It Works

### User Flow:

1. User selects candidate and clicks "Vote"
2. MetaMask shows signature request (no gas cost)
3. User signs the vote
4. Frontend sends `{vote, signature}` to relayer API
5. Relayer receives vote and submits to blockchain
6. **User pays $0 in gas!** 🎉

### Relayer Flow:

1. Receives signed vote from frontend
2. Validates signature and vote structure
3. Checks nonce and deadline
4. Submits transaction to blockchain (relayer pays gas)
5. Vote is recorded under **user's address**, not relayer's

## API Endpoints

### POST `/api/submit-vote`

Submit a signed vote for relaying.

**Request:**
```json
{
  "vote": {
    "voter": "0x...",
    "candidateId": 1,
    "electionId": 1,
    "nonce": 0,
    "deadline": 1234567890
  },
  "signature": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vote received and queued for submission",
  "voter": "0x...",
  "candidateId": 1
}
```

### GET `/api/health`

Check relayer status.

**Response:**
```json
{
  "status": "healthy",
  "relayer": "0x...",
  "balance": "1.5",
  "network": "sepolia",
  "chainId": 11155111,
  "contract": "0x...",
  "queueLength": 0
}
```

### GET `/api/queue`

Check vote queue status.

## Security Considerations

### Current Implementation:
- ✅ Anyone can submit votes (relayer is open)
- ✅ Votes are validated (signature, nonce, deadline)
- ✅ Votes are attributed to the signer, not relayer

### For Production:

1. **Add Relayer Whitelist** (optional):
   - Only allow specific relayers
   - Prevents spam/abuse

2. **Rate Limiting**:
   - Limit votes per user/IP
   - Prevent DoS attacks

3. **Authentication** (optional):
   - API keys for frontend
   - Prevent unauthorized access

4. **Monitoring**:
   - Track gas costs
   - Monitor queue length
   - Alert on errors

## Cost Estimation

### Per Vote:
- **Gas Used**: ~100,000 - 150,000
- **Gas Price**: 1-5 gwei (Sepolia) or current market (Mainnet)
- **Cost per Vote**: 
  - Sepolia: ~0.0001 ETH (testnet, free)
  - Mainnet: ~$0.10 - $0.50 (varies with gas prices)

### For 1000 Votes:
- Sepolia: ~0.1 ETH (testnet)
- Mainnet: ~$100 - $500

## Deployment Options

### Option 1: Local Server
```bash
node relayer-server.js
```
- Simple, good for testing
- Must keep running

### Option 2: Cloud Server (AWS, DigitalOcean, etc.)
- Deploy to VPS
- Use PM2 or systemd to keep running
- More reliable

### Option 3: Serverless (AWS Lambda, Vercel, etc.)
- Pay per execution
- Auto-scales
- More complex setup

## Monitoring

Check relayer health:
```bash
curl http://localhost:3000/api/health
```

Check queue:
```bash
curl http://localhost:3000/api/queue
```

## Troubleshooting

### "Insufficient funds"
- Relayer wallet needs more ETH
- Check balance: `curl http://localhost:3000/api/health`

### "Vote expired"
- User's signature deadline passed
- User needs to sign again

### "Nonce mismatch"
- Vote was already submitted
- User's nonce changed

### "Relayer unavailable"
- Server is down
- Frontend falls back to direct submission (user pays gas)

## Next Steps

1. ✅ Deploy relayer server
2. ✅ Fund relayer wallet
3. ✅ Test with frontend
4. ✅ Monitor gas costs
5. ✅ Scale as needed

Your users can now vote **completely gasless**! 🚀

