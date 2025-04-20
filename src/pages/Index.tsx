import React from 'react';
import Terminal from '@/components/Terminal';
import ConnectWallet from '@/components/ConnectWallet';
import AddWalletForm from '@/components/AddWalletForm';
import { useInitialWallets } from '@/hooks/useInitialWallets';

const Index = () => {
  // Initialize sample wallets
  useInitialWallets();
  
  return (
    <div className="min-h-screen bg-black text-terminal-text font-mono">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-terminal-highlight mb-2">Solana Watch Terminal</h1>
          <p className="text-terminal-muted text-sm">Track real-time transactions from Solana wallets</p>
        </header>
        
        <ConnectWallet />
        
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Terminal />
          <div className="flex justify-center">
            <AddWalletForm />
          </div>
        </div>
        
        <footer className="mt-8 text-center text-xs text-terminal-muted">
          <p>Solana Watch Terminal &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">
            Real-time Solana blockchain transaction monitoring
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
