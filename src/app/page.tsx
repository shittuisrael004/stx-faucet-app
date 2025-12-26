'use client';
import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect, request } from '@stacks/connect';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';
import { TransactionResult } from '@stacks/connect/dist/types/methods';
import { motion, AnimatePresence } from 'framer-motion';

// FIXED IMPORTS
import { fetchCallReadOnlyFunction, Cl, cvToValue } from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<string>("...");

  // Define the network object properly
  const mainnet = new StacksMainnet();

  const updateState = useCallback(async (userAddr: string) => {
    try {
      // 1. Check Eligibility via Read-Only Function
      const result = await fetchCallReadOnlyFunction({
        network: mainnet,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'is-eligible',
        functionArgs: [Cl.principal(userAddr)],
        senderAddress: userAddr,
      });
      setIsEligible(cvToValue(result));

      // 2. FIXED API FETCH
      // Hiro API endpoint for balances
      const balRes = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/balances`);
      const balData = await balRes.json();
      
      // Accessing the STX balance specifically
      const microStx = balData.stx?.balance || "0";
      setFaucetBalance((parseInt(microStx) / 1000000).toLocaleString());
    } catch (e) {
      console.error("Failed to sync with contract:", e);
    }
  }, []);

  useEffect(() => {
    if (address) updateState(address);
  }, [address, updateState]);

  async function handleConnect() {
    setLoading(true);
    try {
      const response = await connect();
      const stxAddr = response.addresses.find(
        (a) => a.symbol === 'STX' || a.address.startsWith('SP')
      );
      if (stxAddr) setAddress(stxAddr.address);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    if (!address || isEligible === false) return;
    setLoading(true);
    setTxId(null);

    try {
      const result: TransactionResult = await request('stx_callContract', {
        contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        functionName: 'claim-stx',
        functionArgs: [],
        network: 'mainnet',
        postConditions: [],
        postConditionMode: 'deny',
      });
      setTxId(result.txid);
    } catch (error) {
      console.error('Claim failed', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFund() {
    try {
      await request('stx_transferStx', {
        recipient: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        amount: '1000000', 
        network: 'mainnet',
      });
    } catch (e) { console.error(e); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-slate-50 to-orange-50 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 text-center border border-white">
        
        <div className="flex justify-between items-center mb-8 bg-slate-900 rounded-2xl p-4 text-white shadow-inner">
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Faucet Balance</p>
            <p className="text-xl font-mono text-orange-400 font-bold">{faucetBalance} STX</p>
          </div>
          <button onClick={handleFund} className="bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded-lg text-xs font-bold transition-all">
            + Fund
          </button>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">STX <span className="text-orange-500">Faucet</span></h1>
        <p className="text-slate-500 font-medium mb-8 italic">Mainnet • SIP-030</p>

        <AnimatePresence mode="wait">
          {!address ? (
            <button onClick={handleConnect} disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl">
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl text-xs font-bold border transition-colors ${isEligible ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                {isEligible === null ? "Synchronizing..." : isEligible ? "✅ Ready to claim" : "⏳ Limit reached (Try again in 24h)"}
              </div>

              <button
                onClick={handleClaim}
                disabled={loading || isEligible === false}
                className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/40 disabled:bg-slate-300 disabled:shadow-none"
              >
                {loading ? "Processing..." : isEligible === false ? "Cooldown Active" : "Claim 0.05 STX"}
              </button>

              {txId && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <p className="text-emerald-700 text-sm font-bold truncate">
                    <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" className="hover:underline">Success! View in Explorer</a>
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-mono mb-2 truncate">Connected: {address}</p>
                <button onClick={() => { disconnect(); setAddress(null); }} className="text-slate-400 text-xs hover:text-red-500 underline">Sign Out</button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}