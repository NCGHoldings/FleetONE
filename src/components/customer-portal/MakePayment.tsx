import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";
import { toast } from "sonner";

interface MakePaymentProps {
  customerId: string;
}

export function MakePayment({ customerId }: MakePaymentProps) {
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // Fetch unpaid invoices
  const { data: unpaidInvoices, isLoading } = useQuery({
    queryKey: ["portal-unpaid-invoices", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .select("*")
        .eq("customer_id", customerId)
        .neq("status", "paid")
        .neq("status", "cancelled")
        .gt("balance", 0)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const selectAll = () => {
    if (selectedInvoices.length === unpaidInvoices?.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(unpaidInvoices?.map(inv => inv.id) || []);
    }
  };

  const selectedTotal = unpaidInvoices
    ?.filter(inv => selectedInvoices.includes(inv.id))
    .reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  const handlePayNow = () => {
    if (selectedInvoices.length === 0) {
      toast.error("Please select at least one invoice to pay");
      return;
    }
    
    // In a real implementation, this would redirect to a payment gateway
    toast.info("Payment gateway integration coming soon. Please contact support to make a payment.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Make a Payment</h2>
        <p className="text-muted-foreground">Select invoices to pay online</p>
      </div>

      {/* Payment Summary Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Selected Amount</p>
              <p className="text-3xl font-bold text-primary">
                <CurrencyDisplay amount={selectedTotal} />
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedInvoices.length} invoice(s) selected
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={handlePayNow}
              disabled={selectedInvoices.length === 0}
              className="w-full sm:w-auto"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Selection */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>Select invoices to include in your payment</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedInvoices.length === unpaidInvoices?.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : unpaidInvoices?.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No outstanding invoices</p>
              <p className="text-sm text-muted-foreground">All your invoices have been paid!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unpaidInvoices?.map((invoice) => (
                <div 
                  key={invoice.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedInvoices.includes(invoice.id) 
                      ? "bg-primary/5 border-primary" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleInvoice(invoice.id)}
                >
                  <Checkbox
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={() => toggleInvoice(invoice.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{invoice.invoice_number}</p>
                      {isOverdue(invoice.due_date) && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      <CurrencyDisplay amount={invoice.balance} />
                    </p>
                    <p className="text-xs text-muted-foreground">Balance due</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <CreditCard className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">Card Payment</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
            <div className="p-4 border rounded-lg">
              <FileText className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">Bank Transfer</p>
              <p className="text-sm text-muted-foreground">Contact support for details</p>
            </div>
            <div className="p-4 border rounded-lg">
              <CreditCard className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">Cheque</p>
              <p className="text-sm text-muted-foreground">Contact support for details</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
