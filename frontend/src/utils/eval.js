// frontend/src/utils/eval.js

import { ethers } from "ethers";
import {
  getProvider,
  getTokenContract,
  getFaucetContract,
} from "./contracts";

export function setupEval() {
  window.__EVAL__ = {
    async connectWallet() {
      if (!window.ethereum) {
        throw new Error("Wallet not found");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      return accounts[0];
    },

    async requestTokens() {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const faucet = await getFaucetContract(signer);

      const tx = await faucet.requestTokens();
      const receipt = await tx.wait();

      return receipt.hash;
    },

    async getBalance(address) {
      const provider = getProvider();
      const token = await getTokenContract(provider);

      const balance = await token.balanceOf(address);
      return balance.toString();
    },

    async canClaim(address) {
      const provider = getProvider();
      const faucet = await getFaucetContract(provider);

      return await faucet.canClaim(address);
    },

    async getRemainingAllowance(address) {
      const provider = getProvider();
      const faucet = await getFaucetContract(provider);

      const remaining = await faucet.remainingAllowance(address);
      return remaining.toString();
    },

    async getContractAddresses() {
      return {
        token: import.meta.env.VITE_TOKEN_ADDRESS,
        faucet: import.meta.env.VITE_FAUCET_ADDRESS,
      };
    },
  };
}