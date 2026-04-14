import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, FileText, RefreshCw } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";

interface InvoiceHistoryProps {
  customerId: string;
}

export function InvoiceHistory({ customerId }: InvoiceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["portal-invoices-full", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .select("*")
        .eq("customer_id", customerId)
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Filter invoices
  const filteredInvoices = invoices?.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (inv.reference?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const isOverdue = inv.status !== "paid" && 
                      inv.status !== "cancelled" && 
                      new Date(inv.due_date) < new Date();
    
    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "paid" && inv.status === "paid") ||
                         (statusFilter === "unpaid" && inv.status !== "paid" && inv.status !== "cancelled" && !isOverdue) ||
                         (statusFilter === "overdue" && isOverdue);
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (invoice: any) => {
    if (invoice.status === "paid") {
      return <Badge className="bg-green-500">Paid</Badge>;
    }
    if (invoice.status === "cancelled") {
      return <Badge variant="secondary">Cancelled</Badge>;
    }
    if (new Date(invoice.due_date) < new Date()) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="outline">Unpaid</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Invoice History</h2>
          <p className="text-muted-foreground">View and download your invoices</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button 
                variant={statusFilter === "unpaid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("unpaid")}
              >
                Unpaid
              </Button>
              <Button 
                variant={statusFilter === "overdue" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("overdue")}
              >
                Overdue
              </Button>
              <Button 
                variant={statusFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
              >
                Paid
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {invoice.invoice_number}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={invoice.total_amount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={invoice.balance} />
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
