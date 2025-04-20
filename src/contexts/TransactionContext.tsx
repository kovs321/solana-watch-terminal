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
  
  const handleNewTransaction = useCallback((trade: TradeInfo) => {
    console.log("Processing new transaction:", trade);
    const wallet = wallets.find(w => w.address.toLowerCase() === trade.wallet.toLowerCase());
    
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
    console.log("Initializing WebSocket service with API key...");
    const service = new WebSocketService(WS_URL, API_KEY);
    setWsService(service);
    
    const checkConnection = setInterval(() => {
      const socket = service.getSocket();
      const connected = socket !== null && socket.readyState === WebSocket.OPEN;
      setIsConnected(connected);
      
      // Update WebSocket status for debugging
      setWsStatus(service.getConnectionStatus());
    }, 2000);
    
    return () => {
      console.log("Cleaning up WebSocket service...");
      service.disconnect();
      clearInterval(checkConnection);
    };
  }, []);
  
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
    
    // Clean up previous listeners
    wsService.emitter.removeAllListeners();
    
    wallets.forEach(wallet => {
      const roomName = `wallet:${wallet.address}`;
      console.log(`Setting up listener for wallet ${wallet.name} (${wallet.address}) in room ${roomName}`);
      
      wsService.joinRoom(roomName);
      
      wsService.on(roomName, (data) => {
        console.log(`New transaction for wallet ${wallet.name}:`, data);
        handleNewTransaction(data);
      });
      
      console.log(`Fetching historical trades for wallet ${wallet.name} (${wallet.address})`);
      getWalletTrades(wallet.address)
        .then(response => {
          console.log(`Received historical trades for ${wallet.name}:`, response);
          
          if (response && response.trades && response.trades.length > 0) {
            console.log(`Processing ${response.trades.length} historical trades for ${wallet.name}`);
            
            const historicalTransactions = response.trades.map(trade => {
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
              const unique = Array.from(
                new Map(combined.map(tx => [tx.id, tx])).values()
              ).sort((a, b) => b.timestamp - a.timestamp);
              
              console.log(`Added ${historicalTransactions.length} historical transactions`);
              return unique.slice(0, 100);
            });
          } else {
            console.log(`No historical trades found for wallet ${wallet.name}`);
          }
        })
        .catch(error => {
          console.error(`Error fetching historical trades for ${wallet.name}:`, error);
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
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};
