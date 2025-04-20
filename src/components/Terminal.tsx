import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import TransactionTable from './TransactionTable';
import WebSocketDebugPanel from './WebSocketDebugPanel';
import { useTransactionContext } from '@/contexts/TransactionContext';
import { Button } from './ui/button';
import { toast } from '@/components/ui/use-toast';
import RawWebSocketDataDrawer from "./RawWebSocketDataDrawer";
import { Code } from "lucide-react";

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [rawDrawerOpen, setRawDrawerOpen] = useState(false);
  const { 
    transactions, 
    clearTransactions, 
    isConnected, 
    wsStatus,
  } = useTransactionContext();

  const handleScroll = () => {
    if (!terminalRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAutoScrollEnabled(isScrolledToBottom);
  };

  useEffect(() => {
    if (isAutoScrollEnabled && terminalRef.current && transactions.length > 0) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [transactions, isAutoScrollEnabled]);

  const handleClearTransactions = () => {
    clearTransactions();
    toast({
      title: "Transactions cleared",
      description: "All transaction history has been cleared from the display",
    });
  };

  const toggleDebug = () => {
    setShowDebug(prev => !prev);
  };

  return (
    <div className="bg-terminal-background text-terminal-text border border-terminal-muted rounded-md shadow-lg flex flex-col h-full w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-terminal-muted">
        <div className="flex items-center">
          <TerminalIcon size={18} className="mr-2 text-terminal-text" />
          <div className="text-sm font-mono font-semibold text-terminal-text">Solana Wallet Tracker</div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded border font-mono text-xs bg-black border-terminal-muted text-terminal-highlight hover:bg-terminal-highlight hover:text-black transition-all"
            title="Show Raw WebSocket Data"
            onClick={() => setRawDrawerOpen(true)}
            style={{ minHeight: 32 }}
          >
            <Code size={14} />
            Raw Data
          </button>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-terminal-success' : 'bg-terminal-error'}`}></div>
          <span className="text-xs text-terminal-muted">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-terminal-muted hover:text-terminal-text"
            onClick={toggleDebug}
            title="Toggle debug info"
          >
            <AlertCircle size={14} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-terminal-muted hover:text-terminal-text"
            onClick={handleClearTransactions}
            title="Clear transactions"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>
      
      <RawWebSocketDataDrawer open={rawDrawerOpen} onOpenChange={setRawDrawerOpen} />
      
      {showDebug && (
        <div className="text-xs bg-black p-2 border-b border-terminal-muted font-mono">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {isConnected ? (
                <Wifi size={12} className="text-terminal-success mr-1" />
              ) : (
                <WifiOff size={12} className="text-terminal-error mr-1" />
              )}
              <span>WebSocket Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="text-terminal-muted">
              Tracking {transactions.length} transactions
            </div>
          </div>
          
          {wsStatus && (
            <div className="mt-1 text-terminal-muted">
              <div>Socket States: Main={wsStatus.mainSocketState}, Transaction={wsStatus.transactionSocketState}</div>
              <div className="truncate">
                Rooms: {wsStatus.subscribedRooms?.join(', ') || 'None'}
              </div>
            </div>
          )}
          
          <WebSocketDebugPanel />
        </div>
      )}
      
      <div 
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm w-full"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        onScroll={handleScroll}
      >
        <div className="text-terminal-text mb-4 flex items-center justify-between">
          <div>$ wallet-tracker --view-transactions</div>
        </div>
        
        <TransactionTable />
        
        <div className="mt-4 text-terminal-text flex items-center">
          <span className="mr-2">$</span>
          <span className="text-terminal-text cursor-blink">_</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
