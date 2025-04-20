import React, { useRef, useState } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import TransactionTable from './TransactionTable';

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // Handle manual scroll to disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!terminalRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAutoScrollEnabled(isScrolledToBottom);
  };

  return (
    <div className="bg-terminal-background text-terminal-text border border-terminal-muted rounded-md shadow-lg flex flex-col h-full w-full">
      <div className="flex items-center px-4 py-2 bg-black border-b border-terminal-muted">
        <TerminalIcon size={18} className="mr-2 text-terminal-text" />
        <div className="text-sm font-mono font-semibold text-terminal-text">Solana Wallet Tracker</div>
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
