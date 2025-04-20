
import { FC, ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useWalletContext } from './WalletContext';
import WebSocketService from '@/services/WebSocketService';
import { 
  TradeInfo, 
  WS_URL, 
  API_KEY,
  getWalletTrades,
  formatTradeDate,
  simulateTrade
} from '@/services/SolanaTrackerService';
import { toast } from '@/components/ui/use-toast';

export interface SolanaTransaction {
  id: string;
  walletAddress: string;
  walletName?: string;
  type: 'BUY' | 'SELL';
  fromToken: string;
  fromAmount: string;
  toToken: string;
  toAmount: string;
  program: string;
  usdValue: number;
  timestamp: number;
  displayTime: string;
}

interface TransactionContextType {
  transactions: SolanaTransaction[];
  clearTransactions: () => void;
  isConnected: boolean;
  wsStatus: any;
  generateTestTransaction: () => void;
}

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
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState({});
  
  const convertTradeToTransaction = useCallback((trade: TradeInfo, walletName?: string): SolanaTransaction => {
    console.log("Converting trade to transaction:", trade);
    
    // Handle null or undefined values
    const fromAmount = trade.token?.from?.amount?.toString() || '0';
    const toAmount = trade.token?.to?.amount?.toString() || '0';
    
    return {
      id: trade.tx,
      walletAddress: trade.wallet,
      walletName: walletName,
      type: trade.type?.toUpperCase() as 'BUY' | 'SELL',
      fromToken: trade.token?.from?.symbol || 'UNKNOWN',
      fromAmount: fromAmount,
      toToken: trade.token?.to?.symbol || 'UNKNOWN',
      toAmount: toAmount,
      program: trade.program || 'Unknown',
      usdValue: trade.volume || 0,
      timestamp: trade.time || Date.now(),
      displayTime: formatTradeDate(trade.time || Date.now()),
    };
  }, []);
  
  const handleNewTransaction = useCallback((trade: TradeInfo) => {
    console.log("Processing new transaction:", trade);
    
    if (!trade || !trade.tx) {
      console.warn("Invalid trade data received:", trade);
      return;
    }
    
    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === trade.wallet?.toLowerCase());
      const transaction = convertTradeToTransaction(trade, wallet?.name);
      console.log("Converted transaction:", transaction);
      
      setTransactions(prev => {
        const exists = prev.some(tx => tx.id === transaction.id);
        if (exists) {
          console.log(`Transaction ${transaction.id} already exists, skipping`);
          return prev;
        }
        
        console.log(`Adding new transaction ${transaction.id} to list`);
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
    
    console.log("Generated test transaction:", testTrade);
    handleNewTransaction(testTrade);
    
    toast({
      title: "Test transaction generated",
      description: `Added test ${testTrade.type.toUpperCase()} transaction for ${randomWallet.name}`,
    });
  }, [wallets, handleNewTransaction]);
  
  useEffect(() => {
    console.log("Initializing WebSocket service...");
    
    if (!WS_URL || !API_KEY) {
      console.error("Missing WebSocket URL or API Key");
      toast({
        title: "WebSocket Configuration Error",
        description: "Missing WebSocket URL or API Key",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const service = new WebSocketService(WS_URL, API_KEY);
      setWsService(service);
      console.log("WebSocket service initialized");
    } catch (error) {
      console.error("Failed to initialize WebSocket service:", error);
      toast({
        title: "WebSocket Error",
        description: "Failed to initialize WebSocket connection",
        variant: "destructive"
      });
    }
    
    return () => {
      console.log("Cleaning up WebSocket service...");
      if (wsService) {
        wsService.disconnect();
      }
    };
  }, []);
  
  useEffect(() => {
    if (!wsService) return;
    
    const statusInterval = setInterval(() => {
      const status = wsService.getConnectionStatus();
      setIsConnected(status.connected);
      setWsStatus(status);
    }, 1000);
    
    return () => clearInterval(statusInterval);
  }, [wsService]);
  
  useEffect(() => {
    if (!wsService || !isConnected || wallets.length === 0) {
      console.log("Cannot setup wallet listeners - prerequisites not met");
      return;
    }

    console.log(`Setting up listeners for ${wallets.length} wallets`);
    wsService.emitter.removeAllListeners();
    
    wallets.forEach(wallet => {
      wsService.leaveRoom(`wallet:${wallet.address}`);
    });

    wsService.on('all-transactions', (data) => {
      console.log("Received transaction from all-transactions channel:", data);
      handleNewTransaction(data);
    });

    wallets.forEach(async (wallet) => {
      const roomName = `wallet:${wallet.address}`;
      console.log(`Setting up listener for wallet ${wallet.name} (${wallet.address})`);

      try {
        console.log(`Fetching historical trades for ${wallet.name}`);
        const historicalData = await getWalletTrades(wallet.address);
        
        if (historicalData?.trades?.length) {
          console.log(`Received ${historicalData.trades.length} historical trades for ${wallet.name}`);
          
          const historicalTransactions = historicalData.trades.map(trade => {
            // Create a properly formatted TradeInfo object from historical data
            const tradeInfo: TradeInfo = {
              tx: trade.tx,
              wallet: trade.wallet,
              type: trade.from.token.symbol === 'SOL' ? 'sell' : 'buy',
              token: {
                from: trade.from.token,
                to: trade.to.token
              },
              // Add the missing required properties
              amount: trade.to.amount,
              priceUsd: trade.price.usd,
              solVolume: parseFloat(trade.volume.sol.toString()),
              volume: trade.volume.usd,
              time: trade.time,
              program: trade.program
            };
            
            return convertTradeToTransaction(tradeInfo, wallet.name);
          });

          setTransactions(prev => {
            const merged = [...prev, ...historicalTransactions];
            const uniqueTransactions = Array.from(
              new Map(merged.map(tx => [tx.id, tx])).values()
            ).sort((a, b) => b.timestamp - a.timestamp);
            return uniqueTransactions.slice(0, 100);
          });
        } else {
          console.log(`No historical trades found for ${wallet.name}`);
        }
      } catch (error) {
        console.error(`Error fetching historical trades for ${wallet.name}:`, error);
        toast({
          title: `Error Fetching Trades`,
          description: `Could not load historical trades for ${wallet.name}`,
          variant: "destructive"
        });
      }

      wsService.joinRoom(roomName);
      console.debug(`[CTX] Subscribed to ${roomName}`);
      
      wsService.on(roomName, (data) => {
        console.debug(`[CTX] Live trade ${roomName}:`, data);
        handleNewTransaction(data);
      });
    });

    return () => {
      console.log("Cleaning up wallet listeners...");
      wallets.forEach(wallet => {
        wsService.leaveRoom(`wallet:${wallet.address}`);
      });
      wsService.emitter.removeAllListeners();
    };
  }, [wsService, isConnected, wallets, handleNewTransaction, convertTradeToTransaction]);
  
  const value = {
    transactions,
    clearTransactions,
    isConnected,
    wsStatus,
    generateTestTransaction,
  };
  
  return (
    <TransactionContext.Provider value={{ transactions, clearTransactions, isConnected, wsStatus, generateTestTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
};
