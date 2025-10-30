// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/EIP712Voting.sol";

contract EIP712VotingTest is Test {
    EIP712Voting private voting;

    uint256 private constant ELECTION_ID = 1;
    string private constant ELECTION_NAME = "MyElection2025";
    string[] private candidateNames;

    // voters
    uint256 private voter1Pk;
    uint256 private voter2Pk;
    address private voter1;
    address private voter2;

    function setUp() public {
        candidateNames.push("Alice");
        candidateNames.push("Bob");
        candidateNames.push("Carol");

        voting = new EIP712Voting(
            ELECTION_NAME,
            candidateNames,
            1 days,
            ELECTION_ID,
            address(this)
        );

        voter1Pk = 0xA11CE;
        voter2Pk = 0xB0B;
        voter1 = vm.addr(voter1Pk);
        voter2 = vm.addr(voter2Pk);
    }

    function _signVote(EIP712Voting.Vote memory vote, uint256 pk) internal view returns (bytes memory) {
        bytes32 digest = voting.hashVote(vote);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_VoteAndFinalizeWinner() public {
        // voter1 votes for Bob (candidateId = 1)
        EIP712Voting.Vote memory v1 = EIP712Voting.Vote({
            voter: voter1,
            candidateId: 1,
            electionId: ELECTION_ID,
            nonce: voting.voterNonces(voter1),
            deadline: block.timestamp + 30 minutes
        });
        bytes memory sig1 = _signVote(v1, voter1Pk);
        voting.submitVote(v1, sig1);

        // voter2 votes for Bob (candidateId = 1)
        EIP712Voting.Vote memory v2 = EIP712Voting.Vote({
            voter: voter2,
            candidateId: 1,
            electionId: ELECTION_ID,
            nonce: voting.voterNonces(voter2),
            deadline: block.timestamp + 30 minutes
        });
        bytes memory sig2 = _signVote(v2, voter2Pk);
        voting.submitVote(v2, sig2);

        // move time forward beyond voting end
        vm.warp(block.timestamp + 2 days);

        // finalize as owner
        voting.finalizeWinner();

        assertEq(voting.finalized(), true, "finalized");
        assertEq(voting.winningCandidateId(), 1, "Bob should win");
    }
}
