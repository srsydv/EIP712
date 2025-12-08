const hre = require("hardhat");

async function main() {
  // Same parameters as deployment
  const electionName = process.env.ELECTION_NAME || "UPElection2025";
  const candidateNames = process.env.CANDIDATES
    ? process.env.CANDIDATES.split(",").map((name) => name.trim())
    : ["SP", "BJP", "Congress"];
  const votingDurationSeconds = process.env.VOTING_DURATION_SECONDS
    ? parseInt(process.env.VOTING_DURATION_SECONDS)
    : 7 * 24 * 60 * 60;
  const electionId = process.env.ELECTION_ID
    ? parseInt(process.env.ELECTION_ID)
    : 1;
  const ownerAddress = process.env.OWNER_ADDRESS || "0xf69F75EB0c72171AfF58D79973819B6A3038f39f";

  const EIP712Voting = await hre.ethers.getContractFactory("EIP712Voting");
  const initData = EIP712Voting.interface.encodeFunctionData("initialize", [
    electionName,
    candidateNames,
    votingDurationSeconds,
    electionId,
    ownerAddress
  ]);

  console.log("InitData for verification:");
  console.log(initData);
  console.log("\nUse this in the verify command:");
  console.log(`npx hardhat verify --network sepolia --contract contracts/Proxy.sol:Proxy \\`);
  console.log(`  0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291 \\`);
  console.log(`  0x8996E502CF6c6f657296BB80c3e1902eF64F3b65 \\`);
  console.log(`  "${initData}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

