
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';

const PHANTOM_INSTALL_URL = 'https://phantom.app/download';

const ConnectWallet: React.FC = () => {
  const { connected, disconnect, wallets, select, connect, wallet } = useWallet();

  // Locate Phantom wallet adapter
  const phantom = wallets.find(w => w.adapter.name === 'Phantom');

  // Handler to connect to Phantom
  const handleConnect = async () => {
    if (phantom) {
      select(phantom.adapter.name); // select Phantom
      try {
        await connect();
      } catch (err) {
        // Handle connection error (optional: show error to user)
        console.error('Error connecting to Phantom:', err);
      }
    } else {
      // Phantom not installed
      window.open(PHANTOM_INSTALL_URL, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="my-4 flex justify-center space-x-4">
      {connected ? (
        <>
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
          <Button
            variant="default"
            className="bg-terminal-highlight text-black font-mono rounded-md shadow-md px-4 py-2 h-auto flex items-center border border-terminal-highlight hover:bg-terminal-success/90"
            onClick={handleConnect}
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
