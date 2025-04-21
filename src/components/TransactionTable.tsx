
import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useTransactionContext } from "@/contexts/TransactionContext";
import { SolanaTransaction } from "@/types/transactions";
import { TrendingUp, TrendingDown } from "lucide-react";
import CopyTooltip from "./CopyTooltip";
import WalletPnlDialog from "./WalletPnlDialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const SOL_ADDRESS_TO_EXCLUDE_COPY = "So11111111111111111111111111111111111111112";

const TransactionTable = () => {
  const { transactions, isConnected } = useTransactionContext();
  const [showNoData, setShowNoData] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<{wallet_address: string, name: string} | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [pnlData, setPnlData] = useState<any>(null);
  const [pnlError, setPnlError] = useState<string | null>(null);

  // API base URL and key for PnL data
  const API_URL = 'https://data.solanatracker.io/pnl';
  const API_KEY = '7e869836-9708-43e2-bb2e-1c11959d306a';

  // Show no data message after a delay (to avoid flickering)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNoData(transactions.length === 0);
    }, 2000);
    return () => clearTimeout(timer);
  }, [transactions.length]);

  // Handle wallet click to fetch PnL data
  const handleWalletClick = async (walletAddress: string, walletName?: string) => {
    if (!walletAddress) return;
    
    const displayName = walletName || walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4);
    
    setSelectedWallet({
      wallet_address: walletAddress,
      name: displayName
    });
    setDialogOpen(true);
    setPnlData(null);
    setPnlError(null);
    setPnlLoading(true);

    try {
      const url = `${API_URL}/${encodeURIComponent(walletAddress)}`;
      const resp = await fetch(url, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      if (!resp.ok) {
        throw new Error(`Failed to fetch PnL: ${resp.statusText}`);
      }
      const respData = await resp.json();
      setPnlData(respData);
    } catch (err: any) {
      console.error(err);
      setPnlError(err.message || 'Failed to fetch wallet PnL');
    } finally {
      setPnlLoading(false);
    }
  };

  // Format token amount to display non-zero values properly
  const formatTokenAmount = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null) return '0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount === 0) return '0.00';
    if (numAmount < 0.01) {
      const fixedValue = numAmount.toFixed(6);
      return parseFloat(fixedValue).toString();
    }
    if (numAmount > 1000) {
      return numAmount.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    if (numAmount > 100) return numAmount.toFixed(2);
    if (numAmount > 10) return numAmount.toFixed(3);
    if (numAmount > 1) return numAmount.toFixed(4);
    return numAmount.toFixed(5);
  };

  // Format token symbol with name if available when token is UNKNOWN
  const formatTokenSymbol = (symbol: string, name?: string) => {
    if (symbol === 'UNKNOWN' && name && name.length > 0) {
      const shortName = name.length > 12 ? name.substring(0, 10) + '...' : name;
      return `${shortName}`;
    }
    return symbol;
  };

  // Helper for rendering token (with copy-to-address)
  const TokenCell: React.FC<{ symbol: string; name?: string; address?: string }> = ({ symbol, name, address }) => {
    const display = (
      <>
        <span className="mr-0.5">{formatTokenSymbol(symbol, name)}</span>
      </>
    );

    // Disable copy for the specific SOL token address
    if (address && address === SOL_ADDRESS_TO_EXCLUDE_COPY) {
      return display;
    }

    return address ? (
      <CopyTooltip
        value={address}
        display={display}
        tooltipLabel="Copy token address"
      />
    ) : (
      display
    );
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
                  {tx.walletName ? (
                    <button 
                      onClick={() => handleWalletClick(tx.walletAddress, tx.walletName)}
                      className="hover:text-highlight-blue hover:underline cursor-pointer"
                    >
                      {tx.walletName}
                    </button>
                  ) : tx.walletAddress ? (
                    <button
                      onClick={() => handleWalletClick(tx.walletAddress)}
                      className="hover:text-highlight-blue hover:underline cursor-pointer"
                    >
                      {tx.walletAddress.slice(0, 4) + "..." + tx.walletAddress.slice(-4)}
                    </button>
                  ) : (
                    "Unknown"
                  )}
                </TableCell>
                <TableCell className="text-terminal-highlight">
                  <span className="flex items-center gap-1">
                    <TokenCell
                      symbol={tx.fromToken}
                      name={tx.fromTokenName}
                      address={tx.fromTokenAddress}
                    />{" "}
                    {formatTokenAmount(tx.fromAmount)}
                    <span className="mx-1">→</span>
                    <TokenCell
                      symbol={tx.toToken}
                      name={tx.toTokenName}
                      address={tx.toTokenAddress}
                    />{" "}
                    {formatTokenAmount(tx.toAmount)}
                  </span>
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

      {/* PnL Dialog for wallet details */}
      <WalletPnlDialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) {
            setSelectedWallet(null);
            setPnlError(null);
            setPnlData(null);
          }
        }}
        walletName={selectedWallet?.name || ""}
        walletAddress={selectedWallet?.wallet_address || ""}
        pnlData={pnlData}
        loading={pnlLoading}
        error={pnlError}
      />
    </div>
  );
};

export default TransactionTable;
