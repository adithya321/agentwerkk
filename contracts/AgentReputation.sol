// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentReputation {
    mapping(address => uint256) public score;

    address public immutable owner;

    error Unauthorized();

    event ScoreUpdated(address indexed agent, uint256 newScore);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function increment(address agent) external onlyOwner {
        score[agent]++;
        emit ScoreUpdated(agent, score[agent]);
    }
}
