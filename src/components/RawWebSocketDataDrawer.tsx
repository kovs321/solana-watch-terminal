
import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import WebSocketDebugPanel from "./WebSocketDebugPanel";
import { Code } from "lucide-react";

const RawWebSocketDataDrawer: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-terminal-muted max-w-xl mx-auto rounded-lg">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 text-terminal-highlight font-mono">
            <Code size={18} /> Raw WebSocket Traffic
          </DrawerTitle>
          <div className="text-xs text-terminal-muted mt-1">
            Live log of the latest raw messages from the Solana Tracker WebSocket API below.
          </div>
        </DrawerHeader>
        <div className="overflow-y-auto max-h-[60vh] p-2 pr-4">
          <WebSocketDebugPanel />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default RawWebSocketDataDrawer;
