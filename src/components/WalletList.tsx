
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react'; // Import the icon for delete functionality

interface TrackedWallet {
  wallet_address: string;
  name: string;
}

const WalletList: React.FC = () => {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      <h2 className="text-terminal-highlight font-mono text-sm mb-3 border-b border-gray-800 pb-2">
        Tracked Wallets ({wallets.length})
      </h2>
      
      {wallets.length === 0 ? (
        <div className="text-terminal-muted italic text-sm">
          No wallets being tracked. Add a wallet to get started.
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {wallets.map((wallet, index) => (
            <div 
              key={index} 
              className="text-sm mb-2 py-1 px-2 rounded hover:bg-gray-800 flex justify-between items-center"
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
