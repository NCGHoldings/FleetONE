import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ProcessNode } from './nodes/ProcessNode';
import { DecisionNode } from './nodes/DecisionNode';
import { DataNode } from './nodes/DataNode';
import { ActionNode } from './nodes/ActionNode';
import { StartEndNode } from './nodes/StartEndNode';
import { FlowToolbar } from './FlowToolbar';
import { NodePalette } from './NodePalette';
import { Card } from '@/components/ui/card';

const nodeTypes = {
  processNode: ProcessNode,
  decisionNode: DecisionNode,
  dataNode: DataNode,
  actionNode: ActionNode,
  startEndNode: StartEndNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { strokeWidth: 2 },
};

interface FlowDiagramCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => void;
  onReset: () => void;
  onRefreshStats: () => void;
  isSaving?: boolean;
  isLocked?: boolean;
  showPalette?: boolean;
  className?: string;
}

function FlowDiagramCanvasInner({
  initialNodes,
  initialEdges,
  onSave,
  onReset,
  onRefreshStats,
  isSaving = false,
  isLocked: externalLock = false,
  showPalette = true,
  className = '',
}: FlowDiagramCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isLocked, setIsLocked] = useState(externalLock);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => {
      if (isLocked) return;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges, isLocked]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (isLocked) return;

      const type = event.dataTransfer.getData('application/reactflow-type');
      const dataStr = event.dataTransfer.getData('application/reactflow-data');

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: dataStr ? JSON.parse(dataStr) : {},
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, isLocked]
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeType: string, data: any) => {
      event.dataTransfer.setData('application/reactflow-type', nodeType);
      event.dataTransfer.setData('application/reactflow-data', JSON.stringify(data));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleSave = useCallback(() => {
    onSave(nodes, edges);
  }, [nodes, edges, onSave]);

  // Sync nodes when initialNodes change (for real-time data updates)
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  return (
    <Card className={`relative w-full h-[700px] overflow-hidden ${className}`}>
      <div ref={reactFlowWrapper} className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isLocked ? undefined : onNodesChange}
          onEdgesChange={isLocked ? undefined : onEdgesChange}
          onConnect={onConnect}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={!isLocked}
          className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.2)" />
          <Controls className="!bg-background/95 !backdrop-blur-sm !shadow-lg !border-border" />
          <MiniMap
            className="!bg-background/95 !backdrop-blur-sm !shadow-lg"
            nodeColor={(node) => {
              switch (node.type) {
                case 'processNode':
                  return 'hsl(217, 91%, 60%)';
                case 'decisionNode':
                  return 'hsl(45, 93%, 47%)';
                case 'dataNode':
                  return 'hsl(187, 85%, 53%)';
                case 'actionNode':
                  return 'hsl(142, 76%, 36%)';
                case 'startEndNode':
                  return node.data?.type === 'start' ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)';
                default:
                  return 'hsl(var(--muted))';
              }
            }}
            maskColor="hsl(var(--background) / 0.8)"
          />
        </ReactFlow>
      </div>

      {/* Toolbar */}
      <FlowToolbar
        onSave={handleSave}
        onReset={onReset}
        onRefreshStats={onRefreshStats}
        isSaving={isSaving}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
      />

      {/* Node Palette */}
      {showPalette && !isLocked && <NodePalette onDragStart={handleDragStart} />}
    </Card>
  );
}

export function FlowDiagramCanvas(props: FlowDiagramCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowDiagramCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
