import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const JournalEntriesView = () => {
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      draft: "secondary",
      posted: "default",
      void: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const columns = [
    {
      accessorKey: "entry_number",
      header: "Entry #",
    },
    {
      accessorKey: "entry_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.entry_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "total_debit",
      header: "Debit",
      cell: ({ row }: any) => (
        <span>
          LKR {(row.original.total_debit || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "total_credit",
      header: "Credit",
      cell: ({ row }: any) => (
        <span>
          LKR {(row.original.total_credit || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <Button size="sm" variant="outline">
          <Eye className="h-4 w-4" />
        </Button>
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={entries || []}
        searchKey="description"
      />
    </Card>
  );
};
