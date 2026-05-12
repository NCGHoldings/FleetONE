import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, CheckCircle, XCircle, RotateCcw, Search, Download, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "./shared/StatusBadge";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { JournalEntryForm } from "./JournalEntryForm";
import { JournalEntryDetailDialog } from "./JournalEntryDetailDialog";
import { useJournalEntries, useAllProfiles } from "@/hooks/useAccountingData";
import { usePostJournalEntry, useRejectJournalEntry, useReverseJournalEntry } from "@/hooks/useAccountingMutations";
import { useCompany } from "@/contexts/CompanyContext";
import { DateRangeFilter, type DateRange } from "@/components/ui/DateRangeFilter";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import { GLExportModal } from "./GLExportModal";
import { GLExportFilters } from "./GLExcelExporter";

// Business unit display mapping
const BUSINESS_UNIT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  SBO: { label: "School Bus", variant: "default" },
  YUT: { label: "Yutong", variant: "secondary" },
  SPH: { label: "Special Hire", variant: "outline" },
  LTV: { label: "Light Vehicle", variant: "secondary" },
  SNT: { label: "Sinotruck", variant: "outline" },
};

export const JournalEntriesView = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Advanced filters
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [resetKey, setResetKey] = useState(0);

  const { selectedCompany, getSubCompaniesFor, isSubCompany, selectedCompanyId } = useCompany();
  
  // Get available business units for filter (only for parent companies)
  const subCompanies = selectedCompany?.id && !isSubCompany(selectedCompany.id) 
    ? getSubCompaniesFor(selectedCompany.id) 
    : [];

  const { data: entries, isLoading } = useJournalEntries(undefined, filterBusinessUnit);
  const { data: profiles } = useAllProfiles();
  const postEntry = usePostJournalEntry();
  const rejectEntry = useRejectJournalEntry();
  const reverseEntry = useReverseJournalEntry();
  const [reverseConfirmEntry, setReverseConfirmEntry] = useState<any>(null);

  const getCreatorName = (userId: string | null) => {
    if (!userId) return "System";
    const profile = profiles?.find((p: any) => p.user_id === userId || p.id === userId);
    if (profile) return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    return userId.substring(0, 8);
  };

  // Filter entries based on multiple criteria
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    
    return entries.filter((entry: any) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        
        // Strip commas for cleaner amount searching (e.g. typing "22112" matches "22,112.00")
        const cleanDebitStr = entry.total_debit ? entry.total_debit.toString().replace(/,/g, '') : '';
        const cleanCreditStr = entry.total_credit ? entry.total_credit.toString().replace(/,/g, '') : '';
        const queryClean = query.replace(/,/g, '');

        const matchesSearch = 
          entry.entry_number?.toLowerCase().includes(query) ||
          entry.description?.toLowerCase().includes(query) ||
          entry.reference?.toLowerCase().includes(query) ||
          entry.business_unit_code?.toLowerCase().includes(query) ||
          cleanDebitStr.includes(queryClean) ||
          cleanCreditStr.includes(queryClean);
          
        if (!matchesSearch) return false;
      }

      // 2. Status
      if (filterStatus !== "all" && entry.status !== filterStatus) return false;

      // 3. Date Range
      if (dateRange?.startDate || dateRange?.endDate) {
        const entryDate = new Date(entry.entry_date);
        entryDate.setHours(0, 0, 0, 0);
        
        if (dateRange.startDate) {
          const fromDate = new Date(dateRange.startDate);
          fromDate.setHours(0, 0, 0, 0);
          if (entryDate < fromDate) return false;
        }
        
        if (dateRange.endDate) {
          const toDate = new Date(dateRange.endDate);
          toDate.setHours(23, 59, 59, 999);
          if (entryDate > toDate) return false;
        }
      }

      // 4. Amount Range (checking total_debit as absolute entry value)
      const amount = entry.total_debit || 0;
      if (minAmount && !isNaN(Number(minAmount)) && amount < Number(minAmount)) return false;
      if (maxAmount && !isNaN(Number(maxAmount)) && amount > Number(maxAmount)) return false;

      return true;
    });
  }, [entries, searchQuery, filterStatus, dateRange, minAmount, maxAmount]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setDateRange({ startDate: null, endDate: null });
    setMinAmount("");
    setMaxAmount("");
    setFilterBusinessUnit("all");
    setResetKey(prev => prev + 1);
  };

  const activeFilterCount = 
    (filterStatus !== "all" ? 1 : 0) + 
    (dateRange?.startDate || dateRange?.endDate ? 1 : 0) + 
    (minAmount ? 1 : 0) + 
    (maxAmount ? 1 : 0) +
    (filterBusinessUnit !== "all" ? 1 : 0);

  const handleApprove = (entryId: string) => {
    postEntry.mutate(entryId, {
      onSuccess: () => toast.success("Journal entry approved and posted"),
      onError: (error) => toast.error(`Failed to approve: ${error.message}`),
    });
  };

  const handleReject = (entryId: string) => {
    rejectEntry.mutate({ id: entryId, reason: "Rejected by user" }, {
      onSuccess: () => toast.success("Journal entry rejected"),
      onError: (error) => toast.error(`Failed to reject: ${error.message}`),
    });
  };

  const handleReverse = (entryId: string) => {
    reverseEntry.mutate(entryId, {
      onSuccess: () => {
        setReverseConfirmEntry(null);
        toast.success("Journal entry reversed successfully");
      },
      onError: (error) => {
        setReverseConfirmEntry(null);
        toast.error(`Failed to reverse: ${error.message}`);
      },
    });
  };

  const handleView = (entry: any) => {
    setSelectedEntry(entry);
    setShowDetail(true);
  };

  const columns = [
    {
      accessorKey: "entry_number",
      header: "Entry #",
      cell: ({ row }: any) => (
        <div>
          <span className="font-mono text-sm">{row.original.entry_number}</span>
          {row.original.legacy_number && row.original.legacy_number !== row.original.entry_number && (
            <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">was: {row.original.legacy_number}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "entry_date",
      header: "Date",
      cell: ({ row }: any) => <DateDisplay date={row.original.entry_date} />,
    },
    {
      accessorKey: "business_unit_code",
      header: "Business Unit",
      cell: ({ row }: any) => {
        const code = row.original.business_unit_code;
        if (!code) return <Badge variant="outline">HQ</Badge>;
        const config = BUSINESS_UNIT_LABELS[code] || { label: code, variant: "outline" as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }: any) => (
        <span className="max-w-[250px] truncate block">{row.original.description}</span>
      ),
    },
    {
      accessorKey: "total_debit",
      header: "Debit",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.total_debit} />,
    },
    {
      accessorKey: "total_credit",
      header: "Credit",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.total_credit} />,
    },
    {
      accessorKey: "created_by",
      header: "Created By",
      cell: ({ row }: any) => (
        <span className="text-sm text-muted-foreground">
          {getCreatorName(row.original.created_by)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => handleView(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === "draft" && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-emerald-600 hover:text-emerald-700"
                onClick={() => handleApprove(row.original.id)}
                disabled={postEntry.isPending}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-destructive hover:text-destructive"
                onClick={() => handleReject(row.original.id)}
                disabled={rejectEntry.isPending}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {row.original.status === "posted" && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-amber-600 hover:text-amber-700"
              onClick={() => setReverseConfirmEntry(row.original)}
              disabled={reverseEntry.isPending}
              title="Reverse Entry"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Card className="p-6"><p>Loading journal entries...</p></Card>;
  }

  // Check if viewing as parent company with sub-companies
  const showBusinessUnitFilter = selectedCompanyId && !isSubCompany(selectedCompanyId) && subCompanies.length > 0;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">General Ledger</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {showBusinessUnitFilter 
              ? "Consolidated journal entries across all business units"
              : "Record and manage journal entries for financial transactions"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Business Unit Filter - only show for parent companies */}
          {showBusinessUnitFilter && (
            <Select value={filterBusinessUnit} onValueChange={setFilterBusinessUnit}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Business Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Units</SelectItem>
                {subCompanies.map((sub) => (
                  <SelectItem key={sub.id} value={sub.short_code || sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button variant="outline" onClick={() => setIsExportOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Journal Entry</DialogTitle>
              </DialogHeader>
              <JournalEntryForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by entry #, amount, desc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <DateRangeFilter 
            key={resetKey}
            value={dateRange}
            onChange={setDateRange} 
          />

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>

          {/* Amount Range Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Min</span>
              <Input 
                type="number" 
                className="w-24 pl-9 h-10" 
                value={minAmount} 
                onChange={(e) => setMinAmount(e.target.value)} 
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Max</span>
              <Input 
                type="number" 
                className="w-24 pl-10 h-10" 
                value={maxAmount} 
                onChange={(e) => setMaxAmount(e.target.value)} 
              />
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground ml-auto md:ml-0 transition-opacity animate-in fade-in"
              onClick={handleClearFilters}
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredEntries}
        enableColumnFilters
      />

      {/* Entry Detail Dialog */}
      <JournalEntryDetailDialog
        entry={selectedEntry}
        open={showDetail}
        onOpenChange={setShowDetail}
      />

      {/* GL Export Modal */}
      <GLExportModal
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        filteredEntries={filteredEntries}
        filters={{
          searchQuery,
          filterStatus,
          filterBusinessUnit,
          dateFrom: dateRange?.startDate ? new Date(dateRange.startDate) : undefined,
          dateTo: dateRange?.endDate ? new Date(dateRange.endDate) : undefined,
          minAmount,
          maxAmount,
        }}
      />

      {/* GL Export Modal */}
      <AlertDialog open={!!reverseConfirmEntry} onOpenChange={(open) => !open && setReverseConfirmEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600">⚠️ Reverse Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to <strong>reverse</strong> this journal entry. This action will:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Create a new <strong>REV-</strong> entry with swapped debits/credits</li>
                  <li>Mark the original entry as <strong>"Reversed"</strong></li>
                  <li>Reverse all Chart of Accounts balance impacts</li>
                </ul>
                {reverseConfirmEntry && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                    <p className="text-sm font-medium">Entry: <span className="font-mono">{reverseConfirmEntry.entry_number}</span></p>
                    <p className="text-sm">Amount: <span className="font-semibold">LKR {Number(reverseConfirmEntry.total_debit).toLocaleString()}</span></p>
                    <p className="text-sm text-muted-foreground truncate">{reverseConfirmEntry.description}</p>
                  </div>
                )}
                <p className="text-destructive font-medium text-sm">This action cannot be easily undone. Please confirm you want to proceed.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              disabled={reverseEntry.isPending}
              onClick={() => {
                if (reverseConfirmEntry) {
                  handleReverse(reverseConfirmEntry.id);
                }
              }}
            >
              {reverseEntry.isPending ? "Reversing..." : "Yes, Reverse Entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};