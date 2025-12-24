'use client';
import { useState, useEffect } from 'react';
import { showConnect, openContractCall } from '@stacks/connect';
import { userSession, network, CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks';

export default function FaucetPage() {
  const [userData, setUserData] = useState<any>(null);

  // Check if user is already logged in when the page loads
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleConnect = () => {
    showConnect({
      appDetails: {
        name: 'STX Faucet',
        icon: '/window.svg',
      },
      onFinish: () => {
        setUserData(userSession.loadUserData());
      },
      userSession,
    });
  };

  const handleClaim = async () => {
    await openContractCall({
      network,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'claim-stx',
      functionArgs: [],
      onFinish: (data) => {
        alert(`Success! View on Explorer: https://explorer.hiro.so/txid/${data.txId}?chain=mainnet`);
      },
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        <h1 className="text-3xl font-extrabold text-orange-600 mb-2">STX Faucet</h1>
        <p className="text-gray-500 mb-8">Mainnet • 0.05 STX Drip</p>

        {!userData ? (
          <button
            onClick={handleConnect}
            className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition"
          >
            Connect Wallet
          </button>
        ) : (
          <div>
            <div className="bg-orange-50 p-3 rounded-md mb-6 text-xs text-orange-800 font-mono break-all">
              Connected: {userData.profile.stxAddress.mainnet}
            </div>
            
            <button
              onClick={handleClaim}
              className="w-full bg-orange-500 text-white font-bold py-4 rounded-lg hover:bg-orange-600 transition shadow-lg shadow-orange-200"
            >
              Claim 0.05 STX
            </button>

            <button 
              onClick={() => { userSession.signUserOut(); setUserData(null); }}
              className="mt-4 text-gray-400 text-sm hover:underline"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </main>
  );
}