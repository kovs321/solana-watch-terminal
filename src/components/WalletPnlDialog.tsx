
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CopyTooltip from "./CopyTooltip";

interface TokenPnl {
  holding: number;
  held: number;
  sold: number;
  realized: number;
  unrealized: number;
  total: number;
  total_sold: number;
  total_invested: number;
  average_buy_amount: number;
  current_value: number;
  cost_basis: number;
}

interface PnlSummary {
  realized: number;
  unrealized: number;
  total: number;
  totalInvested: number;
  averageBuyAmount: number;
  totalWins: number;
  totalLosses: number;
  winPercentage: number;
  lossPercentage: number;
}

interface WalletPnlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletName: string;
  walletAddress: string;
  pnlData: {
    tokens: Record<string, TokenPnl>;
    summary: PnlSummary;
  } | null;
  loading: boolean;
  error?: string | null;
}

export default function WalletPnlDialog({
  open,
  onOpenChange,
  walletName,
  walletAddress,
  pnlData,
  loading,
  error,
}: WalletPnlDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-terminal-background border-highlight-blue">
        <DialogHeader>
          <DialogTitle>
            <span className="text-highlight-blue">
              {walletName}
            </span>
            <span className="ml-2 text-xs block text-highlight-blue font-mono truncate flex items-center">
              {/* Wallet address with copy option only in dialog */}
              <CopyTooltip
                value={walletAddress}
                display={
                  <>
                    <span>{walletAddress}</span>
                    <span style={{ color: "#526FFF", marginLeft: 4, display: "inline-flex", alignItems: "center" }}>
                      {/* The Copy icon will inherit this color in the CopyTooltip */}
                    </span>
                  </>
                }
                tooltipLabel="Copy wallet address"
              />
            </span>
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-4 text-terminal-muted text-sm">Loading PnL data...</div>
        ) : error ? (
          <div className="p-4 text-red-400 font-mono text-xs">{error}</div>
        ) : pnlData ? (
          <div>
            <h4 className="mb-2 mt-4 text-highlight-blue text-sm font-semibold">Summary</h4>
            <ul className="text-sm space-y-1 mb-4">
              <li><span className="font-mono text-highlight-blue">Realized:</span> <span className="font-mono">{pnlData.summary.realized?.toFixed(2)}</span></li>
              <li><span className="font-mono text-highlight-blue">Unrealized:</span> <span className="font-mono">{pnlData.summary.unrealized?.toFixed(2)}</span></li>
              <li><span className="font-mono text-highlight-blue">Total:</span> <span className="font-mono">{pnlData.summary.total?.toFixed(2)}</span></li>
              <li><span className="font-mono text-highlight-blue">Total Invested:</span> <span className="font-mono">{pnlData.summary.totalInvested?.toFixed(2)}</span></li>
              <li><span className="font-mono text-highlight-blue">Avg. Buy Amt:</span> <span className="font-mono">{pnlData.summary.averageBuyAmount?.toFixed(2)}</span></li>
              <li><span className="font-mono text-highlight-blue">Win %:</span> <span className="font-mono">{pnlData.summary.winPercentage?.toFixed(2)}%</span></li>
              <li><span className="font-mono text-highlight-blue">Loss %:</span> <span className="font-mono">{pnlData.summary.lossPercentage?.toFixed(2)}%</span></li>
            </ul>
            <h4 className="mb-2 mt-2 text-highlight-blue text-sm font-semibold">Token PnL</h4>
            <div className="max-h-52 overflow-y-auto">
              {Object.entries(pnlData.tokens).length === 0 ? (
                <div className="text-xs text-terminal-muted">No token-specific PnL data.</div>
              ) : (
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr>
                      <th className="text-left pr-2 text-highlight-blue">Token</th>
                      <th className="text-right px-1">Holding</th>
                      <th className="text-right px-1">Realized</th>
                      <th className="text-right px-1">Unrealized</th>
                      <th className="text-right px-1">Total PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pnlData.tokens).map(([tokenAddress, t]) => (
                      <tr key={tokenAddress}>
                        <td className="pr-2 text-highlight-blue">
                          {/* Accent color for token address */}
                          <span style={{ color: "#526FFF" }}>
                            {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                          </span>
                        </td>
                        <td className="text-right px-1">{t.holding.toFixed(2)}</td>
                        <td className="text-right px-1">{t.realized.toFixed(2)}</td>
                        <td className="text-right px-1">{t.unrealized.toFixed(2)}</td>
                        <td className="text-right px-1">{t.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-terminal-muted text-xs">No PnL data found for this wallet.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
