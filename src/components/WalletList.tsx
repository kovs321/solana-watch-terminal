
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactionContext } from '@/contexts/TransactionContext';

interface TrackedWallet {
  wallet_address: string;
  name: string;
}

const FAKE_WALLET_NAMES = ["Bob", "Charlie", "Alice"];

const WalletList: React.FC = () => {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { wsStatus } = useTransactionContext();

  // Get monitored rooms from the wsStatus
  const monitoredRooms = wsStatus?.subscribedRooms || [];

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

      // Filter out fake wallets
      const realWallets = (data || []).filter(
        wallet => !FAKE_WALLET_NAMES.includes(wallet.name)
      );
      console.log('Wallets fetched:', realWallets);
      setWallets(realWallets);
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

  useEffect(() => {
    fetchTrackedWallets();
  }, []);

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
              className={`text-sm mb-2 py-1 px-2 rounded flex justify-between items-center ${monitoredRooms.includes(`wallet:${wallet.wallet_address}`) ? 'border-l-2 border-terminal-success' : ''}`}
            >
              <div>
                <div className="font-semibold text-terminal-highlight">{wallet.name}</div>
                <div className="text-xs text-terminal-muted font-mono truncate max-w-[200px]">
                  {wallet.wallet_address}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WalletList;
