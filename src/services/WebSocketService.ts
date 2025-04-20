
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
    
    console.log('WebSocketService initialized with URL:', wsUrl);
    this.connect();

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.disconnect.bind(this));
    }
  }

  async connect() {
    if (this.socket && this.transactionSocket) {
      console.log('WebSockets already connected, skipping connection');
      return;
    }

    try {
      const authenticatedUrl = `${this.wsUrl}?api_key=${this.apiKey}`;
      console.log(`Attempting to connect to WebSocket server at ${this.wsUrl}...`);
      
      this.socket = new WebSocket(authenticatedUrl);
      this.transactionSocket = new WebSocket(authenticatedUrl);
      
      console.log('WebSocket instances created, setting up listeners');
      this.setupSocketListeners(this.socket, "main");
      this.setupSocketListeners(this.transactionSocket, "transaction");
    } catch (e) {
      console.error("Error connecting to WebSocket:", e);
      this.reconnect();
    }
  }

  setupSocketListeners(socket: WebSocket, type: string) {
    socket.onopen = () => {
      console.log(`[WebSocket ${type}] Connection established successfully`);
      
      console.group(`WebSocket ${type} Connection Details`);
      console.log('Socket State:', socket.readyState);
      console.log('Subscribed Rooms:', Array.from(this.subscribedRooms));
      console.groupEnd();
      
      if (socket.readyState === WebSocket.OPEN) {
        try {
          const heartbeat = { 
            type: 'ping', 
            client: 'solana-tracker', 
            timestamp: new Date().toISOString(),
            socketType: type 
          };
          socket.send(JSON.stringify(heartbeat));
          console.log(`[WebSocket ${type}] Sent initial heartbeat`);
        } catch (e) {
          console.error(`[WebSocket ${type}] Heartbeat error:`, e);
        }
      }
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.resubscribeToRooms();
      this.startPingInterval();
    };

    socket.onclose = (event) => {
      console.log(`Disconnected from ${type} WebSocket server`, event);
      this.isConnected = false;
      if (type === "main") this.socket = null;
      if (type === "transaction") this.transactionSocket = null;
      
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
        console.debug(`[WebSocket ${type}] Raw Message:`, event.data);
        const message = JSON.parse(event.data);
        
        console.group(`[WebSocket ${type}] Parsed Message`);
        console.log('Message Type:', message.type);
        console.log('Full Message:', message);
        console.groupEnd();

        // Handle system messages
        if (message.type === 'system' || message.event === 'subscribed' || message.type === 'joined') {
          console.log(`System message in ${type} socket:`, message);
          this.emitter.emit('room-subscribed', message.room || message.data?.room);
          return;
        }

        // Handle ping/pong messages
        if (message.type === 'ping') {
          console.log(`Received ping on ${type} socket, sending pong`);
          const pongMessage = JSON.stringify({ 
            type: 'pong', 
            client: 'solana-tracker',
            timestamp: new Date().toISOString() 
          });
          socket.send(pongMessage);
          return;
        }

        // Handle regular messages
        if (message.type === 'message' || message.room) {
          console.log(`Received message for room ${message.room}:`, message.data);
          
          if (message.data?.tx && this.transactions.has(message.data.tx)) {
            console.log(`Skipping duplicate transaction: ${message.data.tx}`);
            return;
          }
          
          if (message.data?.tx) {
            this.transactions.add(message.data.tx);
          }

          if (message.room) {
            this.emitter.emit(message.room, message.data);
            
            if (message.room.startsWith('wallet:')) {
              this.emitter.emit('all-transactions', message.data);
            }
            
            if (message.room.includes('price:')) {
              this.emitter.emit(`price-by-token:${message.data.token}`, message.data);
            }
          }
        }
      } catch (error) {
        console.error(`[WebSocket ${type}] Message parsing error:`, error);
        console.error('Raw Message:', event.data);
      }
    };
  }

  disconnect() {
    console.log('Disconnecting WebSockets');
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.transactionSocket) {
      this.transactionSocket.close();
      this.transactionSocket = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.isConnected = false;
    this.subscribedRooms.clear();
    this.transactions.clear();
  }

  reconnect() {
    console.log(`Reconnecting to WebSocket server (attempt ${this.reconnectAttempts + 1})`);
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.reconnectDelayMax
    );
    const jitter = delay * this.randomizationFactor;
    const reconnectDelay = delay + Math.random() * jitter;

    console.log(`Will attempt reconnection in ${Math.round(reconnectDelay)}ms`);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, reconnectDelay);
  }

  startPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    console.log('Starting ping interval (30s)');
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ 
            type: "ping", 
            client: "solana-tracker",
            timestamp: new Date().toISOString()
          }));
          console.log("Sent ping on main socket");
        } catch (e) {
          console.error("Error sending ping on main socket:", e);
        }
      } else {
        console.warn("Main socket not ready for ping, state:", this.socket?.readyState);
      }
      
      if (this.transactionSocket && this.transactionSocket.readyState === WebSocket.OPEN) {
        try {
          this.transactionSocket.send(JSON.stringify({ 
            type: "ping", 
            client: "solana-tracker",
            timestamp: new Date().toISOString()
          }));
          console.log("Sent ping on transaction socket");
        } catch (e) {
          console.error("Error sending ping on transaction socket:", e);
        }
      } else {
        console.warn("Transaction socket not ready for ping, state:", this.transactionSocket?.readyState);
      }
    }, 30000);
    
    return this.pingInterval;
  }

  joinRoom(room: string) {
    console.log(`[WebSocket] Joining room: ${room}`);
    
    const socket = room.startsWith("wallet:") || room.includes("transaction")
      ? this.transactionSocket
      : this.socket;
      
    if (!socket) {
      console.error(`[WebSocket] No socket available for room: ${room}, will queue for reconnection`);
      this.subscribedRooms.add(room);
      return;
    }
    
    if (socket.readyState !== WebSocket.OPEN) {
      console.warn(`[WebSocket] Socket not ready for room: ${room}. State: ${socket.readyState}, will queue for later`);
      this.subscribedRooms.add(room);
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
    
    const socket = room.startsWith("wallet:") || room.includes("transaction")
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
        const socket = room.startsWith("wallet:") || room.includes("transaction")
          ? this.transactionSocket
          : this.socket;
          
        const message = JSON.stringify({ type: "join", room });
        console.log(`Resubscribing to room ${room}`);
        socket.send(message);
      }
      
      this.startPingInterval();
    } else {
      console.warn("Cannot resubscribe to rooms, sockets not ready");
      console.log("Main socket state:", this.socket?.readyState);
      console.log("Transaction socket state:", this.transactionSocket?.readyState);
    }
  }
}

export default WebSocketService;
