
import { useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';

// List of sample wallets with names for initial data
const sampleWallets = [
  {
    name: "Whale Wallet",
    address: "9FYsKrNuEweb55Wa2jaj8wTKYDBvuCvtz6EV2F9mSTQV"
  },
  {
    name: "Solana Foundation",
    address: "5xoBq7f7Rda1uwMnZg1RkJp4j1x7PzxcEaGQQMF4kxTP"
  },
  {
    name: "Diamond Hands",
    address: "2mM3rABKCgZ1iYwKpSVQRojcPKKqgEUzPvYcmQmLLRJQ"
  },
  {
    name: "NFT Trader",
    address: "5SKmrbAxnHV2sgobT1odV8gwoUFGTsQP3oGMs5wVjPWX"
  }
];

export const useInitialWallets = () => {
  const { wallets, addNewWallet } = useWalletContext();

  useEffect(() => {
    // Only add sample wallets if no wallets exist (first load)
    if (wallets.length === 0) {
      const addWallets = async () => {
        for (const wallet of sampleWallets) {
          await addNewWallet(wallet.address, wallet.name);
        }
      };

      addWallets();
    }
  }, [wallets.length, addNewWallet]);

  return null; // This hook doesn't need to return anything
};
