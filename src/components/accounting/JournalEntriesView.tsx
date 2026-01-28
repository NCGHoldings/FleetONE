import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, CheckCircle, XCircle, RotateCcw, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "./shared/StatusBadge";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { JournalEntryForm } from "./JournalEntryForm";
import { JournalEntryDetailDialog } from "./JournalEntryDetailDialog";
import { useJournalEntries } from "@/hooks/useAccountingData";
import { usePostJournalEntry, useRejectJournalEntry, useReverseJournalEntry } from "@/hooks/useAccountingMutations";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

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
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { selectedCompany, getSubCompaniesFor, isSubCompany, selectedCompanyId } = useCompany();
  
  // Get available business units for filter (only for parent companies)
  const subCompanies = selectedCompany?.id && !isSubCompany(selectedCompany.id) 
    ? getSubCompaniesFor(selectedCompany.id) 
    : [];

  const { data: entries, isLoading } = useJournalEntries(undefined, filterBusinessUnit);
  const postEntry = usePostJournalEntry();
  const rejectEntry = useRejectJournalEntry();
  const reverseEntry = useReverseJournalEntry();

  // Filter entries based on search query across multiple fields
  const filteredEntries = useMemo(() => {
    if (!entries || !searchQuery.trim()) return entries || [];
    const query = searchQuery.toLowerCase();
    return entries.filter((entry: any) => 
      entry.entry_number?.toLowerCase().includes(query) ||
      entry.description?.toLowerCase().includes(query) ||
      entry.reference?.toLowerCase().includes(query) ||
      entry.business_unit_code?.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

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
      onSuccess: () => toast.success("Journal entry reversed"),
      onError: (error) => toast.error(`Failed to reverse: ${error.message}`),
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
        <span className="font-mono text-sm">{row.original.entry_number}</span>
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
              onClick={() => handleReverse(row.original.id)}
              disabled={reverseEntry.isPending}
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

      {/* Search Input */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by entry #, description, reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredEntries}
      />

      {/* Entry Detail Dialog */}
      <JournalEntryDetailDialog
        entry={selectedEntry}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </Card>
  );
};