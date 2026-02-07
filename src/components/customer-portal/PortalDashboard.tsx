import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";

interface PortalDashboardProps {
  customerId: string;
  customerName: string;
}

export function PortalDashboard({ customerId, customerName }: PortalDashboardProps) {
  // Fetch customer's invoices
  const { data: invoices } = useQuery({
    queryKey: ["portal-invoices", customerId],
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

  // Calculate summary stats
  const totalOutstanding = invoices?.reduce((sum, inv) => {
    if (inv.status !== "paid" && inv.status !== "cancelled") {
      return sum + (inv.balance || 0);
    }
    return sum;
  }, 0) || 0;

  const overdueInvoices = invoices?.filter(inv => {
    return inv.status !== "paid" && 
           inv.status !== "cancelled" && 
           new Date(inv.due_date) < new Date();
  }) || [];

  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

  const paidThisMonth = invoices?.filter(inv => {
    const invoiceDate = new Date(inv.invoice_date);
    const now = new Date();
    return inv.status === "paid" &&
           invoiceDate.getMonth() === now.getMonth() &&
           invoiceDate.getFullYear() === now.getFullYear();
  }).reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;

  const recentInvoices = invoices?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome, {customerName}</h2>
        <p className="text-muted-foreground">Here's your account overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalOutstanding} />
            </div>
          </CardContent>
        </Card>

        <Card className={overdueAmount > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${overdueAmount > 0 ? "text-destructive" : ""}`} />
              Overdue Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueAmount > 0 ? "text-destructive" : ""}`}>
              <CurrencyDisplay amount={overdueAmount} />
            </div>
            {overdueInvoices.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {overdueInvoices.length} overdue invoice(s)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Paid This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <CurrencyDisplay amount={paidThisMonth} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No invoices found</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="font-semibold">
                        <CurrencyDisplay amount={invoice.total_amount} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: <CurrencyDisplay amount={invoice.balance} />
                      </p>
                    </div>
                    <Badge 
                      variant={
                        invoice.status === "paid" ? "default" :
                        invoice.status === "overdue" || new Date(invoice.due_date) < new Date() ? "destructive" :
                        "secondary"
                      }
                    >
                      {invoice.status === "paid" ? "Paid" :
                       new Date(invoice.due_date) < new Date() ? "Overdue" :
                       "Unpaid"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
