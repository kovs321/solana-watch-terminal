import EventEmitter from "eventemitter3";

class WebSocketService {
  wsUrl: string;
  apiKey: string;
  socket: WebSocket | null;
  transactionSocket: WebSocket | null;
  reconnectAttempts: number;
  reconnectDelay: number;
  reconnectDelayMax: number;
  randomizationFactor: number;
  emitter: EventEmitter;
  subscribedRooms: Set<string>;
  transactions: Set<string>;
  isConnected: boolean;
  pingInterval: ReturnType<typeof setInterval> | null;

  constructor(wsUrl: string, apiKey: string) {
    this.wsUrl = wsUrl;
    this.apiKey = apiKey;
    this.socket = null;
    this.transactionSocket = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2500;
    this.reconnectDelayMax = 4500;
    this.randomizationFactor = 0.5;
    this.emitter = new EventEmitter();
    this.subscribedRooms = new Set();
    this.transactions = new Set();
    this.isConnected = false;
    this.pingInterval = null;
    this.connect();

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.disconnect.bind(this));
    }
  }

  async connect() {
    if (this.socket && this.transactionSocket) {
      return;
    }

    try {
      // Use the correct query parameter name 'api_key' as specified
      const authenticatedUrl = `${this.wsUrl}?api_key=${this.apiKey}`;
      console.log(`Connecting to WebSocket server at ${authenticatedUrl}...`);
      
      this.socket = new WebSocket(authenticatedUrl);
      this.transactionSocket = new WebSocket(authenticatedUrl);
      
      this.setupSocketListeners(this.socket, "main");
      this.setupSocketListeners(this.transactionSocket, "transaction");
    } catch (e) {
      console.error("Error connecting to WebSocket:", e);
      this.reconnect();
    }
  }

  setupSocketListeners(socket: WebSocket, type: string) {
    socket.onopen = () => {
      console.log(`[WebSocket ${type}] Connection established`);
      
      console.group(`WebSocket ${type} Connection Details`);
      console.log('Socket State:', socket.readyState);
      console.log('Subscribed Rooms:', Array.from(this.subscribedRooms));
      console.groupEnd();
      
      // Enhanced heartbeat
      if (socket.readyState === WebSocket.OPEN) {
        try {
          const heartbeat = { 
            type: 'ping', 
            client: 'solana-tracker', 
            timestamp: new Date().toISOString(),
            socketType: type 
          };
          socket.send(JSON.stringify(heartbeat));
          console.log(`[WebSocket ${type}] Sent heartbeat`);
        } catch (e) {
          console.error(`[WebSocket ${type}] Heartbeat error:`, e);
        }
      }
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.resubscribeToRooms();
    };

    socket.onclose = (event) => {
      console.log(`Disconnected from ${type} WebSocket server`, event);
      this.isConnected = false;
      if (type === "main") this.socket = null;
      if (type === "transaction") this.transactionSocket = null;
      
      // Clear ping interval if it exists
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      this.reconnect();
    };

    socket.onerror = (error) => {
      console.error(`WebSocket ${type} error:`, error);
    };

    socket.onmessage = (event) => {
      try {
        console.log(`[WebSocket ${type}] Raw Message:`, event.data);
        const message = JSON.parse(event.data);
        
        // Log all incoming messages for debugging
        console.group(`[WebSocket ${type}] Parsed Message`);
        console.log('Type:', message.type);
        console.log('Full Message:', message);
        console.groupEnd();
        
        // Handle system messages
        if (message.type === "system") {
          console.log(`System message: ${message.event}`, message);
          if (message.event === "subscribed") {
            console.log(`Successfully subscribed to room: ${message.room}`);
            this.emitter.emit('room-subscribed', message.room);
          }
          return;
        }
        
        // Handle heartbeat messages
        if (message.type === "ping") {
          console.log(`[WebSocket ${type}] Received ping, sending pong`);
          socket.send(JSON.stringify({ 
            type: "pong",
            client: "solana-tracker",
            timestamp: new Date().toISOString()
          }));
          return;
        }
        
        if (message.type === "pong") {
          console.log(`[WebSocket ${type}] Received pong confirmation`);
          return;
        }
        
        // Handle transaction messages
        if (message.type === "message") {
          console.log(`Received message for room ${message.room}:`, message.data);
          
          // Deduplicate transactions
          if (message.data?.tx && this.transactions.has(message.data.tx)) {
            console.log(`Skipping duplicate transaction: ${message.data.tx}`);
            return;
          }
          
          if (message.data?.tx) {
            console.log(`Adding new transaction: ${message.data.tx}`);
            this.transactions.add(message.data.tx);
          }
          
          // Handle price updates
          if (message.room.includes('price:')) {
            this.emitter.emit(`price-by-token:${message.data.token}`, message.data);
          }
          
          // Handle wallet transactions
          if (message.room.startsWith('wallet:')) {
            console.log(`Emitting wallet transaction for ${message.room}:`, message.data);
            this.emitter.emit(message.room, message.data);
            this.emitter.emit('all-transactions', message.data);
          }
          
          // Always emit for the specific room
          this.emitter.emit(message.room, message.data);
        }
      } catch (error) {
        console.error(`[WebSocket ${type}] Parse Error:`, error);
        console.error('Raw Message:', event.data);
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.transactionSocket) {
      this.transactionSocket.close();
      this.transactionSocket = null;
    }
    
    // Clear ping interval if it exists
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.isConnected = false;
    this.subscribedRooms.clear();
    this.transactions.clear();
  }

  reconnect() {
    console.log("Reconnecting to WebSocket server");
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.reconnectDelayMax
    );
    const jitter = delay * this.randomizationFactor;
    const reconnectDelay = delay + Math.random() * jitter;

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, reconnectDelay);
  }

  startPingInterval() {
    // Clear any existing ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Send a ping every 30 seconds to keep the connection alive
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "ping", client: "solana-tracker" }));
          console.log("Sent ping on main socket");
        } catch (e) {
          console.error("Error sending ping on main socket:", e);
        }
      }
      
      if (this.transactionSocket && this.transactionSocket.readyState === WebSocket.OPEN) {
        try {
          this.transactionSocket.send(JSON.stringify({ type: "ping", client: "solana-tracker" }));
          console.log("Sent ping on transaction socket");
        } catch (e) {
          console.error("Error sending ping on transaction socket:", e);
        }
      }
    }, 30000);
    
    return this.pingInterval;
  }

  joinRoom(room: string) {
    console.log(`[WebSocket] Joining room: ${room}`);
    
    // Always use transaction socket for wallet-related rooms
    const socket = room.startsWith("wallet:") || room.includes("transaction")
      ? this.transactionSocket
      : this.socket;
      
    if (!socket) {
      console.error(`[WebSocket] No socket available for room: ${room}`);
      return;
    }
    
    if (socket.readyState !== WebSocket.OPEN) {
      console.warn(`[WebSocket] Socket not ready for room: ${room}. State: ${socket.readyState}`);
      return;
    }
    
    try {
      const message = JSON.stringify({ type: "join", room });
      socket.send(message);
      console.log(`[WebSocket] Sent join request for ${room} on ${room.startsWith("wallet:") ? "transaction" : "main"} socket`);
      this.subscribedRooms.add(room);
    } catch (error) {
      console.error(`[WebSocket] Failed to join room ${room}:`, error);
    }
  }

  leaveRoom(room: string) {
    console.log(`Leaving room: ${room}`);
    this.subscribedRooms.delete(room);
    
    const socket = room.includes("transaction")
      ? this.transactionSocket
      : this.socket;
      
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "leave", room }));
    }
  }

  on(room: string, listener: (data: any) => void) {
    console.log(`Adding listener for room: ${room}`);
    this.emitter.on(room, listener);
  }

  off(room: string, listener: (data: any) => void) {
    this.emitter.off(room, listener);
  }

  getSocket() {
    return this.socket;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      mainSocketState: this.socket?.readyState,
      transactionSocketState: this.transactionSocket?.readyState,
      subscribedRooms: Array.from(this.subscribedRooms),
      authenticated: !!this.apiKey
    };
  }

  resubscribeToRooms() {
    console.log(`Resubscribing to ${this.subscribedRooms.size} rooms`);
    
    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN &&
      this.transactionSocket &&
      this.transactionSocket.readyState === WebSocket.OPEN
    ) {
      for (const room of this.subscribedRooms) {
        // Always use transaction socket for wallet room subscriptions during resubscribe
        const socket = room.startsWith("wallet:") || room.includes("transaction")
          ? this.transactionSocket
          : this.socket;
          
        const message = JSON.stringify({ type: "join", room });
        console.log(`Resubscribing to room ${room}:`, message);
        socket.send(message);
      }
      
      // Start the ping interval after resubscribing
      this.startPingInterval();
    } else {
      console.warn("Cannot resubscribe to rooms, sockets not ready");
    }
  }
}

export default WebSocketService;
