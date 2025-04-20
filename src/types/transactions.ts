
export interface SolanaTransaction {
  id: string;
  walletAddress: string;
  walletName?: string;
  type: 'BUY' | 'SELL';
  fromToken: string;
  fromAmount: number | string;
  toToken: string;
  toAmount: number | string;
  program: string;
  usdValue: number;
  timestamp: number;
  displayTime: string;
}

export interface TransactionContextType {
  transactions: SolanaTransaction[];
  clearTransactions: () => void;
  isConnected: boolean;
  wsStatus: any;
  generateTestTransaction: () => void;
  subscribeToTestWallet: (address: string) => Promise<void>;
}
