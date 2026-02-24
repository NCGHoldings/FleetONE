import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Ban, FileWarning } from "lucide-react";
import { useCustomers, useARInvoices, useBadDebtProvisions } from "@/hooks/useAccountingData";
import { useCreateBadDebtProvision, useWriteOffBadDebt } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format, differenceInDays } from "date-fns";

export const BadDebtProvisionView = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [provisionAmount, setProvisionAmount] = useState("");
  const [provisionDate, setProvisionDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");

  const { data: customers = [] } = useCustomers();
  const { data: arInvoices = [] } = useARInvoices();
  const { data: provisions = [] } = useBadDebtProvisions();
  const createProvision = useCreateBadDebtProvision();
  const writeOff = useWriteOffBadDebt();

  // Filter overdue invoices (more than 90 days past due)
  const overdueInvoices = arInvoices.filter((inv: any) => {
    const daysOverdue = differenceInDays(new Date(), new Date(inv.due_date));
    return inv.balance > 0 && daysOverdue > 90;
  });

  const customerInvoices = invoiceId
    ? []
    : arInvoices.filter((inv: any) => inv.customer_id === customerId && inv.balance > 0);

  const selectedInvoice = arInvoices.find((inv: any) => inv.id === invoiceId);

  const handleSubmit = async () => {
    if (!provisionAmount || !provisionDate) return;

    await createProvision.mutateAsync({
      customer_id: customerId || undefined,
      invoice_id: invoiceId || undefined,
      provision_amount: parseFloat(provisionAmount),
      provision_date: provisionDate,
      reason,
    });

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomerId("");
    setInvoiceId("");
    setProvisionAmount("");
    setProvisionDate(new Date().toISOString().split("T")[0]);
    setReason("");
  };

  const handleWriteOff = async (provisionId: string) => {
    await writeOff.mutateAsync(provisionId);
  };

  const totalProvisions = provisions.reduce((sum: number, p: any) => sum + (p.provision_amount || 0), 0);
  const pendingProvisions = provisions.filter((p: any) => p.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bad Debt Provisions</h2>
          <p className="text-muted-foreground">Manage doubtful accounts and write-offs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Provision
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Bad Debt Provision</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Customer (Optional)</Label>
                <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setInvoiceId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customer_code} - {customer.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {customerId && customerInvoices.length > 0 && (
                <div className="space-y-2">
                  <Label>Invoice (Optional)</Label>
                  <Select value={invoiceId} onValueChange={setInvoiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerInvoices.map((inv: any) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoice_number} - Balance: Rs. {inv.balance?.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedInvoice && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-sm">
                    <p><strong>Invoice:</strong> {selectedInvoice.invoice_number}</p>
                    <p><strong>Balance:</strong> <CurrencyDisplay amount={selectedInvoice.balance} /></p>
                    <p><strong>Due Date:</strong> {format(new Date(selectedInvoice.due_date), "MMM dd, yyyy")}</p>
                    <p className="text-red-600">
                      <strong>Days Overdue:</strong> {differenceInDays(new Date(), new Date(selectedInvoice.due_date))}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Provision Amount</Label>
                <Input
                  type="number"
                  value={provisionAmount}
                  onChange={(e) => setProvisionAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label>Provision Date</Label>
                <Input
                  type="date"
                  value={provisionDate}
                  onChange={(e) => setProvisionDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for provision..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!provisionAmount || createProvision.isPending}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Create Provision
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Provisions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalProvisions} />
            </div>
            <p className="text-xs text-muted-foreground">Accumulated bad debt provisions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileWarning className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingProvisions.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting write-off decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Invoices</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
            <p className="text-xs text-muted-foreground">90+ days overdue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provisions List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {provisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No bad debt provisions recorded
                  </TableCell>
                </TableRow>
              ) : (
                provisions.map((provision: any) => (
                  <TableRow key={provision.id}>
                    <TableCell>{format(new Date(provision.provision_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {provision.customers?.customer_name || "-"}
                    </TableCell>
                    <TableCell>
                      {provision.ar_invoices?.invoice_number || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <CurrencyDisplay amount={provision.provision_amount} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {provision.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          provision.status === "written_off" ? "destructive" : 
                          provision.status === "pending" ? "secondary" : "default"
                        }
                      >
                        {provision.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {provision.status === "pending" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleWriteOff(provision.id)}
                          disabled={writeOff.isPending}
                        >
                          Write Off
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};