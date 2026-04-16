import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateDisplay } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react";

interface ImportHistoryTableProps {
  branchId: string;
}

export function ImportHistoryTable({ branchId }: ImportHistoryTableProps) {
  const [imports, setImports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [branchId]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('school_payment_imports')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setImports(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: "default" as const, icon: CheckCircle, text: "Completed" },
      processing: { variant: "secondary" as const, icon: Clock, text: "Processing" },
      failed: { variant: "destructive" as const, icon: XCircle, text: "Failed" },
      pending: { variant: "outline" as const, icon: Clock, text: "Pending" },
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "import_date",
      header: "Import Date",
      cell: ({ row }) => formatDateDisplay(row.original.import_date),
    },
    {
      accessorKey: "file_name",
      header: "File Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.file_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "total_transactions",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.total_transactions}</span>
      ),
    },
    {
      accessorKey: "auto_matched_count",
      header: "Auto-Matched",
      cell: ({ row }) => (
        <Badge variant="default">{row.original.auto_matched_count}</Badge>
      ),
    },
    {
      accessorKey: "manual_matched_count",
      header: "Manual",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.manual_matched_count}</Badge>
      ),
    },
    {
      accessorKey: "unmatched_count",
      header: "Unmatched",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.unmatched_count}</Badge>
      ),
    },
    {
      accessorKey: "total_amount_imported",
      header: "Total Amount",
      cell: ({ row }) => (
        <span className="font-semibold">
          LKR {row.original.total_amount_imported?.toLocaleString() || '0'}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading history...</div>;
  }

  if (imports.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No import history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import History ({imports.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={imports} />
      </CardContent>
    </Card>
  );
}
