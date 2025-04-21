
import { useState, useEffect } from 'react';
import WebSocketService from '@/services/WebSocketService';
import { getWebSocketUrl } from '@/services/SolanaTrackerService';
import { toast } from '@/components/ui/use-toast';

export const useWebSocketConnection = () => {
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState({});

  useEffect(() => {
    // Initialize WebSocket connection
    const initWebSocket = async () => {
      try {
        // Get WebSocket URL from the edge function
        const wsUrl = await getWebSocketUrl();
        
        if (!wsUrl) {
          console.error("Failed to get WebSocket URL from the edge function");
          toast({
            title: "WebSocket Configuration Error",
            description: "Failed to get WebSocket URL. Please check the console for details.",
            variant: "destructive"
          });
          return;
        }
        
        // Create new WebSocket service with the URL returned from the edge function
        const service = new WebSocketService(wsUrl, "");  // We don't need to pass API key here, it's in the URL
        setWsService(service);
        console.log("WebSocket service initialized with URL from edge function");
      } catch (error) {
        console.error("Failed to initialize WebSocket service:", error);
        toast({
          title: "WebSocket Error",
          description: "Failed to initialize WebSocket connection",
          variant: "destructive"
        });
      }
    };
    
    initWebSocket();
    
    return () => {
      if (wsService) {
        wsService.disconnect();
      }
    };
  }, []);
  
  useEffect(() => {
    if (!wsService) return;
    
    const statusInterval = setInterval(() => {
      const status = wsService.getConnectionStatus();
      setIsConnected(status.connected);
      setWsStatus(status);
    }, 1000);
    
    return () => clearInterval(statusInterval);
  }, [wsService]);

  return { wsService, isConnected, wsStatus };
};
