
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your Supabase URL and anon key from the Supabase dashboard
// For this demo, using placeholder values that will need to be replaced
const supabaseUrl = 'https://example.supabase.co';
const supabaseAnonKey = 'your-anon-key';

// For demo purposes, we're also implementing fallback local storage
// This lets the app work before Supabase is fully configured
const useLocalStorageFallback = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our wallet data
export interface WalletEntry {
  id?: number;
  address: string;
  name: string;
  created_at?: string;
}

// Local storage key for wallet data
const LOCAL_STORAGE_KEY = 'solana-watch-wallets';

// Function to get wallets from local storage
function getWalletsFromLocalStorage(): WalletEntry[] {
  try {
    const storedWallets = localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedWallets ? JSON.parse(storedWallets) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

// Function to save wallets to local storage
function saveWalletsToLocalStorage(wallets: WalletEntry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(wallets));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Function to fetch all wallets
export async function fetchWallets(): Promise<WalletEntry[]> {
  // Use local storage if fallback is enabled
  if (useLocalStorageFallback) {
    return getWalletsFromLocalStorage();
  }
  
  // Otherwise use Supabase
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching wallets from Supabase:', error);
    return [];
  }
  
  return data || [];
}

// Function to add a new wallet
export async function addWallet(address: string, name: string): Promise<WalletEntry | null> {
  const newWallet: WalletEntry = {
    id: Date.now(), // Use timestamp as ID for local storage
    address,
    name,
    created_at: new Date().toISOString()
  };
  
  // Use local storage if fallback is enabled
  if (useLocalStorageFallback) {
    const wallets = getWalletsFromLocalStorage();
    
    // Check if wallet already exists
    if (wallets.some(w => w.address.toLowerCase() === address.toLowerCase())) {
      return null;
    }
    
    const updatedWallets = [newWallet, ...wallets];
    saveWalletsToLocalStorage(updatedWallets);
    return newWallet;
  }
  
  // Otherwise use Supabase
  const { data, error } = await supabase
    .from('wallets')
    .insert([{ address, name }])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding wallet to Supabase:', error);
    return null;
  }
  
  return data;
}
