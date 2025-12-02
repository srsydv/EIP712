const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting UUPS Upgradeable EIP712Voting contract deployment...\n");

  // Deployment parameters - customize these
  const electionName = process.env.ELECTION_NAME || "MyElection2025";
  const candidateNames = process.env.CANDIDATES
    ? process.env.CANDIDATES.split(",").map((name) => name.trim())
    : ["Alice", "Bob", "Carol"];
  const votingDurationSeconds = process.env.VOTING_DURATION_SECONDS
    ? parseInt(process.env.VOTING_DURATION_SECONDS)
    : 7 * 24 * 60 * 60; // 7 days default
  const electionId = process.env.ELECTION_ID
    ? parseInt(process.env.ELECTION_ID)
    : 1;
  const ownerAddress = process.env.OWNER_ADDRESS || undefined; // Uses deployer if not set

  // Validate parameters
  if (candidateNames.length < 2) {
    throw new Error("At least 2 candidates are required");
  }

  if (votingDurationSeconds <= 0) {
    throw new Error("Voting duration must be greater than 0");
  }

  console.log("📋 Deployment Parameters:");
  console.log(`   Election Name: ${electionName}`);
  console.log(`   Candidates: ${candidateNames.join(", ")}`);
  console.log(`   Voting Duration: ${votingDurationSeconds} seconds (${votingDurationSeconds / (24 * 60 * 60)} days)`);
  console.log(`   Election ID: ${electionId}`);
  console.log(`   Owner: ${ownerAddress || "Deployer address"}\n`);

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy the implementation contract
  console.log("📦 Deploying EIP712Voting implementation contract...");
  const EIP712Voting = await hre.ethers.getContractFactory("EIP712Voting");
  const implementation = await EIP712Voting.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  console.log("✅ Implementation deployed to:", implementationAddress);

  // Deploy the UUPS proxy
  console.log("\n📦 Deploying UUPS Proxy...");
  
  const owner = ownerAddress || deployer.address;
  const initData = EIP712Voting.interface.encodeFunctionData("initialize", [
    electionName,
    candidateNames,
    votingDurationSeconds,
    electionId,
    owner
  ]);

  // Deploy proxy using our Proxy contract (which extends ERC1967Proxy)
  const Proxy = await hre.ethers.getContractFactory("Proxy");
  const proxy = await Proxy.deploy(implementationAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("✅ Proxy deployed to:", proxyAddress);

  // Connect to the proxy as the voting contract
  const voting = EIP712Voting.attach(proxyAddress);

  // Verify contract state
  console.log("\n🔍 Verifying contract state...");
  const deployedElectionId = await voting.electionId();
  const deployedElectionName = await voting.electionName();
  const deployedVotingStart = await voting.votingStart();
  const deployedVotingEnd = await voting.votingEnd();
  const deployedOwner = await voting.owner();

  console.log(`   Election Name: ${deployedElectionName}`);
  console.log(`   Election ID: ${deployedElectionId}`);
  console.log(`   Voting Start: ${new Date(Number(deployedVotingStart) * 1000).toLocaleString()}`);
  console.log(`   Voting End: ${new Date(Number(deployedVotingEnd) * 1000).toLocaleString()}`);
  console.log(`   Owner: ${deployedOwner}`);

  // Get candidate names
  console.log("\n📊 Candidates:");
  const candidatesLength = await voting.candidatesLength();
  for (let i = 0; i < candidatesLength; i++) {
    const name = await voting.candidateName(i);
    console.log(`   ${i}. ${name}`);
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    proxyAddress: proxyAddress,
    implementationAddress: implementationAddress,
    deployer: deployer.address,
    owner: deployedOwner,
    deploymentTime: new Date().toISOString(),
    parameters: {
      electionName: deployedElectionName,
      electionId: Number(deployedElectionId),
      votingStart: Number(deployedVotingStart),
      votingEnd: Number(deployedVotingEnd),
      candidates: candidateNames,
      votingDurationSeconds: votingDurationSeconds,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${hre.network.name}-upgradeable-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  console.log("\n📝 Next steps:");
  console.log(`   1. Use PROXY address in your frontend: ${proxyAddress}`);
  console.log(`   2. Implementation address (for upgrades): ${implementationAddress}`);
  console.log(`   3. To upgrade: Deploy new implementation and call upgradeTo() on proxy`);
  console.log(`   4. Connect MetaMask to ${hre.network.name} network`);
  console.log(`   5. Start voting! 🗳️\n`);

  return { proxyAddress, implementationAddress };
}

// Execute deployment
main()
  .then((addresses) => {
    console.log("🎉 Deployment completed successfully!");
    console.log(`   Proxy: ${addresses.proxyAddress}`);
    console.log(`   Implementation: ${addresses.implementationAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

