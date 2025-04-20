
import React, { useEffect, useRef, useState } from 'react';
import { useTransactionContext } from '@/contexts/TransactionContext';
import { formatDistanceToNow } from 'date-fns';
import { Terminal as TerminalIcon } from 'lucide-react';

const formatTimeAgo = (timestamp: number): string => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

const formatAddress = (address: string): string => {
  if (!address || address === 'unknown') return 'unknown';
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

const Terminal: React.FC = () => {
  const { transactions } = useTransactionContext();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // Auto-scroll to bottom when new transactions arrive
  useEffect(() => {
    if (isAutoScrollEnabled && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [transactions, isAutoScrollEnabled]);

  // Handle manual scroll to disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!terminalRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAutoScrollEnabled(isScrolledToBottom);
  };

  // Terminal message/transaction renderer
  const renderTransaction = (tx: any, index: number) => {
    let message = '';
    let className = 'text-terminal-text';

    switch (tx.type) {
      case 'send':
        message = `${tx.senderName || formatAddress(tx.senderAddress)} sent ${tx.amount?.toFixed(4)} ${tx.tokenSymbol || 'tokens'} to ${formatAddress(tx.receiverAddress || '')}`; 
        className = 'text-terminal-error';
        break;
      case 'receive':
        message = `${tx.senderName || formatAddress(tx.senderAddress)} received ${tx.amount?.toFixed(4)} ${tx.tokenSymbol || 'tokens'}`; 
        className = 'text-terminal-success';
        break;
      case 'swap':
        message = `${tx.senderName || formatAddress(tx.senderAddress)} swapped tokens`; 
        className = 'text-terminal-warning';
        break;
      default:
        message = `${tx.senderName || formatAddress(tx.senderAddress)} made a transaction`; 
        break;
    }

    return (
      <div key={tx.signature + index} className="terminal-line mb-1">
        <span className="text-terminal-muted mr-2">[{formatTimeAgo(tx.timestamp)}]</span>
        <span className={className}>{message}</span>
      </div>
    );
  };

  return (
    <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 flex flex-col h-full">
      {/* Terminal header */}
      <div className="flex items-center px-4 py-2 bg-black bg-opacity-30 border-b border-gray-800">
        <TerminalIcon size={18} className="mr-2 text-terminal-highlight" />
        <div className="text-sm font-mono font-semibold">Solana Wallet Tracker</div>
        <div className="ml-auto text-xs text-terminal-muted">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      {/* Terminal content */}
      <div 
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        onScroll={handleScroll}
      >
        {transactions.length === 0 ? (
          <div className="text-terminal-muted italic">
            <span className="cursor-blink">Waiting for transactions...</span>
            <div className="text-xs mt-2">
              (For this demo, simulated transactions will appear every 5-20 seconds)
            </div>
          </div>
        ) : (
          <>
            {transactions.map(renderTransaction)}
          </>
        )}
        
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
