import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "./shared/StatusBadge";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JournalEntryForm } from "./JournalEntryForm";
import { JournalEntryDetailDialog } from "./JournalEntryDetailDialog";
import { useJournalEntries } from "@/hooks/useAccountingData";
import { usePostJournalEntry, useRejectJournalEntry, useReverseJournalEntry } from "@/hooks/useAccountingMutations";
import { toast } from "sonner";

export const JournalEntriesView = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: entries, isLoading } = useJournalEntries();
  const postEntry = usePostJournalEntry();
  const rejectEntry = useRejectJournalEntry();
  const reverseEntry = useReverseJournalEntry();

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
      accessorKey: "description",
      header: "Description",
      cell: ({ row }: any) => (
        <span className="max-w-[300px] truncate block">{row.original.description}</span>
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

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Journal Entries</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Record and manage journal entries for financial transactions
          </p>
        </div>
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

      <DataTable
        columns={columns}
        data={entries || []}
        searchKey="description"
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
