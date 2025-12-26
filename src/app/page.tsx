'use client';
import { useState, useEffect } from 'react';
import { connect, disconnect, openContractCall } from '@stacks/connect';
import { PostConditionMode } from '@stacks/transactions';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';
import { motion, AnimatePresence } from 'framer-motion';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<string>("...");

  // Simple balance fetch using standard browser fetch
  const getBalance = async () => {
    try {
      const res = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/balances`);
      const data = await res.json();
      const stx = data.stx?.balance || "0";
      setFaucetBalance((parseInt(stx) / 1000000).toLocaleString());
    } catch (e) {
      console.error("Balance fetch failed", e);
    }
  };

  useEffect(() => {
    getBalance();
    // Refresh balance every 60 seconds
    const interval = setInterval(getBalance, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleConnect() {
    try {
      const response = await connect();
      const stxAddr = response.addresses.find(a => a.symbol === 'STX' || a.address.startsWith('SP'));
      if (stxAddr) setAddress(stxAddr.address);
    } catch (error) {
      console.error('Connection failed', error);
    }
  }

  async function handleClaim() {
    if (!address) return;
    setLoading(true);

    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'claim-stx',
        functionArgs: [],
        // IMPORTANT: This allows the contract to send you the 0.05 STX
        postConditionMode: PostConditionMode.Allow, 
        network: 'mainnet' as any,
        appDetails: {
          name: 'STX Faucet',
          icon: window.location.origin + '/favicon.ico',
        },
        onFinish: (data) => {
          setTxId(data.txId);
          setLoading(false);
          getBalance(); // Update balance after claim
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
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100">
        
        {/* Balance Display */}
        <div className="mb-8 bg-[#0f172a] rounded-2xl p-4 text-white flex justify-between items-center">
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Faucet Balance</p>
            <p className="text-xl font-mono text-orange-500 font-bold">{faucetBalance} STX</p>
          </div>
          <div className="bg-orange-500/10 text-orange-500 px-2 py-1 rounded text-[10px] font-bold">LIVE</div>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-8">STX <span className="text-orange-500">Faucet</span></h1>

        <AnimatePresence mode="wait">
          {!address ? (
            <button onClick={handleConnect} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg">
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleClaim}
                disabled={loading}
                className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 transition-all shadow-xl disabled:opacity-50"
              >
                {loading ? "Confirm in Wallet..." : "Claim 0.05 STX"}
              </button>

              {txId && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <p className="text-emerald-700 text-xs font-bold break-all">
                    Transaction Sent!<br/>
                    <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" className="underline">View: {txId.substring(0, 12)}...</a>
                  </p>
                </div>
              )}

              <div className="pt-4 mt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-mono truncate mb-2">{address}</p>
                <button onClick={() => { disconnect(); setAddress(null); }} className="text-slate-400 text-xs hover:text-red-500 underline">Sign Out</button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}