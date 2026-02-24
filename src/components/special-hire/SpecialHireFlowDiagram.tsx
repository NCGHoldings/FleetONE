import React, { useMemo, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { FlowDiagramCanvas } from '@/components/flow-diagram/FlowDiagramCanvas';
import { useSystemFlowDiagram } from '@/hooks/useSystemFlowDiagram';
import { Loader2, FileText, Clock, CheckCircle, Bus, CreditCard, AlertCircle } from 'lucide-react';

export function SpecialHireFlowDiagram() {
  const { diagram, loading, saving, moduleStats, saveDiagram, refetchDiagram, refetchStats } = useSystemFlowDiagram('special_hire');

  // Build nodes with real-time data
  const nodes: Node[] = useMemo(() => {
    const stats = moduleStats;
    
    // If we have a saved diagram, use those positions but update data
    if (diagram?.flow_config?.nodes?.length) {
      return diagram.flow_config.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          stats: stats[node.id]?.total ? {
            total: stats[node.id].total,
            pending: stats[node.id].pending,
            completed: stats[node.id].completed || stats[node.id].approved,
          } : node.data.stats,
        },
      }));
    }

    // Default layout for Special Hire workflow
    return [
      {
        id: 'start',
        type: 'startEndNode',
        position: { x: 400, y: 0 },
        data: { label: 'Start', type: 'start' },
      },
      {
        id: 'submissions',
        type: 'processNode',
        position: { x: 350, y: 80 },
        data: {
          label: 'Customer Inquiry',
          description: 'New hire requests',
          color: 'blue',
          icon: <FileText className="h-4 w-4 text-blue-500" />,
          stats: {
            total: stats.submissions?.total || 0,
            pending: stats.submissions?.pending || 0,
          },
        },
      },
      {
        id: 'quotations',
        type: 'processNode',
        position: { x: 350, y: 180 },
        data: {
          label: 'Create Quotation',
          description: 'Generate pricing',
          color: 'purple',
          icon: <Clock className="h-4 w-4 text-purple-500" />,
          stats: {
            total: stats.quotations?.total || 0,
            pending: stats.quotations?.pending || 0,
          },
        },
      },
      {
        id: 'approvals',
        type: 'decisionNode',
        position: { x: 360, y: 290 },
        data: {
          label: 'Approved?',
          condition: 'Manager approval',
          color: 'yellow',
          stats: {
            yes: stats.approvals?.approved || 0,
            no: stats.approvals?.rejected || 0,
          },
        },
      },
      {
        id: 'confirmed',
        type: 'processNode',
        position: { x: 550, y: 380 },
        data: {
          label: 'Trip Confirmed',
          description: 'Customer accepted',
          color: 'green',
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          stats: {
            total: stats.quotations?.confirmed || 0,
          },
        },
      },
      {
        id: 'rejected',
        type: 'processNode',
        position: { x: 150, y: 380 },
        data: {
          label: 'Rejected',
          description: 'Not approved',
          color: 'red',
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          stats: {
            total: stats.approvals?.rejected || 0,
          },
        },
      },
      {
        id: 'trips',
        type: 'processNode',
        position: { x: 550, y: 480 },
        data: {
          label: 'Execute Trip',
          description: 'Bus assigned & dispatched',
          color: 'blue',
          icon: <Bus className="h-4 w-4 text-blue-500" />,
          stats: {
            total: stats.trips?.total || 0,
            pending: stats.trips?.pending || 0,
            completed: stats.trips?.completed || 0,
          },
        },
      },
      {
        id: 'payments',
        type: 'processNode',
        position: { x: 550, y: 580 },
        data: {
          label: 'Process Payment',
          description: 'Finance settlement',
          color: 'green',
          icon: <CreditCard className="h-4 w-4 text-green-500" />,
          stats: {
            total: stats.payments?.total || 0,
            pending: stats.payments?.pending || 0,
            completed: stats.payments?.approved || 0,
          },
        },
      },
      {
        id: 'end',
        type: 'startEndNode',
        position: { x: 600, y: 680 },
        data: { label: 'End', type: 'end' },
      },
    ];
  }, [diagram, moduleStats]);

  const edges: Edge[] = useMemo(() => {
    if (diagram?.flow_config?.edges?.length) {
      return diagram.flow_config.edges;
    }

    return [
      { id: 'e-start-submissions', source: 'start', target: 'submissions', animated: true },
      { id: 'e-submissions-quotations', source: 'submissions', target: 'quotations', animated: true },
      { id: 'e-quotations-approvals', source: 'quotations', target: 'approvals', animated: true },
      { id: 'e-approvals-confirmed', source: 'approvals', sourceHandle: 'yes', target: 'confirmed', animated: true, style: { stroke: 'hsl(142, 76%, 36%)' } },
      { id: 'e-approvals-rejected', source: 'approvals', sourceHandle: 'no', target: 'rejected', animated: true, style: { stroke: 'hsl(0, 84%, 60%)' } },
      { id: 'e-confirmed-trips', source: 'confirmed', target: 'trips', animated: true },
      { id: 'e-trips-payments', source: 'trips', target: 'payments', animated: true },
      { id: 'e-payments-end', source: 'payments', target: 'end', animated: true },
    ];
  }, [diagram]);

  const handleSave = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    saveDiagram(newNodes, newEdges);
  }, [saveDiagram]);

  const handleReset = useCallback(() => {
    refetchDiagram();
  }, [refetchDiagram]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[700px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FlowDiagramCanvas
      initialNodes={nodes}
      initialEdges={edges}
      onSave={handleSave}
      onReset={handleReset}
      onRefreshStats={refetchStats}
      isSaving={saving}
      showPalette={true}
    />
  );
}
