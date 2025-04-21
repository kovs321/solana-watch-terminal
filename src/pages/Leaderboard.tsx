
import React, { useState, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import WalletPnlDialog from '@/components/WalletPnlDialog';

interface TrackedWallet {
  wallet_address: string;
  name: string;
}

interface WalletPnL {
  wallet_address: string;
  name: string;
  realized: number;
  unrealized: number;
  total: number;
  winPercentage: number;
  lossPercentage: number;
  totalInvested: number;
}

// API base URL and key
const API_URL = 'https://data.solanatracker.io/pnl';
const API_KEY = '7e869836-9708-43e2-bb2e-1c11959d306a';

const FAKE_WALLET_NAMES = ["Bob", "Charlie", "Alice"];

const LeaderboardPage: React.FC = () => {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [walletPnLs, setWalletPnLs] = useState<WalletPnL[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'total' | 'winPercentage'>('total');
  const [selectedWallet, setSelectedWallet] = useState<TrackedWallet | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pnlData, setPnlData] = useState<any>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [pnlError, setPnlError] = useState<string | null>(null);
  
  // Fetch the list of tracked wallets
  useEffect(() => {
    const fetchTrackedWallets = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching tracked wallets for leaderboard...');
        
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
        
        setWallets(realWallets);
        
        // Once we have the wallets, fetch PnL data for each
        await fetchAllWalletsPnL(realWallets);
      } catch (error) {
        console.error('Error fetching tracked wallets:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch tracked wallets',
          variant: 'destructive'
        });
        setIsLoading(false);
      }
    };

    fetchTrackedWallets();
  }, []);

  // Fetch PnL data for all wallets
  const fetchAllWalletsPnL = async (walletList: TrackedWallet[]) => {
    try {
      const pnlPromises = walletList.map(wallet => fetchWalletPnL(wallet));
      const results = await Promise.allSettled(pnlPromises);
      
      const validPnLs: WalletPnL[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validPnLs.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`Failed to fetch PnL for ${walletList[index].name}:`, result.reason);
        }
      });
      
      setWalletPnLs(validPnLs);
    } catch (error) {
      console.error('Error fetching all wallet PnLs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch PnL data for a single wallet
  const fetchWalletPnL = async (wallet: TrackedWallet): Promise<WalletPnL | null> => {
    try {
      const url = `${API_URL}/${encodeURIComponent(wallet.wallet_address)}`;
      const resp = await fetch(url, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!resp.ok) {
        throw new Error(`Failed to fetch PnL for ${wallet.name}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      
      if (!data || !data.summary) {
        return null;
      }
      
      return {
        wallet_address: wallet.wallet_address,
        name: wallet.name,
        realized: data.summary.realized || 0,
        unrealized: data.summary.unrealized || 0,
        total: data.summary.total || 0,
        winPercentage: data.summary.winPercentage || 0,
        lossPercentage: data.summary.lossPercentage || 0,
        totalInvested: data.summary.totalInvested || 0
      };
    } catch (error) {
      console.error(`Error fetching PnL for ${wallet.name}:`, error);
      return null;
    }
  };

  // Handle wallet click to view detailed PnL
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

  // Sort wallets based on selected sort criterion
  const sortedWallets = [...walletPnLs].sort((a, b) => {
    if (sortBy === 'total') {
      return b.total - a.total;
    } else {
      return b.winPercentage - a.winPercentage;
    }
  });

  // Format value with color-coding based on whether it's positive or negative
  const formatPnlValue = (value: number | undefined) => {
    if (value === undefined) return <span className="font-mono">0.00</span>;
    
    const formattedValue = value.toFixed(2);
    const isPositive = value > 0;
    
    return (
      <span 
        className={`font-mono ${isPositive ? 'text-green-400' : value < 0 ? 'text-red-400' : ''}`}
      >
        {formattedValue}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl mb-6 text-terminal-highlight">Wallet Leaderboard</h1>
        <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 p-4">
          <div className="space-y-2 mt-2">
            <Skeleton className="h-12 w-full bg-gray-800" />
            <Skeleton className="h-12 w-full bg-gray-800" />
            <Skeleton className="h-12 w-full bg-gray-800" />
            <Skeleton className="h-12 w-full bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl mb-6 text-terminal-highlight">Wallet Leaderboard</h1>
      
      <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 p-4 mb-8">
        <Tabs defaultValue="pnl" className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-terminal-background">
            <TabsTrigger 
              value="pnl" 
              className="data-[state=active]:bg-highlight-blue/20 text-highlight-blue"
              onClick={() => setSortBy('total')}
            >
              Sort by Total PnL
            </TabsTrigger>
            <TabsTrigger 
              value="winrate" 
              className="data-[state=active]:bg-highlight-blue/20 text-highlight-blue"
              onClick={() => setSortBy('winPercentage')}
            >
              Sort by Win Rate
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pnl" className="mt-4">
            <Table>
              <TableHeader className="bg-terminal-background border-terminal-muted">
                <TableRow>
                  <TableHead className="text-terminal-highlight">Rank</TableHead>
                  <TableHead className="text-terminal-highlight">Wallet</TableHead>
                  <TableHead className="text-terminal-highlight text-right">Realized PnL</TableHead>
                  <TableHead className="text-terminal-highlight text-right">Unrealized PnL</TableHead>
                  <TableHead className="text-terminal-highlight text-right">Total PnL</TableHead>
                  <TableHead className="text-terminal-highlight text-right">Total Invested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedWallets.length > 0 ? (
                  sortedWallets.map((wallet, index) => (
                    <TableRow 
                      key={wallet.wallet_address}
                      className="border-terminal-muted hover:bg-terminal-background/50 cursor-pointer"
                      onClick={() => handleWalletClick({wallet_address: wallet.wallet_address, name: wallet.name})}
                    >
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell className="font-mono">
                        <div className="font-semibold text-highlight-blue">{wallet.name}</div>
                        <div className="text-xs text-terminal-muted truncate">
                          {wallet.wallet_address.slice(0, 6)}...{wallet.wallet_address.slice(-4)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatPnlValue(wallet.realized)}</TableCell>
                      <TableCell className="text-right">{formatPnlValue(wallet.unrealized)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          {wallet.total > 0 ? (
                            <TrendingUp size={14} className="mr-1 text-green-400" />
                          ) : wallet.total < 0 ? (
                            <TrendingDown size={14} className="mr-1 text-red-400" />
                          ) : null}
                          {formatPnlValue(wallet.total)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{wallet.totalInvested.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-terminal-muted py-8">
                      No PnL data available for any wallets.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="winrate" className="mt-4">
            <Table>
              <TableHeader className="bg-terminal-background border-terminal-muted">
                <TableRow>
                  <TableHead className="text-terminal-highlight">Rank</TableHead>
                  <TableHead className="text-terminal-highlight">Wallet</TableHead>
                  <TableHead className="text-terminal-highlight text-right">Win Rate</TableHead>
                  <TableHead className="text-terminal-highlight text-right">Loss Rate</TableHead>
                  <TableHead className="text-terminal-highlight text-right">Total PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedWallets.length > 0 ? (
                  sortedWallets.map((wallet, index) => (
                    <TableRow 
                      key={wallet.wallet_address}
                      className="border-terminal-muted hover:bg-terminal-background/50 cursor-pointer"
                      onClick={() => handleWalletClick({wallet_address: wallet.wallet_address, name: wallet.name})}
                    >
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell className="font-mono">
                        <div className="font-semibold text-highlight-blue">{wallet.name}</div>
                        <div className="text-xs text-terminal-muted truncate">
                          {wallet.wallet_address.slice(0, 6)}...{wallet.wallet_address.slice(-4)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-green-400 font-mono">{wallet.winPercentage.toFixed(2)}%</TableCell>
                      <TableCell className="text-right text-red-400 font-mono">{wallet.lossPercentage.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{formatPnlValue(wallet.total)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-terminal-muted py-8">
                      No win rate data available for any wallets.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
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
    </div>
  );
};

export default LeaderboardPage;
