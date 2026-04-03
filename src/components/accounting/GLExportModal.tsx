import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  exportGLToExcel,
  exportGLToCSV,
  GLExportOptions,
  GLExportFilters,
  GLLineItem,
} from "./GLExcelExporter";

interface GLExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filteredEntries: any[];
  filters: GLExportFilters;
}

export const GLExportModal = ({ open, onOpenChange, filteredEntries, filters }: GLExportModalProps) => {
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<GLExportOptions>({
    includeSummary: true,
    includeEntries: true,
    includeLineItems: false,
    includeByBusinessUnit: true,
    includeBySourceModule: false,
  });

  // Reset options when modal opens
  useEffect(() => {
    if (open) {
      setOptions({
        includeSummary: true,
        includeEntries: true,
        includeLineItems: false,
        includeByBusinessUnit: true,
        includeBySourceModule: false,
      });
      setExportFormat("xlsx");
    }
  }, [open]);

  const toggleOption = (key: keyof GLExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    if (filteredEntries.length === 0) {
      toast.error("No entries to export");
      return;
    }

    setIsExporting(true);
    try {
      if (exportFormat === "csv") {
        exportGLToCSV(filteredEntries);
        toast.success(`Exported ${filteredEntries.length} entries as CSV`);
        onOpenChange(false);
        return;
      }

      // For Excel, optionally fetch line items
      let lineItems: GLLineItem[] = [];
      if (options.includeLineItems) {
        const entryIds = filteredEntries.map(e => e.id);
        // Batch fetch in chunks of 50
        for (let i = 0; i < entryIds.length; i += 50) {
          const chunk = entryIds.slice(i, i + 50);
          const { data, error } = await supabase
            .from("journal_entry_lines")
            .select("journal_entry_id, account_id, description, debit, credit, chart_of_accounts(account_code, account_name)")
            .in("journal_entry_id", chunk);

          if (error) throw error;

          if (data) {
            const mapped = data.map((line: any) => {
              const entry = filteredEntries.find(e => e.id === line.journal_entry_id);
              return {
                journal_entry_id: line.journal_entry_id,
                entry_number: entry?.entry_number || '',
                account_code: line.chart_of_accounts?.account_code || '',
                account_name: line.chart_of_accounts?.account_name || '',
                description: line.description || '',
                debit: line.debit || 0,
                credit: line.credit || 0,
              };
            });
            lineItems.push(...mapped);
          }
        }
      }

      exportGLToExcel(filteredEntries, lineItems, filters, options);
      toast.success(`Exported ${filteredEntries.length} entries with ${lineItems.length} line items`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export General Ledger
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Entry count info */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <span className="font-medium text-foreground">{filteredEntries.length}</span> entries match current filters
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "xlsx" | "csv")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </span>
                </SelectItem>
                <SelectItem value="csv">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (.csv)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section toggles - only for Excel */}
          {exportFormat === "xlsx" && (
            <div className="space-y-3">
              <Label>Include Sections</Label>
              <div className="space-y-2">
                {([
                  { key: "includeSummary" as const, label: "Summary & Filter Info", desc: "Report metadata, totals, applied filters" },
                  { key: "includeEntries" as const, label: "Journal Entries", desc: "Entry list with dates, amounts, status" },
                  { key: "includeLineItems" as const, label: "Line Items (GL Detail)", desc: "Individual debit/credit lines with account codes" },
                  { key: "includeByBusinessUnit" as const, label: "By Business Unit", desc: "Subtotals grouped by business unit" },
                  { key: "includeBySourceModule" as const, label: "By Source Module", desc: "Subtotals grouped by source module" },
                ]).map(item => (
                  <div key={item.key} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id={item.key}
                      checked={options[item.key]}
                      onCheckedChange={() => toggleOption(item.key)}
                    />
                    <div className="grid gap-0.5 leading-none">
                      <label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                        {item.label}
                      </label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
