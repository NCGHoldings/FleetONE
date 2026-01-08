import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  dateRange: { from: Date; to: Date };
}

export default function ExportDialog({ open, onOpenChange, data, dateRange }: ExportDialogProps) {
  const [exporting, setExporting] = useState(false);

  const exportToExcel = () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['Daily Trips Analytics Report'],
        ['Period', `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`],
        [''],
        ['Metric', 'Value'],
        ['Total Trips', data.overview.totalTrips],
        ['Total Distance (km)', data.overview.totalDistance.toFixed(2)],
        ['Total Revenue (₨)', data.overview.totalIncome.toLocaleString()],
        ['Total Expenses (₨)', data.overview.totalExpenses.toLocaleString()],
        ['Net Profit (₨)', data.overview.netProfit.toLocaleString()],
        ['Profit Margin (%)', data.overview.profitMargin.toFixed(2)],
        ['Average Efficiency (km/L)', data.overview.avgEfficiency.toFixed(2)],
        ['Active Buses', data.overview.activeBuses]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

      // Driver Performance Sheet
      const driverData = data.driverStats.map((d: any) => ({
        'Rank': d.rank,
        'Driver': d.driverName,
        'Trips': d.totalTrips,
        'Distance (km)': d.totalDistance.toFixed(2),
        'Income (₨)': d.totalIncome,
        'Expenses (₨)': d.totalExpenses,
        'Net Income (₨)': d.netIncome,
        'Avg km/L': d.avgEfficiency.toFixed(2)
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(driverData), 'Driver Performance');

      // Route Analysis Sheet
      const routeData = data.routeStats.map((r: any) => ({
        'Route No': r.routeNo,
        'Route Name': r.routeName,
        'Trips': r.totalTrips,
        'Distance (km)': r.totalDistance.toFixed(2),
        'Income (₨)': r.totalIncome,
        'Expenses (₨)': r.totalExpenses,
        'Net Income (₨)': r.netIncome,
        'Profit Margin (%)': r.profitMargin.toFixed(2)
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(routeData), 'Route Analysis');

      // Bus Performance Sheet
      const busData = data.busStats.map((b: any) => ({
        'Bus No': b.busNo,
        'Trips': b.totalTrips,
        'Distance (km)': b.totalDistance.toFixed(2),
        'Current Odo': b.currentOdo,
        'Avg km/L': b.avgEfficiency.toFixed(2),
        'Income (₨)': b.totalIncome,
        'Utilization (%)': b.utilizationRate.toFixed(2)
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(busData), 'Bus Performance');

      // Daily Trends Sheet
      const trendsData = data.dailyTrends.map((t: any) => ({
        'Date': t.date,
        'Trips': t.trips,
        'Income (₨)': t.income,
        'Expenses (₨)': t.expenses,
        'Net Income (₨)': t.netIncome,
        'Distance (km)': t.distance.toFixed(2),
        'Avg km/L': t.avgEfficiency.toFixed(2)
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trendsData), 'Daily Trends');

      XLSX.writeFile(wb, `trips-analytics-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Excel report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel report');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Daily Trips Analytics Report', 14, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Period: ${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`, 14, yPos);
      
      yPos += 10;

      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Overview', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Trips', data.overview.totalTrips.toString()],
          ['Total Distance', `${data.overview.totalDistance.toFixed(2)} km`],
          ['Total Revenue', `₨${data.overview.totalIncome.toLocaleString()}`],
          ['Total Expenses', `₨${data.overview.totalExpenses.toLocaleString()}`],
          ['Net Profit', `₨${data.overview.netProfit.toLocaleString()}`],
          ['Profit Margin', `${data.overview.profitMargin.toFixed(2)}%`],
          ['Average Efficiency', `${data.overview.avgEfficiency.toFixed(2)} km/L`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Top Drivers
      doc.addPage();
      yPos = 20;
      doc.setFontSize(14);
      doc.text('Top 10 Drivers', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Driver', 'Trips', 'Net Income', 'Avg km/L']],
        body: data.driverStats.slice(0, 10).map((d: any) => [
          d.rank,
          d.driverName,
          d.totalTrips,
          `₨${d.netIncome.toLocaleString()}`,
          d.avgEfficiency.toFixed(2)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Top Routes
      doc.addPage();
      yPos = 20;
      doc.setFontSize(14);
      doc.text('Route Performance', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Route', 'Trips', 'Income', 'Profit Margin']],
        body: data.routeStats.slice(0, 10).map((r: any) => [
          r.routeName,
          r.totalTrips,
          `₨${r.totalIncome.toLocaleString()}`,
          `${r.profitMargin.toFixed(2)}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`trips-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Analytics Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            onClick={exportToExcel}
            disabled={exporting}
            className="w-full justify-start"
            variant="outline"
            size="lg"
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-5 h-5 mr-3" />
            )}
            Export as Excel (.xlsx)
            <span className="ml-auto text-xs text-muted-foreground">Recommended for data analysis</span>
          </Button>

          <Button
            onClick={exportToPDF}
            disabled={exporting}
            className="w-full justify-start"
            variant="outline"
            size="lg"
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <FileText className="w-5 h-5 mr-3" />
            )}
            Export as PDF (.pdf)
            <span className="ml-auto text-xs text-muted-foreground">Best for printing</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          The report will include all analytics data for the selected date range including overview metrics, 
          driver performance, route analysis, bus statistics, and daily trends.
        </p>
      </DialogContent>
    </Dialog>
  );
}
