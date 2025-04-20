
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Radio } from 'lucide-react'; // Added Radio icon for monitoring
import { useTransactionContext } from '@/contexts/TransactionContext';
import { Button } from '@/components/ui/button';

interface TrackedWallet {
  wallet_address: string;
  name: string;
}

const WalletList: React.FC = () => {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { startMonitoringAllWallets, monitoringActive, wsStatus } = useTransactionContext();

  const fetchTrackedWallets = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching tracked wallets...');
      
      const { data, error } = await supabase
        .from('wallet_tracking')
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Wallets fetched:', data);
      setWallets(data || []);
    } catch (error) {
      console.error('Error fetching tracked wallets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tracked wallets',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWallet = async (walletAddress: string, walletName: string) => {
    try {
      setIsDeleting(walletAddress);
      
      const { error } = await supabase
        .from('wallet_tracking')
        .delete()
        .eq('wallet_address', walletAddress);
        
      if (error) throw error;
      
      // Update local state
      setWallets(wallets.filter(wallet => wallet.wallet_address !== walletAddress));
      
      toast({
        title: 'Wallet removed',
        description: `${walletName} has been removed from tracking`,
      });
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete wallet',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    fetchTrackedWallets();
  }, []);

  const monitoredRooms = wsStatus?.subscribedRooms || [];
  const activeWalletRooms = monitoredRooms.filter(room => room.startsWith('wallet:'));
  const allWalletsMonitored = wallets.length > 0 && wallets.every(wallet => 
    monitoredRooms.includes(`wallet:${wallet.wallet_address}`)
  );

  const handleStartMonitoring = () => {
    if (wallets.length === 0) {
      toast({
        title: "No wallets to monitor",
        description: "Add at least one wallet to start monitoring",
        variant: "destructive"
      });
      return;
    }
    
    startMonitoringAllWallets();
    
    toast({
      title: "Wallet Monitoring Started",
      description: `Now monitoring ${wallets.length} wallets for transactions`,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 p-4 my-4">
        <div className="text-terminal-muted italic text-sm">Loading wallets...</div>
        <div className="space-y-2 mt-2">
          <Skeleton className="h-12 w-full bg-gray-800" />
          <Skeleton className="h-12 w-full bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 p-4 my-4">
      <div className="flex justify-between items-center mb-3 border-b border-gray-800 pb-2">
        <h2 className="text-terminal-highlight font-mono text-sm">
          Tracked Wallets ({wallets.length})
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          className={`bg-terminal-background border-terminal-muted hover:bg-gray-800 text-xs ${monitoringActive ? 'border-terminal-success text-terminal-success' : ''}`}
          onClick={handleStartMonitoring}
          disabled={monitoringActive || wallets.length === 0}
        >
          <Radio size={14} className={`mr-1 ${monitoringActive ? 'text-terminal-success' : ''}`} />
          {monitoringActive ? `Monitoring ${activeWalletRooms.length} Wallets` : 'Start Monitoring'}
        </Button>
      </div>
      
      {wallets.length === 0 ? (
        <div className="text-terminal-muted italic text-sm">
          No wallets being tracked. Add a wallet to get started.
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {wallets.map((wallet, index) => (
            <div 
              key={index} 
              className={`text-sm mb-2 py-1 px-2 rounded hover:bg-gray-800 flex justify-between items-center ${monitoredRooms.includes(`wallet:${wallet.wallet_address}`) ? 'border-l-2 border-terminal-success' : ''}`}
            >
              <div>
                <div className="font-semibold text-terminal-highlight">{wallet.name}</div>
                <div className="text-xs text-terminal-muted font-mono truncate max-w-[200px]">
                  {wallet.wallet_address}
                </div>
              </div>
              <button
                className="text-terminal-muted hover:text-terminal-error transition-colors p-1"
                onClick={() => handleDeleteWallet(wallet.wallet_address, wallet.name)}
                disabled={isDeleting === wallet.wallet_address}
                title="Remove wallet"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {monitoringActive && (
        <div className="mt-2 text-xs text-terminal-muted border-t border-gray-800 pt-2">
          <div className="flex items-center">
            <Radio size={10} className="text-terminal-success mr-1" />
            <span>
              {allWalletsMonitored 
                ? 'All wallets are being monitored' 
                : `Monitoring ${activeWalletRooms.length} of ${wallets.length} wallets`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletList;
