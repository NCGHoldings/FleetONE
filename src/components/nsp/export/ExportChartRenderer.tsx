import { SalesTrendChart } from "../charts/SalesTrendChart";
import { CategoryDistributionChart } from "../charts/CategoryDistributionChart";
import { CategoryComparisonChart } from "../charts/CategoryComparisonChart";
import { MonthlyTrendChart } from "../charts/MonthlyTrendChart";
import { DayOfWeekChart } from "../charts/DayOfWeekChart";
import { TyreSalesBreakdown } from "../charts/TyreSalesBreakdown";

interface ExportChartRendererProps {
  analytics: any;
}

export function ExportChartRenderer({ analytics }: ExportChartRendererProps) {
  if (!analytics) return null;

  const combinedTrendData = [...analytics.dailyTrend, ...analytics.predictions];

  return (
    <div className="bg-background" style={{ width: '1200px' }}>
      {/* Sales Trend Chart */}
      <div id="export-sales-trend" className="mb-8 p-4 bg-card">
        <SalesTrendChart data={combinedTrendData} />
      </div>

      {/* Category Distribution Chart */}
      <div id="export-category-distribution" className="mb-8 p-4 bg-card">
        <CategoryDistributionChart data={analytics.categoryTotals} />
      </div>

      {/* Category Comparison Chart */}
      <div id="export-category-comparison" className="mb-8 p-4 bg-card">
        <CategoryComparisonChart data={analytics.categoryTotals} />
      </div>

      {/* Monthly Trend Chart */}
      <div id="export-monthly-trend" className="mb-8 p-4 bg-card">
        <MonthlyTrendChart data={analytics.monthlyTrend} />
      </div>

      {/* Day of Week Chart */}
      <div id="export-day-of-week" className="mb-8 p-4 bg-card">
        <DayOfWeekChart data={analytics.dayOfWeekAnalysis} />
      </div>

      {/* Tyre Breakdown Chart */}
      <div id="export-tyre-breakdown" className="mb-8 p-4 bg-card">
        <TyreSalesBreakdown data={analytics.tyreBreakdown} />
      </div>
    </div>
  );
}
