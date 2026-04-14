import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { YutongReportData } from '@/hooks/useYutongExecutiveReport';

interface Props {
  data: YutongReportData;
}

const formatLKR = (val: number) => `LKR ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function YutongPipelineFunnel({ data }: Props) {
  const stages = [
    { label: 'Quotations', count: data.pipeline.totalQuotations, color: 'bg-blue-500', width: '100%' },
    { label: 'Confirmed', count: data.pipeline.confirmed, color: 'bg-emerald-500', width: `${data.pipeline.totalQuotations > 0 ? Math.max(20, (data.pipeline.confirmed / data.pipeline.totalQuotations) * 100) : 20}%` },
    { label: 'Orders', count: data.orders.totalOrders, color: 'bg-purple-500', width: `${data.pipeline.totalQuotations > 0 ? Math.max(15, (data.orders.totalOrders / data.pipeline.totalQuotations) * 100) : 15}%` },
    { label: 'Shipped', count: data.shipments.totalUnits, color: 'bg-orange-500', width: `${data.pipeline.totalQuotations > 0 ? Math.max(10, (data.shipments.totalUnits / Math.max(1, data.pipeline.totalQuotations)) * 100) : 10}%` },
    { label: 'Delivered', count: data.delivery.totalDelivered, color: 'bg-green-600', width: `${data.pipeline.totalQuotations > 0 ? Math.max(8, (data.delivery.totalDelivered / Math.max(1, data.pipeline.totalQuotations)) * 100) : 8}%` },
  ];

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Sales Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, i) => {
          const prevCount = i > 0 ? stages[i - 1].count : stage.count;
          const dropOff = prevCount > 0 && i > 0 ? ((1 - stage.count / prevCount) * 100).toFixed(0) : null;
          return (
            <div key={stage.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{stage.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-bold">{stage.count}</span>
                  {dropOff !== null && <span className="text-xs text-muted-foreground">(-{dropOff}%)</span>}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-6 flex items-center justify-center mx-auto" style={{ width: stage.width }}>
                <div className={`${stage.color} rounded-full h-6 w-full flex items-center justify-center`}>
                  <span className="text-xs text-white font-medium">{stage.count}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div className="pt-2 border-t flex justify-between text-sm">
          <span className="text-muted-foreground">Total Pipeline Value</span>
          <span className="font-bold">{formatLKR(data.pipeline.totalQuotationValue)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
