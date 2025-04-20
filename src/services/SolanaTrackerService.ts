import { toast } from "@/components/ui/use-toast";

const BASE_URL = 'https://data.solanatracker.io';
const WS_URL = 'wss://stream.solanatracker.io';
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace this with your Solana Tracker API key

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

// Get API key from localStorage
const getApiKey = () => {
  return localStorage.getItem('solana_tracker_api_key') || '';
};

// Save API key to localStorage
export const saveApiKey = (apiKey: string) => {
  localStorage.setItem('solana_tracker_api_key', apiKey);
};

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
