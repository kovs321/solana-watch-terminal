
import { Connection, PublicKey } from '@solana/web3.js';

// Solana RPC URL - Using a public devnet endpoint for this example
// For production, use a reliable RPC provider
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

// Create connection to Solana
export const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Transaction types
export interface TransactionInfo {
  signature: string;
  timestamp: number;
  senderAddress: string;
  senderName?: string;
  receiverAddress?: string;
  amount?: number;
  tokenName?: string;
  tokenSymbol?: string;
  type: 'send' | 'receive' | 'swap' | 'unknown';
}

// Function to parse transaction data from Solana (simplified for example)
export const parseTransaction = async (signature: string, walletName?: string): Promise<TransactionInfo> => {
  try {
    // Get transaction details
    const txn = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!txn) {
      throw new Error('Transaction not found');
    }
    
    // Extract basic info (this is a simplified version)
    const timestamp = txn.blockTime ? txn.blockTime * 1000 : Date.now();
    
    // Get account keys safely depending on message version
    let senderAddress = 'unknown';
    if ('accountKeys' in txn.transaction.message) {
      senderAddress = txn.transaction.message.accountKeys[0].toString();
    } else if (txn.transaction.message.staticAccountKeys && txn.transaction.message.staticAccountKeys.length > 0) {
      senderAddress = txn.transaction.message.staticAccountKeys[0].toString();
    }
    
    // In a full implementation, you would parse instruction data to extract token transfers, amounts, etc.
    // This requires more complex logic depending on the transaction type
    
    return {
      signature,
      timestamp,
      senderAddress,
      senderName: walletName,
      type: 'unknown'
    };
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return {
      signature,
      timestamp: Date.now(),
      senderAddress: 'unknown',
      type: 'unknown'
    };
  }
};

// Function to subscribe to account transaction changes
export const subscribeToWalletTransactions = (
  walletAddress: string, 
  walletName: string | undefined,
  onTransaction: (transaction: TransactionInfo) => void
) => {
  try {
    const publicKey = new PublicKey(walletAddress);
    
    // Subscribe to account
    const subscriptionId = connection.onAccountChange(
      publicKey,
      async (accountInfo, context) => {
        // When this wallet makes a transaction, we'll get this notification
        // In practice you'd want to fetch the actual transaction data
        const transactions = await connection.getSignaturesForAddress(publicKey, { limit: 1 });
        
        if (transactions && transactions.length > 0) {
          const txInfo = await parseTransaction(transactions[0].signature, walletName);
          onTransaction(txInfo);
        }
      },
      'confirmed'
    );
    
    return subscriptionId;
  } catch (error) {
    console.error(`Error subscribing to wallet ${walletAddress}:`, error);
    return null;
  }
};

// Function to unsubscribe from account
export const unsubscribeFromWallet = (subscriptionId: number) => {
  if (subscriptionId) {
    connection.removeAccountChangeListener(subscriptionId);
  }
};

// For development/testing: Simulate transaction (would remove in production)
export const simulateTransaction = (
  walletAddress: string,
  walletName: string,
  onTransaction: (transaction: TransactionInfo) => void
) => {
  const randomTypes = ['send', 'receive', 'swap', 'unknown'] as const;
  const randomTokens = [
    { name: 'Solana', symbol: 'SOL' },
    { name: 'USDC', symbol: 'USDC' },
    { name: 'Bonk', symbol: 'BONK' },
    { name: 'Raydium', symbol: 'RAY' },
  ];
  
  setTimeout(() => {
    const randomType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
    const randomToken = randomTokens[Math.floor(Math.random() * randomTokens.length)];
    const randomAmount = Math.random() * 1000;
    
    onTransaction({
      signature: 'sim_' + Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
      senderAddress: walletAddress,
      senderName: walletName,
      receiverAddress: randomType === 'send' ? 
        '5' + Math.random().toString(36).substring(2, 14) : undefined,
      amount: randomAmount,
      tokenName: randomToken.name,
      tokenSymbol: randomToken.symbol,
      type: randomType
    });
    
    // Schedule another simulated transaction
    simulateTransaction(walletAddress, walletName, onTransaction);
  }, Math.random() * 15000 + 5000); // Random time between 5-20 seconds
};
