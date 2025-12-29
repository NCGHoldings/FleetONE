import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Eye, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProcessNodeData {
  label: string;
  description?: string;
  stats?: {
    total?: number;
    pending?: number;
    completed?: number;
    issues?: number;
  };
  actions?: string[];
  color?: string;
  icon?: React.ReactNode;
  onView?: () => void;
  onAction?: () => void;
  onConfigure?: () => void;
  isLoading?: boolean;
}

function ProcessNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProcessNodeData;
  const { label, description, stats, color = 'blue', icon, onView, onAction, onConfigure, isLoading } = nodeData;

  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/50 bg-blue-500/5',
    green: 'border-green-500/50 bg-green-500/5',
    yellow: 'border-yellow-500/50 bg-yellow-500/5',
    red: 'border-red-500/50 bg-red-500/5',
    purple: 'border-purple-500/50 bg-purple-500/5',
    orange: 'border-orange-500/50 bg-orange-500/5',
  };

  const badgeColorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    green: 'bg-green-500/20 text-green-700 dark:text-green-300',
    yellow: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
    red: 'bg-red-500/20 text-red-700 dark:text-red-300',
    purple: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
    orange: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-3 !h-3" />
      <Card
        className={`min-w-[200px] max-w-[280px] p-3 shadow-lg transition-all duration-200 ${
          colorClasses[color]
        } ${selected ? 'ring-2 ring-primary shadow-xl' : ''}`}
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div>
                <h3 className="font-semibold text-sm leading-tight">{label}</h3>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap gap-1.5">
              {stats.total !== undefined && (
                <Badge variant="outline" className={`text-xs ${badgeColorClasses[color]}`}>
                  Total: {stats.total}
                </Badge>
              )}
              {stats.pending !== undefined && stats.pending > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                  Pending: {stats.pending}
                </Badge>
              )}
              {stats.completed !== undefined && stats.completed > 0 && (
                <Badge variant="outline" className="text-xs bg-green-500/20 text-green-700 dark:text-green-300">
                  Done: {stats.completed}
                </Badge>
              )}
              {stats.issues !== undefined && stats.issues > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Issues: {stats.issues}
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          {(onView || onAction || onConfigure) && (
            <div className="flex gap-1 pt-1">
              {onView && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onView}>
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
              {onAction && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onAction}>
                  <Play className="h-3 w-3 mr-1" />
                  Action
                </Button>
              )}
              {onConfigure && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onConfigure}>
                  <Settings className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-3 !h-3" />
    </>
  );
}

export const ProcessNode = memo(ProcessNodeComponent);
