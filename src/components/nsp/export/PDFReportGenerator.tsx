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
  let pageNumber = 1;

  // Helper to add page header
  const addPageHeader = () => {
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('NSP Sales Analytics Report', margin, 5);
    doc.setTextColor(0, 0, 0);
  };

  // Helper to add page footer
  const addPageFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${pageNumber}`, pageWidth - margin - 10, pageHeight - 10);
    doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy")}`, margin, pageHeight - 10);
    pageNumber++;
  };

  // Helper to add new page if needed
  const checkAddPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin - 15) {
      addPageFooter();
      doc.addPage();
      addPageHeader();
      yPosition = 15;
      return true;
    }
    return false;
  };

  // Helper to capture and add chart with proper sizing
  const addChartImage = async (elementId: string, title: string, maxHeight: number) => {
    if (!chartContainer) return;
    
    const chartElement = chartContainer.querySelector(`#${elementId}`);
    if (!chartElement) return;

    // Add section title with professional styling
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text(title, margin, yPosition);
    yPosition += 8;

    try {
      // Add small delay to ensure chart fully renders
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(chartElement as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1000,
        windowHeight: 600,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      
      // Calculate proper aspect ratio from captured canvas
      const aspectRatio = canvas.height / canvas.width;
      const calculatedHeight = imgWidth * aspectRatio;
      
      // Use calculated height but cap at max if needed
      const imgHeight = Math.min(calculatedHeight, maxHeight);

      // Add subtle border around chart
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, imgWidth, imgHeight);

      // Add chart image
      doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 12;
    } catch (error) {
      console.error(`Error capturing ${elementId}:`, error);
      doc.setFontSize(10);
      doc.setTextColor(255, 0, 0);
      doc.text(`[Chart could not be rendered]`, margin, yPosition);
      yPosition += 10;
    }
  };

  // Helper to add two charts stacked vertically on same page
  const addStackedCharts = async (
    topChart: { id: string; title: string },
    bottomChart: { id: string; title: string }
  ) => {
    // Start new page
    addPageFooter();
    doc.addPage();
    addPageHeader();
    yPosition = 18;

    // Add top chart with height for stacking
    await addChartImage(topChart.id, topChart.title, 110);
    
    // Add spacing between charts
    yPosition += 10;
    
    // Check if we need a new page for bottom chart
    checkAddPage(110);
    
    // Add bottom chart
    await addChartImage(bottomChart.id, bottomChart.title, 110);
  };

  // Add header to first page
  addPageHeader();
  yPosition = 15;

  // Title Section
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text("NSP Sales Analytics Report", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Report Period: ${format(dateRange.from, "MMM dd, yyyy")} to ${format(dateRange.to, "MMM dd, yyyy")}`,
    margin,
    yPosition
  );
  yPosition += 12;

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

  // Render sections based on page order
  const pageOrder = options.pageOrder || [];
  
  for (const section of pageOrder) {
    switch (section.id) {
      case 'cover':
        // Cover page is already rendered above (KPIs + Insights)
        // This is just a placeholder for the order logic
        break;

      case 'salesTrend':
        if (options.includeOverview && options.includeSalesTrend) {
          addPageFooter();
          doc.addPage();
          addPageHeader();
          yPosition = 18;
          await addChartImage('export-sales-trend', 'Sales Trend Analysis', 140);
        }
        break;

      case 'categoryDistribution':
        if (options.includeOverview && options.includeCategoryDistribution) {
          await addStackedCharts(
            { id: 'export-category-distribution', title: 'Category Distribution' },
            { id: 'export-category-comparison', title: 'Category Comparison' }
          );
        }
        break;

      case 'monthlyDayOfWeek':
        if (options.includeDetailedAnalytics && options.includeMonthlyTrend && options.includeDayOfWeek) {
          await addStackedCharts(
            { id: 'export-monthly-trend', title: 'Monthly Sales Trend' },
            { id: 'export-day-of-week', title: 'Day of Week Analysis' }
          );
        } else if (options.includeDetailedAnalytics && options.includeMonthlyTrend) {
          addPageFooter();
          doc.addPage();
          addPageHeader();
          yPosition = 18;
          await addChartImage('export-monthly-trend', 'Monthly Sales Trend', 120);
        } else if (options.includeDetailedAnalytics && options.includeDayOfWeek) {
          addPageFooter();
          doc.addPage();
          addPageHeader();
          yPosition = 18;
          await addChartImage('export-day-of-week', 'Day of Week Analysis', 120);
        }
        break;

      case 'tyreBreakdown':
        if (options.includeDetailedAnalytics && options.includeTyreBreakdown && analytics.tyreBreakdown?.length > 0) {
          addPageFooter();
          doc.addPage();
          addPageHeader();
          yPosition = 18;
          await addChartImage('export-tyre-breakdown', 'Tyre Sales Breakdown', 110);
        }
        break;

      case 'categoryTrends':
        if (options.includeDetailedAnalytics && options.includeCategoryTrends) {
          // Page 1: LSS Outside + LSS Inside stacked
          addPageFooter();
          doc.addPage();
          addPageHeader();
          yPosition = 18;
          
          // Section title
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text("Individual Category Sales Trends", margin, yPosition);
          yPosition += 10;
          
          // Chart 1: LSS Outside
          await addChartImage('export-lss-outside-trend', 'LSS Outside Sales Trend', 110);
          
          // Chart 2: LSS Inside
          await addChartImage('export-lss-inside-trend', 'LSS Inside Sales Trend', 110);
          
          // Page 2: Tyre Sales (full page)
          addPageFooter();
          doc.addPage();
          addPageHeader();
          yPosition = 18;
          
          // Chart 3: Tyre Sales
          await addChartImage('export-tyre-trend', 'Tyre Sales Trend', 140);
        }
        break;

      case 'performance':
        if (options.includePerformance && options.includeBestWorst) {
          checkAddPage(50);

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text("Performance Analysis", margin, yPosition);
          yPosition += 8;

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
        break;

      case 'dataTable':
        if (options.includeDataTable && analytics.dailyTrend?.length > 0) {
          addPageFooter();
          doc.addPage();
          addPageHeader();
          yPosition = 15;

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text("Daily Sales Data", margin, yPosition);
          yPosition += 6;

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
        break;
    }
  }

  // Add final page footer
  addPageFooter();

  // Save PDF
  doc.save(`NSP_Analytics_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
}
