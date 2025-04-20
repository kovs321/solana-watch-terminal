
import { FC, ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletEntry, addWallet, fetchWallets } from '@/lib/supabase';
import { Connection } from '@solana/web3.js';

interface WalletContextType {
  wallets: WalletEntry[];
  addNewWallet: (address: string, name: string) => Promise<boolean>;
  walletAdapter: WalletContextState;
  connection: Connection;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: FC<WalletProviderProps> = ({ children }) => {
  const { connection } = useConnection();
  const walletAdapter = useWallet();
  const [wallets, setWallets] = useState<WalletEntry[]>([]);

  // Load wallets from Supabase
  const loadWallets = useCallback(async () => {
    const walletList = await fetchWallets();
    setWallets(walletList);
  }, []);

  // Load wallets on mount
  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  // Function to add a new wallet
  const addNewWallet = async (address: string, name: string): Promise<boolean> => {
    // Check if wallet already exists
    if (wallets.some(wallet => wallet.address.toLowerCase() === address.toLowerCase())) {
      return false;
    }

    const newWallet = await addWallet(address, name);
    if (newWallet) {
      setWallets(prev => [newWallet, ...prev]);
      return true;
    }
    return false;
  };

  const value = useMemo(() => ({
    wallets,
    addNewWallet,
    walletAdapter,
    connection,
  }), [wallets, walletAdapter, connection]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
