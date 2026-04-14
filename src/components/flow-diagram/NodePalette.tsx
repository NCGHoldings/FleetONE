import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Workflow, 
  HelpCircle, 
  Database, 
  Zap, 
  Play, 
  Square,
  GripVertical 
} from 'lucide-react';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string, data: any) => void;
}

const nodeTypes = [
  {
    type: 'processNode',
    label: 'Process Step',
    icon: Workflow,
    color: 'blue',
    description: 'A workflow step',
    defaultData: {
      label: 'New Process',
      description: 'Process description',
      color: 'blue',
    },
  },
  {
    type: 'decisionNode',
    label: 'Decision',
    icon: HelpCircle,
    color: 'yellow',
    description: 'A decision point',
    defaultData: {
      label: 'Decision?',
      condition: 'Check condition',
      color: 'yellow',
    },
  },
  {
    type: 'dataNode',
    label: 'Data Table',
    icon: Database,
    color: 'cyan',
    description: 'Database table',
    defaultData: {
      label: 'Table Name',
      tableName: 'table_name',
    },
  },
  {
    type: 'actionNode',
    label: 'Action',
    icon: Zap,
    color: 'green',
    description: 'Trigger action',
    defaultData: {
      label: 'Action',
      actionType: 'trigger',
      description: 'Execute action',
    },
  },
  {
    type: 'startEndNode',
    label: 'Start',
    icon: Play,
    color: 'green',
    description: 'Flow start',
    defaultData: {
      label: 'Start',
      type: 'start',
    },
  },
  {
    type: 'startEndNode',
    label: 'End',
    icon: Square,
    color: 'red',
    description: 'Flow end',
    defaultData: {
      label: 'End',
      type: 'end',
    },
  },
];

export function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <Card className="absolute top-4 right-4 z-10 w-[180px] bg-background/95 backdrop-blur-sm shadow-lg">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm font-medium">Add Nodes</CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-1">
        {nodeTypes.map((node, index) => {
          const Icon = node.icon;
          return (
            <div
              key={`${node.type}-${index}`}
              className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
              draggable
              onDragStart={(e) => onDragStart(e, node.type, node.defaultData)}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <Icon className={`h-4 w-4 text-${node.color}-500`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{node.label}</p>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground text-center pt-2">
          Drag nodes to canvas
        </p>
      </CardContent>
    </Card>
  );
}
