'use client';
import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect, openContractCall } from '@stacks/connect';
import { PostConditionMode, Cl, cvToValue } from '@stacks/transactions';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';
import { motion, AnimatePresence } from 'framer-motion';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<string>("...");
  const [fundAmount, setFundAmount] = useState<string>("");
  const [blocksRemaining, setBlocksRemaining] = useState<number>(0);

  // 1. Fetch blocks-remaining from contract
  const checkCooldown = useCallback(async (userAddr: string) => {
    try {
      const res = await fetch(`https://api.mainnet.hiro.so/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-blocks-remaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: userAddr,
          arguments: [Cl.serialize(Cl.principal(userAddr))],
        }),
      });
      const data = await res.json();
      if (data.okay) {
        // data.result is the Clarity value; cvToValue converts it to a JS number
        const blocks = Number(cvToValue(data.result));
        setBlocksRemaining(blocks);
      }
    } catch (e) {
      console.error("Cooldown check failed", e);
    }
  }, []);

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
    if (address) checkCooldown(address);
    const interval = setInterval(() => {
      getBalance();
      if (address) checkCooldown(address);
    }, 30000);
    return () => clearInterval(interval);
  }, [getBalance, address, checkCooldown]);

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
    setTxId(null);

    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'claim-stx',
        functionArgs: [],
        postConditionMode: PostConditionMode.Allow,
        network: 'mainnet' as any,
        appDetails: { name: 'STX Faucet', icon: '' },
        onFinish: (data) => {
          setTxId(data.txId);
          setLoading(false);
          // Refresh both balance and cooldown after claim
          setTimeout(() => {
            getBalance();
            checkCooldown(address);
          }, 5000);
        },
        onCancel: () => setLoading(false),
      });
    } catch (error) {
      console.error('Transaction failed', error);
      setLoading(false);
    }
  }

  async function handleFund() {
    if (!fundAmount || isNaN(Number(fundAmount)) || !address) return;
    setLoading(true);
    const microStxAmount = Math.floor(parseFloat(fundAmount) * 1000000);

    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'fund-faucet',
        functionArgs: [Cl.uint(microStxAmount)],
        postConditionMode: PostConditionMode.Allow,
        network: 'mainnet' as any,
        appDetails: { name: 'STX Faucet', icon: '' },
        onFinish: (data) => {
          setTxId(data.txId);
          setFundAmount("");
          setLoading(false);
          setTimeout(getBalance, 5000);
        },
        onCancel: () => setLoading(false),
      });
    } catch (e) {
      console.error("Funding failed", e);
      setLoading(false);
    }
  }

  // Helper to convert blocks to hours (144 blocks = 24h, so 6 blocks = 1h)
  const hoursRemaining = Math.ceil(blocksRemaining / 6);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center border border-slate-50"
      >
        <div className="mb-8 bg-[#111827] rounded-3xl p-6 text-white relative">
          <div className="text-left">
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Faucet Balance</p>
            <p className="text-3xl font-mono text-white font-bold">{faucetBalance} <span className="text-orange-500 text-xl">STX</span></p>
          </div>
          <div className="absolute top-4 right-4 bg-orange-500/20 text-orange-500 px-2 py-1 rounded text-[10px] font-bold">LIVE</div>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter">STX <span className="text-orange-500">Faucet</span></h1>
        <p className="text-slate-400 text-xs mb-8">Free Mainnet Faucet by sargesmith</p>

        <AnimatePresence mode="wait">
          {!address ? (
            <button onClick={handleConnect} className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl hover:bg-slate-800 transition-all">
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-6">
              
              {/* COOLDOWN STATUS BOX */}
              <div className={`p-4 rounded-2xl text-[11px] font-bold border transition-colors ${blocksRemaining === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                {blocksRemaining === 0 
                  ? "✅ Claim is available now!" 
                  : `⏳ You can claim again in ~${hoursRemaining} ${hoursRemaining === 1 ? 'hour' : 'hours'}`}
              </div>

              <button
                onClick={handleClaim}
                disabled={loading || blocksRemaining > 0}
                className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? "Processing..." : blocksRemaining > 0 ? "Claim Locked" : "Claim 0.05 STX"}
              </button>

              <div className="pt-6 border-t border-slate-100 text-left">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-3">Top up Faucet</p>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="STX Amount" 
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <button 
                    onClick={handleFund}
                    disabled={loading || !fundAmount}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Fund
                  </button>
                </div>
              </div>

              {txId && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <p className="text-emerald-700 text-[10px] font-bold break-all">
                    Tx Sent! <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" className="underline">View in Explorer</a>
                  </p>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100">
                <p className="text-[9px] text-slate-500 font-mono break-all mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed">
                  {address}
                </p>
                <button 
                  onClick={() => { disconnect(); setAddress(null); }} 
                  className="text-slate-400 text-xs font-bold hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}