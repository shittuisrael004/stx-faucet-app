'use client';
import { useState } from 'react';
import { connect, disconnect, request } from '@stacks/connect';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';
import { TransactionResult } from '@stacks/connect/dist/types/methods';
import { motion, AnimatePresence } from 'framer-motion';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    try {
      const response = await connect();
      const stxAddr = response.addresses.find(
        (a) => a.symbol === 'STX' || a.address.startsWith('SP')
      );
      if (stxAddr) setAddress(stxAddr.address);
    } catch (error) {
      console.error('Connection failed', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    if (!address) return;
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-slate-50 to-orange-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-orange-200/50 p-10 text-center border border-white"
      >
        {/* Logo/Icon Area */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 rotate-3">
             <span className="text-white text-3xl font-bold">S</span>
          </div>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
          STX <span className="text-orange-500">Faucet</span>
        </h1>
        <p className="text-slate-500 font-medium mb-8">Claim your daily mainnet drip</p>

        <AnimatePresence mode="wait">
          {!address ? (
            <motion.button
              key="connect"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-slate-200"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </motion.button>
          ) : (
            <motion.div 
              key="faucet"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Address Badge */}
              <div className="bg-slate-100/50 border border-slate-200 p-4 rounded-2xl">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Active Wallet</p>
                <p className="text-xs text-slate-700 font-mono break-all">{address}</p>
              </div>

              {/* Claim Button */}
              <button
                onClick={handleClaim}
                disabled={loading}
                className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/40 active:scale-[0.98] disabled:animate-pulse"
              >
                {loading ? "Processing..." : "Claim 0.05 STX"}
              </button>

              {/* Transaction Feedback */}
              {txId && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"
                >
                  <p className="text-emerald-700 text-sm font-bold mb-2">Success! 🎉</p>
                  <a 
                    href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`}
                    target="_blank"
                    className="text-emerald-600 text-xs hover:underline break-all"
                  >
                    View: {txId.substring(0, 20)}...
                  </a>
                </motion.div>
              )}

              <button 
                onClick={() => { disconnect(); setAddress(null); }}
                className="text-slate-400 text-sm font-semibold hover:text-red-400 transition-colors"
              >
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}