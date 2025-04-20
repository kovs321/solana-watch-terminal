
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';

// Import the Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const ConnectWallet: React.FC = () => {
  const { connected, disconnect, select, wallets } = useWallet();

  // Function to directly open the wallet selector
  const openWalletSelector = () => {
    // The default wallet adapter modal is controlled by WalletMultiButton
    // We need to programmatically trigger it via DOM
    const walletModal = document.querySelector('.wallet-adapter-modal-wrapper');
    
    if (!walletModal) {
      // If modal isn't visible yet, make the WalletMultiButton visible for a moment
      const buttonContainer = document.createElement('div');
      buttonContainer.style.position = 'absolute';
      buttonContainer.style.opacity = '0';
      document.body.appendChild(buttonContainer);
      
      // Render the WalletMultiButton temporarily
      const tempButton = document.createElement('button');
      buttonContainer.appendChild(tempButton);
      tempButton.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(buttonContainer);
      }, 100);
    }
  };

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
          <WalletMultiButton className="hidden" />
          
          <Button
            variant="default"
            className="bg-terminal-highlight text-black font-mono rounded-md shadow-md px-4 py-2 h-auto flex items-center border border-terminal-highlight hover:bg-terminal-success/90"
            onClick={openWalletSelector}
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
