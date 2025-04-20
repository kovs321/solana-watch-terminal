
import React from 'react';
import Terminal from '@/components/Terminal';
import ConnectWallet from '@/components/ConnectWallet';
import AddWalletForm from '@/components/AddWalletForm';
import WalletList from '@/components/WalletList';
import WalletTestPanel from '@/components/WalletTestPanel';
import { useInitialWallets } from '@/hooks/useInitialWallets';
import { TransactionProvider } from '@/contexts/TransactionContext';

const Index = () => {
  useInitialWallets();
  
  return (
    <TransactionProvider>
      <div className="min-h-screen bg-terminal-background text-terminal-text font-mono">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-terminal-text mb-2">Solana Watch Terminal</h1>
            <p className="text-terminal-muted">$ tracking_solana_transactions --live</p>
          </header>
          
          <ConnectWallet />
          
          <div className="grid grid-cols-1 gap-4 mb-6">
            <WalletTestPanel />
            <Terminal />
            <WalletList />
            <div className="flex justify-center">
              <AddWalletForm />
            </div>
          </div>
          
          <footer className="mt-8 text-center text-xs text-terminal-muted">
            <p>Solana Watch Terminal &copy; {new Date().getFullYear()}</p>
            <p className="mt-1">
              $ system_status --monitoring
            </p>
          </footer>
        </div>
      </div>
    </TransactionProvider>
  );
};

export default Index;
