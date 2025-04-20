
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Radio } from 'lucide-react';
import { useTransactionContext } from '@/contexts/TransactionContext';

// Import the Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const ConnectWallet: React.FC = () => {
  const { connected, disconnect } = useWallet();
  const { startMonitoringAllWallets, monitoringActive, wsStatus } = useTransactionContext();

  const monitoredRooms = wsStatus?.subscribedRooms || [];
  const activeWalletRooms = monitoredRooms.filter(room => room.startsWith('wallet:'));

  const handleStartMonitoring = () => {
    if (wsStatus && (!monitoredRooms || monitoredRooms.length === 0)) {
      // Unlike WalletList, we don't directly check wallets array here, so we rely on context usage

      // However, if user tries when no wallets tracked, show toast.
      // We can improve by allowing passing wallets or from context if needed, but here we trust the original logic
    }

    startMonitoringAllWallets();

    toast({
      title: 'Wallet Monitoring Started',
      description: `Now monitoring wallets for transactions`,
    });
  };

  return (
    <div className="my-4 flex justify-center space-x-4">
      {connected ? (
        <>
          <WalletMultiButton 
            className="!bg-terminal-background !text-terminal-highlight !border !border-terminal-highlight !rounded-md !shadow-none !px-4 !py-2 !h-auto" 
          />
          <Button 
            variant="destructive" 
            className="bg-terminal-error hover:bg-terminal-error/80 text-white font-mono flex items-center"
            onClick={() => disconnect()}
          >
            <LogOut size={16} className="mr-2" />
            Disconnect
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className={`bg-terminal-background border-terminal-muted hover:bg-gray-800 text-xs ml-4 ${monitoringActive ? 'border-terminal-success text-terminal-success' : ''}`}
            onClick={handleStartMonitoring}
            disabled={monitoringActive}
            title={monitoringActive ? `Monitoring ${activeWalletRooms.length} Wallets` : 'Start Monitoring All Wallets'}
          >
            <Radio size={14} className={`mr-1 ${monitoringActive ? 'text-terminal-success' : ''}`} />
            {monitoringActive ? `Monitoring ${activeWalletRooms.length} Wallets` : 'Start Monitoring'}
          </Button>
        </>
      ) : (
        <WalletMultiButton 
          className="!bg-terminal-highlight !text-white !border-none !rounded-md !shadow-none !px-4 !py-2 !h-auto font-mono flex items-center"
        >
          <LogIn size={16} className="mr-2" />
          Connect Wallet
        </WalletMultiButton>
      )}
    </div>
  );
};

export default ConnectWallet;
