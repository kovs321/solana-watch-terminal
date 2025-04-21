
import React, { useState, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import WalletPnlDialog from '@/components/WalletPnlDialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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

const mockPnlData = [
  {
    wallet_address: "2aMFh6mjmz1gJRVU3XA8LGfYZaQnwmLEUTRZRM3bf9AU",
    name: "SimuWallet1",
    realized: 450.75,
    unrealized: 235.25,
    total: 686.0,
    winPercentage: 78.5,
    lossPercentage: 21.5,
    totalInvested: 1200.0
  },
  {
    wallet_address: "5VafcEP3xLBMUHWQxmVsLQDW93WRKKTWRBcVpVFWFjnJ",
    name: "SimuWallet2",
    realized: -120.33,
    unrealized: 350.45,
    total: 230.12,
    winPercentage: 62.3,
    lossPercentage: 37.7,
    totalInvested: 900.0
  },
  {
    wallet_address: "8RMpV7kaFJpEL5oCq8oiuCCKBjiXUWuRfFQxsGsYwcSL",
    name: "SimuWallet3",
    realized: 890.25,
    unrealized: -230.50,
    total: 659.75,
    winPercentage: 81.2,
    lossPercentage: 18.8,
    totalInvested: 1500.0
  },
  {
    wallet_address: "4LbQXghE3CcdoBJw5CoSEq2HFmQxGvKmMsULPgeCGQNt",
    name: "SimuWallet4",
    realized: -250.10,
    unrealized: -150.25,
    total: -400.35,
    winPercentage: 35.7,
    lossPercentage: 64.3,
    totalInvested: 800.0
  },
  {
    wallet_address: "7QAp8xzXRQPPY59Z3T3DEbCnKoSeTqR9BQi8YJF6Vzoh",
    name: "SimuWallet5",
    realized: 1200.50,
    unrealized: 450.33,
    total: 1650.83,
    winPercentage: 92.1,
    lossPercentage: 7.9,
    totalInvested: 2000.0
  }
];

const LeaderboardPage: React.FC = () => {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [walletPnLs, setWalletPnLs] = useState<WalletPnL[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useFallbackData, setUseFallbackData] = useState(false);
  const [sortBy, setSortBy] = useState<'total' | 'winPercentage'>('total');
  const [selectedWallet, setSelectedWallet] = useState<TrackedWallet | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pnlData, setPnlData] = useState<any>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [pnlError, setPnlError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch the list of tracked wallets
  useEffect(() => {
    const fetchTrackedWallets = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
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
        
        // If we have wallets, fetch PnL data for each
        if (realWallets.length > 0) {
          await fetchAllWalletsPnL(realWallets);
        } else {
          setIsLoading(false);
          setLoadError("No wallets found to track");
        }
      } catch (error) {
        console.error('Error fetching tracked wallets:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch tracked wallets',
          variant: 'destructive'
        });
        setIsLoading(false);
        setLoadError("Failed to load wallet data");
      }
    };

    // Set a timeout to prevent endless loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setLoadError("Loading timed out. API may be unavailable.");
        toast({
          title: 'Loading Timeout',
          description: 'Using simulated data due to API timeout',
          variant: 'destructive'
        });
        setUseFallbackData(true);
        setWalletPnLs(mockPnlData);
      }
    }, 10000); // 10 seconds timeout

    fetchTrackedWallets();

    return () => clearTimeout(timeoutId);
  }, []);

  // Fetch PnL data for all wallets
  const fetchAllWalletsPnL = async (walletList: TrackedWallet[]) => {
    try {
      const pnlPromises = walletList.map(wallet => fetchWalletPnL(wallet));
      const results = await Promise.allSettled(pnlPromises);
      
      const validPnLs: WalletPnL[] = [];
      let allFailed = true;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validPnLs.push(result.value);
          allFailed = false;
        } else if (result.status === 'rejected') {
          console.error(`Failed to fetch PnL for ${walletList[index].name}:`, result.reason);
        }
      });
      
      if (allFailed && walletList.length > 0) {
        console.log("All API calls failed, using fallback data");
        setUseFallbackData(true);
        setWalletPnLs(mockPnlData);
      } else {
        setWalletPnLs(validPnLs);
      }
    } catch (error) {
      console.error('Error fetching all wallet PnLs:', error);
      setUseFallbackData(true);
      setWalletPnLs(mockPnlData);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch PnL data for a single wallet
  const fetchWalletPnL = async (wallet: TrackedWallet): Promise<WalletPnL | null> => {
    try {
      const url = `${API_URL}/${encodeURIComponent(wallet.wallet_address)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const resp = await fetch(url, {
        headers: {
          'x-api-key': API_KEY
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
      if (useFallbackData) {
        // Use mock data for the selected wallet
        const mockData = {
          tokens: {
            "So11111111111111111111111111111111111111112": {
              holding: 10.5,
              held: 15.3,
              sold: 4.8,
              realized: wallet.name.includes('2') ? -120.33 : 450.75,
              unrealized: wallet.name.includes('2') ? 350.45 : 235.25,
              total: wallet.name.includes('2') ? 230.12 : 686.0,
              total_sold: 720.0,
              total_invested: wallet.name.includes('2') ? 900.0 : 1200.0,
              average_buy_amount: 80.0,
              current_value: 950.0,
              cost_basis: 720.0
            },
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
              holding: 200.0,
              held: 500.0,
              sold: 300.0,
              realized: 150.0,
              unrealized: 75.0,
              total: 225.0,
              total_sold: 300.0,
              total_invested: 450.0,
              average_buy_amount: 1.5,
              current_value: 200.0,
              cost_basis: 125.0
            }
          },
          summary: {
            realized: wallet.name.includes('2') ? -120.33 : 450.75,
            unrealized: wallet.name.includes('2') ? 350.45 : 235.25,
            total: wallet.name.includes('2') ? 230.12 : 686.0,
            totalInvested: wallet.name.includes('2') ? 900.0 : 1200.0,
            averageBuyAmount: 80.0,
            totalWins: 12,
            totalLosses: 3,
            winPercentage: wallet.name.includes('2') ? 62.3 : 78.5,
            lossPercentage: wallet.name.includes('2') ? 37.7 : 21.5
          }
        };
        
        setPnlData(mockData);
        setTimeout(() => {
          setPnlLoading(false);
        }, 500);
        return;
      }
      
      const url = `${API_URL}/${encodeURIComponent(wallet.wallet_address)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const resp = await fetch(url, {
        headers: {
          'x-api-key': API_KEY
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!resp.ok) {
        throw new Error(`Failed to fetch PnL: ${resp.statusText}`);
      }
      
      const respData = await resp.json();
      setPnlData(respData);
    } catch (err: any) {
      console.error(err);
      setPnlError(err.message || 'Failed to fetch wallet PnL');
      
      // Use fallback data for individual wallet
      if (err.name === 'AbortError' || err.message.includes('Failed to fetch')) {
        const matchedMock = mockPnlData.find(mock => 
          mock.name.toLowerCase().includes(wallet.name.toLowerCase().substring(0, 3))
        ) || mockPnlData[0];
        
        setPnlData({
          tokens: {
            "So11111111111111111111111111111111111111112": {
              holding: 10.5,
              held: 15.3,
              sold: 4.8,
              realized: matchedMock.realized,
              unrealized: matchedMock.unrealized,
              total: matchedMock.total,
              total_sold: 720.0,
              total_invested: matchedMock.totalInvested,
              average_buy_amount: 80.0,
              current_value: 950.0,
              cost_basis: 720.0
            }
          },
          summary: {
            realized: matchedMock.realized,
            unrealized: matchedMock.unrealized,
            total: matchedMock.total,
            totalInvested: matchedMock.totalInvested,
            averageBuyAmount: 80.0,
            totalWins: 12,
            totalLosses: 3,
            winPercentage: matchedMock.winPercentage,
            lossPercentage: matchedMock.lossPercentage
          }
        });
        
        setPnlError(null);
        toast({
          title: 'Using Simulated Data',
          description: 'API unavailable, showing example data',
        });
      }
    } finally {
      setPnlLoading(false);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    setUseFallbackData(false);
    setWalletPnLs([]);
    const fetchTrackedWallets = async () => {
      try {
        const { data, error } = await supabase
          .from('wallet_tracking')
          .select('*');

        if (error) throw error;

        const realWallets = (data || []).filter(
          wallet => !FAKE_WALLET_NAMES.includes(wallet.name)
        );
        
        setWallets(realWallets);
        await fetchAllWalletsPnL(realWallets);
      } catch (error) {
        console.error('Error fetching tracked wallets:', error);
        setIsLoading(false);
        setLoadError("Failed to reload wallet data");
        setUseFallbackData(true);
        setWalletPnLs(mockPnlData);
      }
    };
    
    fetchTrackedWallets();
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-terminal-highlight">Wallet Leaderboard</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/')}
            className="bg-terminal-background border-terminal-muted hover:bg-gray-800 text-highlight-blue"
          >
            Back to Terminal
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRetry}
            disabled={isLoading}
            className="flex items-center gap-1 bg-terminal-background border-terminal-muted hover:bg-gray-800 text-highlight-blue"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Loading..." : "Reload Data"}
          </Button>
        </div>
      </div>
      
      {useFallbackData && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-md p-2 mb-4 text-yellow-500 text-sm">
          Note: Using simulated data because the API is unavailable. This data is for demonstration purposes only.
        </div>
      )}
      
      {loadError && !useFallbackData && (
        <div className="bg-red-900/30 border border-red-700 rounded-md p-4 mb-4 text-red-400">
          <p className="text-sm">{loadError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry} 
            className="mt-2 bg-terminal-background border-terminal-muted hover:bg-gray-800 text-highlight-blue"
          >
            <RefreshCw size={14} className="mr-1" /> Try Again
          </Button>
        </div>
      )}
      
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
          
          {isLoading ? (
            <div className="space-y-2 mt-6">
              <Skeleton className="h-12 w-full bg-gray-800" />
              <Skeleton className="h-12 w-full bg-gray-800" />
              <Skeleton className="h-12 w-full bg-gray-800" />
              <Skeleton className="h-12 w-full bg-gray-800" />
            </div>
          ) : (
            <>
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
            </>
          )}
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
