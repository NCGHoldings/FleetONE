import React, { useState } from 'react';
import { useSinotrukExecutiveReport, SinotrukReportFilters as FilterType } from '@/hooks/useSinotrukExecutiveReport';
import { SinotrukReportKPICards } from './SinotrukReportKPICards';
import { SinotrukPipelineFunnel } from './SinotrukPipelineFunnel';
import { SinotrukRevenueCharts } from './SinotrukRevenueCharts';
import { SinotrukShipmentStatus } from './SinotrukShipmentStatus';
import { SinotrukModelPerformance } from './SinotrukModelPerformance';
import { SinotrukTopCustomers } from './SinotrukTopCustomers';
import { SinotrukAfterSalesHealth } from './SinotrukAfterSalesHealth';
import { SinotrukReportShareDialog } from './SinotrukReportShareDialog';
import { SinotrukReportFilters } from './SinotrukReportFilters';
import { SinotrukExecutiveSummary } from './SinotrukExecutiveSummary';
import { SinotrukPeriodComparison } from './SinotrukPeriodComparison';
import { SinotrukRevenueForecasting } from './SinotrukRevenueForecasting';
import { SinotrukSalesVelocity } from './SinotrukSalesVelocity';
import { SinotrukCustomerAnalytics } from './SinotrukCustomerAnalytics';
import { exportSinotrukReport } from './SinotrukExcelExporter';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Printer, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { SinotrukReportData } from '@/hooks/useSinotrukExecutiveReport';

interface Props {
  data?: SinotrukReportData;
  isPublic?: boolean;
}

function PredictiveInsights({ data }: { data: SinotrukReportData }) {
  const avgMonthlyDeliveries = data.monthlyTrends.slice(-3).reduce((s, m) => s + m.deliveries, 0) / 3;
  const pendingPipelineUnits = data.orders.totalUnits - data.delivery.totalDelivered;
  const estimatedRevenueFromPending = data.orders.totalBalance;
  const overdueRisk = data.payments.totalOverdue;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Predictive Insights & Risk Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 bg-blue-50 text-blue-800">
            <Clock className="h-5 w-5 mb-2" />
            <p className="text-sm font-medium">Projected Monthly Deliveries</p>
            <p className="text-2xl font-bold">{avgMonthlyDeliveries.toFixed(0)} units/mo</p>
            <p className="text-xs mt-1">{pendingPipelineUnits} units remaining in pipeline</p>
          </div>
          <div className="rounded-xl p-4 bg-green-50 text-green-800">
            <TrendingUp className="h-5 w-5 mb-2" />
            <p className="text-sm font-medium">Estimated Pending Revenue</p>
            <p className="text-2xl font-bold">LKR {(estimatedRevenueFromPending / 1000000).toFixed(1)}M</p>
            <p className="text-xs mt-1">From {data.orders.totalOrders} active orders</p>
          </div>
          <div className={`rounded-xl p-4 ${overdueRisk > 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            <AlertTriangle className="h-5 w-5 mb-2" />
            <p className="text-sm font-medium">Overdue Payment Risk</p>
            <p className="text-2xl font-bold">LKR {(overdueRisk / 1000000).toFixed(1)}M</p>
            <p className="text-xs mt-1">{overdueRisk > 0 ? 'Requires immediate follow-up' : 'No overdue payments'}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Orders & Deliveries Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="orders" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} name="Orders" />
              <Area type="monotone" dataKey="deliveries" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Deliveries" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function SinotrukExecutiveReport({ data: externalData, isPublic = false }: Props) {
  const [filters, setFilters] = useState<FilterType>({
    startDate: null,
    endDate: null,
    compareWithPrevious: false,
    busModels: [],
    paymentMode: 'all',
  });

  const { data: hookData, isLoading, refetch } = useSinotrukExecutiveReport(externalData ? undefined : filters);
  const data = externalData || hookData;

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading Executive Report...</span>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-muted-foreground">Failed to load report data</div>;
  }

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto print:max-w-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sinotruk Bus Sales — Executive Report</h1>
          <p className="text-sm text-muted-foreground">
            NCG Holdings • Auto-refreshes every 60s • Last updated: {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
        {!isPublic && (
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportSinotrukReport(data)} className="gap-2">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <SinotrukReportShareDialog />
          </div>
        )}
      </div>

      {/* Filters */}
      {!isPublic && (
        <SinotrukReportFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableBusModels={data.availableBusModels}
        />
      )}

      {/* Executive Summary */}
      <SinotrukExecutiveSummary data={data} />

      {/* KPI Cards */}
      <SinotrukReportKPICards data={data} />

      {/* Period Comparison */}
      <SinotrukPeriodComparison data={data} />

      {/* Pipeline + Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <SinotrukPipelineFunnel data={data} />
        </div>
        <div className="md:col-span-2">
          <SinotrukRevenueCharts data={data} />
        </div>
      </div>

      {/* Sales Velocity & Conversion */}
      <SinotrukSalesVelocity data={data} />

      {/* Revenue Forecasting & Breakdown */}
      <SinotrukRevenueForecasting data={data} />

      {/* Shipment & Operations */}
      <SinotrukShipmentStatus data={data} />

      {/* Order Phase Distribution + Quotation Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Order Phase Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={Object.entries(data.orders.byPhase).map(([phase, count]) => ({ phase: phase.replace(/_/g, ' '), count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="phase" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(215, 88%, 52%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Quotation Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="quotations" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Quotations" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bus Models */}
      <SinotrukModelPerformance data={data} />

      {/* Customer Analytics */}
      <SinotrukCustomerAnalytics data={data} />

      {/* Top Customers (full table) */}
      <SinotrukTopCustomers data={data} />

      {/* After Sales */}
      <SinotrukAfterSalesHealth data={data} />

      {/* Predictive Insights */}
      <PredictiveInsights data={data} />

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-muted-foreground border-t pt-4 mt-8">
        NCG Holdings — Sinotruk Bus Sales Executive Report — Generated {new Date(data.generatedAt).toLocaleString()} — Confidential
      </div>
    </div>
  );
}
