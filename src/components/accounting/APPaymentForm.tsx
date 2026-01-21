import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useVendors, useAPInvoices, useBankAccounts } from "@/hooks/useAccountingData";
import { useCreateAPPayment } from "@/hooks/useAccountingMutations";
import { format } from "date-fns";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Badge } from "@/components/ui/badge";

const paymentSchema = z.object({
  payment_number: z.string().min(1, "Payment number is required"),
  vendor_id: z.string().min(1, "Vendor is required"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_method: z.string().min(1, "Payment method is required"),
  bank_account_id: z.string().optional(),
  cheque_number: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface InvoiceAllocation {
  invoice_id: string;
  invoice_number: string;
  due_date: string;
  balance: number;
  wht_amount: number;
  allocated_amount: number;
  wht_deducted: number;
  selected: boolean;
}

interface APPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedVendorId?: string;
}

export const APPaymentForm = ({ open, onOpenChange, preselectedVendorId }: APPaymentFormProps) => {
  const { data: vendors } = useVendors();
  const { data: bankAccounts } = useBankAccounts();
  const { data: allInvoices } = useAPInvoices();
  const createPayment = useCreateAPPayment();

  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState(preselectedVendorId || "");

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_number: `PAY-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      vendor_id: preselectedVendorId || "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "bank_transfer",
      reference: "",
      notes: "",
    },
  });

  const paymentMethod = form.watch("payment_method");

  // Filter invoices for selected vendor
  useEffect(() => {
    if (selectedVendorId && allInvoices) {
      const vendorInvoices = allInvoices.filter(
        (inv) => inv.vendor_id === selectedVendorId && (inv.balance || 0) > 0 && inv.approval_status === "approved"
      );
      setAllocations(
        vendorInvoices.map((inv) => ({
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          balance: inv.balance || 0,
          wht_amount: inv.wht_amount || 0,
          allocated_amount: 0,
          wht_deducted: 0,
          selected: false,
        }))
      );
    } else {
      setAllocations([]);
    }
  }, [selectedVendorId, allInvoices]);

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    form.setValue("vendor_id", vendorId);
  };

  const toggleInvoice = (invoiceId: string) => {
    setAllocations(
      allocations.map((alloc) => {
        if (alloc.invoice_id === invoiceId) {
          return {
            ...alloc,
            selected: !alloc.selected,
            allocated_amount: !alloc.selected ? alloc.balance : 0,
          };
        }
        return alloc;
      })
    );
  };

  const updateAllocation = (invoiceId: string, field: "allocated_amount" | "wht_deducted", value: number) => {
    setAllocations(
      allocations.map((alloc) => {
        if (alloc.invoice_id === invoiceId) {
          const updated = { ...alloc, [field]: value };
          if (field === "allocated_amount") {
            updated.allocated_amount = Math.min(Math.max(0, value), alloc.balance);
            updated.selected = updated.allocated_amount > 0;
          }
          return updated;
        }
        return alloc;
      })
    );
  };

  const totalPayment = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
  const totalWhtDeducted = allocations.reduce((sum, a) => sum + a.wht_deducted, 0);

  const onSubmit = async (data: PaymentFormData) => {
    const selectedAllocations = allocations.filter((a) => a.selected && a.allocated_amount > 0);
    
    try {
      await createPayment.mutateAsync({
        payment_number: data.payment_number,
        vendor_id: data.vendor_id,
        payment_date: data.payment_date,
        amount: totalPayment,
        payment_method: data.payment_method,
        bank_account_id: data.bank_account_id,
        cheque_number: data.cheque_number,
        reference: data.reference,
        notes: data.notes,
        allocations: selectedAllocations.map((a) => ({
          invoice_id: a.invoice_id,
          allocated_amount: a.allocated_amount,
          wht_deducted: a.wht_deducted,
        })),
      });
      onOpenChange(false);
      form.reset();
      setAllocations([]);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record AP Payment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="payment_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment #</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select onValueChange={handleVendorChange} value={selectedVendorId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="online">Online Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Bank Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts?.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {paymentMethod === "cheque" && (
                <FormField
                  control={form.control}
                  name="cheque_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cheque Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cheque #" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Transfer ref..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invoice Allocation */}
            {selectedVendorId && (
              <div className="space-y-3">
                <h3 className="font-semibold">Allocate to Invoices</h3>
                {allocations.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-medium w-10"></th>
                          <th className="px-3 py-2 text-left text-sm font-medium">Invoice #</th>
                          <th className="px-3 py-2 text-left text-sm font-medium">Due Date</th>
                          <th className="px-3 py-2 text-right text-sm font-medium">Balance</th>
                          <th className="px-3 py-2 text-right text-sm font-medium w-32">WHT Deducted</th>
                          <th className="px-3 py-2 text-right text-sm font-medium w-36">Pay Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocations.map((alloc) => {
                          const isOverdue = new Date(alloc.due_date) < new Date();
                          return (
                            <tr key={alloc.invoice_id} className="border-t">
                              <td className="px-3 py-2">
                                <Checkbox
                                  checked={alloc.selected}
                                  onCheckedChange={() => toggleInvoice(alloc.invoice_id)}
                                />
                              </td>
                              <td className="px-3 py-2 font-mono">{alloc.invoice_number}</td>
                              <td className="px-3 py-2">
                                {format(new Date(alloc.due_date), "MMM dd, yyyy")}
                                {isOverdue && <Badge variant="destructive" className="ml-2">Overdue</Badge>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <CurrencyDisplay amount={alloc.balance} />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={alloc.wht_deducted}
                                  onChange={(e) => updateAllocation(alloc.invoice_id, "wht_deducted", parseFloat(e.target.value) || 0)}
                                  className="h-8 text-right"
                                  min={0}
                                  step="0.01"
                                  placeholder="WHT"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={alloc.allocated_amount}
                                  onChange={(e) => updateAllocation(alloc.invoice_id, "allocated_amount", parseFloat(e.target.value) || 0)}
                                  className="h-8 text-right"
                                  max={alloc.balance}
                                  min={0}
                                  step="0.01"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                    No approved invoices pending payment for this vendor
                  </p>
                )}

                {/* Totals */}
                <div className="flex justify-end gap-6">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">WHT Deducted:</span>
                      <span className="text-lg font-semibold text-orange-600">
                        <CurrencyDisplay amount={totalWhtDeducted} />
                      </span>
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">Total Payment:</span>
                      <span className="text-2xl font-bold text-primary">
                        <CurrencyDisplay amount={totalPayment} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending || totalPayment === 0}>
                {createPayment.isPending ? "Processing..." : "Process Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
