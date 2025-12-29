import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play, Square } from 'lucide-react';

export interface StartEndNodeData {
  label: string;
  type: 'start' | 'end';
}

function StartEndNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as StartEndNodeData;
  const { label, type } = nodeData;

  const isStart = type === 'start';
  const Icon = isStart ? Play : Square;
  const bgColor = isStart ? 'bg-green-500' : 'bg-red-500';
  const ringColor = isStart ? 'ring-green-300' : 'ring-red-300';

  return (
    <>
      {!isStart && (
        <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-3 !h-3" />
      )}
      <div
        className={`flex items-center justify-center w-[100px] h-[50px] rounded-full ${bgColor} shadow-lg transition-all duration-200 ${
          selected ? `ring-4 ${ringColor} scale-105` : ''
        }`}
      >
        <div className="flex items-center gap-1.5 text-white">
          <Icon className="h-4 w-4" />
          <span className="font-semibold text-sm">{label}</span>
        </div>
      </div>
      {isStart && (
        <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-3 !h-3" />
      )}
    </>
  );
}

export const StartEndNode = memo(StartEndNodeComponent);
