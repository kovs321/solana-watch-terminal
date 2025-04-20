
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react'; // Removed Radio icon
// Removed useTransactionContext and toast imports

// Import the Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const ConnectWallet: React.FC = () => {
  const { connected, disconnect } = useWallet();

  return (
    <div className="my-4 flex justify-center space-x-4">
      {connected ? (
        <>
          <WalletMultiButton 
            className="!bg-terminal-background !text-terminal-highlight !border !border-terminal-highlight !rounded-md !shadow-none !px-4 !py-2 !h-auto" 
          />
          <Button 
            variant="destructive" 
            className="bg-terminal-error hover:bg-terminal-error/80 text-white font-mono flex items-center"
            onClick={() => disconnect()}
          >
            <LogOut size={16} className="mr-2" />
            Disconnect
          </Button>
        </>
      ) : (
        <WalletMultiButton 
          className="!bg-terminal-highlight !text-white !border-none !rounded-md !shadow-none !px-4 !py-2 !h-auto font-mono flex items-center"
        >
          <LogIn size={16} className="mr-2" />
          Connect Wallet
        </WalletMultiButton>
      )}
    </div>
  );
};

export default ConnectWallet;
