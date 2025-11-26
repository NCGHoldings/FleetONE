import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generatePDFReport } from "./export/PDFReportGenerator";
import { generateExcelReport } from "./export/ExcelReportGenerator";
import { generateCSVReport } from "./export/CSVReportGenerator";
import { ExportChartRenderer } from "./export/ExportChartRenderer";

interface EnhancedExportModalProps {
  open: boolean;
  onClose: () => void;
  dateRange: {
    from: Date;
    to: Date;
  };
  analytics: any;
}

export function EnhancedExportModal({ open, onClose, dateRange, analytics }: EnhancedExportModalProps) {
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | "csv">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Section selections
  const [includeOverview, setIncludeOverview] = useState(true);
  const [includeKPIs, setIncludeKPIs] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeSalesTrend, setIncludeSalesTrend] = useState(true);
  const [includeCategoryDistribution, setIncludeCategoryDistribution] = useState(true);
  
  const [includeDetailedAnalytics, setIncludeDetailedAnalytics] = useState(true);
  const [includeMonthlyTrend, setIncludeMonthlyTrend] = useState(true);
  const [includeDayOfWeek, setIncludeDayOfWeek] = useState(true);
  const [includeTyreBreakdown, setIncludeTyreBreakdown] = useState(true);
  
  const [includePerformance, setIncludePerformance] = useState(true);
  const [includeBestWorst, setIncludeBestWorst] = useState(true);
  const [includeCategoryComparison, setIncludeCategoryComparison] = useState(true);
  
  const [includeDataTable, setIncludeDataTable] = useState(false);

  const handleExport = async () => {
    if (!analytics) {
      toast({
        title: "No Data",
        description: "Analytics data is not available",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const exportOptions = {
        includeOverview,
        includeKPIs,
        includeInsights,
        includeSalesTrend,
        includeCategoryDistribution,
        includeDetailedAnalytics,
        includeMonthlyTrend,
        includeDayOfWeek,
        includeTyreBreakdown,
        includePerformance,
        includeBestWorst,
        includeCategoryComparison,
        includeDataTable,
      };

      if (exportFormat === "pdf") {
        await generatePDFReport(analytics, dateRange, exportOptions, chartContainerRef.current);
      } else if (exportFormat === "excel") {
        await generateExcelReport(analytics, dateRange, exportOptions);
      } else if (exportFormat === "csv") {
        await generateCSVReport(analytics, dateRange, exportOptions);
      }

      toast({
        title: "Success",
        description: `Report exported successfully as ${exportFormat.toUpperCase()}`,
      });

      onClose();
    } catch (error: any) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Analytics Report</DialogTitle>
            <DialogDescription>
              Select sections and format to export comprehensive sales analytics
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Export Format */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Export Format</Label>
              <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    PDF Report (with charts)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" />
                  <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx) - Multiple sheets
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    CSV (data only)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Overview Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overview"
                  checked={includeOverview}
                  onCheckedChange={(checked) => {
                    const isChecked = checked as boolean;
                    setIncludeOverview(isChecked);
                    if (!isChecked) {
                      setIncludeKPIs(false);
                      setIncludeInsights(false);
                      setIncludeSalesTrend(false);
                      setIncludeCategoryDistribution(false);
                    }
                  }}
                />
                <Label htmlFor="overview" className="text-base font-semibold cursor-pointer">
                  Overview Section
                </Label>
              </div>
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kpis"
                    checked={includeKPIs}
                    disabled={!includeOverview}
                    onCheckedChange={(checked) => setIncludeKPIs(checked as boolean)}
                  />
                  <Label htmlFor="kpis" className="cursor-pointer text-sm">
                    KPI Summary Cards
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="insights"
                    checked={includeInsights}
                    disabled={!includeOverview}
                    onCheckedChange={(checked) => setIncludeInsights(checked as boolean)}
                  />
                  <Label htmlFor="insights" className="cursor-pointer text-sm">
                    Insights Panel
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sales-trend"
                    checked={includeSalesTrend}
                    disabled={!includeOverview}
                    onCheckedChange={(checked) => setIncludeSalesTrend(checked as boolean)}
                  />
                  <Label htmlFor="sales-trend" className="cursor-pointer text-sm">
                    Sales Trend Chart
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="category-dist"
                    checked={includeCategoryDistribution}
                    disabled={!includeOverview}
                    onCheckedChange={(checked) => setIncludeCategoryDistribution(checked as boolean)}
                  />
                  <Label htmlFor="category-dist" className="cursor-pointer text-sm">
                    Category Distribution & Comparison Charts
                  </Label>
                </div>
              </div>
            </div>

            {/* Detailed Analytics Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detailed"
                  checked={includeDetailedAnalytics}
                  onCheckedChange={(checked) => {
                    const isChecked = checked as boolean;
                    setIncludeDetailedAnalytics(isChecked);
                    if (!isChecked) {
                      setIncludeMonthlyTrend(false);
                      setIncludeDayOfWeek(false);
                      setIncludeTyreBreakdown(false);
                    }
                  }}
                />
                <Label htmlFor="detailed" className="text-base font-semibold cursor-pointer">
                  Detailed Analytics Section
                </Label>
              </div>
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="monthly-trend"
                    checked={includeMonthlyTrend}
                    disabled={!includeDetailedAnalytics}
                    onCheckedChange={(checked) => setIncludeMonthlyTrend(checked as boolean)}
                  />
                  <Label htmlFor="monthly-trend" className="cursor-pointer text-sm">
                    Monthly Trend Chart
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="day-of-week"
                    checked={includeDayOfWeek}
                    disabled={!includeDetailedAnalytics}
                    onCheckedChange={(checked) => setIncludeDayOfWeek(checked as boolean)}
                  />
                  <Label htmlFor="day-of-week" className="cursor-pointer text-sm">
                    Day-of-Week Performance Chart
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tyre-breakdown"
                    checked={includeTyreBreakdown}
                    disabled={!includeDetailedAnalytics}
                    onCheckedChange={(checked) => setIncludeTyreBreakdown(checked as boolean)}
                  />
                  <Label htmlFor="tyre-breakdown" className="cursor-pointer text-sm">
                    Tyre Sales Breakdown Chart
                  </Label>
                </div>
              </div>
            </div>

            {/* Performance Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="performance"
                  checked={includePerformance}
                  onCheckedChange={(checked) => {
                    const isChecked = checked as boolean;
                    setIncludePerformance(isChecked);
                    if (!isChecked) {
                      setIncludeBestWorst(false);
                      setIncludeCategoryComparison(false);
                    }
                  }}
                />
                <Label htmlFor="performance" className="text-base font-semibold cursor-pointer">
                  Performance Section
                </Label>
              </div>
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="best-worst"
                    checked={includeBestWorst}
                    disabled={!includePerformance}
                    onCheckedChange={(checked) => setIncludeBestWorst(checked as boolean)}
                  />
                  <Label htmlFor="best-worst" className="cursor-pointer text-sm">
                    Best/Worst Day Analysis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="category-comparison"
                    checked={includeCategoryComparison}
                    disabled={!includePerformance}
                    onCheckedChange={(checked) => setIncludeCategoryComparison(checked as boolean)}
                  />
                  <Label htmlFor="category-comparison" className="cursor-pointer text-sm">
                    Category Comparison Chart
                  </Label>
                </div>
              </div>
            </div>

            {/* Data Table Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="data-table"
                  checked={includeDataTable}
                  onCheckedChange={(checked) => setIncludeDataTable(checked as boolean)}
                />
                <Label htmlFor="data-table" className="text-base font-semibold cursor-pointer">
                  Raw Data Table
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="flex-1">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden chart renderer for capturing charts */}
      <div ref={chartContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <ExportChartRenderer analytics={analytics} />
      </div>
    </>
  );
}
