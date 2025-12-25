'use client';
import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect, request } from '@stacks/connect';
import { CONTRACT_ADDRESS, CONTRACT_NAME, network } from '@/lib/stacks';
import { fetchCallReadOnlyFunction, Cl, cvToValue } from '@stacks/transactions';
import { motion, AnimatePresence } from 'framer-motion';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faucetBalance, setFaucetBalance] = useState<string>("0");
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  // 1. Fetch Faucet Balance & Eligibility
  const updateContractState = useCallback(async (userAddr: string | null) => {
    try {
      // Get Balance (Using public Hiro API for speed)
      const balRes = await fetch(`https://api.mainnet.hiro.so/address/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/balances`);
      const balData = await balRes.json();
      const stxBalance = parseInt(balData.stx.balance) / 1000000;
      setFaucetBalance(stxBalance.toLocaleString());

      // Check Eligibility (Read-only call to your contract)
      if (userAddr) {
        const result = await fetchCallReadOnlyFunction({
          network,
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: "is-eligible",
          functionArgs: [Cl.principal(userAddr)],
          senderAddress: userAddr,
        });
        // Converts Clarity boolean to JS boolean
        setIsEligible(cvToValue(result));
      }
    } catch (e) {
      console.error("Failed to fetch state", e);
    }
  }, []);

  useEffect(() => {
    updateContractState(address);
    const interval = setInterval(() => updateContractState(address), 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [address, updateContractState]);

  // 2. Connect Wallet
  async function handleConnect() {
    setLoading(true);
    try {
      const response = await connect();
      const stxAddr = response.addresses.find(a => a.symbol === 'STX' || a.address.startsWith('SP'));
      if (stxAddr) setAddress(stxAddr.address);
    } finally {
      setLoading(false);
    }
  }

  // 3. Claim STX
  async function handleClaim() {
    if (!address || !isEligible) return;
    setLoading(true);
    try {
      const result = await request('stx_callContract', {
        contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        functionName: 'claim-stx',
        functionArgs: [],
        network: 'mainnet',
        postConditions: [],
        postConditionMode: 'deny',
      });
      setTxId(result.txid);
    } finally {
      setLoading(false);
    }
  }

  // 4. Fund Faucet (Simple STX Transfer)
  async function handleFund() {
    try {
      await request('stx_transferStx', {
        recipient: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        amount: '5000000', // Default to 5 STX, user can edit in wallet
        network: 'mainnet',
      });
    } catch (e) { console.error(e); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-slate-50 to-orange-50 p-6 font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 text-center border border-white">
        
        {/* Faucet Balance Header */}
        <div className="flex items-center justify-between mb-8 bg-slate-900 text-white p-4 rounded-2xl shadow-inner">
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Faucet Balance</p>
            <p className="text-xl font-mono font-bold text-orange-400">{faucetBalance} STX</p>
          </div>
          <button onClick={handleFund} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/20">
            + Fund
          </button>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">STX <span className="text-orange-500">Faucet</span></h1>
        
        <AnimatePresence mode="wait">
          {!address ? (
            <button onClick={handleConnect} disabled={loading} className="w-full mt-6 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl">
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <div className="mt-8 space-y-6">
              {/* Eligibility Status */}
              <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 ${isEligible ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                {isEligible === null ? "Checking..." : isEligible ? "✅ You are eligible to claim" : "❌ Claim limit reached (24h)"}
              </div>

              {/* Claim Button */}
              <button
                onClick={handleClaim}
                disabled={loading || !isEligible}
                className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30"
              >
                {loading ? "Processing..." : isEligible ? "Claim 0.05 STX" : "Wait 24 Hours"}
              </button>

              {txId && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                  <p className="text-blue-700 text-xs font-bold truncate underline">
                    <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank">Track: {txId}</a>
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 font-mono">Wallet: {address}</p>
              <button onClick={() => { disconnect(); setAddress(null); }} className="text-slate-400 text-xs hover:text-red-500 underline">Disconnect</button>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}