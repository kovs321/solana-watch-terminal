
import { useCallback } from 'react';
import { TradeInfo } from '@/services/SolanaTrackerService';
import { SolanaTransaction } from '@/types/transactions';
import { formatTradeDate } from '@/services/SolanaTrackerService';

export const useTradeProcessor = () => {
  const convertTradeToTransaction = useCallback((trade: TradeInfo, walletName?: string): SolanaTransaction => {
    console.log("Converting trade to transaction:", trade);
    
    const fromToken = trade.token?.from?.symbol || "UNKNOWN";
    const toToken = trade.token?.to?.symbol || "UNKNOWN";
    
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
      fromAmount,
      toToken,
      toAmount,
      program: trade.program || 'Unknown',
      usdValue,
      timestamp: trade.time || Date.now(),
      displayTime: formatTradeDate(trade.time || Date.now()),
    };
  }, []);

  return { convertTradeToTransaction };
};
