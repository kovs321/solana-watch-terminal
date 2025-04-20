
import React, { useEffect, useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardContent } from './ui/card';

interface WebSocketMessage {
  timestamp: string;
  type: string;
  data: any;
}

const WebSocketDebugPanel = () => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      const now = new Date().toISOString();
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [{
          timestamp: now,
          type: data.type || 'unknown',
          data: data
        }, ...prev].slice(0, 100)); // Keep last 100 messages
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
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
            type: 'outgoing',
            data: parsedData
          }, ...prev].slice(0, 100));
        } catch (error) {
          console.error('Error parsing outgoing WebSocket message:', error);
        }
      }
      return originalSend.call(this, data);
    };

    // Listen for messages on all WebSocket instances
    window.addEventListener('message', handleWebSocketMessage);

    return () => {
      window.removeEventListener('message', handleWebSocketMessage);
      WebSocket.prototype.send = originalSend;
    };
  }, []);

  return (
    <Card className="bg-black border-terminal-muted">
      <CardHeader className="py-2">
        <div className="text-xs font-mono text-terminal-muted">WebSocket Debug Panel</div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px] w-full">
          <div className="p-2 space-y-2">
            {messages.map((msg, index) => (
              <div key={index} className="text-xs font-mono">
                <div className="text-terminal-muted">{msg.timestamp} - {msg.type}</div>
                <pre className="text-terminal-text overflow-x-auto p-1 bg-black/30 rounded">
                  {JSON.stringify(msg.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WebSocketDebugPanel;
