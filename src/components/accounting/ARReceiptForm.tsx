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
import { Switch } from "@/components/ui/switch";
import { useCustomers, useARInvoices, useBankAccounts } from "@/hooks/useAccountingData";
import { useCreateARReceipt } from "@/hooks/useAccountingMutations";
import { format } from "date-fns";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

const receiptSchema = z.object({
  receipt_number: z.string().min(1, "Receipt number is required"),
  customer_id: z.string().min(1, "Customer is required"),
  receipt_date: z.string().min(1, "Receipt date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.string().min(1, "Payment method is required"),
  bank_account_id: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  is_advance: z.boolean().optional(),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

interface InvoiceAllocation {
  invoice_id: string;
  invoice_number: string;
  due_date: string;
  balance: number;
  allocated_amount: number;
  selected: boolean;
}

interface ARReceiptFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCustomerId?: string;
  isAdvanceMode?: boolean;
}

export const ARReceiptForm = ({ open, onOpenChange, preselectedCustomerId, isAdvanceMode = false }: ARReceiptFormProps) => {
  const { data: customers } = useCustomers();
  const { data: bankAccounts } = useBankAccounts();
  const { data: allInvoices } = useARInvoices();
  const createReceipt = useCreateARReceipt();

  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || "");
  const [isAdvance, setIsAdvance] = useState(isAdvanceMode);

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      receipt_number: `RCV-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      customer_id: preselectedCustomerId || "",
      receipt_date: format(new Date(), "yyyy-MM-dd"),
      amount: 0,
      payment_method: "bank_transfer",
      reference: "",
      notes: "",
      is_advance: isAdvanceMode,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setIsAdvance(isAdvanceMode);
      form.setValue("is_advance", isAdvanceMode);
      if (!isAdvanceMode) {
        form.setValue("amount", 0);
      }
    }
  }, [open, isAdvanceMode, form]);

  // Filter invoices for selected customer
  useEffect(() => {
    if (selectedCustomerId && allInvoices && !isAdvance) {
      const customerInvoices = allInvoices.filter(
        (inv) => inv.customer_id === selectedCustomerId && (inv.balance || 0) > 0
      );
      setAllocations(
        customerInvoices.map((inv) => ({
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          balance: inv.balance || 0,
          allocated_amount: 0,
          selected: false,
        }))
      );
    } else {
      setAllocations([]);
    }
  }, [selectedCustomerId, allInvoices, isAdvance]);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    form.setValue("customer_id", customerId);
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

  const updateAllocation = (invoiceId: string, amount: number) => {
    setAllocations(
      allocations.map((alloc) => {
        if (alloc.invoice_id === invoiceId) {
          const validAmount = Math.min(Math.max(0, amount), alloc.balance);
          return { ...alloc, allocated_amount: validAmount, selected: validAmount > 0 };
        }
        return alloc;
      })
    );
  };

  // Mark all as full payment
  const handleMarkFullPayment = () => {
    setAllocations(
      allocations.map((alloc) => ({
        ...alloc,
        selected: true,
        allocated_amount: alloc.balance,
      }))
    );
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);

  // Auto-update amount when allocations change (only if not advance mode)
  useEffect(() => {
    if (!isAdvance) {
      form.setValue("amount", totalAllocated);
    }
  }, [totalAllocated, form, isAdvance]);

  const handleAdvanceToggle = (checked: boolean) => {
    setIsAdvance(checked);
    form.setValue("is_advance", checked);
    if (checked) {
      // Clear allocations when switching to advance mode
      setAllocations([]);
    }
  };

  const onSubmit = async (data: ReceiptFormData) => {
    const selectedAllocations = isAdvance
      ? []
      : allocations.filter((a) => a.selected && a.allocated_amount > 0);

    try {
      await createReceipt.mutateAsync({
        receipt_number: data.receipt_number,
        customer_id: data.customer_id,
        receipt_date: data.receipt_date,
        amount: data.amount,
        payment_method: data.payment_method,
        bank_account_id: data.bank_account_id,
        reference: data.reference,
        notes: data.notes,
        is_advance: isAdvance,
        allocations: selectedAllocations.map((a) => ({
          invoice_id: a.invoice_id,
          allocated_amount: a.allocated_amount,
        })),
      });
      onOpenChange(false);
      form.reset();
      setAllocations([]);
      setIsAdvance(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const canSubmit = isAdvance
    ? form.watch("amount") > 0 && selectedCustomerId
    : totalAllocated > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAdvance ? (
              <>
                <Wallet className="h-5 w-5 text-orange-600" />
                Record Advance Receipt
              </>
            ) : (
              "Record AR Receipt"
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Advance Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Advance Receipt</p>
                  <p className="text-sm text-muted-foreground">
                    Record payment without allocating to invoices
                  </p>
                </div>
              </div>
              <Switch
                checked={isAdvance}
                onCheckedChange={handleAdvanceToggle}
              />
            </div>

            {/* Header Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="receipt_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt #</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={handleCustomerChange} value={selectedCustomerId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.customer_name}
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
                name="receipt_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
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
                    <FormLabel>Bank Account</FormLabel>
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

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Cheque #, Transfer ref..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Advance Mode: Direct Amount Input */}
            {isAdvance && (
              <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">Advance Amount</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={(val) => field.onChange(val)}
                          className="text-2xl h-14 font-bold"
                          placeholder="Enter advance amount"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground mt-1">
                        This amount will be recorded as an advance and can be allocated to invoices later.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Invoice Allocation (only when not advance mode) */}
            {!isAdvance && selectedCustomerId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Allocate to Invoices</h3>
                  {allocations.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleMarkFullPayment}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark All Full Payment
                    </Button>
                  )}
                </div>
                {allocations.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-medium w-10"></th>
                          <th className="px-3 py-2 text-left text-sm font-medium">Invoice #</th>
                          <th className="px-3 py-2 text-left text-sm font-medium">Due Date</th>
                          <th className="px-3 py-2 text-right text-sm font-medium">Balance</th>
                          <th className="px-3 py-2 text-right text-sm font-medium w-36">Allocate</th>
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
                                <CurrencyInput
                                  value={alloc.allocated_amount}
                                  onChange={(val) => updateAllocation(alloc.invoice_id, Math.min(val, alloc.balance))}
                                  className="h-8"
                                  placeholder="0.00"
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
                    No outstanding invoices for this customer
                  </p>
                )}

                {/* Total */}
                <div className="flex justify-end">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">Total Receipt Amount:</span>
                      <span className="text-2xl font-bold text-primary">
                        <CurrencyDisplay amount={totalAllocated} />
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
                    <Textarea {...field} value={field.value || ''} placeholder="Additional notes..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createReceipt.isPending || !canSubmit}>
                {createReceipt.isPending ? "Recording..." : isAdvance ? "Record Advance" : "Record Receipt"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
