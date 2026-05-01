import React, { useEffect, useRef, useState } from "react";
import { Copy, ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { BlueprintGenerator } from "./blueprint_data";

declare global {
  interface Window {
    mermaid: any;
  }
}

export const PipelineBlueprintViewer = ({ code, filename }: { code: BlueprintGenerator; filename: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCode, setResolvedCode] = useState<string | null>(null);
  const { selectedCompanyId } = useCompany();

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.2));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCopy = () => {
    if (resolvedCode) {
      navigator.clipboard.writeText(resolvedCode);
      toast.success("Blueprint code copied to clipboard!");
    }
  };

  useEffect(() => {
    let isMounted = true;
    setSvgContent(null);
    setError(null);
    setResolvedCode(null);

    const renderChart = async () => {
      try {
        let finalCode = "";
        
        if (typeof code === "function") {
          if (!selectedCompanyId) {
            // Still loading company context, just wait
            return;
          }
          finalCode = await code(supabase, selectedCompanyId);
        } else {
          finalCode = code;
        }

        if (!isMounted) return;
        setResolvedCode(finalCode);
        if (!window.mermaid) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        window.mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "Inter, sans-serif",
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await window.mermaid.render(id, finalCode);

        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.error("Failed to render Mermaid chart", err);
        if (isMounted) {
          setError(err.message || "Failed to load diagram.");
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [code, selectedCompanyId]);

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e] rounded-b-lg overflow-hidden border-t border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border-b border-slate-700 z-10 shadow-sm">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-sm text-slate-400 font-mono font-bold tracking-wider">{filename}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div 
        className="p-8 overflow-hidden flex-1 bg-[#1e1e1e] relative select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {svgContent && !error && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-slate-800 p-1.5 rounded-lg border border-slate-700 shadow-xl opacity-90 hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-center w-12 text-xs font-mono text-slate-300 bg-slate-900/50 h-8 rounded">
              {Math.round(scale * 100)}%
            </div>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-slate-700 mx-1"></div>
            <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700" title="Reset View">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}

        {error ? (
          <div className="text-red-400 font-mono p-4 border border-red-500/30 rounded bg-red-500/10 h-full flex flex-col justify-center items-center">
            <div className="max-w-2xl text-center">
              <p className="font-bold mb-2 text-lg">Error rendering diagram</p>
              <p className="mb-4 text-sm opacity-80">{error}</p>
              <pre className="text-xs text-slate-400 mt-4 text-left bg-black/20 p-4 rounded overflow-auto max-h-[300px] w-full">
                {resolvedCode || String(code)}
              </pre>
            </div>
          </div>
        ) : svgContent ? (
          <div 
            ref={containerRef} 
            className="flex justify-center min-w-full min-h-full items-center text-slate-200 transition-transform duration-75 ease-linear"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center'
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 text-slate-500">
            <Skeleton className="h-[400px] w-[800px] bg-slate-800 rounded-lg" />
            <span className="animate-pulse font-mono text-sm">Rendering Architecture Blueprint...</span>
          </div>
        )}
      </div>
    </div>
  );
};
