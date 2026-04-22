import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Download, FileText, Loader2, Calendar } from "lucide-react";
import { useSpecialHireReports } from "@/hooks/useSpecialHireReports";
import RevenueOverview from "./RevenueOverview";
import TripPerformance from "./TripPerformance";
import FinancialSummary from "./FinancialSummary";
import FuelEfficiencyReport from "./FuelEfficiencyReport";
import PaymentCollectionReport from "./PaymentCollectionReport";
import BusRouteAnalytics from "./BusRouteAnalytics";
import CommissionReport from "./CommissionReport";
import SpecialHiresIncomeReport from "./SpecialHiresIncomeReport";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export default function SpecialHireReportsTab() {
  const { filters, setFilters, isLoading, quotations, stats, monthlyData, statusBreakdown, revenueBreakdown, expenseBreakdown, topBuses, topRoutes, paymentAging, commissionByAgent, fuelByBusType } = useSpecialHireReports();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    income: true, revenue: false, trips: true, financial: false, fuel: false, payment: false, bus: false, commission: false,
  });

  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const toggle = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      // Open all sections for export
      setOpenSections({ income: true, revenue: true, trips: true, financial: true, fuel: true, payment: true, bus: true, commission: true });
      await new Promise((r) => setTimeout(r, 500));

      const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      let position = 0;
      const pageH = pdf.internal.pageSize.getHeight();

      while (position < pdfH) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -position, pdfW, pdfH);
        position += pageH;
      }

      pdf.save(`special-hire-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Month", "Revenue", "Profit", "Trips", "Fuel Cost", "Commission", "Advance"];
    const rows = monthlyData.map((m) => [m.month, m.revenue, m.profit, m.trips, m.fuelCost, m.commission, m.advance].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `special-hire-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const sections = [
    { key: "income", title: "💰 Special Hires Income Report", component: <SpecialHiresIncomeReport quotations={quotations} dateTo={filters.dateTo} /> },
    { key: "revenue", title: "📊 Revenue & Profit Overview", component: <RevenueOverview stats={stats} monthlyData={monthlyData} /> },
    { key: "trips", title: "🚌 Trip Performance Analytics", component: <TripPerformance statusBreakdown={statusBreakdown} monthlyData={monthlyData} tripCount={stats.tripCount} /> },
    { key: "financial", title: "💰 Financial Summary", component: <FinancialSummary revenueBreakdown={revenueBreakdown} expenseBreakdown={expenseBreakdown} monthlyData={monthlyData} costPerKm={stats.costPerKm} /> },
    { key: "fuel", title: "⛽ Fuel & Efficiency Report", component: <FuelEfficiencyReport fuelByBusType={fuelByBusType} monthlyData={monthlyData} fuelRevenueRatio={stats.fuelRevenueRatio} totalFuel={stats.totalFuel} tripCount={stats.tripCount} /> },
    { key: "payment", title: "💳 Payment & Collection Status", component: <PaymentCollectionReport totalAdvance={stats.totalAdvance} totalBalance={stats.totalBalance} collectionRate={stats.collectionRate} paymentAging={paymentAging} monthlyData={monthlyData} /> },
    { key: "bus", title: "🗺️ Bus & Route Analytics", component: <BusRouteAnalytics topBuses={topBuses} topRoutes={topRoutes} /> },
    { key: "commission", title: "🤝 Commission & Referral Report", component: <CommissionReport totalCommission={stats.totalCommission} totalRevenue={stats.totalRevenue} commissionByAgent={commissionByAgent} monthlyData={monthlyData} /> },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading report data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Input type="date" value={format(filters.dateFrom, "yyyy-MM-dd")} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: new Date(e.target.value) }))} className="w-[150px] h-9" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={format(filters.dateTo, "yyyy-MM-dd")} onChange={(e) => setFilters((f) => ({ ...f, dateTo: new Date(e.target.value) }))} className="w-[150px] h-9" />
            </div>
            <span className="text-xs text-muted-foreground">{stats.tripCount.toLocaleString()} trips</span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileText className="h-3 w-3 mr-1" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
                {exporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Sections */}
      <div ref={reportRef} className="space-y-3">
        {sections.map((s) => (
          <Collapsible key={s.key} open={openSections[s.key]} onOpenChange={() => toggle(s.key)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    {openSections[s.key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  {s.component}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
