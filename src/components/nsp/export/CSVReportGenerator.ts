import * as XLSX from "xlsx-js-style";
import { format } from "date-fns";

export async function generateCSVReport(
  analytics: any,
  dateRange: { from: Date; to: Date },
  options: any
) {
  // For CSV, we'll export the most important data in a single flat file
  const csvData: any[] = [];

  // Add header information
  csvData.push({
    Section: "REPORT INFO",
    Field: "Report Period",
    Value: `${format(dateRange.from, "MMM dd, yyyy")} to ${format(dateRange.to, "MMM dd, yyyy")}`,
  });
  csvData.push({
    Section: "REPORT INFO",
    Field: "Generated",
    Value: format(new Date(), "MMM dd, yyyy HH:mm"),
  });
  csvData.push({}); // Empty row

  // KPI Summary
  if (options.includeOverview && options.includeKPIs) {
    csvData.push({ Section: "KPI SUMMARY", Field: "", Value: "" });
    csvData.push({
      Section: "KPI",
      Field: "Total Sales",
      Value: analytics.totalSales,
    });
    csvData.push({
      Section: "KPI",
      Field: "Average Daily Sales",
      Value: analytics.avgDailySales,
    });
    csvData.push({
      Section: "KPI",
      Field: "Days Recorded",
      Value: analytics.daysRecorded,
    });
    csvData.push({
      Section: "KPI",
      Field: "Growth Rate",
      Value: `${analytics.growthRate.toFixed(1)}%`,
    });
    csvData.push({}); // Empty row
  }

  // Daily Trend Data
  if (analytics.dailyTrend?.length > 0) {
    csvData.push({ Section: "DAILY SALES DATA", Field: "", Value: "" });
    csvData.push({
      Date: "Date",
      "LSS Outside": "LSS Outside",
      "LSS Inside": "LSS Inside",
      "Tyre Sale": "Tyre Sale",
      "Breakdown Sales": "Breakdown Sales",
      "Other Income": "Other Income",
      "Total Sales": "Total Sales",
    });

    analytics.dailyTrend.forEach((record: any) => {
      csvData.push({
        Date: format(new Date(record.date), "yyyy-MM-dd"),
        "LSS Outside": record.lssOutside,
        "LSS Inside": record.lssInside,
        "Tyre Sale": record.tyre,
        "Breakdown Sales": record.breakdown,
        "Other Income": record.other,
        "Total Sales": record.total,
      });
    });
    csvData.push({}); // Empty row
  }

  // Category Breakdown
  if (options.includeOverview && analytics.categoryTotals) {
    csvData.push({ Section: "CATEGORY BREAKDOWN", Field: "", Value: "" });
    csvData.push({
      Category: "Category",
      Amount: "Amount",
      Percentage: "Percentage",
    });

    Object.entries(analytics.categoryTotals).forEach(([category, amount]) => {
      csvData.push({
        Category: category,
        Amount: amount as number,
        Percentage: `${((amount as number / analytics.totalSales) * 100).toFixed(2)}%`,
      });
    });
    csvData.push({}); // Empty row
  }

  // Day of Week Analysis
  if (options.includeDetailedAnalytics && options.includeDayOfWeek && analytics.dayOfWeekAnalysis?.length > 0) {
    csvData.push({ Section: "DAY OF WEEK ANALYSIS", Field: "", Value: "" });
    csvData.push({
      Day: "Day",
      "Average Sales": "Average Sales",
      "Number of Days": "Number of Days",
    });

    analytics.dayOfWeekAnalysis.forEach((record: any) => {
      csvData.push({
        Day: record.day,
        "Average Sales": record.average,
        "Number of Days": record.count,
      });
    });
    csvData.push({}); // Empty row
  }

  // Tyre Breakdown
  if (options.includeDetailedAnalytics && options.includeTyreBreakdown && analytics.tyreBreakdown?.length > 0) {
    csvData.push({ Section: "TYRE SALES BREAKDOWN", Field: "", Value: "" });
    csvData.push({
      "Tyre Type": "Tyre Type",
      Quantity: "Quantity",
      Amount: "Amount",
      "Average Price": "Average Price",
    });

    analytics.tyreBreakdown.forEach((record: any) => {
      csvData.push({
        "Tyre Type": record.type,
        Quantity: record.quantity,
        Amount: record.amount,
        "Average Price": (record.amount / record.quantity).toFixed(2),
      });
    });
  }

  // Convert to CSV
  const ws = XLSX.utils.json_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(ws);

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NSP_Analytics_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
