'use client';
import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect, request } from '@stacks/connect';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';
import { TransactionResult } from '@stacks/connect/dist/types/methods';
import { motion, AnimatePresence } from 'framer-motion';
// New Imports from @stacks/transactions
import { fetchCallReadOnlyFunction, Cl, cvToValue } from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<string>("...");

  const mainnet = new StacksMainnet();

  // 1. Logic to check eligibility and balance
  const checkContractState = useCallback(async (userAddr: string) => {
    try {
      // Check if user can claim (prevents failing gas-burn transactions)
      const result = await fetchCallReadOnlyFunction({
        network: mainnet,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'is-eligible', // Ensure this matches your contract function name
        functionArgs: [Cl.principal(userAddr)],
        senderAddress: userAddr,
      });
      setIsEligible(cvToValue(result));

      // Fetch Faucet Balance
      const balRes = await fetch(`https://api.mainnet.hiro.so/address/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/balances`);
      const balData = await balRes.json();
      setFaucetBalance((parseInt(balData.stx.balance) / 1000000).toLocaleString());
    } catch (e) {
      console.error("State check failed", e);
    }
  }, []);

  useEffect(() => {
    if (address) checkContractState(address);
  }, [address, checkContractState]);

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
      // Using the RPC request method but with explicit mainnet params
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
      alert('Transaction failed. Check if you have enough STX for gas or if the 24h limit is up.');
    } finally {
      setLoading(false);
    }
  }

  // Helper for funding the faucet
  async function handleFund() {
    try {
      await request('stx_transferStx', {
        recipient: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        amount: '1000000', // 1 STX
        network: 'mainnet',
      });
    } catch (e) { console.error(e); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-slate-50 to-orange-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 text-center border border-white"
      >
        {/* Faucet Stats */}
        <div className="flex justify-between items-center mb-8 bg-slate-900 rounded-2xl p-4 text-white shadow-inner">
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Balance</p>
            <p className="text-xl font-mono text-orange-400 font-bold">{faucetBalance} STX</p>
          </div>
          <button onClick={handleFund} className="bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded-lg text-xs font-bold transition-colors">
            + Fund
          </button>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-2">
          STX <span className="text-orange-500">Faucet</span>
        </h1>

        <AnimatePresence mode="wait">
          {!address ? (
            <motion.button
              key="connect"
              onClick={handleConnect}
              disabled={loading}
              className="w-full mt-4 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </motion.button>
          ) : (
            <motion.div key="faucet" className="space-y-6 mt-6">
              {/* Eligibility Alert */}
              {isEligible === false && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">
                  ⚠️ Limit reached. Try again in 24 hours.
                </div>
              )}

              <button
                onClick={handleClaim}
                disabled={loading || isEligible === false}
                className="w-full bg-orange-500 text-white font-bold py-5 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/40 disabled:bg-slate-300 disabled:shadow-none"
              >
                {loading ? "Processing..." : isEligible === false ? "Locked" : "Claim 0.05 STX"}
              </button>

              {txId && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <p className="text-emerald-700 text-sm font-bold truncate">
                    <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank">Success! View Transaction</a>
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-mono mb-2 truncate">{address}</p>
                <button onClick={() => { disconnect(); setAddress(null); }} className="text-slate-400 text-xs hover:text-red-500 underline">Sign Out</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}