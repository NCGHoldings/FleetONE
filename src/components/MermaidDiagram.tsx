import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Skeleton } from "./ui/skeleton";

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      fontFamily: "Inter, sans-serif",
    });

    const renderChart = async () => {
      if (!chart) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvgContent(svg);
      } catch (err) {
        console.error("Failed to render Mermaid chart", err);
      }
    };

    renderChart();
  }, [chart]);

  if (!svgContent) {
    return <Skeleton className="h-[400px] w-full rounded-md" />;
  }

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center w-full overflow-auto bg-slate-50 p-6 rounded-lg border"
      dangerouslySetInnerHTML={{ __html: svgContent }} 
    />
  );
};
