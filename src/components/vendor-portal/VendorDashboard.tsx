import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, FileText, DollarSign, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface VendorDashboardProps {
  vendorId: string;
  vendorName: string;
}

export const VendorDashboard = ({ vendorId, vendorName }: VendorDashboardProps) => {
  // Fetch purchase orders for this vendor
  const { data: purchaseOrders } = useQuery({
    queryKey: ["vendor_purchase_orders", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch payments (AP payments) for this vendor
  const { data: payments } = useQuery({
    queryKey: ["vendor_payments", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_payments")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch submitted invoices
  const { data: submittedInvoices } = useQuery({
    queryKey: ["vendor_submitted_invoices", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_submitted_invoices")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const openPOs = purchaseOrders?.filter(po => po.status !== "completed" && po.status !== "cancelled") || [];
  const totalOpenPOValue = openPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);
  const pendingInvoices = submittedInvoices?.filter(inv => inv.status === "pending") || [];
  const recentPayments = payments?.slice(0, 5) || [];
  const totalPaymentsThisMonth = payments?.filter(p => {
    const paymentDate = new Date(p.payment_date);
    const now = new Date();
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome, {vendorName}</h2>
        <p className="text-muted-foreground">Here's your account overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Purchase Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPOs.length}</div>
            <p className="text-xs text-muted-foreground">
              Total Value: <CurrencyDisplay amount={totalOpenPOValue} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payments This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalPaymentsThisMonth} />
            </div>
            <p className="text-xs text-muted-foreground">{payments?.length || 0} total payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedInvoices?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent POs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Recent Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchaseOrders && purchaseOrders.length > 0 ? (
              <div className="space-y-3">
                {purchaseOrders.slice(0, 5).map((po) => (
                  <div key={po.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{po.po_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(po.order_date), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <CurrencyDisplay amount={po.total_amount || 0} className="font-medium" />
                      <Badge variant={po.status === "approved" ? "default" : "secondary"} className="ml-2">
                        {po.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No purchase orders yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length > 0 ? (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{payment.payment_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.payment_date), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <CurrencyDisplay amount={payment.amount} className="font-medium text-green-600" />
                      <p className="text-xs text-muted-foreground">{payment.payment_method || "Bank Transfer"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No payments recorded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {openPOs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertCircle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 dark:text-orange-400">
              You have <strong>{openPOs.length}</strong> open purchase order(s) awaiting delivery or invoice submission.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
