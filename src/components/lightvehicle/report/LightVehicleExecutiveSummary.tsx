import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightVehicleReportData } from '@/hooks/useLightVehicleExecutiveReport';
import { Activity, AlertTriangle, AlertCircle, Info, Lightbulb, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  data: LightVehicleReportData;
}

export function LightVehicleExecutiveSummary({ data }: Props) {
  const score = data.healthScore;
  const scoreColor = score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = score >= 75 ? 'bg-emerald-50' : score >= 50 ? 'bg-amber-50' : 'bg-red-50';
  const scoreLabel = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Attention';

  const recommendations: string[] = [];
  if (data.pipeline.conversionRate < 30) recommendations.push('Conversion rate is low — review quotation pricing and follow-up process');
  if (data.payments.collectionRate < 70) recommendations.push('Collection rate below 70% — prioritize overdue payment follow-ups');
  if (data.customerBreakdown.topConcentration > 60) recommendations.push('Revenue heavily concentrated in top 3 customers — diversify customer base');
  if (data.velocity.avgQuoteToOrderDays > 30) recommendations.push('Quote-to-order cycle is long — streamline approval process');
  if (data.afterSales.openTickets > 5) recommendations.push('Multiple open support tickets — allocate resources to resolve');

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    if (s === 'warning') return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    return <Info className="h-3.5 w-3.5 text-blue-500" />;
  };

  const severityBadge = (s: string) => {
    if (s === 'critical') return 'destructive' as const;
    if (s === 'warning') return 'secondary' as const;
    return 'outline' as const;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Health Score */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${scoreBg} mb-3`}>
            <div className="text-center">
              <p className={`text-3xl font-bold ${scoreColor}`}>{score}</p>
              <p className="text-[10px] text-muted-foreground">/ 100</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className={`h-4 w-4 ${scoreColor}`} />
            <p className={`text-sm font-semibold ${scoreColor}`}>{scoreLabel}</p>
          </div>
          <p className="text-xs text-muted-foreground">Business Health Score</p>
          <div className="mt-3 w-full grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
            <div><p className="font-medium">{data.pipeline.conversionRate.toFixed(0)}%</p><p>Conv.</p></div>
            <div><p className="font-medium">{data.payments.collectionRate.toFixed(0)}%</p><p>Coll.</p></div>
            <div><p className="font-medium">{data.delivery.handoverRate.toFixed(0)}%</p><p>Deliv.</p></div>
            <div><p className="font-medium">{data.afterSales.avgFeedbackRating}/5</p><p>Rating</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Key Alerts ({data.alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No alerts — everything looks good! ✅</p>
          ) : (
            data.alerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                {severityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-tight">{alert.message}</p>
                </div>
                <Badge variant={severityBadge(alert.severity)} className="text-[10px] shrink-0">
                  {alert.severity}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Performance metrics are healthy 🎯</p>
          ) : (
            recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-xs font-bold text-primary shrink-0">{i + 1}.</span>
                <p className="text-xs leading-tight">{rec}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
