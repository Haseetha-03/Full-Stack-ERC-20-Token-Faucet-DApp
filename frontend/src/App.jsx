import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

import {
  getBrowserProvider,
  getBalance,
  canClaim,
  getRemainingAllowance,
  getLastClaimAt,
  requestTokens,
} from "./utils/contracts";

import { setupEval } from "./utils/eval";

export default function App() {
  const [address, setAddress] = useState("");
  const [connected, setConnected] = useState(false);

  const [balance, setBalance] = useState("0");
  const [remaining, setRemaining] = useState("0");
  const [eligible, setEligible] = useState(false);

  const [lastClaimAt, setLastClaimAt] = useState("0");
  const [cooldownText, setCooldownText] = useState("Connect wallet");

  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const COOLDOWN_SECONDS = 24 * 60 * 60;

  const shortAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  // Expose window.__EVAL__
  useEffect(() => {
    setupEval();
  }, []);

  async function connectWallet() {
    setError("");
    setTxHash("");

    try {
      if (!window.ethereum) throw new Error("MetaMask not found");

      const provider = getBrowserProvider();
      const accounts = await provider.send("eth_requestAccounts", []);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from wallet");
      }

      setAddress(accounts[0]);
      setConnected(true);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  function disconnectWallet() {
    // MetaMask doesn't support true disconnect.
    // We just clear UI state.
    setAddress("");
    setConnected(false);
    setBalance("0");
    setRemaining("0");
    setEligible(false);
    setLastClaimAt("0");
    setCooldownText("Disconnected");
    setError("");
    setTxHash("");
  }

  async function refreshData(addr) {
    if (!addr) return;

    try {
      const [bal, rem, can, last] = await Promise.all([
        getBalance(addr),
        getRemainingAllowance(addr),
        canClaim(addr),
        getLastClaimAt(addr),
      ]);

      setBalance(bal);
      setRemaining(rem);
      setEligible(can);
      setLastClaimAt(last);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  // Update UI every time address changes
  useEffect(() => {
    if (!address) return;
    refreshData(address);
  }, [address]);

  // Cooldown timer update
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      const last = Number(lastClaimAt || "0");
      const now = Math.floor(Date.now() / 1000);

      if (last === 0) {
        setCooldownText("Ready to claim");
        return;
      }

      const nextTime = last + COOLDOWN_SECONDS;
      const diff = nextTime - now;

      if (diff <= 0) {
        setCooldownText("Ready to claim");
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setCooldownText(
          `Cooldown: ${hours}h ${minutes}m ${seconds}s remaining`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [address, lastClaimAt]);

  // Listen to MetaMask account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
      } else {
        setAddress(accounts[0]);
        setConnected(true);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  async function handleClaim() {
    setError("");
    setTxHash("");

    if (!address) {
      setError("Connect wallet first");
      return;
    }

    try {
      setLoading(true);

      const hash = await requestTokens();
      setTxHash(hash);

      // Refresh after success
      await refreshData(address);
    } catch (e) {
      // Nice error messages
      const msg = e?.message || String(e);

      if (msg.includes("user rejected")) {
        setError("You rejected the transaction in MetaMask.");
      } else if (msg.includes("Cooldown period not elapsed")) {
        setError("You must wait 24 hours before claiming again.");
      } else if (msg.includes("Lifetime claim limit reached")) {
        setError("You reached your lifetime claim limit.");
      } else if (msg.includes("Faucet is paused")) {
        setError("Faucet is paused by admin.");
      } else if (msg.includes("Faucet has insufficient token balance")) {
        setError("Token max supply reached. Faucet cannot mint more.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // Display balance in tokens (not required but nice)
  const balanceTokens = useMemo(() => {
    try {
      return ethers.formatUnits(balance || "0", 18);
    } catch {
      return "0";
    }
  }, [balance]);

  const remainingTokens = useMemo(() => {
    try {
      return ethers.formatUnits(remaining || "0", 18);
    } catch {
      return "0";
    }
  }, [remaining]);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 20, maxWidth: 800 }}>
      <h1>Token Faucet DApp</h1>

      {!connected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div>
            <b>Connected:</b> {shortAddress}
          </div>
          <button onClick={disconnectWallet}>Disconnect</button>
        </div>
      )}

      <hr />

      <div style={{ marginTop: 10 }}>
        <p>
          <b>Token Balance (base units):</b> {balance}
        </p>
        <p>
          <b>Token Balance:</b> {balanceTokens} tokens
        </p>

        <p>
          <b>Remaining Lifetime Allowance (base units):</b> {remaining}
        </p>
        <p>
          <b>Remaining Allowance:</b> {remainingTokens} tokens
        </p>

        <p>
          <b>Cooldown Status:</b> {cooldownText}
        </p>

        <p>
          <b>Can Claim:</b> {eligible ? "Yes ✅" : "No ❌"}
        </p>
      </div>

      <button
        onClick={handleClaim}
        disabled={!connected || !eligible || loading}
        style={{ marginTop: 10 }}
      >
        {loading ? "Claiming..." : "Request Tokens"}
      </button>

      {txHash && (
        <p style={{ marginTop: 10 }}>
          ✅ Tx Hash: <code>{txHash}</code>
        </p>
      )}

      {error && (
        <p style={{ marginTop: 10, color: "red" }}>
          ❌ Error: {error}
        </p>
      )}

      <hr />
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Network: Sepolia | Faucet gives fixed tokens every 24h (lifetime limit
        enforced on-chain).
      </p>
    </div>
  );
}
