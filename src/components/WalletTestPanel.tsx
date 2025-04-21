
import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useTransactionContext } from '@/contexts/TransactionContext';
import { toast } from '@/components/ui/use-toast';
import { Terminal as TerminalIcon, PlaySquare, RefreshCw } from 'lucide-react';
import TransactionTable from './TransactionTable';

const WalletTestPanel = () => {
  const [testAddress, setTestAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { wsStatus, isConnected, subscribeToTestWallet, lastError, reinitializeConnection } = useTransactionContext();
  
  const handleRefreshConnection = async () => {
    toast({
      title: "Refreshing Connection",
      description: "Attempting to reconnect WebSocket...",
    });
    
    await reinitializeConnection();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testAddress) {
      toast({
        title: "No Address Provided",
        description: "Please enter a wallet address to test",
        variant: "destructive"
      });
      return;
    }
    
    if (!isConnected) {
      toast({
        title: "WebSocket Not Connected",
        description: "Please wait for WebSocket connection to be established or try refreshing the connection",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await subscribeToTestWallet(testAddress);
      toast({
        title: "Monitoring Started",
        description: `Now monitoring transactions for ${testAddress.slice(0, 4)}...${testAddress.slice(-4)}`,
      });
    } catch (error) {
      console.error("Error subscribing to test wallet:", error);
      toast({
        title: "Subscription Error",
        description: "Failed to subscribe to wallet. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-terminal-background text-terminal-text border border-terminal-muted rounded-md shadow-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TerminalIcon size={18} className="text-terminal-text" />
          <h2 className="text-sm font-mono font-semibold">Transaction Test Panel</h2>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefreshConnection}
          className="bg-terminal-background border-terminal-muted hover:bg-terminal-background/50"
        >
          <RefreshCw size={14} className="mr-2" />
          Refresh Connection
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <Input
          type="text"
          value={testAddress}
          onChange={(e) => setTestAddress(e.target.value)}
          placeholder="Enter wallet address to monitor..."
          className="flex-1 bg-black text-terminal-text border-terminal-muted"
        />
        <Button 
          type="submit"
          variant="outline"
          className="bg-terminal-background border-terminal-muted hover:bg-terminal-background/50"
          disabled={!isConnected || isLoading}
        >
          <PlaySquare size={16} className="mr-2" />
          {isLoading ? 'Connecting...' : 'Monitor'}
        </Button>
      </form>
      
      <div className="text-xs text-terminal-muted mb-2">
        WebSocket Status: {isConnected ? 
          <span className="text-green-500">Connected</span> : 
          <span className="text-red-500">Disconnected</span>
        }
      </div>
      
      {lastError && (
        <div className="text-xs text-red-500 mb-2 font-mono p-2 bg-red-950/30 rounded border border-red-900">
          Error: {lastError}
        </div>
      )}
      
      {wsStatus && (
        <div className="text-xs text-terminal-muted mb-4">
          <div>Socket States: Main={wsStatus.mainSocketState}, Transaction={wsStatus.transactionSocketState}</div>
          <div className="truncate">
            Active Rooms: {wsStatus.subscribedRooms?.join(', ') || 'None'}
          </div>
        </div>
      )}
      
      <TransactionTable />
    </div>
  );
};

export default WalletTestPanel;
