// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title EIP712Voting
 * @notice Off-chain (MetaMask) signed voting verified on-chain via EIP-712.
 *         - Users sign a Vote struct using eth_signTypedData_v4.
 *         - Contract verifies the signature and records one vote per voter per election.
 *         - Owner can change voting end timestamp at any time before finalization.
 *         - Owner can finalize the winner after votingEnd.
 *         - Contract is upgradeable using UUPS proxy pattern.
 *
 * Security / Replay Protection
 * - Includes electionId in the signed data to prevent cross-election replay.
 * - Includes nonce per voter to prevent replay of the same signature.
 * - Includes deadline in the signed data to bound signature validity.
 */
contract EIP712Voting is Initializable, EIP712Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // --- Types ---
    struct Vote {
        address voter;
        uint256 candidateId;
        uint256 electionId;
        uint256 nonce;
        uint256 deadline; // unix timestamp after which the signature is invalid
    }

    // keccak256("Vote(address voter,uint256 candidateId,uint256 electionId,uint256 nonce,uint256 deadline)")
    bytes32 private constant VOTE_TYPEHASH = keccak256(
        "Vote(address voter,uint256 candidateId,uint256 electionId,uint256 nonce,uint256 deadline)"
    );

    // --- Events ---
    event VoteAccepted(address indexed voter, uint256 indexed electionId, uint256 indexed candidateId);
    event VoteRelayed(address indexed voter, address indexed relayer, uint256 indexed electionId, uint256 candidateId);
    event WinnerFinalized(uint256 indexed electionId, uint256 indexed winningCandidateId, uint256 votes);
    event VotingEndUpdated(uint256 oldVotingEnd, uint256 newVotingEnd);

    // --- Storage ---
    string public electionName;
    string[] private _candidates;
    uint256 public votingStart;
    uint256 public votingEnd; // Owner can change this anytime
    uint256 public electionId;

    mapping(uint256 => uint256) public candidateIdToVotes; // candidateId => votes
    mapping(uint256 => mapping(address => bool)) public hasVotedForElection; // electionId => voter => voted
    mapping(address => uint256) public voterNonces; // per-address sequential nonce

    bool public finalized;
    uint256 public winningCandidateId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // --- Initialization ---
    /**
     * @notice Initializes the contract (replaces constructor for upgradeable contracts).
     * @param electionName_ The name of the election (used in EIP-712 domain).
     * @param candidateNames Array of candidate names.
     * @param votingDurationSeconds Duration of voting period in seconds.
     * @param electionId_ Unique identifier for this election.
     * @param initialOwner Address that will own the contract.
     */
    function initialize(
        string memory electionName_,
        string[] memory candidateNames,
        uint256 votingDurationSeconds,
        uint256 electionId_,
        address initialOwner
    ) public initializer {
        require(candidateNames.length >= 2, "need >= 2 candidates");
        require(votingDurationSeconds > 0, "invalid duration");
        require(initialOwner != address(0), "invalid owner");

        __EIP712_init(electionName_, "1");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        electionName = electionName_;
        _candidates = candidateNames;
        votingStart = block.timestamp;
        votingEnd = block.timestamp + votingDurationSeconds;
        electionId = electionId_;
    }

    // --- View helpers ---
    function candidatesLength() external view returns (uint256) {
        return _candidates.length;
    }

    function candidateName(uint256 candidateId) external view returns (string memory) {
        require(candidateId < _candidates.length, "bad candidateId");
        return _candidates[candidateId];
    }

    // Returns the EIP-712 struct hash for an off-chain built Vote (debug/clients).
    function hashVote(Vote calldata vote) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                VOTE_TYPEHASH,
                vote.voter,
                vote.candidateId,
                vote.electionId,
                vote.nonce,
                vote.deadline
            )
        );
        return _hashTypedDataV4(structHash);
    }

    // --- Core logic ---
    function submitVote(Vote calldata vote, bytes calldata signature) external {
        require(block.timestamp >= votingStart, "not started");
        require(block.timestamp <= votingEnd, "ended");
        require(vote.deadline >= block.timestamp, "sig expired");
        require(vote.electionId == electionId, "wrong electionId");
        require(vote.candidateId < _candidates.length, "bad candidateId");

        // Ensure the vote matches the current nonce for this voter (prevents replay)
        require(vote.nonce == voterNonces[vote.voter], "bad nonce");

        // Recreate EIP-712 digest and recover signer
        bytes32 structHash = keccak256(
            abi.encode(
                VOTE_TYPEHASH,
                vote.voter,
                vote.candidateId,
                vote.electionId,
                vote.nonce,
                vote.deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == vote.voter, "invalid sig");

        // One vote per voter per election
        require(!hasVotedForElection[electionId][vote.voter], "already voted");
        hasVotedForElection[electionId][vote.voter] = true;

        // Tally
        candidateIdToVotes[vote.candidateId] += 1;

        // Bump nonce so this signature cannot be reused
        voterNonces[vote.voter] = vote.nonce + 1;

        // Check if called by relayer (someone other than the voter)
        if (msg.sender != vote.voter) {
            emit VoteRelayed(vote.voter, msg.sender, vote.electionId, vote.candidateId);
        }

        emit VoteAccepted(vote.voter, vote.electionId, vote.candidateId);
    }

    // --- Owner Functions ---
    /**
     * @notice Allows owner to change the voting end timestamp at any time.
     * @param newVotingEnd The new voting end timestamp (unix timestamp).
     */
    function setVotingEnd(uint256 newVotingEnd) external onlyOwner {
        require(!finalized, "already finalized");
        require(newVotingEnd > votingStart, "votingEnd must be after votingStart");
        
        uint256 oldVotingEnd = votingEnd;
        votingEnd = newVotingEnd;
        
        emit VotingEndUpdated(oldVotingEnd, newVotingEnd);
    }

    /**
     * @notice Authorizes an upgrade (required by UUPS pattern).
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- Finalization ---
    function finalizeWinner() external onlyOwner {
        require(block.timestamp > votingEnd, "voting not ended");
        require(!finalized, "already finalized");

        uint256 numCandidates = _candidates.length;
        uint256 bestId;
        uint256 bestVotes;

        for (uint256 i = 0; i < numCandidates; i++) {
            uint256 v = candidateIdToVotes[i];
            if (v > bestVotes) {
                bestVotes = v;
                bestId = i;
            }
        }

        winningCandidateId = bestId;
        finalized = true;
        emit WinnerFinalized(electionId, bestId, bestVotes);
    }
}


