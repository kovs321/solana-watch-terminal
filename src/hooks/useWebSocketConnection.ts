
import { useState, useEffect, useCallback } from 'react';
import WebSocketService from '@/services/WebSocketService';
import { getWebSocketUrl } from '@/services/SolanaTrackerService';
import { toast } from '@/components/ui/use-toast';

export const useWebSocketConnection = () => {
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState({});
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const initWebSocket = useCallback(async () => {
    try {
      console.log("Initializing WebSocket connection...");
      
      // Get WebSocket URL from the edge function
      const response = await getWebSocketUrl();
      
      if (!response || !response.wsUrl) {
        console.error("Failed to get WebSocket URL from the edge function", response);
        const errorDetails = response?.error ? `: ${response.error}` : '';
        const configInfo = response?.configValid === false ? " (API configuration invalid)" : "";
        
        setLastError(`WebSocket URL retrieval failed${errorDetails}${configInfo}`);
        
        toast({
          title: "WebSocket Configuration Error",
          description: `Failed to get WebSocket URL${configInfo}. Please check that API keys are valid.`,
          variant: "destructive"
        });
        return null;
      }
      
      console.log("Received WebSocket URL:", response.wsUrl);
      
      // Create new WebSocket service with the proxy WebSocket URL
      const service = new WebSocketService(response.wsUrl, "");  // API key is no longer needed here
      setWsService(service);
      console.log("WebSocket service initialized with proxy WebSocket URL");
      
      return service;
    } catch (error) {
      console.error("Failed to initialize WebSocket service:", error);
      setLastError(error instanceof Error ? error.message : String(error));
      
      toast({
        title: "WebSocket Error",
        description: "Failed to initialize WebSocket connection. Please check console for details.",
        variant: "destructive"
      });
      return null;
    }
  }, []);
  
  useEffect(() => {
    // Initialize WebSocket connection
    initWebSocket();
    
    return () => {
      if (wsService) {
        console.log("Cleaning up WebSocket service");
        wsService.disconnect();
      }
    };
  }, [initWebSocket]);
  
  useEffect(() => {
    if (!wsService) return;
    
    const statusInterval = setInterval(() => {
      const status = wsService.getConnectionStatus();
      setIsConnected(status.connected);
      setWsStatus(status);
      
      // If not connected after multiple status checks, attempt to reconnect
      if (!status.connected) {
        setConnectionAttempts(prev => {
          if (prev > 5) {
            console.log("Multiple connection attempts failed, trying to re-initialize WebSocket");
            initWebSocket();
            return 0;
          }
          return prev + 1;
        });
      } else {
        setConnectionAttempts(0);
        setLastError(null); // Clear error when successfully connected
      }
    }, 1000);
    
    return () => clearInterval(statusInterval);
  }, [wsService, initWebSocket]);

  return { 
    wsService, 
    isConnected, 
    wsStatus, 
    lastError,
    connectionAttempts,
    reinitialize: initWebSocket 
  };
};
