
import { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  name: string;
  wallet_address: string;
  transaction_type: 'BUY' | 'SELL';
  token_name: string;
  value_usd: number;
  created_at: string;
}

const TransactionTable = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('tracked_wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      // Validate and convert transaction_type to ensure it matches our enum type
      const validTransactions = (data || []).map(tx => {
        // Make sure transaction_type is either 'BUY' or 'SELL'
        const validType = tx.transaction_type === 'BUY' || tx.transaction_type === 'SELL' 
          ? tx.transaction_type as 'BUY' | 'SELL'
          : 'BUY'; // Default to 'BUY' if invalid
        
        return {
          ...tx,
          transaction_type: validType
        } as Transaction;
      });

      setTransactions(validTransactions);
    };

    fetchTransactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracked_wallets'
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="font-mono text-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-terminal-background border-terminal-muted">
          <TableRow>
            <TableHead className="text-terminal-highlight">NAME</TableHead>
            <TableHead className="text-terminal-highlight">WALLET ADDRESS</TableHead>
            <TableHead className="text-terminal-highlight">TYPE</TableHead>
            <TableHead className="text-terminal-highlight">TOKEN</TableHead>
            <TableHead className="text-terminal-highlight text-right">VALUE (USD)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow 
              key={tx.id}
              className="border-terminal-muted hover:bg-terminal-background/50"
            >
              <TableCell className="text-terminal-text">{tx.name}</TableCell>
              <TableCell className="text-terminal-text font-mono">{tx.wallet_address}</TableCell>
              <TableCell className={tx.transaction_type === 'BUY' ? 'text-terminal-success' : 'text-terminal-error'}>
                {tx.transaction_type}
              </TableCell>
              <TableCell className="text-terminal-highlight">{tx.token_name}</TableCell>
              <TableCell className="text-right text-terminal-text">
                ${tx.value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionTable;
