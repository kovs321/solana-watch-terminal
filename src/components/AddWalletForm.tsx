
import React, { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AddWalletForm: React.FC = () => {
  const { walletAdapter } = useWalletContext();
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidSolanaAddress = (address: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address || !name) {
      toast({
        title: "Missing information",
        description: "Please provide both wallet address and name",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValidSolanaAddress(address)) {
      toast({
        title: "Invalid wallet address",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('wallet_tracking')
        .insert([
          {
            wallet_address: address,
            name: name,
            transaction_type: 'WATCH', // Default type for new wallets
            token_name: 'ALL' // Default to watching all tokens
          }
        ]);

      if (error) throw error;

      toast({
        title: "Wallet added successfully",
        description: `${name} (${address.substring(0, 4)}...${address.substring(address.length - 4)}) is now being tracked`,
      });
      
      // Reset form
      setAddress('');
      setName('');
    } catch (error) {
      console.error('Error adding wallet:', error);
      toast({
        title: "Error adding wallet",
        description: "Failed to add wallet for tracking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConnected = !!walletAdapter.connected;
  
  if (!isConnected) {
    return null;
  }

  return (
    <div className="bg-terminal-background text-terminal-text rounded-md shadow-lg border border-gray-800 p-4 my-4">
      <h2 className="text-terminal-highlight font-mono text-sm mb-3 border-b border-gray-800 pb-2">
        Add Wallet to Track
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block text-xs text-terminal-muted mb-1">
            Wallet Name/Label
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Diamond Hands, Whale Wallet"
            className="w-full bg-gray-900 border-gray-700 text-terminal-text"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label htmlFor="address" className="block text-xs text-terminal-muted mb-1">
            Solana Wallet Address
          </label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Solana wallet address"
            className="w-full bg-gray-900 border-gray-700 text-terminal-text font-mono text-xs"
            disabled={isSubmitting}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-terminal-highlight hover:bg-terminal-highlight/80 text-white font-mono"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding..." : "Add Wallet"}
        </Button>
      </form>
    </div>
  );
};

export default AddWalletForm;
