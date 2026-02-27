const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Token Faucet DApp", function () {
  let token, faucet;
  let owner, user1, user2;

  const MAX_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 tokens
  const FAUCET_AMOUNT = ethers.parseEther("100");  // must match contract
  const MAX_CLAIM = ethers.parseEther("1000");     // must match contract
  const COOLDOWN = 24 * 60 * 60;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Token
    const Token = await ethers.getContractFactory("YourToken");
    token = await Token.deploy("YourToken", "YTK", MAX_SUPPLY);
    await token.waitForDeployment();

    // Deploy Faucet
    const Faucet = await ethers.getContractFactory("TokenFaucet");
    faucet = await Faucet.deploy(await token.getAddress());
    await faucet.waitForDeployment();

    // Set faucet as token minter
    await token.setFaucet(await faucet.getAddress());
  });

  it("should deploy correctly", async () => {
    expect(await token.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    expect(await token.faucet()).to.equal(await faucet.getAddress());
    expect(await faucet.admin()).to.equal(owner.address);
  });

  it("should allow a user to claim tokens successfully", async () => {
    const tx = await faucet.connect(user1).requestTokens();
    await tx.wait();

    const bal = await token.balanceOf(user1.address);
    expect(bal).to.equal(FAUCET_AMOUNT);

    const claimed = await faucet.totalClaimed(user1.address);
    expect(claimed).to.equal(FAUCET_AMOUNT);

    const last = await faucet.lastClaimAt(user1.address);
    expect(last).to.be.gt(0);
  });

  it("should emit TokensClaimed event", async () => {
    await expect(faucet.connect(user1).requestTokens())
      .to.emit(faucet, "TokensClaimed")
      .withArgs(user1.address, FAUCET_AMOUNT, anyValue);
  });

  it("should revert if claiming during cooldown", async () => {
    await faucet.connect(user1).requestTokens();

    await expect(faucet.connect(user1).requestTokens())
      .to.be.revertedWith("Cooldown period not elapsed");
  });

  it("should allow claim after 24 hours", async () => {
    await faucet.connect(user1).requestTokens();

    await network.provider.send("evm_increaseTime", [COOLDOWN]);
    await network.provider.send("evm_mine");

    await expect(faucet.connect(user1).requestTokens()).to.not.be.reverted;
  });

  it("should enforce lifetime claim limit", async () => {
    for (let i = 0; i < 10; i++) {
      await faucet.connect(user1).requestTokens();
      await network.provider.send("evm_increaseTime", [COOLDOWN]);
      await network.provider.send("evm_mine");
    }

    const claimed = await faucet.totalClaimed(user1.address);
    expect(claimed).to.equal(MAX_CLAIM);

    await expect(faucet.connect(user1).requestTokens())
      .to.be.revertedWith("Lifetime claim limit reached");
  });

  it("should track remainingAllowance correctly", async () => {
    let rem1 = await faucet.remainingAllowance(user1.address);
    expect(rem1).to.equal(MAX_CLAIM);

    await faucet.connect(user1).requestTokens();

    let rem2 = await faucet.remainingAllowance(user1.address);
    expect(rem2).to.equal(MAX_CLAIM - FAUCET_AMOUNT);
  });

  it("should allow different users to claim independently", async () => {
    await faucet.connect(user1).requestTokens();
    await faucet.connect(user2).requestTokens();

    const bal1 = await token.balanceOf(user1.address);
    const bal2 = await token.balanceOf(user2.address);

    expect(bal1).to.equal(FAUCET_AMOUNT);
    expect(bal2).to.equal(FAUCET_AMOUNT);
  });

  it("should allow admin to pause faucet", async () => {
    await expect(faucet.connect(owner).setPaused(true))
      .to.emit(faucet, "FaucetPaused")
      .withArgs(true);

    expect(await faucet.isPaused()).to.equal(true);
  });

  it("should not allow non-admin to pause faucet", async () => {
    await expect(faucet.connect(user1).setPaused(true))
      .to.be.revertedWith("Only admin");
  });

  it("should revert claims when faucet is paused", async () => {
    await faucet.connect(owner).setPaused(true);

    await expect(faucet.connect(user1).requestTokens())
      .to.be.revertedWith("Faucet is paused");
  });

  it("should revert if max supply would be exceeded", async () => {
    const Token = await ethers.getContractFactory("YourToken");
    const smallToken = await Token.deploy("Small", "SM", ethers.parseEther("50"));
    await smallToken.waitForDeployment();

    const Faucet = await ethers.getContractFactory("TokenFaucet");
    const smallFaucet = await Faucet.deploy(await smallToken.getAddress());
    await smallFaucet.waitForDeployment();

    await smallToken.setFaucet(await smallFaucet.getAddress());

    await expect(smallFaucet.connect(user1).requestTokens())
      .to.be.revertedWith("Faucet has insufficient token balance");
  });
});