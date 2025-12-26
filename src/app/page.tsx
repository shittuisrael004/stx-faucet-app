'use client';
import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect, openContractCall } from '@stacks/connect';
import { PostConditionMode } from '@stacks/transactions';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';
import { motion, AnimatePresence } from 'framer-motion';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<string>("...");

  // Optimized balance fetcher
  const getBalance = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.mainnet.hiro.so/extended/v1/address/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/balances`
      );
      const data = await res.json();
      const stx = data.stx?.balance || "0";
      setFaucetBalance((parseInt(stx) / 1000000).toLocaleString());
    } catch (e) {
      console.error("Balance fetch failed", e);
    }
  }, []);

  useEffect(() => {
    getBalance();
    const interval = setInterval(getBalance, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [getBalance]);

  async function handleConnect() {
    try {
      const response = await connect();
      const stxAddr = response.addresses.find(
        (a) => a.symbol === 'STX' || a.address.startsWith('SP')
      );
      if (stxAddr) setAddress(stxAddr.address);
    } catch (error) {
      console.error('Connection failed', error);
    }
  }

  async function handleClaim() {
    if (!address) return;
    setLoading(true);
    setTxId(null); // Reset previous TX link

    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'claim-stx',
        functionArgs: [],
        postConditionMode: PostConditionMode.Allow,
        network: 'mainnet' as any,
        appDetails: {
          name: 'STX Faucet',
          icon: window.location.origin + '/favicon.ico',
        },
        onFinish: (data) => {
          setTxId(data.txId);
          setLoading(false);
          // Refresh balance after a few seconds to let the chain update
          setTimeout(getBalance, 5000);
        },
        onCancel: () => {
          setLoading(false);
        },
      });
    } catch (error) {
      console.error('Transaction failed', error);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fcfcfc] bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-orange-50 via-white to-slate-100 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-md w-full bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 text-center border border-slate-50"
      >
        {/* Modern Balance Card */}
        <div className="mb-10 bg-[#111827] rounded-3xl p-6 text-white shadow-2xl shadow-orange-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          </div>
          <div className="text-left relative z-10">
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Faucet Liquidity</p>
            <p className="text-3xl font-mono text-white font-bold">
              {faucetBalance} <span className="text-orange-500 text-xl">STX</span>
            </p>
          </div>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter">
          STX <span className="text-orange-500">Faucet</span>
        </h1>
        <p className="text-slate-400 text-sm mb-10 font-medium">Mainnet Rewards Protocol</p>

        <AnimatePresence mode="wait">
          {!address ? (
            <motion.button 
              key="connect"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={handleConnect} 
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-95"
            >
              Connect Wallet
            </motion.button>
          ) : (
            <motion.div 
              key="active"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <button
                onClick={handleClaim}
                disabled={loading}
                className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? "Waiting for Approval..." : "Claim 0.05 STX"}
              </button>

              {txId && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"
                >
                  <p className="text-emerald-700 text-xs font-bold leading-relaxed">
                    Transaction Broadcasted!<br/>
                    <a 
                      href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} 
                      target="_blank" 
                      className="underline decoration-emerald-200 hover:decoration-emerald-500"
                    >
                      Track on Explorer ↗
                    </a>
                  </p>
                </motion.div>
              )}

              <div className="pt-6 mt-6 border-t border-slate-50 flex flex-col items-center">
                <p className="text-[10px] text-slate-300 font-mono truncate max-w-[200px] mb-3">
                  {address}
                </p>
                <button 
                  onClick={() => { disconnect(); setAddress(null); }} 
                  className="text-slate-400 text-xs font-bold hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  Disconnect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}