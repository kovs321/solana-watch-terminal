
import { useCallback } from 'react';
import { TradeInfo } from '@/services/SolanaTrackerService';
import { SolanaTransaction } from '@/types/transactions';
import { formatTradeDate } from '@/services/SolanaTrackerService';

export const useTradeProcessor = () => {
  const convertTradeToTransaction = useCallback((trade: TradeInfo, walletName?: string): SolanaTransaction => {
    console.log("Converting trade to transaction:", trade);
    
    // Extract token symbols with better fallbacks
    const fromToken = trade.token?.from?.symbol || trade.from?.token?.symbol || "UNKNOWN";
    const toToken = trade.token?.to?.symbol || trade.to?.token?.symbol || "UNKNOWN";
    
    // Extract token names for additional display information
    const fromTokenName = trade.token?.from?.name || trade.from?.token?.name || "";
    const toTokenName = trade.token?.to?.name || trade.to?.token?.name || "";

    // Extract token addresses
    const fromTokenAddress = trade.token?.from?.address || trade.from?.token?.address || undefined;
    const toTokenAddress = trade.token?.to?.address || trade.to?.token?.address || undefined;
    
    let fromAmount: number | string = 0;
    let toAmount: number | string = 0;
    
    if (trade.token?.from?.amount !== undefined) {
      fromAmount = trade.token.from.amount;
    } else if (trade.from?.amount !== undefined) {
      fromAmount = trade.from.amount;
    }
    
    if (trade.token?.to?.amount !== undefined) {
      toAmount = trade.token.to.amount;
    } else if (trade.to?.amount !== undefined) {
      toAmount = trade.to.amount;
    } else if (trade.amount !== undefined) {
      toAmount = trade.amount;
    }
    
    let usdValue = 0;
    if (typeof trade.volume === 'number') {
      usdValue = trade.volume;
    } else if (trade.volume && typeof trade.volume === 'object') {
      const volumeObj = trade.volume as { usd?: number };
      if (volumeObj.usd !== undefined) {
        usdValue = volumeObj.usd;
      }
    }
    
    return {
      id: trade.tx,
      walletAddress: trade.wallet,
      walletName: walletName || undefined,
      type: trade.type?.toUpperCase() as 'BUY' | 'SELL',
      fromToken,
      fromTokenName,
      fromTokenAddress,
      fromAmount,
      toToken,
      toTokenName,
      toTokenAddress,
      toAmount,
      program: trade.program || 'Unknown',
      usdValue,
      timestamp: trade.time || Date.now(),
      displayTime: formatTradeDate(trade.time || Date.now()),
    };
  }, []);

  return { convertTradeToTransaction };
};
