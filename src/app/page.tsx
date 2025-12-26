'use client';
import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect, request } from '@stacks/connect';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';
import { TransactionResult } from '@stacks/connect/dist/types/methods';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCallReadOnlyFunction, Cl, cvToValue } from '@stacks/transactions';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<string>("...");

  // 1. Sync State (No StacksMainnet object needed)
  const updateState = useCallback(async (userAddr: string) => {
    try {
      // READ-ONLY: Checking eligibility
      const result = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'is-eligible',
        functionArgs: [Cl.principal(userAddr)],
        senderAddress: userAddr,
        // We pass the URL directly instead of a network object
        network: { coreApiUrl: 'https://api.mainnet.hiro.so' } as any,
      });
      setIsEligible(cvToValue(result));

      // BALANCE: Using the Hiro API directly
      const balRes = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/balances`);
      const balData = await balRes.json();
      const microStx = balData.stx?.balance || "0";
      setFaucetBalance((parseInt(microStx) / 1000000).toLocaleString());
    } catch (e) {
      console.error("Sync error:", e);
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

  // 2. THE TRANSACTION CALL (SIP-030 RPC)
  async function handleClaim() {
    if (!address || isEligible === false) return;
    setLoading(true);
    setTxId(null);

    try {
      // This is the specific SIP-030 RPC method
      const result = await (window as any).StacksProvider.request('stx_callContract', {
        contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        functionName: 'claim-stx',
        functionArgs: [], // No args
        network: 'mainnet',
        postConditions: [], 
        postConditionMode: 'allow', // CHANGED TO ALLOW: Faucets send STX TO the user, deny often blocks this
      });
      
      setTxId(result.txid);
    } catch (error: any) {
      console.error('Claim failed:', error);
      alert(`Error: ${error.message || 'Transaction rejected'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-slate-50 to-orange-50 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 text-center border border-white">
        
        <div className="flex justify-between items-center mb-8 bg-slate-900 rounded-2xl p-4 text-white shadow-inner">
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Faucet</p>
            <p className="text-xl font-mono text-orange-400 font-bold">{faucetBalance} STX</p>
          </div>
          <div className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] text-orange-400 font-bold">MAINNET</div>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">STX <span className="text-orange-500">Faucet</span></h1>

        <AnimatePresence mode="wait">
          {!address ? (
            <button onClick={handleConnect} disabled={loading} className="w-full mt-4 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl">
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <div className="space-y-6 mt-6">
              <div className={`p-4 rounded-2xl text-xs font-bold border ${isEligible ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                {isEligible === null ? "Checking..." : isEligible ? "✅ Eligible to claim" : "⏳ Already claimed today"}
              </div>

              <button
                onClick={handleClaim}
                disabled={loading || isEligible === false}
                className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 transition-all disabled:bg-slate-300"
              >
                {loading ? "Processing..." : isEligible === false ? "Locked" : "Claim 0.05 STX"}
              </button>

              {txId && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl overflow-hidden">
                  <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" className="text-emerald-700 text-xs font-bold underline break-all">
                    View Transaction: {txId.substring(0, 15)}...
                  </a>
                </div>
              )}

              <button onClick={() => { disconnect(); setAddress(null); }} className="text-slate-400 text-xs hover:underline">Sign Out</button>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}