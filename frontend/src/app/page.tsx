'use client';
import dynamic from 'next/dynamic';

// This tells Next.js to only load the Faucet on the client side (browser)
const Faucet = dynamic(() => import('./Faucet'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
      <div className="animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">
        Loading Stacks Faucet...
      </div>
    </div>
  )
});

export default function Page() {
  return <Faucet />;
}