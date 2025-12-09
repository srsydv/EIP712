const express = require('express');
const ethers = require('ethers');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291";
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY; // Your bot's private key (with ETH for gas)

// Contract ABI (minimal - just what we need)
const CONTRACT_ABI = [
    "function submitVote(tuple(address voter, uint256 candidateId, uint256 electionId, uint256 nonce, uint256 deadline) vote, bytes signature) external",
    "function voterNonces(address) external view returns (uint256)",
    "function electionId() external view returns (uint256)",
    "function votingStart() external view returns (uint256)",
    "function votingEnd() external view returns (uint256)",
    "event VoteAccepted(address indexed voter, uint256 indexed electionId, uint256 indexed candidateId)",
    "event VoteRelayed(address indexed voter, address indexed relayer, uint256 indexed electionId, uint256 candidateId)"
];

// Initialize provider and signer
let provider, relayer, contract;

if (RELAYER_PRIVATE_KEY && RPC_URL) {
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, relayer);
    console.log(`✅ Relayer initialized: ${relayer.address}`);
    console.log(`✅ Contract: ${CONTRACT_ADDRESS}`);
} else {
    console.error("❌ Missing RELAYER_PRIVATE_KEY or RPC_URL in .env");
    process.exit(1);
}

// Queue to store pending votes
const voteQueue = [];
let isProcessing = false;

// Endpoint to receive signed votes from frontend
app.post('/api/submit-vote', async (req, res) => {
    try {
        const { vote, signature } = req.body;

        // Validate input
        if (!vote || !signature) {
            return res.status(400).json({ error: 'Missing vote or signature' });
        }

        // Validate vote structure
        if (!vote.voter || vote.candidateId === undefined || vote.electionId === undefined || 
            vote.nonce === undefined || vote.deadline === undefined) {
            return res.status(400).json({ error: 'Invalid vote structure' });
        }

        // Check if signature is valid (basic check)
        if (!signature.startsWith('0x') || signature.length < 130) {
            return res.status(400).json({ error: 'Invalid signature format' });
        }

        // Add to queue
        voteQueue.push({ vote, signature, timestamp: Date.now() });
        
        console.log(`📥 Vote queued from ${vote.voter} for candidate ${vote.candidateId}`);

        // Process queue
        processVoteQueue();

        // Return immediately (don't wait for transaction)
        res.json({ 
            success: true, 
            message: 'Vote received and queued for submission',
            voter: vote.voter,
            candidateId: vote.candidateId
        });

    } catch (error) {
        console.error('Error processing vote:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process vote queue
async function processVoteQueue() {
    if (isProcessing || voteQueue.length === 0) {
        return;
    }

    isProcessing = true;

    while (voteQueue.length > 0) {
        const { vote, signature } = voteQueue.shift();

        try {
            // Verify vote is still valid
            const currentTime = Math.floor(Date.now() / 1000);
            if (vote.deadline < currentTime) {
                console.log(`⏰ Vote expired for ${vote.voter}`);
                continue;
            }

            // Check current nonce
            const currentNonce = await contract.voterNonces(vote.voter);
            if (vote.nonce !== currentNonce.toString()) {
                console.log(`⚠️ Nonce mismatch for ${vote.voter}. Expected ${currentNonce}, got ${vote.nonce}`);
                continue;
            }

            // Submit vote (relayer pays gas)
            console.log(`🚀 Submitting vote for ${vote.voter} (candidate ${vote.candidateId})...`);
            
            const tx = await contract.submitVote(vote, signature, {
                gasLimit: 200000 // Adjust if needed
            });

            console.log(`⏳ Transaction sent: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log(`✅ Vote submitted successfully! Tx: ${tx.hash}`);
                console.log(`   Voter: ${vote.voter}`);
                console.log(`   Candidate: ${vote.candidateId}`);
                console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
            } else {
                console.error(`❌ Transaction failed: ${tx.hash}`);
            }

            // Small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`❌ Error submitting vote for ${vote.voter}:`, error.message);
            
            // If it's a nonce issue, the vote might have been submitted already
            if (error.message.includes('bad nonce') || error.message.includes('already voted')) {
                console.log(`   Vote may have already been submitted`);
            }
        }
    }

    isProcessing = false;
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const balance = await relayer.getBalance();
        const network = await provider.getNetwork();
        
        res.json({
            status: 'healthy',
            relayer: relayer.address,
            balance: ethers.utils.formatEther(balance),
            network: network.name,
            chainId: network.chainId,
            contract: CONTRACT_ADDRESS,
            queueLength: voteQueue.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get queue status
app.get('/api/queue', (req, res) => {
    res.json({
        queueLength: voteQueue.length,
        isProcessing: isProcessing,
        queuedVotes: voteQueue.map(v => ({
            voter: v.vote.voter,
            candidateId: v.vote.candidateId,
            timestamp: v.timestamp
        }))
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Relayer server running on http://localhost:${PORT}`);
    console.log(`📡 Ready to relay votes for contract: ${CONTRACT_ADDRESS}\n`);
});

