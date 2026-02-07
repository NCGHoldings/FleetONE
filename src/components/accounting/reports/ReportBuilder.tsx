import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, Play, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";

const DATA_SOURCES = [
  { id: "ar_invoices", label: "AR Invoices", columns: ["invoice_number", "invoice_date", "due_date", "total_amount", "balance", "status"] },
  { id: "ap_invoices", label: "AP Invoices", columns: ["invoice_number", "invoice_date", "due_date", "total_amount", "balance", "status"] },
  { id: "journal_entries", label: "Journal Entries", columns: ["entry_number", "entry_date", "description", "total_debit", "total_credit", "status"] },
  { id: "customers", label: "Customers", columns: ["customer_code", "customer_name", "email", "phone", "credit_limit", "current_balance"] },
  { id: "vendors", label: "Vendors", columns: ["vendor_code", "vendor_name", "email", "phone", "payment_terms"] },
  { id: "items", label: "Inventory Items", columns: ["item_code", "item_name", "category_id", "selling_price", "standard_cost", "reorder_level"] },
];

const OPERATORS = [
  { id: "equals", label: "Equals" },
  { id: "contains", label: "Contains" },
  { id: "greater_than", label: "Greater Than" },
  { id: "less_than", label: "Less Than" },
];

interface Filter {
  field: string;
  operator: string;
  value: string;
}

export const ReportBuilder = () => {
  const { selectedCompany } = useCompany();
  const [dataSource, setDataSource] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentSource = DATA_SOURCES.find(s => s.id === dataSource);

  const addFilter = () => {
    if (currentSource && currentSource.columns.length > 0) {
      setFilters([...filters, { field: currentSource.columns[0], operator: "equals", value: "" }]);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, key: keyof Filter, value: string) => {
    const updated = [...filters];
    updated[index][key] = value;
    setFilters(updated);
  };

  const toggleColumn = (column: string) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const runReport = async () => {
    if (!dataSource || !selectedCompany?.id) {
      toast.error("Please select a data source");
      return;
    }

    setIsLoading(true);
    try {
      let query = (supabase as any).from(dataSource).select(selectedColumns.length > 0 ? selectedColumns.join(",") : "*");
      
      if (dataSource !== "customers" && dataSource !== "vendors" && dataSource !== "items") {
        query = query.eq("company_id", selectedCompany.id);
      }

      filters.forEach(filter => {
        if (filter.value) {
          switch (filter.operator) {
            case "equals":
              query = query.eq(filter.field, filter.value);
              break;
            case "contains":
              query = query.ilike(filter.field, `%${filter.value}%`);
              break;
            case "greater_than":
              query = query.gt(filter.field, filter.value);
              break;
            case "less_than":
              query = query.lt(filter.field, filter.value);
              break;
          }
        }
      });

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setPreviewData(data || []);
      toast.success(`Loaded ${data?.length || 0} records`);
    } catch (error: any) {
      toast.error(error.message || "Failed to run report");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (previewData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(previewData[0]);
    const csvContent = [
      headers.join(","),
      ...previewData.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${dataSource}_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Report Builder</h2>
        <p className="text-muted-foreground">Create custom reports from your accounting data</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Data Source */}
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={(v) => { setDataSource(v); setSelectedColumns([]); setFilters([]); setPreviewData([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map(source => (
                    <SelectItem key={source.id} value={source.id}>{source.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Columns */}
            {currentSource && (
              <div className="space-y-2">
                <Label>Columns</Label>
                <div className="flex flex-wrap gap-2">
                  {currentSource.columns.map(col => (
                    <Button
                      key={col}
                      variant={selectedColumns.includes(col) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleColumn(col)}
                    >
                      {col.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedColumns.length === 0 ? "All columns selected" : `${selectedColumns.length} column(s) selected`}
                </p>
              </div>
            )}

            {/* Filters */}
            {currentSource && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Filters</Label>
                  <Button variant="ghost" size="sm" onClick={addFilter}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {filters.map((filter, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select value={filter.field} onValueChange={(v) => updateFilter(index, "field", v)}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentSource.columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filter.operator} onValueChange={(v) => updateFilter(index, "operator", v)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.id} value={op.id}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="flex-1"
                      value={filter.value}
                      onChange={(e) => updateFilter(index, "value", e.target.value)}
                      placeholder="Value"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeFilter(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={runReport} disabled={!dataSource || isLoading}>
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? "Running..." : "Run Report"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>{previewData.length} record(s)</CardDescription>
            </div>
            {previewData.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {previewData.length > 0 ? (
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(previewData[0]).map(key => (
                        <TableHead key={key}>{key.replace(/_/g, " ")}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        {Object.entries(row).map(([key, value], i) => (
                          <TableCell key={i}>
                            {typeof value === "number" && (key.includes("amount") || key.includes("balance") || key.includes("price") || key.includes("cost"))
                              ? <CurrencyDisplay amount={value} />
                              : String(value ?? "-")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configure and run your report to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
