
import React, { useEffect } from 'react';
import Terminal from '@/components/Terminal';
import ConnectWallet from '@/components/ConnectWallet';
import AddWalletForm from '@/components/AddWalletForm';
import WalletList from '@/components/WalletList';
import { useInitialWallets } from '@/hooks/useInitialWallets';
import { TransactionProvider, useTransactionContext } from '@/contexts/TransactionContext';
import { Button } from '@/components/ui/button';
import { Radio, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useWalletContext } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

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
  const {
    startMonitoringAllWallets,
    monitoringActive,
    wsStatus
  } = useTransactionContext();
  const monitoredRooms = wsStatus?.subscribedRooms || [];
  const activeWalletRooms = monitoredRooms.filter(room => room.startsWith('wallet:'));
  const handleStartMonitoring = () => {
    startMonitoringAllWallets();
    toast({
      title: 'Wallet Monitoring Started',
      description: `Now monitoring wallets for transactions`
    });
  };
  return <Button variant="outline" size="sm" className={`bg-terminal-background border-terminal-muted hover:bg-gray-800 text-xs ml-4 font-mono flex items-center ${monitoringActive ? 'border-terminal-success text-terminal-success' : ''}`} onClick={handleStartMonitoring} disabled={monitoringActive} title={monitoringActive ? `Monitoring ${activeWalletRooms.length} Wallets` : 'Start Monitoring All Wallets'}>
      <Radio size={14} className={`mr-1 ${monitoringActive ? 'text-terminal-success' : ''}`} />
      {monitoringActive ? `Monitoring ${activeWalletRooms.length} Wallets` : 'Start Monitoring'}
    </Button>;
}

function ExportWalletsCSVButton() {
  const [trackedWallets, setTrackedWallets] = useState<{ wallet_address: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTrackedWallets = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('wallet_tracking')
          .select('*');

        if (error) throw error;
        
        const FAKE_WALLET_NAMES = ["Bob", "Charlie", "Alice"];
        const realWallets = (data || []).filter(
          wallet => !FAKE_WALLET_NAMES.includes(wallet.name)
        );
        
        setTrackedWallets(realWallets);
      } catch (error) {
        console.error('Error fetching tracked wallets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrackedWallets();
  }, []);

  const walletsToCSV = () => {
    const header = ['Name', 'Wallet Address'];
    const rows = trackedWallets.map(w => [
      `"${(w.name ?? '').replace(/"/g, '""')}"`,
      `"${(w.wallet_address ?? '').replace(/"/g, '""')}"`
    ]);
    const csv = [
      header.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');
    return csv;
  };

  const handleExport = () => {
    const csv = walletsToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'solana-tracked-wallets.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);

    toast({
      title: "Wallets exported",
      description: `Exported ${trackedWallets.length} tracked wallets to CSV file.`,
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="ml-2 flex items-center gap-1 font-mono bg-terminal-background border-terminal-muted hover:bg-gray-800 text-xs"
      onClick={handleExport}
      title="Export all tracked wallets as CSV file"
      disabled={trackedWallets.length === 0 || isLoading}
    >
      <FileSpreadsheet size={14} />
      {isLoading ? "Loading..." : "Export Wallets"}
    </Button>
  );
}

function AutoMonitorTrigger() {
  const { startMonitoringAllWallets, monitoringActive } = useTransactionContext();
  useEffect(() => {
    if (!monitoringActive) {
      startMonitoringAllWallets();
    }
    // No dependencies other than the 2, don't call on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitoringActive, startMonitoringAllWallets]);
  return null;
}

const Index = () => {
  useInitialWallets();
  return <TransactionProvider>
      <div className="min-h-screen bg-terminal-background text-terminal-text font-mono relative">
        <div className="container mx-auto px-4 py-8 z-10 relative">
          <pre aria-label="solana terminal ascii" className="text-[10px] sm:text-xs md:text-sm leading-tight font-mono text-center text-terminal-highlight mb-1" style={{
          userSelect: 'none'
        }}>{TERMINAL_ASCII}</pre>
          <div className="flex justify-center mb-10">
            <span style={{
              userSelect: 'none'
            }} className="text-center text-2xl sm:text-4xl font-bold text-terminal-highlight font-mono md:text-2xl">
            </span>
          </div>
          
          <div className="flex justify-center gap-2 mb-4 items-center">
            <ConnectWallet />
            <MonitoringButton />
            <ExportWalletsCSVButton />
          </div>
          <AutoMonitorTrigger />

          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="flex justify-center">
              <AddWalletForm />
            </div>
            <Terminal />
            <WalletList />
          </div>
          
          <footer className="mt-8 text-center text-xs text-terminal-muted">
            <p>Solana Watch Terminal &copy; {new Date().getFullYear()}</p>
            <p className="mt-1">
              $ system_status --monitoring
            </p>
          </footer>
        </div>
      </div>
    </TransactionProvider>;
};

export default Index;

