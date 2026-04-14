import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Save,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RefreshCw,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FlowToolbarProps {
  onSave: () => void;
  onReset: () => void;
  onRefreshStats: () => void;
  isSaving?: boolean;
  isLocked?: boolean;
  onToggleLock?: () => void;
}

export function FlowToolbar({
  onSave,
  onReset,
  onRefreshStats,
  isSaving = false,
  isLocked = false,
  onToggleLock,
}: FlowToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <TooltipProvider>
      <Card className="absolute top-4 left-4 z-10 flex items-center gap-1 p-1.5 bg-background/95 backdrop-blur-sm shadow-lg">
        {/* Save */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onSave}
              disabled={isSaving || isLocked}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save Layout</TooltipContent>
        </Tooltip>

        {/* Reset */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onReset}
              disabled={isLocked}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset Layout</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Zoom Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => zoomIn()}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => zoomOut()}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => fitView({ padding: 0.2 })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit View</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Refresh Stats */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onRefreshStats}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh Data</TooltipContent>
        </Tooltip>

        {/* Lock Toggle */}
        {onToggleLock && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isLocked ? 'secondary' : 'ghost'}
                className="h-8 w-8 p-0"
                onClick={onToggleLock}
              >
                {isLocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isLocked ? 'Unlock Editing' : 'Lock Editing'}</TooltipContent>
          </Tooltip>
        )}
      </Card>
    </TooltipProvider>
  );
}
