
import { useState } from 'react';
import { useTransactionContext } from '@/contexts/TransactionContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const ApiKeyForm = () => {
  const { setApiKey } = useTransactionContext();
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      setApiKey(key.trim());
    }
  };

  return (
    <div className="p-4 border border-terminal-muted bg-terminal-background/70 rounded-md">
      <h3 className="text-terminal-highlight mb-4 text-center">Solana Tracker API Key Required</h3>
      <p className="text-terminal-text mb-4">
        To view real-time Solana transactions, please enter your Solana Tracker API key.
        You can obtain this key by subscribing to the Solana Tracker data service.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-terminal-muted mb-1 text-sm">
            API Key
          </label>
          <Input
            id="apiKey" 
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="bg-black border-terminal-muted text-terminal-text font-mono"
            placeholder="Enter your Solana Tracker API key"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-terminal-highlight hover:bg-terminal-highlight/80 text-black font-mono"
          disabled={!key.trim()}
        >
          Connect to Solana Tracker
        </Button>
      </form>
      
      <div className="mt-4 text-xs text-terminal-muted">
        The API key will be stored in your browser's local storage and is only used to authenticate API requests to Solana Tracker.
      </div>
    </div>
  );
};
