import { ethers } from "ethers";

// Minimal ABI (only what we need)
const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
];

const FAUCET_ABI = [
  "function requestTokens()",
  "function canClaim(address) view returns (bool)",
  "function remainingAllowance(address) view returns (uint256)",
  "function lastClaimAt(address) view returns (uint256)",
  "function isPaused() view returns (bool)",
];

export function getRpcProvider() {
  const rpcUrl = import.meta.env.VITE_RPC_URL;
  if (!rpcUrl) throw new Error("Missing VITE_RPC_URL");
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getBrowserProvider() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = getBrowserProvider();
  return await provider.getSigner();
}

export function getAddresses() {
  const token = import.meta.env.VITE_TOKEN_ADDRESS;
  const faucet = import.meta.env.VITE_FAUCET_ADDRESS;

  if (!token) throw new Error("Missing VITE_TOKEN_ADDRESS");
  if (!faucet) throw new Error("Missing VITE_FAUCET_ADDRESS");

  return { token, faucet };
}

export function getTokenContractRead() {
  const { token } = getAddresses();
  const provider = getRpcProvider();
  return new ethers.Contract(token, TOKEN_ABI, provider);
}

export function getFaucetContractRead() {
  const { faucet } = getAddresses();
  const provider = getRpcProvider();
  return new ethers.Contract(faucet, FAUCET_ABI, provider);
}

export async function getTokenContractWrite() {
  const { token } = getAddresses();
  const signer = await getSigner();
  return new ethers.Contract(token, TOKEN_ABI, signer);
}

export async function getFaucetContractWrite() {
  const { faucet } = getAddresses();
  const signer = await getSigner();
  return new ethers.Contract(faucet, FAUCET_ABI, signer);
}

export async function getBalance(address) {
  const token = getTokenContractRead();
  const bal = await token.balanceOf(address);
  return bal.toString(); // MUST return string
}

export async function canClaim(address) {
  const faucet = getFaucetContractRead();
  return await faucet.canClaim(address);
}

export async function getRemainingAllowance(address) {
  const faucet = getFaucetContractRead();
  const rem = await faucet.remainingAllowance(address);
  return rem.toString(); // MUST return string
}

export async function getLastClaimAt(address) {
  const faucet = getFaucetContractRead();
  const ts = await faucet.lastClaimAt(address);
  return ts.toString(); // return string for safety
}

export async function requestTokens() {
  const faucet = await getFaucetContractWrite();
  const tx = await faucet.requestTokens();
  const receipt = await tx.wait();
  return receipt.hash; // MUST return tx hash string
}
