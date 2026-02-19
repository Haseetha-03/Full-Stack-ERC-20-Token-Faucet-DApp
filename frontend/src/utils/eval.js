import {
  getBrowserProvider,
  requestTokens,
  getBalance,
  canClaim,
  getRemainingAllowance,
  getAddresses,
} from "./contracts";

// This file MUST expose window.__EVAL__ for evaluation
export function setupEval() {
  window.__EVAL__ = {
    connectWallet: async () => {
      try {
        if (!window.ethereum) throw new Error("MetaMask not found");

        const provider = getBrowserProvider();
        const accounts = await provider.send("eth_requestAccounts", []);

        if (!accounts || accounts.length === 0) {
          throw new Error("No wallet accounts found");
        }

        return accounts[0];
      } catch (err) {
        throw new Error(`connectWallet failed: ${err.message || err}`);
      }
    },

    requestTokens: async () => {
      try {
        const hash = await requestTokens();
        return hash;
      } catch (err) {
        throw new Error(`requestTokens failed: ${err.message || err}`);
      }
    },

    getBalance: async (address) => {
      try {
        if (!address) throw new Error("Address is required");
        const bal = await getBalance(address);
        return bal; // string
      } catch (err) {
        throw new Error(`getBalance failed: ${err.message || err}`);
      }
    },

    canClaim: async (address) => {
      try {
        if (!address) throw new Error("Address is required");
        return await canClaim(address); // boolean
      } catch (err) {
        throw new Error(`canClaim failed: ${err.message || err}`);
      }
    },

    getRemainingAllowance: async (address) => {
      try {
        if (!address) throw new Error("Address is required");
        const rem = await getRemainingAllowance(address);
        return rem; // string
      } catch (err) {
        throw new Error(`getRemainingAllowance failed: ${err.message || err}`);
      }
    },

    getContractAddresses: async () => {
      try {
        return getAddresses(); // { token, faucet }
      } catch (err) {
        throw new Error(`getContractAddresses failed: ${err.message || err}`);
      }
    },
  };
}
