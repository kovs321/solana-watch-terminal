
import React, { createContext, useContext, useState, ReactNode } from "react";

interface RawWebSocketContextType {
  rawMessages: any[];
  pushRawMessage: (msg: any) => void;
  clearRawMessages: () => void;
}

const RawWebSocketContext = createContext<RawWebSocketContextType | undefined>(undefined);

export const useRawWebSocketContext = () => {
  const ctx = useContext(RawWebSocketContext);
  if (!ctx) throw new Error("useRawWebSocketContext must be used within RawWebSocketProvider");
  return ctx;
};

export const RawWebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [rawMessages, setRawMessages] = useState<any[]>([]);

  const pushRawMessage = (msg: any) =>
    setRawMessages((prev) => [{ ...msg, __rawReceived: Date.now() }, ...prev].slice(0, 100));
  const clearRawMessages = () => setRawMessages([]);

  return (
    <RawWebSocketContext.Provider value={{ rawMessages, pushRawMessage, clearRawMessages }}>
      {children}
    </RawWebSocketContext.Provider>
  );
};
