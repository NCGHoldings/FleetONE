import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';

export interface DecisionNodeData {
  label: string;
  condition?: string;
  stats?: {
    yes?: number;
    no?: number;
    pending?: number;
  };
  color?: string;
}

function DecisionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DecisionNodeData;
  const { label, condition, stats, color = 'yellow' } = nodeData;

  const colorClasses: Record<string, string> = {
    yellow: 'border-yellow-500 bg-yellow-500/10',
    orange: 'border-orange-500 bg-orange-500/10',
    blue: 'border-blue-500 bg-blue-500/10',
    purple: 'border-purple-500 bg-purple-500/10',
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-3 !h-3" />
      <div
        className={`relative w-[160px] h-[100px] flex items-center justify-center ${
          selected ? 'scale-105' : ''
        }`}
      >
        {/* Diamond shape */}
        <div
          className={`absolute inset-0 transform rotate-45 rounded-lg border-2 shadow-lg transition-all duration-200 ${
            colorClasses[color]
          } ${selected ? 'ring-2 ring-primary shadow-xl' : ''}`}
        />
        
        {/* Content */}
        <div className="relative z-10 text-center px-2 max-w-[140px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-xs leading-tight">{label}</span>
          </div>
          {condition && (
            <p className="text-[10px] text-muted-foreground leading-tight">{condition}</p>
          )}
          
          {/* Stats */}
          {stats && (
            <div className="flex justify-center gap-1 mt-1.5">
              {stats.yes !== undefined && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-700">
                  ✓ {stats.yes}
                </Badge>
              )}
              {stats.no !== undefined && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-700">
                  ✗ {stats.no}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Multiple output handles for decision branches */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="no" 
        className="!bg-red-500 !w-3 !h-3"
        style={{ left: -6 }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="yes" 
        className="!bg-green-500 !w-3 !h-3"
        style={{ right: -6 }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="default" 
        className="!bg-muted-foreground !w-3 !h-3"
      />
    </>
  );
}

export const DecisionNode = memo(DecisionNodeComponent);
