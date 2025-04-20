
import React from 'react';
import Terminal from '@/components/Terminal';
import ConnectWallet from '@/components/ConnectWallet';
import AddWalletForm from '@/components/AddWalletForm';
import WalletList from '@/components/WalletList';
import WalletTestPanel from '@/components/WalletTestPanel';
import { useInitialWallets } from '@/hooks/useInitialWallets';
import { TransactionProvider } from '@/contexts/TransactionContext';

const TERMINAL_ASCII = `
 ______  __    __   ______   ______  _______   ________  _______  
|      \\|  \\  |  \\ /      \\ |      \\|       \\ |        \\|       \\ 
 \\$$$$$$| $$\\ | $$|  $$$$$$\\ \\$$$$$$| $$$$$$$\\| $$$$$$$$| $$$$$$$\\
  | $$  | $$$\\| $$| $$___\\$$  | $$  | $$  | $$| $$__    | $$__| $$
  | $$  | $$$$\\ $$ \\$$    \\   | $$  | $$  | $$| $$  \\   | $$    $$
  | $$  | $$\\$$ $$ _\\$$$$$$\\  | $$  | $$  | $$| $$$$$   | $$$$$$$\\
 _| $$_ | $$ \\$$$$|  \\__| $$ _| $$_ | $$__/ $$| $$_____ | $$  | $$
|   $$ \\| $$  \\$$$ \\$$    $$|   $$ \\| $$    $$| $$     \\| $$  | $$
 \\$$$$$$ \\$$   \\$$  \\$$$$$$  \\$$$$$$ \\$$$$$$$  \\$$$$$$$$ \\$$   \\$$
                                                                  
                                                                  
                                                                  
`;

const Index = () => {
  useInitialWallets();

  return (
    <TransactionProvider>
      <div className="min-h-screen bg-terminal-background text-terminal-text font-mono relative">
        <div className="container mx-auto px-4 py-8 z-10 relative">
          {/* ASCII Art header */}
          <pre 
            aria-label="solana terminal ascii"
            className="text-[10px] sm:text-xs md:text-sm leading-tight font-mono text-center text-terminal-highlight mb-4"
            style={{
              textShadow: "0 0 8px #00FF00, 0 0 2px #00FF00",
              userSelect: 'none'
            }}
          >{TERMINAL_ASCII}</pre>
          
          <header className="mb-5 text-center">
            <h1 className="text-2xl font-bold text-terminal-highlight mb-2 drop-shadow-[0_0_6px_#00ff00]">
              Solana Watch Terminal
            </h1>
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
