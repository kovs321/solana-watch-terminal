
import { toast } from "@/components/ui/use-toast";

const BASE_URL = 'https://data.solanatracker.io';

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

// Get API key from localStorage for now (we'll prompt the user to add this later)
const getApiKey = () => {
  return localStorage.getItem('solana_tracker_api_key') || '';
};

// Save API key to localStorage
export const saveApiKey = (apiKey: string) => {
  localStorage.setItem('solana_tracker_api_key', apiKey);
};

// Get wallet trades
export const getWalletTrades = async (walletAddress: string, cursor?: number) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    toast({
      title: "API Key Missing",
      description: "Please add your Solana Tracker API key in the settings",
      variant: "destructive",
    });
    return null;
  }
  
  try {
    const url = new URL(`/wallet/${walletAddress}/trades`, BASE_URL);
    if (cursor) {
      url.searchParams.append('cursor', cursor.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
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
export const WS_URL = 'wss://stream.solanatracker.io';

// Format date from timestamp
export const formatTradeDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Format amount with appropriate decimals
export const formatAmount = (amount: number, decimals: number = 6) => {
  return amount.toFixed(decimals);
};
