import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useVendors, useAPInvoices } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { SearchableVendorSelector } from "./shared/SearchableVendorSelector";

const debitNoteSchema = z.object({
  debit_note_number: z.string().min(1, "Debit note number is required"),
  vendor_id: z.string().min(1, "Vendor is required"),
  original_invoice_id: z.string().optional(),
  debit_date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  reason: z.string().min(1, "Reason is required"),
});

type DebitNoteFormData = z.infer<typeof debitNoteSchema>;

interface APDebitNoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const APDebitNoteForm = ({ open, onOpenChange }: APDebitNoteFormProps) => {
  const { data: vendors } = useVendors();
  const { data: invoices } = useAPInvoices();
  const createDebitNote = useCreateAPDebitNote();
  const generateNumber = useGenerateNumber();
  const [selectedVendor, setSelectedVendor] = useState<string>("");

  const form = useForm<DebitNoteFormData>({
    resolver: zodResolver(debitNoteSchema),
    defaultValues: {
      debit_note_number: "",
      debit_date: new Date().toISOString().split("T")[0],
      amount: 0,
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      generateNumber("debit_note").then(num => form.setValue("debit_note_number", num));
    }
  }, [open]);

  const vendorInvoices = invoices?.filter(inv => 
    inv.vendor_id === selectedVendor && inv.status !== "cancelled"
  ) || [];

  const onSubmit = async (data: DebitNoteFormData) => {
    await createDebitNote.mutateAsync(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create AP Debit Note</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="debit_note_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debit Note #</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="debit_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <SearchableVendorSelector
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedVendor(value);
                    }}
                    showQuickAdd={true}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="original_invoice_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Invoice (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select invoice" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendorInvoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number} - <CurrencyDisplay amount={invoice.total_amount} />
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (LKR)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for debit note..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDebitNote.isPending}>
                {createDebitNote.isPending ? "Creating..." : "Create Debit Note"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
