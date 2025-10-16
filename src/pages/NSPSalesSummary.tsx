import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ShoppingCart, Download } from "lucide-react";
import { SalesSummaryTable } from "@/components/nsp/SalesSummaryTable";
import { ExportModal } from "@/components/nsp/ExportModal";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";

const NSPSalesSummary = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg">
            <FileSpreadsheet className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Sales Summary & Reports</h1>
            <p className="text-muted-foreground">View and export NSP sales data</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/nsp-daily-sales')}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Daily Sales Entry
          </Button>
          <Button onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Data</CardTitle>
              <CardDescription>
                Filter and view sales records by date range
              </CardDescription>
            </div>
            <DateRangePicker
              onDateRangeChange={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <SalesSummaryTable dateRange={dateRange} />
        </CardContent>
      </Card>

      <ExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        dateRange={dateRange}
      />
    </div>
  );
};

export default NSPSalesSummary;
