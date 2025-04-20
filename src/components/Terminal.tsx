
import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, RefreshCw } from 'lucide-react';
import TransactionTable from './TransactionTable';
import { useTransactionContext } from '@/contexts/TransactionContext';
import { Button } from './ui/button';

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const { transactions, clearTransactions, isConnected } = useTransactionContext();

  // Handle manual scroll to disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!terminalRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAutoScrollEnabled(isScrolledToBottom);
  };

  // Auto-scroll to bottom when new transactions arrive
  useEffect(() => {
    if (isAutoScrollEnabled && terminalRef.current && transactions.length > 0) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [transactions, isAutoScrollEnabled]);

  // Function to clear all transactions
  const handleClearTransactions = () => {
    clearTransactions();
  };

  return (
    <div className="bg-terminal-background text-terminal-text border border-terminal-muted rounded-md shadow-lg flex flex-col h-full w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-terminal-muted">
        <div className="flex items-center">
          <TerminalIcon size={18} className="mr-2 text-terminal-text" />
          <div className="text-sm font-mono font-semibold text-terminal-text">Solana Wallet Tracker</div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-terminal-success' : 'bg-terminal-error'}`}></div>
          <span className="text-xs text-terminal-muted">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
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
      
      <div 
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm w-full"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        onScroll={handleScroll}
      >
        <div className="text-terminal-text mb-4">
          $ wallet-tracker --view-transactions
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
