import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function ExportModal({ open, onClose, dateRange: initialRange }: ExportModalProps) {
  const [dateRange, setDateRange] = useState(initialRange);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | "csv">("excel");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeBreakdown, setIncludeBreakdown] = useState(true);
  const [includeOtherIncome, setIncludeOtherIncome] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch data
      const { data, error } = await supabase
        .from('nsp_daily_sales')
        .select('*')
        .gte('sale_date', dateRange.from.toISOString().split('T')[0])
        .lte('sale_date', dateRange.to.toISOString().split('T')[0])
        .order('sale_date', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No sales data found for the selected date range",
          variant: "destructive",
        });
        return;
      }

      if (exportFormat === "excel") {
        exportToExcel(data);
      } else if (exportFormat === "pdf") {
        exportToPDF(data);
      } else if (exportFormat === "csv") {
        exportToCSV(data);
      }

      toast({
        title: "Success",
        description: "Sales data exported successfully",
      });

      onClose();
    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export sales data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = (data: any[]) => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    if (includeSummary) {
      const totalSales = data.reduce((sum, r) => sum + r.total_sale, 0);
      const avgSales = totalSales / data.length;

      const summaryData = [
        ["NSP Sales Summary"],
        ["Period", `${format(dateRange.from, "MMM dd, yyyy")} to ${format(dateRange.to, "MMM dd, yyyy")}`],
        [""],
        ["Total Sales", totalSales],
        ["Days Recorded", data.length],
        ["Average Daily Sales", avgSales],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
    }

    // Detailed data sheet
    if (includeBreakdown) {
      const detailedData = data.map((record) => {
        const otherTotal = record.other_income?.reduce(
          (sum: number, item: any) => sum + (item.amount || 0),
          0
        ) || 0;

        return {
          Date: format(new Date(record.sale_date), "yyyy-MM-dd"),
          "LSS Outside": record.lss_outside_sale,
          "LSS Inside": record.lss_inside_sale,
          "Tyre Sale": record.tyre_sale,
          Pepiliyana: record.pepiliyana_sale,
          "Other Income": otherTotal,
          "Total Sale": record.total_sale,
        };
      });

      const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, detailedSheet, "Daily Sales");
    }

    // Other income details
    if (includeOtherIncome) {
      const otherIncomeData: any[] = [];
      data.forEach((record) => {
        if (record.other_income && record.other_income.length > 0) {
          record.other_income.forEach((item: any) => {
            otherIncomeData.push({
              Date: format(new Date(record.sale_date), "yyyy-MM-dd"),
              Description: item.description,
              Amount: item.amount,
            });
          });
        }
      });

      if (otherIncomeData.length > 0) {
        const otherSheet = XLSX.utils.json_to_sheet(otherIncomeData);
        XLSX.utils.book_append_sheet(wb, otherSheet, "Other Income");
      }
    }

    XLSX.writeFile(wb, `NSP_Sales_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const exportToPDF = (data: any[]) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("NSP Sales Report", 14, 20);

    doc.setFontSize(10);
    doc.text(
      `Period: ${format(dateRange.from, "MMM dd, yyyy")} to ${format(dateRange.to, "MMM dd, yyyy")}`,
      14,
      30
    );

    // Summary
    if (includeSummary) {
      const totalSales = data.reduce((sum, r) => sum + r.total_sale, 0);
      const avgSales = totalSales / data.length;

      doc.text(`Total Sales: Rs. ${totalSales.toLocaleString()}`, 14, 40);
      doc.text(`Days Recorded: ${data.length}`, 14, 46);
      doc.text(`Average Daily Sales: Rs. ${avgSales.toLocaleString()}`, 14, 52);
    }

    // Table
    if (includeBreakdown) {
      const tableData = data.map((record) => {
        const otherTotal = record.other_income?.reduce(
          (sum: number, item: any) => sum + (item.amount || 0),
          0
        ) || 0;

        return [
          format(new Date(record.sale_date), "MMM dd"),
          record.lss_outside_sale.toLocaleString(),
          record.lss_inside_sale.toLocaleString(),
          record.tyre_sale.toLocaleString(),
          record.pepiliyana_sale.toLocaleString(),
          otherTotal.toLocaleString(),
          record.total_sale.toLocaleString(),
        ];
      });

      autoTable(doc, {
        startY: includeSummary ? 60 : 40,
        head: [["Date", "LSS Out", "LSS In", "Tyre", "Pepil", "Other", "Total"]],
        body: tableData,
      });
    }

    doc.save(`NSP_Sales_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const exportToCSV = (data: any[]) => {
    const csvData = data.map((record) => {
      const otherTotal = record.other_income?.reduce(
        (sum: number, item: any) => sum + (item.amount || 0),
        0
      ) || 0;

      return {
        Date: format(new Date(record.sale_date), "yyyy-MM-dd"),
        LSS_Outside: record.lss_outside_sale,
        LSS_Inside: record.lss_inside_sale,
        Tyre_Sale: record.tyre_sale,
        Pepiliyana: record.pepiliyana_sale,
        Other_Income: otherTotal,
        Total_Sale: record.total_sale,
      };
    });

    const ws = XLSX.utils.json_to_sheet(csvData);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NSP_Sales_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Sales Data</DialogTitle>
          <DialogDescription>
            Configure your export settings and download the sales report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <DateRangePicker 
              onDateRangeChange={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }} 
            />
          </div>

          {/* Export Format */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  PDF Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  CSV
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <Label>Include</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                />
                <Label htmlFor="summary" className="cursor-pointer">
                  Summary totals
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="breakdown"
                  checked={includeBreakdown}
                  onCheckedChange={(checked) => setIncludeBreakdown(checked as boolean)}
                />
                <Label htmlFor="breakdown" className="cursor-pointer">
                  Daily breakdown
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="other-income"
                  checked={includeOtherIncome}
                  onCheckedChange={(checked) => setIncludeOtherIncome(checked as boolean)}
                />
                <Label htmlFor="other-income" className="cursor-pointer">
                  Other income details
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
