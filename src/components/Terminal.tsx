
import React, { useEffect, useRef, useState } from 'react';
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
    <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 flex flex-col h-full">
      {/* Terminal header */}
      <div className="flex items-center px-4 py-2 bg-black bg-opacity-30 border-b border-gray-800">
        <TerminalIcon size={18} className="mr-2 text-terminal-highlight" />
        <div className="text-sm font-mono font-semibold">Solana Wallet Tracker</div>
      </div>
      
      {/* Terminal content */}
      <div 
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        onScroll={handleScroll}
      >
        <div className="text-terminal-highlight mb-4">
          $ wallet-tracker --view-transactions
        </div>
        
        <TransactionTable />
        
        {/* Terminal prompt line */}
        <div className="mt-4 text-terminal-highlight flex items-center">
          <span className="mr-2">$</span>
          <span className="text-terminal-text cursor-blink">_</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
