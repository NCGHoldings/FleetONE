import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface SalesRecord {
  sale_date: string;
  lss_outside_sale: number;
  lss_inside_sale: number;
  tyre_sale: number;
  pepiliyana_sale: number;
  other_income: any;
  tyre_entries: any;
  total_sale: number;
}

export const useNSPSalesAnalytics = (dateRange: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ["nsp-sales-analytics", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nsp_daily_sales")
        .select("*")
        .gte("sale_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("sale_date", format(dateRange.to, "yyyy-MM-dd"))
        .order("sale_date", { ascending: true });

      if (error) throw error;

      const salesData = (data || []) as any[];

      // 1. Daily trend data
      const dailyTrend = salesData.map(record => ({
        date: record.sale_date,
        total: record.total_sale || 0,
        lssOutside: record.lss_outside_sale || 0,
        lssInside: record.lss_inside_sale || 0,
        tyre: record.tyre_sale || 0,
        pepiliyana: record.pepiliyana_sale || 0,
        other: (record.other_income || []).reduce((sum, item) => sum + (item.amount || 0), 0)
      }));

      // 2. Category totals
      const categoryTotals = {
        'LSS Outside': salesData.reduce((sum, r) => sum + (r.lss_outside_sale || 0), 0),
        'LSS Inside': salesData.reduce((sum, r) => sum + (r.lss_inside_sale || 0), 0),
        'Tyre Sale': salesData.reduce((sum, r) => sum + (r.tyre_sale || 0), 0),
        'Pepiliyana': salesData.reduce((sum, r) => sum + (r.pepiliyana_sale || 0), 0),
        'Other Income': salesData.reduce((sum, r) => sum + (r.other_income || []).reduce((s, i) => s + (i.amount || 0), 0), 0)
      };

      // 3. Day-of-week analysis
      const dayOfWeekMap: { [key: number]: { total: number; count: number } } = {};
      salesData.forEach(record => {
        const day = new Date(record.sale_date).getDay();
        if (!dayOfWeekMap[day]) dayOfWeekMap[day] = { total: 0, count: 0 };
        dayOfWeekMap[day].total += record.total_sale || 0;
        dayOfWeekMap[day].count += 1;
      });

      const dayOfWeekAnalysis = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, index) => ({
        day: name,
        average: dayOfWeekMap[index] ? dayOfWeekMap[index].total / dayOfWeekMap[index].count : 0,
        count: dayOfWeekMap[index]?.count || 0
      }));

      // 4. Monthly aggregation
      const monthlyMap: { [key: string]: number } = {};
      salesData.forEach(record => {
        const month = format(new Date(record.sale_date), "yyyy-MM");
        monthlyMap[month] = (monthlyMap[month] || 0) + (record.total_sale || 0);
      });

      const monthlyTrend = Object.entries(monthlyMap).map(([month, total]) => ({
        month,
        total,
        label: format(new Date(month + "-01"), "MMM yyyy")
      }));

      // 5. Tyre analysis
      const tyreTypeMap: { [key: string]: { quantity: number; amount: number } } = {};
      salesData.forEach(record => {
        (record.tyre_entries || []).forEach(entry => {
          if (!tyreTypeMap[entry.type]) {
            tyreTypeMap[entry.type] = { quantity: 0, amount: 0 };
          }
          tyreTypeMap[entry.type].quantity += entry.quantity || 0;
          tyreTypeMap[entry.type].amount += entry.amount || 0;
        });
      });

      const tyreBreakdown = Object.entries(tyreTypeMap).map(([type, data]) => ({
        type,
        quantity: data.quantity,
        amount: data.amount
      }));

      // 6. Best/Worst days
      const sortedByTotal = [...salesData].sort((a, b) => (b.total_sale || 0) - (a.total_sale || 0));
      const bestDay = sortedByTotal[0] || null;
      const worstDay = sortedByTotal[sortedByTotal.length - 1] || null;

      // 7. Growth calculations
      const totalSales = salesData.reduce((sum, r) => sum + (r.total_sale || 0), 0);
      const daysRecorded = salesData.length;
      const avgDailySales = daysRecorded > 0 ? totalSales / daysRecorded : 0;

      // Calculate growth (last 7 days vs previous 7 days)
      const last7Days = salesData.slice(-7);
      const previous7Days = salesData.slice(-14, -7);
      const last7Total = last7Days.reduce((sum, r) => sum + (r.total_sale || 0), 0);
      const prev7Total = previous7Days.reduce((sum, r) => sum + (r.total_sale || 0), 0);
      const growthRate = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : 0;

      // 8. Prediction (7-day moving average)
      const movingAverage7 = last7Days.length > 0 
        ? last7Days.reduce((sum, d) => sum + (d.total_sale || 0), 0) / last7Days.length 
        : avgDailySales;

      // Generate prediction for next 7 days
      const lastDate = salesData.length > 0 ? new Date(salesData[salesData.length - 1].sale_date) : new Date();
      const predictions = Array.from({ length: 7 }, (_, i) => ({
        date: format(addDays(lastDate, i + 1), "yyyy-MM-dd"),
        total: movingAverage7,
        isPrediction: true
      }));

      // 9. Top category
      const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

      // 10. Insights generation
      const insights = [];
      
      if (growthRate > 10) {
        insights.push({
          type: 'success',
          title: 'Strong Growth',
          message: `Sales increased by ${growthRate.toFixed(1)}% compared to previous week`
        });
      } else if (growthRate < -10) {
        insights.push({
          type: 'warning',
          title: 'Declining Sales',
          message: `Sales decreased by ${Math.abs(growthRate).toFixed(1)}% compared to previous week`
        });
      }

      if (topCategory) {
        insights.push({
          type: 'info',
          title: 'Top Performing Category',
          message: `${topCategory[0]} contributes ${((topCategory[1] / totalSales) * 100).toFixed(1)}% of total sales`
        });
      }

      const bestDayOfWeek = dayOfWeekAnalysis.sort((a, b) => b.average - a.average)[0];
      if (bestDayOfWeek && bestDayOfWeek.count > 0) {
        insights.push({
          type: 'info',
          title: 'Best Performance Day',
          message: `${bestDayOfWeek.day} is your best performing day with avg sales of LKR ${bestDayOfWeek.average.toFixed(0)}`
        });
      }

      return {
        dailyTrend,
        categoryTotals,
        dayOfWeekAnalysis,
        monthlyTrend,
        tyreBreakdown,
        bestDay,
        worstDay,
        totalSales,
        daysRecorded,
        avgDailySales,
        growthRate,
        movingAverage7,
        predictions,
        topCategory,
        insights
      };
    }
  });
};
