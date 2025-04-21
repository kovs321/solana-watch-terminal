
import React, { useEffect, useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trash, Filter } from 'lucide-react';

interface WebSocketMessage {
  timestamp: string;
  type: string;
  direction: 'incoming' | 'outgoing';
  data: any;
}

const WebSocketDebugPanel = () => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [showOnlyTransactions, setShowOnlyTransactions] = useState(true);
  
  useEffect(() => {
    // Function to handle incoming messages
    const handleWebSocketMessage = (event: MessageEvent) => {
      const now = new Date().toISOString();
      try {
        const data = JSON.parse(event.data);
        
        // Create the message object
        const message: WebSocketMessage = {
          timestamp: now,
          type: data.type || 'unknown',
          direction: 'incoming' as const,
          data: data
        };
        
        setMessages(prev => [message, ...prev].slice(0, 100)); // Keep last 100 messages
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

    // We need to store references to the original methods
    const originalSend = WebSocket.prototype.send;
    const originalAddEventListener = WebSocket.prototype.addEventListener;
    const originalOnMessage = WebSocket.prototype.onmessage;

    // Override the WebSocket.prototype.send method to intercept outgoing messages
    WebSocket.prototype.send = function(data: string | ArrayBuffer | Blob | ArrayBufferView) {
      const now = new Date().toISOString();
      if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          
          // Create the message object
          const message: WebSocketMessage = {
            timestamp: now,
            type: parsedData.type || 'unknown',
            direction: 'outgoing' as const,
            data: parsedData
          };
          
          setMessages(prev => [message, ...prev].slice(0, 100));
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
      return originalSend.apply(this, [data]);
    };

    // Add an enhanced message listener to all WebSocket instances
    WebSocket.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (type === 'message') {
        const wrappedListener = function(this: WebSocket, event: MessageEvent) {
          // Call the original listener
          if (typeof listener === 'function') {
            listener.call(this, event);
          } else if (listener && typeof listener.handleEvent === 'function') {
            listener.handleEvent.call(listener, event);
          }
          
          // Also log the message in our panel
          handleWebSocketMessage(event);
        };
        
        return originalAddEventListener.apply(this, [type, wrappedListener as EventListener, options]);
      } else {
        return originalAddEventListener.apply(this, [type, listener, options]);
      }
    };

    // Direct hook into any existing WebSocket's onmessage
    if (window.WebSocket) {
      WebSocket.prototype.onmessage = function(this: WebSocket, event: MessageEvent) {
        if (originalOnMessage) {
          originalOnMessage.call(this, event);
        }
        handleWebSocketMessage(event);
      };
    }

    // Monitor messages on window
    window.addEventListener('message', handleWebSocketMessage);
    
    return () => {
      // Clean up by restoring original methods
      window.removeEventListener('message', handleWebSocketMessage);
      WebSocket.prototype.send = originalSend;
      WebSocket.prototype.addEventListener = originalAddEventListener;
      if (window.WebSocket) {
        WebSocket.prototype.onmessage = originalOnMessage;
      }
    };
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  // Helper to determine if a message is transaction related
  const isTransactionRelated = (message: WebSocketMessage): boolean => {
    const { data, type } = message;
    
    // Skip system messages, ping/pong, etc.
    if (type === 'ping' || type === 'pong' || type === 'system' || type === 'join') {
      return false;
    }
    
    // Check for transaction-related fields in the data object
    if (data.tx || 
        data.type === 'buy' || 
        data.type === 'sell' || 
        data.wallet || 
        data.from || 
        data.to ||
        data.amount ||
        data.token ||
        data.priceUsd ||
        (data.data && (
          data.data.tx || 
          data.data.wallet || 
          data.data.token ||
          data.data.type === 'buy' || 
          data.data.type === 'sell' ||
          data.room?.startsWith('wallet:')
        ))
    ) {
      return true;
    }
    
    // Check if it's a message object with transaction data
    if (
      data.room?.startsWith('wallet:') || 
      (data.message?.data && 
       (data.message.data.tx || 
        data.message.data.wallet ||
        data.message.data.type === 'buy' || 
        data.message.data.type === 'sell'))
    ) {
      return true;
    }
    
    return false;
  };

  // Filter messages based on toggle state
  const filteredMessages = showOnlyTransactions 
    ? messages.filter(isTransactionRelated)
    : messages;

  return (
    <Card className="bg-black border-terminal-muted">
      <CardHeader className="py-2 flex flex-row items-center justify-between">
        <div className="text-xs font-mono text-terminal-muted">WebSocket Debug Panel</div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowOnlyTransactions(!showOnlyTransactions)}
            className={`h-6 p-1 text-xs ${showOnlyTransactions ? 'text-terminal-highlight' : 'text-terminal-muted'}`}
          >
            <Filter size={12} className="mr-1" />
            {showOnlyTransactions ? "Showing Trades Only" : "Show All"}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearMessages}
            className="h-6 w-6 p-0 text-terminal-muted hover:text-terminal-error"
          >
            <Trash size={12} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px] w-full">
          <div className="p-2 space-y-2">
            {filteredMessages.length > 0 ? (
              filteredMessages.map((msg, index) => (
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
                {showOnlyTransactions 
                  ? "No trade-related WebSocket messages captured yet" 
                  : "No WebSocket messages captured yet"}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WebSocketDebugPanel;
