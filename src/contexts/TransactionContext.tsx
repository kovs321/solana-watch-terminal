import { FC, ReactNode, createContext, useCallback, useContext, useState } from 'react';
import { useWalletContext } from './WalletContext';
import { getWalletTrades, simulateTrade } from '@/services/SolanaTrackerService';
import { toast } from '@/components/ui/use-toast';
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection';
import { useTradeProcessor } from '@/hooks/useTradeProcessor';
import { SolanaTransaction, TransactionContextType } from '@/types/transactions';
import { TradeInfo } from '@/services/SolanaTrackerService';

const TransactionContext = createContext<TransactionContextType | null>(null);

export const useTransactionContext = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: FC<TransactionProviderProps> = ({ children }) => {
  const { wallets } = useWalletContext();
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const { wsService, isConnected, wsStatus } = useWebSocketConnection();
  const { convertTradeToTransaction } = useTradeProcessor();
  
  const handleNewTransaction = useCallback((trade: TradeInfo) => {
    if (!trade || !trade.tx) {
      console.warn("Invalid trade data received:", trade);
      return;
    }
    
    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === trade.wallet?.toLowerCase());
      const transaction = convertTradeToTransaction(trade, wallet?.name);
      
      setTransactions(prev => {
        const exists = prev.some(tx => tx.id === transaction.id);
        if (exists) {
          console.log(`Transaction ${transaction.id} already exists, skipping`);
          return prev;
        }
        
        return [transaction, ...prev].slice(0, 100);
      });
    } catch (error) {
      console.error("Error processing transaction:", error);
    }
  }, [wallets, convertTradeToTransaction]);
  
  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);
  
  const generateTestTransaction = useCallback(() => {
    if (wallets.length === 0) {
      toast({
        title: "No wallets to test",
        description: "Add at least one wallet to generate test transactions",
        variant: "destructive"
      });
      return;
    }
    
    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
    const testTrade = simulateTrade(randomWallet.address, randomWallet.name);
    
    handleNewTransaction(testTrade);
    
    toast({
      title: "Test transaction generated",
      description: `Added test ${testTrade.type.toUpperCase()} transaction for ${randomWallet.name}`,
    });
  }, [wallets, handleNewTransaction]);
  
  const subscribeToTestWallet = useCallback(async (address: string) => {
    console.log(`Setting up test wallet listener for address ${address}`);
    
    if (!wsService || !isConnected) {
      throw new Error("WebSocket not connected");
    }
    
    const roomName = `wallet:${address}`;
    
    // First, unsubscribe from any existing test wallet
    const existingTestRooms = Array.from(wsService.subscribedRooms).filter(
      room => room.startsWith('wallet:') && !wallets.some(w => room === `wallet:${w.address}`)
    );
    
    existingTestRooms.forEach(room => {
      console.log(`Leaving existing test room: ${room}`);
      wsService.leaveRoom(room);
    });
    
    try {
      // Fetch historical trades for the test wallet
      console.log(`Fetching historical trades for test wallet ${address}`);
      const historicalData = await getWalletTrades(address);
      
      if (historicalData?.trades?.length) {
        console.log(`Received ${historicalData.trades.length} historical trades for test wallet`);
        
        const historicalTransactions = historicalData.trades.map(trade => {
          // Create a properly formatted TradeInfo object from historical data
          const tradeInfo: TradeInfo = {
            tx: trade.tx,
            wallet: trade.wallet,
            type: trade.from.token.symbol === 'SOL' ? 'sell' : 'buy',
            token: {
              from: {
                ...trade.from.token,
                amount: trade.from.amount
              },
              to: {
                ...trade.to.token,
                amount: trade.to.amount
              }
            },
            // Add the missing required properties
            amount: trade.to.amount,
            priceUsd: trade.price.usd,
            solVolume: parseFloat(trade.volume.sol.toString()),
            volume: trade.volume.usd,
            time: trade.time,
            program: trade.program
          };
          
          return convertTradeToTransaction(tradeInfo, "Test Wallet");
        });

        setTransactions(prev => {
          const merged = [...prev, ...historicalTransactions];
          const uniqueTransactions = Array.from(
            new Map(merged.map(tx => [tx.id, tx])).values()
          ).sort((a, b) => b.timestamp - a.timestamp);
          return uniqueTransactions.slice(0, 100);
        });
      } else {
        console.log(`No historical trades found for test wallet ${address}`);
      }
    } catch (error) {
      console.error(`Error fetching historical trades for test wallet:`, error);
      toast({
        title: `Error Fetching Trades`,
        description: `Could not load historical trades for test wallet`,
        variant: "destructive"
      });
    }
    
    // Subscribe to live trades
    wsService.joinRoom(roomName);
    console.log(`Subscribed to test wallet room: ${roomName}`);
    
    // Add listener for this specific room
    wsService.on(roomName, (data) => {
      console.log(`Live trade received for test wallet:`, data);
      
      // Set a temporary wallet name
      if (data) {
        data.walletName = "Test Wallet";
      }
      
      handleNewTransaction(data);
    });
    
    toast({
      title: "Test Wallet Monitoring",
      description: `Successfully subscribed to ${address.slice(0, 4)}...${address.slice(-4)}`,
    });
  }, [wsService, isConnected, wallets, handleNewTransaction, convertTradeToTransaction]);
  
  const value = {
    transactions,
    clearTransactions,
    isConnected,
    wsStatus,
    generateTestTransaction,
    subscribeToTestWallet,
  };
  
  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};
