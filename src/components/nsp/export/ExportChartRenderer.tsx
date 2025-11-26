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
    <div className="bg-background">
      {/* Full-width Sales Trend Chart */}
      <div id="export-sales-trend" className="mb-4 p-3 bg-card" style={{ width: '1000px', height: '280px' }}>
        <SalesTrendChart data={combinedTrendData} />
      </div>

      {/* Side-by-side: Category Distribution & Comparison */}
      <div className="flex gap-4 mb-4">
        <div id="export-category-distribution" className="p-3 bg-card" style={{ width: '480px', height: '320px' }}>
          <CategoryDistributionChart data={analytics.categoryTotals} />
        </div>
        <div id="export-category-comparison" className="p-3 bg-card" style={{ width: '480px', height: '320px' }}>
          <CategoryComparisonChart data={analytics.categoryTotals} />
        </div>
      </div>

      {/* Medium: Monthly Trend Chart */}
      <div id="export-monthly-trend" className="mb-4 p-3 bg-card" style={{ width: '800px', height: '260px' }}>
        <MonthlyTrendChart data={analytics.monthlyTrend} />
      </div>

      {/* Medium: Day of Week Chart */}
      <div id="export-day-of-week" className="mb-4 p-3 bg-card" style={{ width: '800px', height: '260px' }}>
        <DayOfWeekChart data={analytics.dayOfWeekAnalysis} />
      </div>

      {/* Compact: Tyre Breakdown Chart */}
      <div id="export-tyre-breakdown" className="mb-4 p-3 bg-card" style={{ width: '700px', height: '240px' }}>
        <TyreSalesBreakdown data={analytics.tyreBreakdown} />
      </div>
    </div>
  );
}
