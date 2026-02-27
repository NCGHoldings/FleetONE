import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, TrendingUp, ShoppingCart, DollarSign, Banknote, AlertCircle, Truck, Star } from 'lucide-react';
import { YutongReportData } from '@/hooks/useYutongExecutiveReport';

const formatLKR = (val: number) => `LKR ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

interface Props {
  data: YutongReportData;
}

export function YutongReportKPICards({ data }: Props) {
  const kpis = [
    { label: 'Total Quotations', value: data.pipeline.totalQuotations.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Conversion Rate', value: `${data.pipeline.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Orders', value: data.orders.totalOrders.toString(), icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Revenue', value: formatLKR(data.orders.totalOrderValue), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', small: true },
    { label: 'Collected', value: formatLKR(data.orders.totalPaid), icon: Banknote, color: 'text-green-600', bg: 'bg-green-50', small: true },
    { label: 'Outstanding', value: formatLKR(data.orders.totalBalance), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', small: true },
    { label: 'Units Delivered', value: data.delivery.totalDelivered.toString(), icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Customer Rating', value: data.afterSales.avgFeedbackRating > 0 ? `${data.afterSales.avgFeedbackRating}/5` : 'N/A', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                <p className={`font-bold ${kpi.small ? 'text-sm' : 'text-lg'} truncate`}>{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
