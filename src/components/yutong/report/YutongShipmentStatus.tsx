import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { YutongReportData } from '@/hooks/useYutongExecutiveReport';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  data: YutongReportData;
}

export function YutongShipmentStatus({ data }: Props) {
  const operationsData = [
    { stage: 'Ordering', count: Object.values(data.orders.byPhase).reduce((s, v) => s + v, 0) - (data.orders.byPhase['shipping'] || 0) - (data.orders.byPhase['customs'] || 0) - (data.orders.byPhase['processing'] || 0) - (data.orders.byPhase['rmv'] || 0) - (data.orders.byPhase['delivery'] || 0) - (data.orders.byPhase['completed'] || 0), color: '#6366f1' },
    { stage: 'Shipping', count: data.shipments.inTransit, color: '#f59e0b' },
    { stage: 'Customs', count: data.operations.inCustoms, color: '#ef4444' },
    { stage: 'Processing', count: data.operations.inProcessing, color: '#8b5cf6' },
    { stage: 'RMV', count: data.operations.inRMV, color: '#06b6d4' },
    { stage: 'Delivered', count: data.delivery.totalDelivered, color: '#22c55e' },
  ].map(d => ({ ...d, count: Math.max(0, d.count) }));

  // Bottleneck detection
  const activeStages = operationsData.filter(d => d.stage !== 'Delivered');
  const maxStage = activeStages.reduce((max, d) => d.count > max.count ? d : max, activeStages[0]);
  const hasBottleneck = maxStage && maxStage.count > 0;

  const shipmentCards = [
    { label: 'Planning', value: data.shipments.planning, color: 'text-blue-600 bg-blue-50' },
    { label: 'In Transit', value: data.shipments.inTransit, color: 'text-amber-600 bg-amber-50' },
    { label: 'Arrived', value: data.shipments.arrived, color: 'text-purple-600 bg-purple-50' },
    { label: 'Delivered', value: data.shipments.delivered, color: 'text-green-600 bg-green-50' },
  ];

  const totalActiveOrders = data.orders.totalOrders;
  const throughputRate = data.delivery.totalDelivered > 0 && totalActiveOrders > 0
    ? ((data.delivery.totalDelivered / totalActiveOrders) * 100).toFixed(0)
    : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Operations Pipeline</CardTitle>
            {hasBottleneck && (
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Bottleneck: {maxStage.stage} ({maxStage.count})
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={operationsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {operationsData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
            <span>Throughput Rate: <strong className="text-foreground">{throughputRate}%</strong></span>
            <span>Avg Delivery: <strong className="text-foreground">{data.velocity.avgOrderToDeliveryDays}d</strong></span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Shipment Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {shipmentCards.map(card => (
              <div key={card.label} className={`rounded-xl p-4 text-center ${card.color}`}>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="text-sm mt-1">{card.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">Total Shipment Units</p>
            <p className="text-2xl font-bold">{data.shipments.totalUnits}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
