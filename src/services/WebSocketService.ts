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
      console.log(`Connected to ${type} WebSocket server`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Send a ping immediately after connection to test the connection
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: "ping", client: "solana-tracker" }));
          console.log(`Sent initial ping on ${type} socket`);
        } catch (e) {
          console.error(`Error sending initial ping on ${type} socket:`, e);
        }
      }
      
      this.resubscribeToRooms();
    };

    socket.onclose = (event) => {
      console.log(`Disconnected from ${type} WebSocket server`, event);
      this.isConnected = false;
      if (type === "main") this.socket = null;
      if (type === "transaction") this.transactionSocket = null;
      this.reconnect();
    };

    socket.onerror = (error) => {
      console.error(`WebSocket ${type} error:`, error);
    };

    socket.onmessage = (event) => {
      try {
        console.log(`Received ${type} message:`, event.data);
        const message = JSON.parse(event.data);
        
        if (message.type === "message") {
          console.log(`Processed message for room ${message.room}:`, message.data);
          
          if (message.data?.tx && this.transactions.has(message.data.tx)) {
            console.log(`Skipping duplicate transaction: ${message.data.tx}`);
            return;
          } else if (message.data?.tx) {
            this.transactions.add(message.data.tx);
          }
          
          if (message.room.includes('price:')) {
            this.emitter.emit(`price-by-token:${message.data.token}`, message.data);
          }
          
          this.emitter.emit(message.room, message.data);
        } else if (message.type === "system") {
          console.log(`System message: ${message.event}`, message);
          
          if (message.event === "subscribed") {
            console.log(`Successfully subscribed to room: ${message.room}`);
          }
        } else if (message.type === "pong") {
          console.log(`Received pong response on ${type} socket`);
        } else {
          console.log(`Unknown message type on ${type} socket:`, message);
        }
      } catch (error) {
        console.error("Error processing message:", error);
        console.error("Raw message data:", event.data);
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
    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
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
    
    return pingInterval;
  }

  joinRoom(room: string) {
    console.log(`Joining room: ${room}`);
    this.subscribedRooms.add(room);
    
    // Always use transaction socket for wallet room subscriptions
    const socket = room.startsWith("wallet:") || room.includes("transaction")
      ? this.transactionSocket
      : this.socket;
      
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: "join", room });
      console.log(`Sending join request for room ${room} on ${room.startsWith("wallet:") ? "transaction" : "main"} socket:`, message);
      socket.send(message);
    } else {
      console.warn(`Cannot join room ${room}, socket not ready (state: ${socket?.readyState})`);
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
