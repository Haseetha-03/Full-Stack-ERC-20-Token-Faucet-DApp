// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract YourToken is ERC20 {
    uint256 public immutable MAX_SUPPLY;
    address public faucet;

    error OnlyFaucet();
    error MaxSupplyExceeded();

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_
    ) ERC20(name_, symbol_) {
        MAX_SUPPLY = maxSupply_;
    }

    function setFaucet(address faucet_) external {
        require(faucet == address(0), "Faucet already set");
        faucet = faucet_;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != faucet) revert OnlyFaucet();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
    }
}
