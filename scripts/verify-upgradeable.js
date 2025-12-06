const hre = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0xeac9C1B4CE05b1A91927b35f7486034F6CCc1291";
  const IMPLEMENTATION_ADDRESS = "0x8996E502CF6c6f657296BB80c3e1902eF64F3b65";

  console.log("🔍 Verifying contracts on Etherscan...\n");

  // Verify implementation contract
  console.log("📦 Verifying Implementation Contract...");
  try {
    await hre.run("verify:verify", {
      address: IMPLEMENTATION_ADDRESS,
      constructorArguments: [], // Implementation has no constructor args
    });
    console.log("✅ Implementation verified successfully!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Implementation already verified!\n");
    } else {
      console.error("❌ Error verifying implementation:", error.message);
    }
  }

  // Verify proxy contract
  console.log("📦 Verifying Proxy Contract...");
  try {
    // Get the initialization parameters from deployment
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

    // Get the EIP712Voting contract factory to encode the init data
    const EIP712Voting = await hre.ethers.getContractFactory("EIP712Voting");
    const initData = EIP712Voting.interface.encodeFunctionData("initialize", [
      electionName,
      candidateNames,
      votingDurationSeconds,
      electionId,
      ownerAddress
    ]);

    await hre.run("verify:verify", {
      address: PROXY_ADDRESS,
      constructorArguments: [IMPLEMENTATION_ADDRESS, initData],
      contract: "contracts/Proxy.sol:Proxy", // Use fully qualified name
    });
    console.log("✅ Proxy verified successfully!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Proxy already verified!\n");
    } else {
      console.error("❌ Error verifying proxy:", error.message);
      console.log("\n💡 Tip: You can also verify manually on Etherscan:");
      console.log(`   Implementation: https://sepolia.etherscan.io/address/${IMPLEMENTATION_ADDRESS}#code`);
      console.log(`   Proxy: https://sepolia.etherscan.io/address/${PROXY_ADDRESS}#code`);
    }
  }

  console.log("📝 Contract Links:");
  console.log(`   Implementation: https://sepolia.etherscan.io/address/${IMPLEMENTATION_ADDRESS}`);
  console.log(`   Proxy: https://sepolia.etherscan.io/address/${PROXY_ADDRESS}`);
  console.log("\n✅ Verification process completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

