
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactionContext } from '@/contexts/TransactionContext';
import WalletPnlDialog from './WalletPnlDialog';

interface TrackedWallet {
  wallet_address: string;
  name: string;
}

const FAKE_WALLET_NAMES = ["Bob", "Charlie", "Alice"];

// API base URL and key
const API_URL = 'https://data.solanatracker.io/pnl';
const API_KEY = '7e869836-9708-43e2-bb2e-1c11959d306a';

const WalletList: React.FC = () => {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<TrackedWallet | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [pnlData, setPnlData] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pnlError, setPnlError] = useState<string | null>(null);
  const { wsStatus } = useTransactionContext();

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

  // Fetch wallet PnL data
  const handleWalletClick = async (wallet: TrackedWallet) => {
    setSelectedWallet(wallet);
    setDialogOpen(true);
    setPnlData(null);
    setPnlError(null);
    setPnlLoading(true);

    try {
      const url = `${API_URL}/${encodeURIComponent(wallet.wallet_address)}`;
      const resp = await fetch(url, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      if (!resp.ok) {
        throw new Error(`Failed to fetch PnL: ${resp.statusText}`);
      }
      const respData = await resp.json();
      setPnlData(respData);
    } catch (err: any) {
      console.error(err);
      setPnlError(err.message || 'Failed to fetch wallet PnL');
    } finally {
      setPnlLoading(false);
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
    <>
      <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 p-4 my-4">
        <div className="flex justify-between items-center mb-3 border-b border-gray-800 pb-2">
          <h2 className="text-highlight-blue font-mono text-sm">
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
              <button
                key={index}
                onClick={() => handleWalletClick(wallet)}
                className={`
                  text-sm mb-2 py-1 px-2 rounded flex justify-between items-center w-full text-left
                  hover:bg-highlight-blue/10 transition 
                  ${monitoredRooms.includes(`wallet:${wallet.wallet_address}`) ? 'border-l-2 border-highlight-blue' : ''}
                `}
                title="Show wallet PnL"
              >
                <div>
                  <div className="font-semibold text-highlight-blue">{wallet.name}</div>
                  <div className="text-xs text-terminal-muted font-mono truncate max-w-[200px]">
                    {wallet.wallet_address}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <WalletPnlDialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) {
            setSelectedWallet(null);
            setPnlError(null);
            setPnlData(null);
          }
        }}
        walletName={selectedWallet?.name || ""}
        walletAddress={selectedWallet?.wallet_address || ""}
        pnlData={pnlData}
        loading={pnlLoading}
        error={pnlError}
      />
    </>
  );
};

export default WalletList;

