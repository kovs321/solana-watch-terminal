
import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useTransactionContext, SolanaTransaction } from "@/contexts/TransactionContext";
import { TrendingUp, TrendingDown } from "lucide-react";

const TransactionTable = () => {
  const { transactions, isConnected } = useTransactionContext();
  const [showNoData, setShowNoData] = useState(false);

  // Show no data message after a delay (to avoid flickering)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNoData(transactions.length === 0);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [transactions.length]);

  // Format token amount to display non-zero values properly
  const formatTokenAmount = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null) return '0.00';
    
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // If it's zero or NaN, return 0.00
    if (isNaN(numAmount) || numAmount === 0) return '0.00';
    
    // If it's a very small number, preserve the original precision
    if (numAmount < 0.01) {
      // Show at least 6 decimal places for very small numbers
      return numAmount.toFixed(6).replace(/\.?0+$/, '');
    }
    
    // If it's a large number with decimals, show 2 decimal places
    if (numAmount > 1000) {
      return numAmount.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    
    // For normal numbers, adjust decimal places based on size
    if (numAmount > 100) return numAmount.toFixed(2);
    if (numAmount > 10) return numAmount.toFixed(3);
    if (numAmount > 1) return numAmount.toFixed(4);
    
    // For small but visible numbers
    return numAmount.toFixed(5);
  };

  return (
    <div className="font-mono text-sm overflow-x-auto">
      {!isConnected && (
        <div className="p-2 mb-4 border border-terminal-muted bg-black bg-opacity-30 rounded text-terminal-warning">
          Connecting to WebSocket... Please wait.
        </div>
      )}
      
      <Table>
        <TableHeader className="bg-terminal-background border-terminal-muted">
          <TableRow>
            <TableHead className="text-terminal-highlight">TYPE</TableHead>
            <TableHead className="text-terminal-highlight">WALLET</TableHead>
            <TableHead className="text-terminal-highlight">SWAP</TableHead>
            <TableHead className="text-terminal-highlight">PROGRAM</TableHead>
            <TableHead className="text-terminal-highlight text-right">VALUE (USD)</TableHead>
            <TableHead className="text-terminal-highlight text-right">TIME</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <TableRow 
                key={tx.id}
                className="border-terminal-muted hover:bg-terminal-background/50"
              >
                <TableCell className={tx.type === 'BUY' ? 'text-terminal-success' : 'text-terminal-error'}>
                  {tx.type === 'BUY' ? (
                    <div className="flex items-center">
                      <TrendingUp size={14} className="mr-1" /> BUY
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <TrendingDown size={14} className="mr-1" /> SELL
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-terminal-text font-mono text-xs">
                  {tx.walletName || (tx.walletAddress ? tx.walletAddress.slice(0, 4) + '...' + tx.walletAddress.slice(-4) : 'Unknown')}
                </TableCell>
                <TableCell className="text-terminal-highlight">
                  {formatTokenAmount(tx.fromAmount)} {tx.fromToken} → {formatTokenAmount(tx.toAmount)} {tx.toToken}
                </TableCell>
                <TableCell className="text-terminal-muted">{tx.program}</TableCell>
                <TableCell className="text-right text-terminal-text">
                  ${typeof tx.usdValue === 'number' 
                    ? tx.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : '0.00'}
                </TableCell>
                <TableCell className="text-right text-terminal-muted text-xs">
                  {tx.displayTime}
                </TableCell>
              </TableRow>
            ))
          ) : showNoData ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-terminal-muted py-8">
                No transactions yet. Waiting for data...
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionTable;
