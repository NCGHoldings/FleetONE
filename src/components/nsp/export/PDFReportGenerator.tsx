import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { format } from "date-fns";

export async function generatePDFReport(
  analytics: any,
  dateRange: { from: Date; to: Date },
  options: any,
  chartContainer: HTMLDivElement | null
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Helper to add new page if needed
  const checkAddPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Blue color
  doc.text("NSP Sales Analytics Report", margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Report Period: ${format(dateRange.from, "MMM dd, yyyy")} to ${format(dateRange.to, "MMM dd, yyyy")}`,
    margin,
    yPosition
  );
  doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, margin, yPosition + 5);
  yPosition += 15;

  // KPI Summary
  if (options.includeOverview && options.includeKPIs) {
    checkAddPage(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Key Performance Indicators", margin, yPosition);
    yPosition += 8;

    const kpiData = [
      ['Total Sales', `LKR ${analytics.totalSales.toLocaleString()}`],
      ['Average Daily Sales', `LKR ${analytics.avgDailySales.toLocaleString()}`],
      ['Days Recorded', analytics.daysRecorded.toString()],
      ['Growth Rate', `${analytics.growthRate > 0 ? '+' : ''}${analytics.growthRate.toFixed(1)}%`],
      ['7-Day Forecast', `LKR ${analytics.movingAverage7.toLocaleString()}`],
      ['Top Category', analytics.topCategory ? `${analytics.topCategory[0]} (LKR ${analytics.topCategory[1].toLocaleString()})` : 'N/A'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: kpiData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Insights
  if (options.includeOverview && options.includeInsights && analytics.insights?.length > 0) {
    checkAddPage(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Key Insights", margin, yPosition);
    yPosition += 8;

    analytics.insights.forEach((insight: any, index: number) => {
      if (checkAddPage(15)) {
        // Page was added, continue
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${insight.title}`, margin, yPosition);
      yPosition += 5;
      
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(insight.message, pageWidth - 2 * margin);
      doc.text(lines, margin + 5, yPosition);
      yPosition += lines.length * 5 + 3;
    });
    yPosition += 5;
  }

  // Helper function to capture and add chart
  const addChartImage = async (elementId: string, title: string) => {
    if (!chartContainer) return;
    
    const chartElement = chartContainer.querySelector(`#${elementId}`);
    if (!chartElement) return;

    doc.addPage();
    yPosition = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, yPosition);
    yPosition += 10;

    try {
      const canvas = await html2canvas(chartElement as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
    } catch (error) {
      console.error(`Error capturing ${elementId}:`, error);
      doc.setFontSize(10);
      doc.text(`[Chart could not be rendered]`, margin, yPosition);
    }
  };

  // Add charts based on selection
  if (options.includeOverview && options.includeSalesTrend) {
    await addChartImage('export-sales-trend', 'Sales Trend Analysis');
  }

  if (options.includeOverview && options.includeCategoryDistribution) {
    await addChartImage('export-category-distribution', 'Category Distribution');
    await addChartImage('export-category-comparison', 'Category Comparison');
  }

  if (options.includeDetailedAnalytics && options.includeMonthlyTrend) {
    await addChartImage('export-monthly-trend', 'Monthly Trend');
  }

  if (options.includeDetailedAnalytics && options.includeDayOfWeek) {
    await addChartImage('export-day-of-week', 'Day-of-Week Performance');
  }

  if (options.includeDetailedAnalytics && options.includeTyreBreakdown && analytics.tyreBreakdown?.length > 0) {
    await addChartImage('export-tyre-breakdown', 'Tyre Sales Breakdown');
  }

  // Performance Section
  if (options.includePerformance && options.includeBestWorst) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Performance Analysis", margin, yPosition);
    yPosition += 10;

    if (analytics.bestDay) {
      doc.setFontSize(12);
      doc.text("Best Performing Day", margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${format(new Date(analytics.bestDay.sale_date), "MMM dd, yyyy")}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Sales: LKR ${analytics.bestDay.total_sale.toLocaleString()}`, margin + 5, yPosition);
      yPosition += 10;
    }

    if (analytics.worstDay) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Lowest Performing Day", margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${format(new Date(analytics.worstDay.sale_date), "MMM dd, yyyy")}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Sales: LKR ${analytics.worstDay.total_sale.toLocaleString()}`, margin + 5, yPosition);
      yPosition += 10;
    }
  }

  // Data Table
  if (options.includeDataTable && analytics.dailyTrend?.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Daily Sales Data", margin, yPosition);
    yPosition += 8;

    const tableData = analytics.dailyTrend.map((record: any) => [
      format(new Date(record.date), "MMM dd"),
      record.lssOutside.toLocaleString(),
      record.lssInside.toLocaleString(),
      record.tyre.toLocaleString(),
      record.pepiliyana.toLocaleString(),
      record.other.toLocaleString(),
      record.total.toLocaleString(),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["Date", "LSS Out", "LSS In", "Tyre", "Pepil", "Other", "Total"]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
    });
  }

  // Save PDF
  doc.save(`NSP_Analytics_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
}
