// frontend/src/utils/contracts.js

import { ethers } from "ethers";

import tokenABI from "../abi/YourToken.json";
import faucetABI from "../abi/TokenFaucet.json";

const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;
const FAUCET_ADDRESS = import.meta.env.VITE_FAUCET_ADDRESS;

/* ---------- PROVIDER ---------- */

export function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}
export const getProvider = getBrowserProvider;

async function getSigner() {
  const provider = getBrowserProvider();
  return await provider.getSigner();
}

/* ---------- CONTRACTS ---------- */

export async function getTokenContract() {
  const signer = await getSigner();
  return new ethers.Contract(TOKEN_ADDRESS, tokenABI.abi, signer);
}

export async function getFaucetContract() {
  const signer = await getSigner();
  return new ethers.Contract(FAUCET_ADDRESS, faucetABI.abi, signer);
}

/* ---------- READ FUNCTIONS ---------- */

export async function getBalance(address) {
  const provider = getBrowserProvider();
  const contract = new ethers.Contract(
    TOKEN_ADDRESS,
    tokenABI.abi,
    provider
  );

  const balance = await contract.balanceOf(address);
  return balance.toString();
}

export async function canClaim(address) {
  const provider = getBrowserProvider();
  const contract = new ethers.Contract(
    FAUCET_ADDRESS,
    faucetABI.abi,
    provider
  );

  return await contract.canClaim(address);
}

export async function getRemainingAllowance(address) {
  const provider = getBrowserProvider();
  const contract = new ethers.Contract(
    FAUCET_ADDRESS,
    faucetABI.abi,
    provider
  );

  const value = await contract.remainingAllowance(address);
  return value.toString();
}

export async function getLastClaimAt(address) {
  const provider = getBrowserProvider();
  const contract = new ethers.Contract(
    FAUCET_ADDRESS,
    faucetABI.abi,
    provider
  );

  const ts = await contract.lastClaimAt(address);
  return ts.toString();
}

/* ---------- WRITE ---------- */

export async function requestTokens() {
  const contract = await getFaucetContract();
  const tx = await contract.requestTokens();
  const receipt = await tx.wait();
  return receipt.hash;
}