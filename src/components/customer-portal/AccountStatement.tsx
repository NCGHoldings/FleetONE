import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";

interface AccountStatementProps {
  customerId: string;
  customerName: string;
}

interface Transaction {
  id: string;
  date: string;
  type: "invoice" | "payment";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export function AccountStatement({ customerId, customerName }: AccountStatementProps) {
  // Fetch invoices
  const { data: invoices } = useQuery({
    queryKey: ["portal-invoices-statement", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .select("*")
        .eq("customer_id", customerId)
        .order("invoice_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch receipts
  const { data: receipts } = useQuery({
    queryKey: ["portal-receipts-statement", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_receipts")
        .select("*")
        .eq("customer_id", customerId)
        .order("receipt_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Combine and sort transactions
  const transactions: Transaction[] = [];
  let runningBalance = 0;

  // Add invoices
  invoices?.forEach(inv => {
    transactions.push({
      id: inv.id,
      date: inv.invoice_date,
      type: "invoice",
      reference: inv.invoice_number,
      description: inv.notes || "Invoice",
      debit: inv.total_amount,
      credit: 0,
      balance: 0, // Will be calculated
    });
  });

  // Add receipts
  receipts?.forEach(rec => {
    transactions.push({
      id: rec.id,
      date: rec.receipt_date,
      type: "payment",
      reference: rec.receipt_number,
      description: rec.notes || "Payment received",
      debit: 0,
      credit: rec.amount,
      balance: 0, // Will be calculated
    });
  });

  // Sort by date
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  transactions.forEach(trans => {
    runningBalance += trans.debit - trans.credit;
    trans.balance = runningBalance;
  });

  const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);
  const closingBalance = totalDebits - totalCredits;

  const isLoading = !invoices || !receipts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Account Statement</h2>
          <p className="text-muted-foreground">Complete transaction history</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalDebits} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-green-500" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <CurrencyDisplay amount={totalCredits} />
            </div>
          </CardContent>
        </Card>

        <Card className={closingBalance > 0 ? "border-destructive" : "border-green-500"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${closingBalance > 0 ? "text-destructive" : "text-green-600"}`}>
              <CurrencyDisplay amount={closingBalance} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statement Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Statement of Account</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{customerName}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Statement Date: {format(new Date(), "MMMM dd, yyyy")}</p>
              <p>Transactions: {transactions.length}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {transactions.map((trans) => (
                    <TableRow key={`${trans.type}-${trans.id}`}>
                      <TableCell>
                        {format(new Date(trans.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {trans.type === "invoice" ? (
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-green-500" />
                          )}
                          {trans.reference}
                        </div>
                      </TableCell>
                      <TableCell>{trans.description}</TableCell>
                      <TableCell className="text-right">
                        {trans.debit > 0 && <CurrencyDisplay amount={trans.debit} />}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {trans.credit > 0 && <CurrencyDisplay amount={trans.credit} />}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${trans.balance > 0 ? "text-destructive" : ""}`}>
                        <CurrencyDisplay amount={trans.balance} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3}>Totals</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={totalDebits} />
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      <CurrencyDisplay amount={totalCredits} />
                    </TableCell>
                    <TableCell className={`text-right ${closingBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                      <CurrencyDisplay amount={closingBalance} />
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
