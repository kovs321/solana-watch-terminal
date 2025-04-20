
import { FC, ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { 
  TransactionInfo, 
  subscribeToWalletTransactions, 
  unsubscribeFromWallet,
  simulateTransaction 
} from '@/lib/solana';
import { useWalletContext } from './WalletContext';

// Type for our transaction context
interface TransactionContextType {
  transactions: TransactionInfo[];
  clearTransactions: () => void;
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
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, number>>({});
  
  // Function to handle new transactions
  const handleNewTransaction = useCallback((transaction: TransactionInfo) => {
    setTransactions(prev => [transaction, ...prev.slice(0, 99)]); // Keep last 100 transactions
  }, []);
  
  // Clear all transactions
  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);
  
  // Subscribe to wallet transactions when wallet list changes
  useEffect(() => {
    // Unsubscribe from all existing subscriptions
    Object.values(subscriptions).forEach(id => {
      if (id) unsubscribeFromWallet(id);
    });
    
    // Create new subscriptions
    const newSubscriptions: Record<string, number> = {};
    
    wallets.forEach(wallet => {
      // In a production app, use real subscription
      // const id = subscribeToWalletTransactions(
      //   wallet.address, 
      //   wallet.name, 
      //   handleNewTransaction
      // );
      
      // For development/demo, use simulated transactions
      simulateTransaction(wallet.address, wallet.name, handleNewTransaction);
      newSubscriptions[wallet.address] = 1; // Placeholder for simulation
    });
    
    setSubscriptions(newSubscriptions);
    
    // Cleanup subscriptions on unmount
    return () => {
      Object.values(newSubscriptions).forEach(id => {
        if (id) unsubscribeFromWallet(id);
      });
    };
  }, [wallets, handleNewTransaction]);
  
  // Context value
  const value = {
    transactions,
    clearTransactions,
  };
  
  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};
