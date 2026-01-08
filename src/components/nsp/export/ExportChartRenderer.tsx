import { SalesTrendChart } from "../charts/SalesTrendChart";
import { CategoryDistributionChart } from "../charts/CategoryDistributionChart";
import { CategoryComparisonChart } from "../charts/CategoryComparisonChart";
import { MonthlyTrendChart } from "../charts/MonthlyTrendChart";
import { DayOfWeekChart } from "../charts/DayOfWeekChart";
import { TyreSalesBreakdown } from "../charts/TyreSalesBreakdown";
import { CategoryTrendChart } from "../charts/CategoryTrendChart";

interface ExportChartRendererProps {
  analytics: any;
}

export function ExportChartRenderer({ analytics }: ExportChartRendererProps) {
  if (!analytics) return null;

  const combinedTrendData = [...analytics.dailyTrend, ...analytics.predictions];

  return (
    <div className="bg-white">
      {/* Sales Trend Chart - Full Page */}
      <div id="export-sales-trend" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '500px' }}>
        <SalesTrendChart data={combinedTrendData} />
      </div>

      {/* Category Distribution Chart - Full Width for Stacking */}
      <div id="export-category-distribution" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '480px' }}>
        <CategoryDistributionChart data={analytics.categoryTotals} />
      </div>

      {/* Category Comparison Chart - Full Width for Stacking */}
      <div id="export-category-comparison" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '480px' }}>
        <CategoryComparisonChart data={analytics.categoryTotals} />
      </div>

      {/* Monthly Trend Chart - Full Width */}
      <div id="export-monthly-trend" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '460px' }}>
        <MonthlyTrendChart data={analytics.monthlyTrend} />
      </div>

      {/* Day of Week Chart - Full Width */}
      <div id="export-day-of-week" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '460px' }}>
        <DayOfWeekChart data={analytics.dayOfWeekAnalysis} />
      </div>

      {/* Tyre Breakdown Chart - Full Width */}
      <div id="export-tyre-breakdown" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '460px' }}>
        <TyreSalesBreakdown data={analytics.tyreBreakdown} />
      </div>

      {/* Individual Category Trend Charts - Separate for Export */}
      <div id="export-lss-outside-trend" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '460px' }}>
        <CategoryTrendChart 
          data={analytics.dailyTrend} 
          category="lssOutside" 
          title="LSS Outside Sales Trend"
          color="#3B82F6"
        />
      </div>

      <div id="export-lss-inside-trend" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '460px' }}>
        <CategoryTrendChart 
          data={analytics.dailyTrend} 
          category="lssInside" 
          title="LSS Inside Sales Trend"
          color="#A855F7"
        />
      </div>

      <div id="export-tyre-trend" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '460px' }}>
        <CategoryTrendChart 
          data={analytics.dailyTrend} 
          category="tyre" 
          title="Tyre Sales Trend"
          color="#14B8A6"
        />
      </div>

      {/* Breakdown Sales Trend Chart */}
      <div id="export-breakdown-trend" className="mb-4 p-4 bg-white" style={{ width: '900px', height: '460px' }}>
        <CategoryTrendChart 
          data={analytics.dailyTrend} 
          category="breakdown" 
          title="Breakdown Sales Trend"
          color="#EC4899"
        />
      </div>
    </div>
  );
}
