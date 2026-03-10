import { X } from "lucide-react";
import { ExternalSystem } from "./ExternalSystemContext";

interface ExternalSystemOverlayProps {
  system: ExternalSystem;
  onClose: () => void;
}

export function ExternalSystemOverlay({ system, onClose }: ExternalSystemOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground shadow-md">
        <span className="font-semibold text-sm">{system.name}</span>
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors text-sm font-medium"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>
      <iframe
        src={system.url}
        className="flex-1 w-full border-0"
        title={system.name}
        allow="clipboard-write; clipboard-read"
      />
    </div>
  );
}
