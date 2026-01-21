import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "./shared/StatusBadge";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JournalEntryForm } from "./JournalEntryForm";

export const JournalEntriesView = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("entry_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

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
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === "draft" && (
            <>
              <Button size="sm" variant="outline" className="text-green-600">
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="text-destructive">
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

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
    </Card>
  );
};
