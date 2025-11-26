import * as XLSX from "xlsx-js-style";
import { format } from "date-fns";

export async function generateExcelReport(
  analytics: any,
  dateRange: { from: Date; to: Date },
  options: any
) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  if (options.includeOverview && options.includeKPIs) {
    const summaryData = [
      ["NSP Sales Analytics Report"],
      [""],
      ["Report Period", `${format(dateRange.from, "MMM dd, yyyy")} to ${format(dateRange.to, "MMM dd, yyyy")}`],
      ["Generated", format(new Date(), "MMM dd, yyyy HH:mm")],
      [""],
      ["KEY PERFORMANCE INDICATORS"],
      [""],
      ["Total Sales", analytics.totalSales, "LKR"],
      ["Average Daily Sales", analytics.avgDailySales, "LKR"],
      ["Days Recorded", analytics.daysRecorded],
      ["Growth Rate", `${analytics.growthRate.toFixed(1)}%`],
      ["7-Day Forecast", analytics.movingAverage7, "LKR"],
      ["Top Category", analytics.topCategory ? analytics.topCategory[0] : "N/A"],
      ["Top Category Sales", analytics.topCategory ? analytics.topCategory[1] : 0, "LKR"],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Style the header
    if (summarySheet['A1']) {
      summarySheet['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: "1E3A8A" } },
        alignment: { horizontal: "left" }
      };
    }

    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
  }

  // Daily Trend Sheet
  if (options.includeOverview && analytics.dailyTrend?.length > 0) {
    const dailyData = analytics.dailyTrend.map((record: any) => ({
      Date: format(new Date(record.date), "yyyy-MM-dd"),
      "LSS Outside": record.lssOutside,
      "LSS Inside": record.lssInside,
      "Tyre Sale": record.tyre,
      "Pepiliyana": record.pepiliyana,
      "Other Income": record.other,
      "Total Sales": record.total,
    }));

    const dailySheet = XLSX.utils.json_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(wb, dailySheet, "Daily Trend");
  }

  // Category Totals Sheet
  if (options.includeOverview && analytics.categoryTotals) {
    const categoryData = Object.entries(analytics.categoryTotals).map(([category, amount]) => ({
      Category: category,
      Amount: amount as number,
      Percentage: ((amount as number / analytics.totalSales) * 100).toFixed(2) + "%",
    }));

    const categorySheet = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, categorySheet, "Category Breakdown");
  }

  // Monthly Trend Sheet
  if (options.includeDetailedAnalytics && options.includeMonthlyTrend && analytics.monthlyTrend?.length > 0) {
    const monthlyData = analytics.monthlyTrend.map((record: any) => ({
      Month: record.label,
      "Total Sales": record.total,
    }));

    const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly Trend");
  }

  // Day of Week Analysis Sheet
  if (options.includeDetailedAnalytics && options.includeDayOfWeek && analytics.dayOfWeekAnalysis?.length > 0) {
    const dayOfWeekData = analytics.dayOfWeekAnalysis.map((record: any) => ({
      Day: record.day,
      "Average Sales": record.average,
      "Number of Days": record.count,
    }));

    const dayOfWeekSheet = XLSX.utils.json_to_sheet(dayOfWeekData);
    XLSX.utils.book_append_sheet(wb, dayOfWeekSheet, "Day of Week Analysis");
  }

  // Tyre Breakdown Sheet
  if (options.includeDetailedAnalytics && options.includeTyreBreakdown && analytics.tyreBreakdown?.length > 0) {
    const tyreData = analytics.tyreBreakdown.map((record: any) => ({
      "Tyre Type": record.type,
      Quantity: record.quantity,
      Amount: record.amount,
      "Average Price": (record.amount / record.quantity).toFixed(2),
    }));

    const tyreSheet = XLSX.utils.json_to_sheet(tyreData);
    XLSX.utils.book_append_sheet(wb, tyreSheet, "Tyre Sales");
  }

  // Performance Sheet
  if (options.includePerformance && options.includeBestWorst) {
    const performanceData = [
      ["PERFORMANCE ANALYSIS"],
      [""],
      ["Best Performing Day"],
      ["Date", analytics.bestDay ? format(new Date(analytics.bestDay.sale_date), "MMM dd, yyyy") : "N/A"],
      ["Sales", analytics.bestDay ? analytics.bestDay.total_sale : 0],
      [""],
      ["Lowest Performing Day"],
      ["Date", analytics.worstDay ? format(new Date(analytics.worstDay.sale_date), "MMM dd, yyyy") : "N/A"],
      ["Sales", analytics.worstDay ? analytics.worstDay.total_sale : 0],
      [""],
      ["Growth Metrics"],
      ["7-Day Growth Rate", `${analytics.growthRate.toFixed(1)}%`],
      ["Moving Average (7 days)", analytics.movingAverage7],
    ];

    const performanceSheet = XLSX.utils.aoa_to_sheet(performanceData);
    XLSX.utils.book_append_sheet(wb, performanceSheet, "Performance");
  }

  // Predictions Sheet
  if (analytics.predictions?.length > 0) {
    const predictionData = analytics.predictions.map((record: any) => ({
      Date: format(new Date(record.date), "yyyy-MM-dd"),
      "Predicted Sales": record.total,
      Note: "Forecast based on 7-day moving average",
    }));

    const predictionSheet = XLSX.utils.json_to_sheet(predictionData);
    XLSX.utils.book_append_sheet(wb, predictionSheet, "7-Day Forecast");
  }

  // Insights Sheet
  if (options.includeOverview && options.includeInsights && analytics.insights?.length > 0) {
    const insightData = analytics.insights.map((insight: any, index: number) => ({
      "#": index + 1,
      Type: insight.type.toUpperCase(),
      Title: insight.title,
      Message: insight.message,
    }));

    const insightSheet = XLSX.utils.json_to_sheet(insightData);
    XLSX.utils.book_append_sheet(wb, insightSheet, "Insights");
  }

  // Write file
  XLSX.writeFile(wb, `NSP_Analytics_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
}
