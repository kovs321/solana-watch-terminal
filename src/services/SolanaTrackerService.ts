import { toast } from "@/components/ui/use-toast";

const BASE_URL = 'https://data.solanatracker.io';
const WS_URL = 'wss://datastream.solanatracker.io/6332a381-1d02-45e9-b9d1-fa797b304a40';
const API_KEY = '7e869836-9708-43e2-bb2e-1c11959d306a';

// Types for API responses
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
  time: number;
  program: string;
  token: TradeTokenInfo;
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

// Get wallet trades
export const getWalletTrades = async (walletAddress: string, cursor?: number) => {
  try {
    const url = new URL(`/wallet/${walletAddress}/trades`, BASE_URL);
    if (cursor) {
      url.searchParams.append('cursor', cursor.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json() as WalletTradeResponse;
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

// Constants for WebSocket connection
export { WS_URL };

// Format date from timestamp
export const formatTradeDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Format amount with appropriate decimals
export const formatAmount = (amount: number, decimals: number = 6) => {
  return amount.toFixed(decimals);
};
