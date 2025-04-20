
import React from 'react';
import Terminal from '@/components/Terminal';
import ConnectWallet from '@/components/ConnectWallet';
import AddWalletForm from '@/components/AddWalletForm';
import WalletList from '@/components/WalletList';
import WalletTestPanel from '@/components/WalletTestPanel';
import { useInitialWallets } from '@/hooks/useInitialWallets';
import { TransactionProvider, useTransactionContext } from '@/contexts/TransactionContext';
import { Button } from '@/components/ui/button';
import { Radio } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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

function MonitoringButton() {
  const { startMonitoringAllWallets, monitoringActive, wsStatus } = useTransactionContext();
  const monitoredRooms = wsStatus?.subscribedRooms || [];
  const activeWalletRooms = monitoredRooms.filter(room => room.startsWith('wallet:'));

  const handleStartMonitoring = () => {
    startMonitoringAllWallets();

    toast({
      title: 'Wallet Monitoring Started',
      description: `Now monitoring wallets for transactions`,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`bg-terminal-background border-terminal-muted hover:bg-gray-800 text-xs ml-4 font-mono flex items-center ${
        monitoringActive ? 'border-terminal-success text-terminal-success' : ''
      }`}
      onClick={handleStartMonitoring}
      disabled={monitoringActive}
      title={monitoringActive ? `Monitoring ${activeWalletRooms.length} Wallets` : 'Start Monitoring All Wallets'}
    >
      <Radio size={14} className={`mr-1 ${monitoringActive ? 'text-terminal-success' : ''}`} />
      {monitoringActive
        ? `Monitoring ${activeWalletRooms.length} Wallets`
        : 'Start Monitoring'}
    </Button>
  );
}

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
          
          {/* Wallet controls row */}
          <div className="flex justify-center gap-2 mb-4 items-center">
            <ConnectWallet />
            <MonitoringButton />
          </div>

          <header className="mb-5 text-center">
            {/* Removed the Solana Watch Terminal line */}
            <p className="text-terminal-muted">$ tracking_solana_transactions --live</p>
          </header>
          
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
