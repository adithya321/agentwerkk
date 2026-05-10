// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentReputation {
    mapping(address => uint256) public score;

    event ScoreUpdated(address indexed agent, uint256 newScore);

    function increment(address agent) external {
        score[agent]++;
        emit ScoreUpdated(agent, score[agent]);
    }

    function getScore(address agent) external view returns (uint256) {
        return score[agent];
    }
}
