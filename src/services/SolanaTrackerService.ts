import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = 'https://data.solanatracker.io';

export interface TokenInfo {
  name: string;
  symbol: string;
  image: string;
  decimals: number;
  address?: string;
  amount?: number;
}

export interface TradeTokenInfo {
  from: TokenInfo;
  to: TokenInfo;
}

export interface TradeInfo {
  tx: string;
  amount: number;
  priceUsd: number;
  solVolume: number;
  volume: number;
  type: 'buy' | 'sell';
  wallet: string;
  walletName?: string;
  time: number;
  program: string;
  token: TradeTokenInfo;
  from?: {
    address: string;
    amount: number;
    token: TokenInfo;
  };
  to?: {
    address: string;
    amount: number;
    token: TokenInfo;
  };
}

export interface WalletTradeResponse {
  trades: {
    tx: string;
    from: {
      address: string;
      amount: number;
      token: TokenInfo;
    };
    to: {
      address: string;
      amount: number;
      token: TokenInfo;
    };
    price: {
      usd: number;
      sol: string;
    };
    volume: {
      usd: number;
      sol: number;
    };
    wallet: string;
    program: string;
    time: number;
  }[];
  nextCursor: number;
  hasNextPage: boolean;
}

export const getWalletTrades = async (walletAddress: string, cursor?: number) => {
  try {
    console.log(`Fetching trades for wallet: ${walletAddress}`);
    
    const { data, error } = await supabase.functions.invoke('solana-tracker', {
      body: { walletAddress, cursor }
    });

    if (error) {
      console.error('Error fetching wallet trades:', error);
      throw error;
    }

    console.log(`Received response for ${walletAddress}:`, data);
    return data;
  } catch (error) {
    console.error('Error fetching wallet trades:', error);
    toast({
      title: "API Request Failed",
      description: error instanceof Error ? error.message : "Unknown error occurred",
      variant: "destructive",
    });
    return null;
  }
};

export const formatTradeDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export const formatAmount = (amount: number, decimals: number = 6) => {
  return amount.toFixed(decimals);
};

export const simulateTrade = (walletAddress: string, walletName?: string): TradeInfo => {
  const randomTokens = [
    { name: 'Solana', symbol: 'SOL', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', decimals: 9 },
    { name: 'USDC', symbol: 'USDC', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', decimals: 6 },
    { name: 'Bonk', symbol: 'BONK', image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/23095.png', decimals: 5 },
    { name: 'Raydium', symbol: 'RAY', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png', decimals: 6 },
    { name: 'Jito', symbol: 'JTO', image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28524.png', decimals: 9 },
  ];
  
  const programs = ['Jupiter', 'Raydium', 'Orca', 'Phoenix'];
  const types: ('buy' | 'sell')[] = ['buy', 'sell'];
  
  const isSOLTrade = Math.random() > 0.5;
  const tradeType = types[Math.floor(Math.random() * types.length)];
  const nonSOLToken = randomTokens[Math.floor(Math.random() * (randomTokens.length - 1)) + 1];
  
  // For BUY: SOL -> Token, for SELL: Token -> SOL
  const fromToken = tradeType === 'buy' ? randomTokens[0] : nonSOLToken;
  const toToken = tradeType === 'buy' ? nonSOLToken : randomTokens[0];
  
  const fromAmount = tradeType === 'buy' 
    ? (Math.random() * 10)
    : (Math.random() * 1000);
    
  const toAmount = tradeType === 'buy'
    ? (Math.random() * 1000)
    : (Math.random() * 10);
  
  const usdValue = Math.random() * 500 + 10;
  
  return {
    tx: 'sim_' + Math.random().toString(36).substring(2, 15),
    amount: toAmount,
    priceUsd: usdValue / toAmount,
    solVolume: fromToken.symbol === 'SOL' ? fromAmount : toAmount,
    volume: usdValue,
    type: tradeType,
    wallet: walletAddress,
    time: Date.now(),
    program: programs[Math.floor(Math.random() * programs.length)],
    token: {
      from: {
        name: fromToken.name,
        symbol: fromToken.symbol,
        image: fromToken.image,
        decimals: fromToken.decimals,
        amount: fromAmount
      },
      to: {
        name: toToken.name,
        symbol: toToken.symbol,
        image: toToken.image,
        decimals: toToken.decimals,
        amount: toAmount
      }
    }
  };
};

export const getWebSocketUrl = async () => {
  try {
    console.log("Requesting WebSocket URL from edge function");
    const { data, error } = await supabase.functions.invoke('solana-tracker', {
      body: { getWsUrl: true }
    });
    
    if (error) {
      console.error('Error fetching WebSocket URL from edge function:', error);
      return { error: error.message };
    }
    
    if (!data || !data.wsUrl) {
      console.error('No WebSocket URL returned from edge function:', data);
      return { 
        error: 'Invalid response from server', 
        configValid: data?.configValid 
      };
    }
    
    return data;
  } catch (error) {
    console.error('Exception fetching WebSocket URL:', error);
    return { 
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
};
