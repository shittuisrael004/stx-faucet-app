'use client';
import { useState } from 'react';
import { connect, disconnect, request, isConnected } from '@stacks/connect';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';
import { TransactionResult } from '@stacks/connect/dist/types/methods';

export default function FaucetPage() {
  const [address, setAddress] = useState<string | null>(null);

  async function handleConnect() {
    try {
      // SIP-030 way to initiate connection
      const response = await connect();
      
      // Look for the Stacks Mainnet address in the response
      // Usually, it's the address where the symbol is "STX" or prefix is "SP"
      const stxAddr = response.addresses.find(
        (a) => a.symbol === 'STX' || a.address.startsWith('SP')
      );

      if (stxAddr) {
        setAddress(stxAddr.address);
      }
    } catch (error) {
      console.error('Connection failed', error);
    }
  }

  async function handleDisconnect() {
    disconnect();
    setAddress(null);
  }

  async function handleClaim() {
    if (!address) return;

    try {
      // SIP-030 RPC call: stx_callContract
      const result: TransactionResult = await request('stx_callContract', {
        contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        functionName: 'claim-stx',
        functionArgs: [], // No arguments for your faucet
        network: 'mainnet',
        postConditions: [], // No STX leaving the user wallet, so empty is fine
        postConditionMode: 'deny',
      });

      alert(`Claim transaction sent! ID: ${result.txid}`);
    } catch (error) {
      console.error('Claim failed', error);
      alert('Transaction cancelled or failed.');
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        <h1 className="text-3xl font-extrabold text-orange-600 mb-2">STX Faucet</h1>
        <p className="text-gray-500 mb-8">Mainnet • SIP-030 Standard</p>

        {!address ? (
          <button
            onClick={handleConnect}
            className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition"
          >
            Connect Wallet
          </button>
        ) : (
          <div>
            <div className="bg-orange-50 p-3 rounded-md mb-6 text-xs text-orange-800 font-mono break-all">
              Connected: {address}
            </div>
            
            <button
              onClick={handleClaim}
              className="w-full bg-orange-500 text-white font-bold py-4 rounded-lg hover:bg-orange-600 transition shadow-lg shadow-orange-200"
            >
              Claim 0.05 STX
            </button>

            <button 
              onClick={handleDisconnect}
              className="mt-4 text-gray-400 text-sm hover:underline"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </main>
  );
}