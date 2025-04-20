
import { useState, useEffect } from 'react';
import WebSocketService from '@/services/WebSocketService';
import { WS_URL, API_KEY } from '@/services/SolanaTrackerService';
import { toast } from '@/components/ui/use-toast';

export const useWebSocketConnection = () => {
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState({});

  useEffect(() => {
    if (!WS_URL || !API_KEY) {
      console.error("Missing WebSocket URL or API Key");
      toast({
        title: "WebSocket Configuration Error",
        description: "Missing WebSocket URL or API Key",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const service = new WebSocketService(WS_URL, API_KEY);
      setWsService(service);
      console.log("WebSocket service initialized");
    } catch (error) {
      console.error("Failed to initialize WebSocket service:", error);
      toast({
        title: "WebSocket Error",
        description: "Failed to initialize WebSocket connection",
        variant: "destructive"
      });
    }
    
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
