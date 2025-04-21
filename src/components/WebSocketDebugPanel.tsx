
import React, { useEffect, useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trash, Shield, AlertCircle } from 'lucide-react';

interface WebSocketMessage {
  timestamp: string;
  type: string;
  direction: 'incoming' | 'outgoing';
  data: any;
}

const WebSocketDebugPanel = () => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [securityStatus, setSecurityStatus] = useState<'secure' | 'insecure' | 'checking'>('checking');
  
  useEffect(() => {
    // Check connection security
    const checkConnectionSecurity = () => {
      // Check for API key exposure in WebSocket connections
      const isSecure = !Array.from(window.performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .some(resource => 
          resource.name.includes('websocket') && 
          resource.name.includes('api_key')
        );
      
      setSecurityStatus(isSecure ? 'secure' : 'insecure');
    };
    
    // Check security initially and every 5 seconds
    checkConnectionSecurity();
    const interval = setInterval(checkConnectionSecurity, 5000);
    
    // Function to handle incoming messages
    const handleWebSocketMessage = (event: MessageEvent) => {
      const now = new Date().toISOString();
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [{
          timestamp: now,
          type: data.type || 'unknown',
          direction: 'incoming' as const,
          data: data
        }, ...prev].slice(0, 100)); // Keep last 100 messages
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        // Still log raw messages that can't be parsed
        setMessages(prev => [{
          timestamp: now,
          type: 'unparseable',
          direction: 'incoming' as const,
          data: { raw: event.data }
        }, ...prev].slice(0, 100));
      }
    };

    // Override the WebSocket.prototype.send method to intercept outgoing messages
    const originalSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(data: string | ArrayBuffer | Blob | ArrayBufferView) {
      const now = new Date().toISOString();
      if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          setMessages(prev => [{
            timestamp: now,
            type: parsedData.type || 'unknown',
            direction: 'outgoing' as const,
            data: parsedData
          }, ...prev].slice(0, 100));
        } catch (error) {
          console.error('Error parsing outgoing WebSocket message:', error);
          // Log raw outgoing messages that can't be parsed
          setMessages(prev => [{
            timestamp: now,
            type: 'unparseable',
            direction: 'outgoing' as const,
            data: { raw: typeof data === 'string' ? data : 'Binary data' }
          }, ...prev].slice(0, 100));
        }
      } else {
        // Log binary data
        setMessages(prev => [{
          timestamp: now,
          type: 'binary',
          direction: 'outgoing' as const,
          data: { type: 'Binary data' }
        }, ...prev].slice(0, 100));
      }
      return originalSend.call(this, data);
    };

    // Monitor both the message event on window and directly on WebSockets
    window.addEventListener('message', handleWebSocketMessage);
    
    // Add an enhanced message listener to all WebSocket instances
    const originalAddEventListener = WebSocket.prototype.addEventListener;
    WebSocket.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (type === 'message') {
        const wrappedListener = function(event: MessageEvent) {
          // Call the original listener
          if (typeof listener === 'function') {
            listener.call(this, event);
          } else if (listener && typeof listener.handleEvent === 'function') {
            listener.handleEvent(event);
          }
          
          // Also log the message in our panel
          handleWebSocketMessage(event);
        };
        
        return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
      } else {
        return originalAddEventListener.call(this, type, listener, options);
      }
    };

    return () => {
      window.removeEventListener('message', handleWebSocketMessage);
      WebSocket.prototype.send = originalSend;
      WebSocket.prototype.addEventListener = originalAddEventListener;
      clearInterval(interval);
    };
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <Card className="bg-black border-terminal-muted">
      <CardHeader className="py-2 flex flex-row items-center justify-between">
        <div className="text-xs font-mono text-terminal-muted flex items-center">
          <span>WebSocket Debug Panel</span>
          {securityStatus === 'secure' && (
            <div className="ml-2 flex items-center text-green-500">
              <Shield size={12} className="mr-1" />
              <span>Secure</span>
            </div>
          )}
          {securityStatus === 'insecure' && (
            <div className="ml-2 flex items-center text-red-500">
              <AlertCircle size={12} className="mr-1" />
              <span>Insecure</span>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearMessages}
          className="h-6 w-6 p-0 text-terminal-muted hover:text-terminal-error"
        >
          <Trash size={12} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px] w-full">
          <div className="p-2 space-y-2">
            {messages.length > 0 ? (
              messages.map((msg, index) => (
                <div key={index} className="text-xs font-mono">
                  <div className={`${msg.direction === 'outgoing' ? 'text-terminal-highlight' : 'text-terminal-muted'}`}>
                    {msg.timestamp} - {msg.direction} {msg.type}
                  </div>
                  <pre className="text-terminal-text overflow-x-auto p-1 bg-black/30 rounded">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <div className="text-center text-terminal-muted py-4">
                No WebSocket messages captured yet
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WebSocketDebugPanel;
