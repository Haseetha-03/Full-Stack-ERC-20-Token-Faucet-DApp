// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IYourToken {
    function mint(address to, uint256 amount) external;
    function MAX_SUPPLY() external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

contract TokenFaucet {
    IYourToken public immutable token;

    uint256 public constant FAUCET_AMOUNT = 100 * 1e18;
    uint256 public constant COOLDOWN_TIME = 24 hours;
    uint256 public constant MAX_CLAIM_AMOUNT = 1000 * 1e18;

    address public immutable admin;
    bool private paused;

    mapping(address => uint256) public lastClaimAt;
    mapping(address => uint256) public totalClaimed;

    event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event FaucetPaused(bool paused);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address tokenAddress) {
        token = IYourToken(tokenAddress);
        admin = msg.sender;
        paused = false;
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function setPaused(bool _paused) external onlyAdmin {
        paused = _paused;
        emit FaucetPaused(_paused);
    }

    function remainingAllowance(address user) public view returns (uint256) {
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) return 0;
        return MAX_CLAIM_AMOUNT - totalClaimed[user];
    }

    function canClaim(address user) public view returns (bool) {
        if (paused) return false;
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) return false;
        if (block.timestamp < lastClaimAt[user] + COOLDOWN_TIME) return false;
        if (remainingAllowance(user) < FAUCET_AMOUNT) return false;
        return true;
    }

    function requestTokens() external {
        require(!paused, "Faucet is paused");

        require(
            block.timestamp >= lastClaimAt[msg.sender] + COOLDOWN_TIME,
            "Cooldown period not elapsed"
        );

        require(
            totalClaimed[msg.sender] < MAX_CLAIM_AMOUNT,
            "Lifetime claim limit reached"
        );

        require(
            remainingAllowance(msg.sender) >= FAUCET_AMOUNT,
            "Not enough lifetime allowance"
        );

        // check max supply availability
        require(
            token.totalSupply() + FAUCET_AMOUNT <= token.MAX_SUPPLY(),
            "Faucet has insufficient token balance"
        );

        // effects first
        lastClaimAt[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += FAUCET_AMOUNT;

        // interaction
        token.mint(msg.sender, FAUCET_AMOUNT);

        emit TokensClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }
}
