
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';

// Import the Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const ConnectWallet: React.FC = () => {
  const { connected, disconnect } = useWallet();

  return (
    <div className="my-4 flex justify-center space-x-4">
      {connected ? (
        <>
          {/* Custom styled WalletMultiButton - hidden, we'll use our own button */}
          <WalletMultiButton style={{ display: 'none' }} />
          <Button
            variant="default"
            className="bg-terminal-highlight text-black font-mono border border-terminal-highlight rounded-md shadow-md px-4 py-2 h-auto flex items-center"
          >
            Connected
          </Button>
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
        <>
          {/* Place the WalletMultiButton in the DOM but visually hidden */}
          <WalletMultiButton className="hidden" id="wallet-adapter-button" />
          
          <Button
            variant="default"
            className="bg-terminal-highlight text-black font-mono rounded-md shadow-md px-4 py-2 h-auto flex items-center border border-terminal-highlight hover:bg-terminal-success/90"
            onClick={() => {
              // Find the wallet button by ID and trigger its click event
              const walletButton = document.getElementById('wallet-adapter-button') as HTMLButtonElement;
              if (walletButton) {
                walletButton.click();
              }
            }}
          >
            <LogIn size={16} className="mr-2" />
            Connect Wallet
          </Button>
        </>
      )}
    </div>
  );
};

export default ConnectWallet;
