
import { FC, ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useWalletContext } from './WalletContext';
import WebSocketService from '@/services/WebSocketService';
import { 
  TradeInfo, 
  WS_URL, 
  getWalletTrades,
  formatTradeDate 
} from '@/services/SolanaTrackerService';
import { toast } from '@/components/ui/use-toast';

// Type for our transaction context
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
  setApiKey: (key: string) => void;
  apiKey: string | null;
}

// Create the context
const TransactionContext = createContext<TransactionContextType | null>(null);

// Hook to use the transaction context
export const useTransactionContext = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
};

// Props for the provider
interface TransactionProviderProps {
  children: ReactNode;
}

// Provider component
export const TransactionProvider: FC<TransactionProviderProps> = ({ children }) => {
  const { wallets } = useWalletContext();
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(
    localStorage.getItem('solana_tracker_api_key')
  );
  
  // Save API key to localStorage
  const handleSetApiKey = useCallback((key: string) => {
    localStorage.setItem('solana_tracker_api_key', key);
    setApiKey(key);
    toast({
      title: "API Key Saved",
      description: "Your Solana Tracker API key has been saved",
    });
    
    // Reload to reconnect with the new API key
    window.location.reload();
  }, []);
  
  // Convert TradeInfo to SolanaTransaction
  const convertTradeToTransaction = useCallback((trade: TradeInfo, walletName?: string): SolanaTransaction => {
    return {
      id: trade.tx,
      walletAddress: trade.wallet,
      walletName: walletName,
      type: trade.type.toUpperCase() as 'BUY' | 'SELL',
      fromToken: trade.token.from.symbol,
      fromAmount: trade.token.from.amount?.toString() || '0',
      toToken: trade.token.to.symbol,
      toAmount: trade.token.to.amount?.toString() || '0',
      program: trade.program,
      usdValue: trade.volume,
      timestamp: trade.time,
      displayTime: formatTradeDate(trade.time),
    };
  }, []);
  
  // Function to handle new transactions from WebSocket
  const handleNewTransaction = useCallback((trade: TradeInfo) => {
    const wallet = wallets.find(w => w.address.toLowerCase() === trade.wallet.toLowerCase());
    
    const transaction = convertTradeToTransaction(trade, wallet?.name);
    
    setTransactions(prev => {
      // Check if this transaction already exists
      const exists = prev.some(tx => tx.id === transaction.id);
      if (exists) return prev;
      
      // Add to beginning and limit to 100 transactions
      return [transaction, ...prev].slice(0, 100);
    });
  }, [wallets, convertTradeToTransaction]);
  
  // Clear all transactions
  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);
  
  // Initialize WebSocket service
  useEffect(() => {
    if (!apiKey) return;
    
    const service = new WebSocketService(WS_URL);
    setWsService(service);
    
    // Check connection status
    const checkConnection = setInterval(() => {
      const socket = service.getSocket();
      setIsConnected(socket !== null && socket.readyState === WebSocket.OPEN);
    }, 2000);
    
    return () => {
      service.disconnect();
      clearInterval(checkConnection);
    };
  }, [apiKey]);
  
  // Subscribe to wallet transactions when wallet list changes
  useEffect(() => {
    if (!wsService || !isConnected || wallets.length === 0) return;
    
    // Unsubscribe from all existing subscriptions
    wsService.emitter.removeAllListeners();
    
    // Create new subscriptions
    wallets.forEach(wallet => {
      const roomName = `wallet:${wallet.address}`;
      
      // Join the room for this wallet
      wsService.joinRoom(roomName);
      
      // Listen for wallet transaction updates
      wsService.on(roomName, (data) => {
        console.log(`New transaction for wallet ${wallet.name}:`, data);
        handleNewTransaction(data);
      });
      
      // Fetch historical trades to populate initial data
      if (apiKey) {
        getWalletTrades(wallet.address)
          .then(response => {
            if (response && response.trades) {
              const historicalTransactions = response.trades.map(trade => {
                // Map API response to our TradeInfo format (simplified)
                const tradeInfo: TradeInfo = {
                  tx: trade.tx,
                  amount: trade.to.amount,
                  priceUsd: trade.price.usd,
                  solVolume: trade.volume.sol,
                  volume: trade.volume.usd,
                  type: trade.from.token.symbol === 'SOL' ? 'buy' : 'sell',
                  wallet: trade.wallet,
                  time: trade.time,
                  program: trade.program,
                  token: {
                    from: {
                      name: trade.from.token.name,
                      symbol: trade.from.token.symbol,
                      image: trade.from.token.image,
                      decimals: trade.from.token.decimals,
                      address: trade.from.address,
                      amount: trade.from.amount
                    },
                    to: {
                      name: trade.to.token.name,
                      symbol: trade.to.token.symbol,
                      image: trade.to.token.image,
                      decimals: trade.to.token.decimals,
                      address: trade.to.address,
                      amount: trade.to.amount
                    }
                  }
                };
                
                return convertTradeToTransaction(tradeInfo, wallet.name);
              });
              
              setTransactions(prev => {
                const combined = [...prev, ...historicalTransactions];
                // Remove duplicates and sort by timestamp (newest first)
                const unique = Array.from(
                  new Map(combined.map(tx => [tx.id, tx])).values()
                ).sort((a, b) => b.timestamp - a.timestamp);
                
                return unique.slice(0, 100); // Limit to 100 transactions
              });
            }
          })
          .catch(console.error);
      }
    });
    
    return () => {
      // Cleanup subscriptions on unmount or when wallets change
      wallets.forEach(wallet => {
        wsService.leaveRoom(`wallet:${wallet.address}`);
      });
      wsService.emitter.removeAllListeners();
    };
  }, [wsService, isConnected, wallets, handleNewTransaction, convertTradeToTransaction, apiKey]);
  
  // Context value
  const value = {
    transactions,
    clearTransactions,
    isConnected,
    setApiKey: handleSetApiKey,
    apiKey,
  };
  
  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};
