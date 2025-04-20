
import React from 'react';
import { useWalletContext } from '@/contexts/WalletContext';

const WalletList: React.FC = () => {
  const { wallets } = useWalletContext();

  return (
    <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 p-4 my-4">
      <h2 className="text-terminal-highlight font-mono text-sm mb-3 border-b border-gray-800 pb-2">Tracked Wallets ({wallets.length})</h2>
      
      {wallets.length === 0 ? (
        <div className="text-terminal-muted italic text-sm">
          No wallets being tracked yet. Connect your wallet to add wallets.
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {wallets.map((wallet) => (
            <div key={wallet.address} className="text-sm mb-2 py-1 px-2 rounded hover:bg-gray-800">
              <div className="font-semibold text-terminal-highlight">{wallet.name}</div>
              <div className="text-xs text-terminal-muted font-mono">{wallet.address}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WalletList;
