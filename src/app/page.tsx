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
  const [blocksRemaining, setBlocksRemaining] = useState<number | null>(null); // Changed to null for initial state

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
      
      if (data.okay && data.result) {
        // More robust parsing to prevent NaN
        const blocksValue = cvToValue(data.result);
        const blocks = typeof blocksValue === 'bigint' ? Number(blocksValue) : Number(blocksValue);
        
        setBlocksRemaining(isNaN(blocks) ? 0 : blocks);
      } else {
        setBlocksRemaining(0);
      }
    } catch (e) {
      console.error("Cooldown check failed", e);
      setBlocksRemaining(0); // Assume eligible if check fails to avoid locking users out
    }
  }, []);

  const getBalance = useCallback(async () => {
    try {
      const res = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/balances`);
      const data = await res.json();
      const stx = data.stx?.balance || "0";
      setFaucetBalance((parseInt(stx) / 1000000).toLocaleString());
    } catch (e) { console.error(e); }
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
      const stxAddr = response.addresses.find(a => a.symbol === 'STX' || a.address.startsWith('SP'));
      if (stxAddr) setAddress(stxAddr.address);
    } catch (error) { console.error(error); }
  }

  async function handleClaim() {
    if (!address) return;
    setLoading(true);
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'claim-stx',
      functionArgs: [],
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        setTxId(data.txId);
        setLoading(false);
        setTimeout(() => { getBalance(); checkCooldown(address); }, 5000);
      },
      onCancel: () => setLoading(false),
    });
  }

  async function handleFund() {
    if (!fundAmount || !address) return;
    const microStx = Math.floor(parseFloat(fundAmount) * 1000000);
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'fund-faucet',
      functionArgs: [Cl.uint(microStx)],
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => { setFundAmount(""); setTimeout(getBalance, 5000); }
    });
  }

  // Logic for UI display
  const isCooldownActive = blocksRemaining !== null && blocksRemaining > 0;
  const hoursRemaining = isCooldownActive ? Math.ceil(blocksRemaining / 6) : 0;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center border border-slate-50">
        
        <div className="mb-8 bg-[#111827] rounded-3xl p-6 text-white text-left relative">
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Faucet Balance</p>
          <p className="text-3xl font-mono font-bold">{faucetBalance} <span className="text-orange-500 text-xl">STX</span></p>
          <div className="absolute top-4 right-4 bg-orange-500/20 text-orange-500 px-2 py-1 rounded text-[10px] font-bold">LIVE</div>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter">STX <span className="text-orange-500">Faucet</span></h1>
        <p className="text-slate-400 text-xs mb-8">Free Mainnet Faucet by sargesmith</p>

        {!address ? (
          <button onClick={handleConnect} className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl hover:bg-slate-800 transition-all">
            Connect Wallet
          </button>
        ) : (
          <div className="space-y-6">
            {/* COOLDOWN STATUS */}
            <AnimatePresence>
              {blocksRemaining !== null && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`p-4 rounded-2xl text-[11px] font-bold border ${!isCooldownActive ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}
                >
                  {!isCooldownActive 
                    ? "✅ Claim is available now!" 
                    : `⏳ You can claim again in ~${hoursRemaining} ${hoursRemaining === 1 ? 'hour' : 'hours'}`}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleClaim}
              disabled={loading || isCooldownActive}
              className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {loading ? "Processing..." : isCooldownActive ? "Claim Locked" : "Claim 0.05 STX"}
            </button>

            <div className="pt-6 border-t border-slate-100 text-left">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-3">Top up Faucet</p>
              <div className="flex gap-2">
                <input type="number" placeholder="STX Amount" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-orange-500" />
                <button onClick={handleFund} disabled={!fundAmount || loading} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold">Fund</button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <p className="text-[9px] text-slate-500 font-mono break-all p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">{address}</p>
              <button onClick={() => { disconnect(); setAddress(null); }} className="text-slate-400 text-xs font-bold hover:text-red-500 uppercase tracking-widest">Disconnect</button>
            </div>
          </div>
        )}
      </motion.div>
    </main>
  );
}