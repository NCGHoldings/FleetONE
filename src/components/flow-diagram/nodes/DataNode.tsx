import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DataNodeData {
  label: string;
  tableName: string;
  stats?: {
    total?: number;
    recent?: number;
    issues?: number;
  };
  lastUpdated?: string;
  onViewTable?: () => void;
  onRefresh?: () => void;
}

function DataNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DataNodeData;
  const { label, tableName, stats, lastUpdated, onViewTable, onRefresh } = nodeData;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-3 !h-3" />
      <Card
        className={`min-w-[180px] max-w-[240px] p-3 shadow-lg transition-all duration-200 border-cyan-500/50 bg-cyan-500/5 ${
          selected ? 'ring-2 ring-primary shadow-xl' : ''
        }`}
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm leading-tight">{label}</h3>
                <p className="text-[10px] text-muted-foreground font-mono">{tableName}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap gap-1.5">
              {stats.total !== undefined && (
                <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                  {stats.total} records
                </Badge>
              )}
              {stats.recent !== undefined && stats.recent > 0 && (
                <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300">
                  +{stats.recent} new
                </Badge>
              )}
              {stats.issues !== undefined && stats.issues > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.issues} issues
                </Badge>
              )}
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground">Updated: {lastUpdated}</p>
          )}

          {/* Actions */}
          {(onViewTable || onRefresh) && (
            <div className="flex gap-1 pt-1">
              {onViewTable && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onViewTable}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
              {onRefresh && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onRefresh}>
                  <RefreshCw className="h-3 w-3" />
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

export const DataNode = memo(DataNodeComponent);
