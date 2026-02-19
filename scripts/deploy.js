const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1) Deploy Token
  const Token = await hre.ethers.getContractFactory("YourToken");

  const MAX_SUPPLY = hre.ethers.parseEther("1000000"); // 1,000,000 tokens

  const token = await Token.deploy("YourToken", "YTK", MAX_SUPPLY);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("Token deployed:", tokenAddress);

  // 2) Deploy Faucet
  const Faucet = await hre.ethers.getContractFactory("TokenFaucet");
  const faucet = await Faucet.deploy(tokenAddress);
  await faucet.waitForDeployment();

  const faucetAddress = await faucet.getAddress();
  console.log("Faucet deployed:", faucetAddress);

  // 3) Set faucet as minter
  const tx = await token.setFaucet(faucetAddress);
  await tx.wait();
  console.log("Faucet set as token minter ✅");

  // 4) Save addresses for frontend
  const data = {
    token: tokenAddress,
    faucet: faucetAddress,
    network: hre.network.name,
  };

  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }

  fs.writeFileSync("./deployments/addresses.json", JSON.stringify(data, null, 2));

  console.log("Saved deployment file at deployments/addresses.json ✅");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
