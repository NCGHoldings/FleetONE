import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const AccountsPayableView = () => {
  const { data: payables, isLoading } = useQuery({
    queryKey: ["accounts-payable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("*")
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      unpaid: "destructive",
      partial: "outline",
      paid: "default",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const columns = [
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
    },
    {
      accessorKey: "vendor_name",
      header: "Vendor",
    },
    {
      accessorKey: "invoice_date",
      header: "Invoice Date",
      cell: ({ row }: any) => format(new Date(row.original.invoice_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }: any) => format(new Date(row.original.due_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <span>
          LKR {(row.original.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }: any) => (
        <span className={row.original.balance > 0 ? "text-destructive font-semibold" : ""}>
          LKR {(row.original.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <DollarSign className="h-4 w-4 mr-2" />
          Pay
        </Button>
      ),
    },
  ];

  const totalUnpaid = payables?.reduce((sum, p) => sum + (p.balance || 0), 0) || 0;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Accounts Payable</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage vendor invoices and payments
          </p>
          <p className="text-lg font-semibold mt-2">
            Total Outstanding: <span className="text-destructive">LKR {totalUnpaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Invoice
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={payables || []}
        searchKey="vendor_name"
      />
    </Card>
  );
};
