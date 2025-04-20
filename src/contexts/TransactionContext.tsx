
import { FC, ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  const [monitoringActive, setMonitoringActive] = useState(false);

  const currentWalletSubsRef = useRef<Set<string>>(new Set());

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

  const startMonitoringAllWallets = useCallback(() => {
    if (!wsService || !isConnected) {
      toast({
        title: "Connection Error",
        description: "WebSocket is not connected. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const subscribeToWallet = (address: string, name?: string) => {
      const roomName = `wallet:${address}`;
      wsService.joinRoom(roomName);
      console.log(`Subscribed to wallet: ${name || address.slice(0, 4) + '...' + address.slice(-4)}`);
      
      const handler = (data: TradeInfo) => {
        if (data) {
          data.walletName = name || undefined;
        }
        handleNewTransaction(data);
      };
      
      wsService.on(roomName, handler);
      currentWalletSubsRef.current.add(address);

      return () => wsService.off(roomName, handler);
    };

    // Unsubscribe from any wallet that's no longer in the list
    const currentWalletsSet = new Set(wallets.map(w => w.address));
    currentWalletSubsRef.current.forEach(address => {
      if (!currentWalletsSet.has(address)) {
        const roomName = `wallet:${address}`;
        wsService.leaveRoom(roomName);
        currentWalletSubsRef.current.delete(address);
        console.log(`Unsubscribed from wallet: ${address}`);
      }
    });

    // Subscribe to all wallets
    let count = 0;
    wallets.forEach(wallet => {
      if (!currentWalletSubsRef.current.has(wallet.address)) {
        subscribeToWallet(wallet.address, wallet.name);
        count++;
      }
    });

    setMonitoringActive(true);
    
    toast({
      title: "Wallet Monitoring Started",
      description: `Now monitoring ${count} new wallets for transactions`,
    });
  }, [wallets, wsService, isConnected, handleNewTransaction]);

  // Auto-subscribe when component mounts or connection changes
  useEffect(() => {
    if (isConnected && wsService && wallets.length > 0 && !monitoringActive) {
      console.log("Auto-starting monitoring for all wallets...");
      startMonitoringAllWallets();
    }
    
    return () => {
      if (wsService) {
        currentWalletSubsRef.current.forEach(address => {
          const roomName = `wallet:${address}`;
          wsService.leaveRoom(roomName);
        });
        currentWalletSubsRef.current.clear();
      }
    };
  }, [isConnected, wsService, wallets.length, monitoringActive, startMonitoringAllWallets]);

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
    if (!wsService || !isConnected) {
      throw new Error("WebSocket not connected");
    }

    const roomName = `wallet:${address}`;

    const existingTestRooms = Array.from(wsService.subscribedRooms).filter(
      room => room.startsWith('wallet:') && !wallets.some(w => room === `wallet:${w.address}`)
    );

    existingTestRooms.forEach(room => {
      console.log(`Leaving existing test room: ${room}`);
      wsService.leaveRoom(room);
    });

    try {
      const historicalData = await getWalletTrades(address);

      if (historicalData?.trades?.length) {
        console.log(`Received ${historicalData.trades.length} historical trades for test wallet`);

        const historicalTransactions = historicalData.trades.map(trade => {
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

    wsService.joinRoom(roomName);
    console.log(`Subscribed to test wallet room: ${roomName}`);

    wsService.on(roomName, (data) => {
      console.log(`Live trade received for test wallet:`, data);

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
    startMonitoringAllWallets,
    monitoringActive
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

export default TransactionContext;
