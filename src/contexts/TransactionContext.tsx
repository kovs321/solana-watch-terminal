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
  
  // Modify the WebSocket setup effect
  useEffect(() => {
    if (!wsService || !isConnected) {
      console.log("WebSocket not ready or not connected");
      return;
    }
    
    if (wallets.length === 0) {
      console.log("No wallets to track");
      return;
    }
    
    console.log(`Setting up listeners for ${wallets.length} wallets`);
    
    // Clear previous listeners
    wsService.emitter.removeAllListeners();
    
    // Listen for all transactions across wallets
    wsService.on('all-transactions', (data) => {
      console.log("Received transaction from all-transactions channel:", data);
      handleNewTransaction(data);
    });
    
    // Listen for room subscription confirmations
    wsService.on('room-subscribed', (room) => {
      console.log(`Successfully subscribed to room: ${room}`);
      
      // Optional: Fetch historical trades for the subscribed wallet
      if (room?.startsWith('wallet:')) {
        const walletAddress = room.split(':')[1];
        const wallet = wallets.find(w => w.address.toLowerCase() === walletAddress.toLowerCase());
        
        if (wallet) {
          console.log(`Fetching historical trades for wallet ${wallet.name} (${wallet.address})`);
          // Implement historical trade fetching logic here if needed
        }
      }
    });
    
    // Subscribe to each wallet's room
    wallets.forEach(wallet => {
      const roomName = `wallet:${wallet.address}`;
      console.log(`Setting up listener for wallet ${wallet.name} (${wallet.address}) in room ${roomName}`);
      
      wsService.joinRoom(roomName);
      
      wsService.on(roomName, (data) => {
        console.log(`New transaction for wallet ${wallet.name}:`, data);
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
  }, [wsService, isConnected, wallets, handleNewTransaction]);
  
  const value = {
    transactions,
    clearTransactions,
    isConnected,
    wsStatus,
    generateTestTransaction,
  };
  
  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};
