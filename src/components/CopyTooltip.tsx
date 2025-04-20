
import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Copy } from "lucide-react";

interface CopyTooltipProps {
  value: string;
  display: React.ReactNode;
  children?: React.ReactNode;
  tooltipLabel?: string;
}

const CopyTooltip: React.FC<CopyTooltipProps> = ({ value, display, tooltipLabel }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTooltipOpen(true);
    setTimeout(() => {
      setCopied(false);
      setTooltipOpen(false);
    }, 1200);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={tooltipOpen || undefined}>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="inline-flex items-center cursor-pointer hover:underline hover:text-terminal-highlight focus-visible:outline-none"
            onClick={handleCopy}
            onMouseLeave={() => setTooltipOpen(false)}
            onMouseEnter={() => setTooltipOpen(false)}
            title={tooltipLabel || value}
          >
            {display}
            <Copy size={13} className="ml-1 text-terminal-muted opacity-70 group-hover:text-terminal-highlight" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="z-50">
          {copied ? "Copied!" : tooltipLabel || "Copy"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CopyTooltip;

