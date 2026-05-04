import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Calendar as CalendarIcon, BookOpen, Search, ArrowUpRight, ArrowDownRight, Activity, HandCoins } from "lucide-react";
import { format, parseISO } from "date-fns";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { useCompany } from "@/contexts/CompanyContext";
import { JournalEntryDetailDialog } from "../JournalEntryDetailDialog";
import { cn } from "@/lib/utils";

export const DayBookView = () => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "cash_bank" | "revenue" | "expense">("all");
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["day-book-v2", selectedDate, effectiveCompanyId],
    queryFn: async () => {
      // 1. Fetch journal entries for the specific date
      let jeQuery = supabase
        .from("journal_entries")
        .select(`
          id,
          entry_number,
          entry_date,
          description,
          status,
          created_at,
          total_debit,
          total_credit,
          is_reversal,
          reversed_entry_id
        `)
        .eq("entry_date", selectedDate)
        .order("created_at", { ascending: true });

      if (effectiveCompanyId) {
        jeQuery = jeQuery.eq("company_id", effectiveCompanyId);
      }

      const { data: entries, error: jeError } = await jeQuery;
      if (jeError) throw jeError;
      if (!entries || entries.length === 0) return { entries: [], lines: [] };

      const entryIds = entries.map((e) => e.id);

      // 2. Fetch all lines for these entries
      const { data: lines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          id,
          journal_entry_id,
          account_id,
          description,
          debit,
          credit,
          chart_of_accounts (
            account_code,
            account_name,
            account_type
          )
        `)
        .in("journal_entry_id", entryIds)
        .order("debit", { ascending: false }); // Show debits first in the UI for standard reading

      if (linesError) throw linesError;

      return { entries, lines: lines || [] };
    },
    enabled: !!selectedDate,
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    let totalVolume = 0;
    let cashIn = 0;
    let cashOut = 0;

    if (rawData?.entries && rawData?.lines) {
      // Volume = sum of all debits
      totalVolume = rawData.entries.reduce((sum, e) => sum + (e.total_debit || 0), 0);

      rawData.lines.forEach(line => {
        const acctName = (line.chart_of_accounts?.account_name || "").toLowerCase();
        const acctType = (line.chart_of_accounts?.account_type || "").toLowerCase();
        
        // Very broad check for cash/bank
        const isCashOrBank = acctType === 'bank' || acctType === 'cash' || /bank|cash|float|petty/i.test(acctName);

        if (isCashOrBank) {
          if (line.debit > 0) cashIn += line.debit;
          if (line.credit > 0) cashOut += line.credit;
        }
      });
    }

    return {
      volume: totalVolume,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut
    };
  }, [rawData]);

  // Apply Filters
  const filteredEntries = useMemo(() => {
    if (!rawData) return [];
    
    return rawData.entries.filter(entry => {
      const entryLines = rawData.lines.filter(l => l.journal_entry_id === entry.id);
      
      // 1. Quick Filter Logic (if a filter is active, at least ONE line must match)
      if (activeFilter !== "all") {
        let matchesFilter = false;
        
        for (const line of entryLines) {
          const acctName = (line.chart_of_accounts?.account_name || "").toLowerCase();
          const acctType = (line.chart_of_accounts?.account_type || "").toLowerCase();
          
          if (activeFilter === "cash_bank" && (/bank|cash|float|petty/i.test(acctName) || acctType === 'bank' || acctType === 'cash')) {
            matchesFilter = true; break;
          }
          if (activeFilter === "revenue" && (acctType === 'revenue' || acctType === 'income')) {
            matchesFilter = true; break;
          }
          if (activeFilter === "expense" && acctType === 'expense') {
            matchesFilter = true; break;
          }
        }
        if (!matchesFilter) return false;
      }

      // 2. Search Logic
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesEntryLevel = entry.entry_number?.toLowerCase().includes(q) || entry.description?.toLowerCase().includes(q);
        
        const matchesAnyLine = entryLines.some(line => 
          line.description?.toLowerCase().includes(q) || 
          line.chart_of_accounts?.account_name?.toLowerCase().includes(q) ||
          line.chart_of_accounts?.account_code?.toLowerCase().includes(q)
        );

        if (!matchesEntryLevel && !matchesAnyLine) return false;
      }

      return true;
    });
  }, [rawData, activeFilter, searchQuery]);

  // Flatten for table rendering
  const flattenedData = useMemo(() => {
    const flat: any[] = [];
    filteredEntries.forEach((entry, entryIndex) => {
      const entryLines = rawData?.lines.filter(l => l.journal_entry_id === entry.id) || [];
      entryLines.forEach((line, index) => {
        flat.push({
          ...line,
          entryObj: entry, // Keep full object for the modal
          entryIndex,      // For alternating background colors
          time: entry.created_at,
          entryNumber: entry.entry_number,
          entryDescription: entry.description,
          status: entry.status,
          accountCode: line.chart_of_accounts?.account_code,
          accountName: line.chart_of_accounts?.account_name,
          lineDescription: line.description || entry.description,
          isFirstLine: index === 0,
          isLastLine: index === entryLines.length - 1,
          rowspan: entryLines.length
        });
      });
    });
    return flat;
  }, [filteredEntries, rawData]);

  const totalFilteredDebit = filteredEntries.reduce((sum, e) => sum + (e.total_debit || 0), 0);
  const totalFilteredCredit = filteredEntries.reduce((sum, e) => sum + (e.total_credit || 0), 0);

  const handleExportCSV = () => {
    if (!flattenedData.length) return;
    
    const rows = [
      ["Day Book", `Date: ${format(parseISO(selectedDate), "dd MMM yyyy")}`],
      [],
      ["Time", "Entry Number", "Account Code", "Account Name", "Description", "Debit", "Credit", "Status"]
    ];

    flattenedData.forEach(item => {
      rows.push([
        format(new Date(item.time), "HH:mm:ss"),
        item.entryNumber,
        item.accountCode || "",
        item.accountName || "",
        item.lineDescription || "",
        item.debit.toString(),
        item.credit.toString(),
        item.status
      ]);
    });

    rows.push([]);
    rows.push(["", "", "", "", "TOTAL", totalFilteredDebit.toString(), totalFilteredCredit.toString(), ""]);

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `day-book-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Day Book
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Chronological interactive ledger for daily financial activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2 bg-white dark:bg-black rounded-md border p-1 mr-2">
             <CalendarIcon className="h-4 w-4 text-muted-foreground ml-2" />
             <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 w-[140px] border-0 focus:ring-0 text-sm bg-transparent"
             />
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!flattenedData.length}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Daily Volume</p>
              <h3 className="text-2xl font-bold mt-1"><CurrencyDisplay amount={kpis.volume} /></h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cash & Bank Inflows</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400"><CurrencyDisplay amount={kpis.cashIn} /></h3>
            </div>
            <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500 hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cash & Bank Outflows</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400"><CurrencyDisplay amount={kpis.cashOut} /></h3>
            </div>
            <div className="h-10 w-10 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary bg-primary/5 hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Net Cash Movement</p>
              <h3 className={cn("text-2xl font-bold mt-1", kpis.netCash >= 0 ? "text-emerald-600" : "text-rose-600")}>
                <CurrencyDisplay amount={kpis.netCash} />
              </h3>
            </div>
            <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
              <HandCoins className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="p-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
             {/* Quick Filters */}
             <div className="flex bg-background/80 p-1 rounded-lg border shadow-sm w-full sm:w-auto">
                {(['all', 'cash_bank', 'revenue', 'expense'] as const).map(filter => (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                       "h-8 text-xs px-3 rounded-md transition-all",
                       activeFilter === filter && "shadow-sm"
                    )}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter === 'all' && 'All Activity'}
                    {filter === 'cash_bank' && 'Cash Book Only'}
                    {filter === 'revenue' && 'Revenue'}
                    {filter === 'expense' && 'Expenses'}
                  </Button>
                ))}
             </div>
             
             {/* Search */}
             <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Entry No, Description, Account..."
                  className="pl-8 h-9 bg-background/80"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-24">Time</TableHead>
                  <TableHead className="w-44">Entry No.</TableHead>
                  <TableHead className="w-48">Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-36">Debit</TableHead>
                  <TableHead className="text-right w-36">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                       <div className="flex flex-col items-center gap-2">
                          <Activity className="h-6 w-6 animate-pulse text-primary/50" />
                          <p>Loading ledger entries...</p>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : !flattenedData || flattenedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-lg font-medium">No transactions found</p>
                        <p className="text-sm">Try adjusting your filters or selecting a different date.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {flattenedData.map((item, i) => (
                      <TableRow 
                        key={`${item.id}-${i}`} 
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          item.isFirstLine && "border-t-2 border-t-muted", // Stronger top border for entry separation
                          !item.isLastLine && "border-b-0", // Remove inner borders for grouping
                          item.isLastLine && "border-b",
                          item.entryIndex % 2 === 0 ? "bg-transparent" : "bg-muted/5" // Subtle alternating row grouping
                        )}
                      >
                        <TableCell className="text-xs text-muted-foreground align-top pt-4">
                          {item.isFirstLine ? format(new Date(item.time), "HH:mm") : ""}
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          {item.isFirstLine && (
                            <div className="flex flex-col gap-1.5 items-start">
                               <Badge 
                                  variant="outline" 
                                  className="font-mono text-[11px] cursor-pointer bg-background hover:bg-primary/10 hover:text-primary transition-all py-1 border-primary/20 shadow-sm"
                                  onClick={() => setSelectedEntry(item.entryObj)}
                                  title="Click to view Journal Entry Details"
                               >
                                  {item.entryNumber}
                               </Badge>
                               {item.status !== "posted" && (
                                  <span className="text-[10px] font-semibold text-rose-500 uppercase">{item.status}</span>
                               )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <div className="text-sm font-medium whitespace-nowrap">{item.accountCode}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.accountName}>
                            {item.accountName}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm align-top pt-4">
                          <span className={cn(item.isFirstLine ? "font-medium text-foreground/90" : "text-muted-foreground")}>
                            {item.lineDescription}
                          </span>
                        </TableCell>
                        <TableCell className="text-right align-top pt-4">
                          {item.debit > 0 ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              <CurrencyDisplay amount={item.debit} />
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right align-top pt-4">
                          {item.credit > 0 ? (
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              <CurrencyDisplay amount={item.credit} />
                            </span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Totals Row */}
                    <TableRow className="bg-muted/30 border-t-2 border-t-muted">
                      <TableCell colSpan={4} className="text-right font-bold py-5 text-sm uppercase tracking-wider text-muted-foreground">
                        Totals For {format(parseISO(selectedDate), "dd MMM yyyy")} {activeFilter !== 'all' && "(Filtered)"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 py-5 text-lg">
                        <CurrencyDisplay amount={totalFilteredDebit} />
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400 py-5 text-lg">
                        <CurrencyDisplay amount={totalFilteredCredit} />
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Modal */}
      {selectedEntry && (
         <JournalEntryDetailDialog
           entry={selectedEntry}
           open={!!selectedEntry}
           onOpenChange={(open) => {
             if (!open) setSelectedEntry(null);
           }}
         />
      )}
    </div>
  );
};
