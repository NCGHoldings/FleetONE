import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Zap, Mail, FileText, Bell, Loader2 } from 'lucide-react';

export interface ActionNodeData {
  label: string;
  actionType: 'email' | 'document' | 'notification' | 'trigger' | 'custom';
  description?: string;
  isExecuting?: boolean;
  lastExecuted?: string;
  onExecute?: () => void;
}

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData;
  const { label, actionType, description, isExecuting, lastExecuted, onExecute } = nodeData;

  const iconMap = {
    email: Mail,
    document: FileText,
    notification: Bell,
    trigger: Zap,
    custom: Zap,
  };

  const colorMap = {
    email: 'from-blue-500 to-blue-600',
    document: 'from-purple-500 to-purple-600',
    notification: 'from-orange-500 to-orange-600',
    trigger: 'from-green-500 to-green-600',
    custom: 'from-pink-500 to-pink-600',
  };

  const Icon = iconMap[actionType];
  const gradient = colorMap[actionType];

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-3 !h-3" />
      <div
        className={`min-w-[160px] max-w-[200px] rounded-lg overflow-hidden shadow-lg transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-xl scale-105' : ''
        }`}
      >
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${gradient} p-2 flex items-center gap-2`}>
          <Icon className="h-4 w-4 text-white" />
          <span className="font-semibold text-sm text-white">{label}</span>
        </div>
        
        {/* Content */}
        <div className="bg-card p-2 space-y-2">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          
          {lastExecuted && (
            <p className="text-[10px] text-muted-foreground">Last: {lastExecuted}</p>
          )}
          
          {onExecute && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-7 text-xs"
              onClick={onExecute}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Execute
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-3 !h-3" />
    </>
  );
}

export const ActionNode = memo(ActionNodeComponent);
