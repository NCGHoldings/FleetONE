import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Receipt, Upload, Bus, Building2, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useCreateExpenseRequest, EXPENSE_CATEGORIES, BUSINESS_UNITS, PAYMENT_METHODS } from "@/hooks/useExpenseRequests";
import { usePettyCashFunds, useIOURecords } from "@/hooks/usePettyCash";
import { useVendors } from "@/hooks/useAccountingData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const expenseSchema = z.object({
  request_date: z.string().min(1, "Date is required"),
  business_unit_code: z.string().min(1, "Business unit is required"),
  expense_category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  bus_id: z.string().optional(),
  vendor_id: z.string().optional(),
  vendor_name_draft: z.string().optional(),
  payment_method: z.string().min(1, "Payment method is required"),
  petty_cash_fund_id: z.string().optional(),
  iou_id: z.string().optional(),
  notes: z.string().optional(),
  pass_to_finance: z.boolean().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBusinessUnit?: string;
}

export const ExpenseRequestForm = ({ open, onOpenChange, defaultBusinessUnit }: ExpenseRequestFormProps) => {
  const createExpense = useCreateExpenseRequest();
  const { data: vendors } = useVendors();
  const { data: pettyCashFunds } = usePettyCashFunds();
  const { data: iouRecords } = useIOURecords({ status: "pending" });
  const [passToFinance, setPassToFinance] = useState(false);

  // Fetch buses for optional bus selection
  const { data: buses } = useQuery({
    queryKey: ["buses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_no, type")
        .eq("status", "active")
        .order("bus_no");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      request_date: format(new Date(), "yyyy-MM-dd"),
      business_unit_code: defaultBusinessUnit || "",
      expense_category: "",
      description: "",
      amount: 0,
      payment_method: "to_be_paid",
      notes: "",
      pass_to_finance: false,
    },
  });

  const paymentMethod = form.watch("payment_method");

  const onSubmit = async (data: ExpenseFormData) => {
    const status = passToFinance || !data.vendor_id ? "pending_finance" : "pending_approval";
    
    await createExpense.mutateAsync({
      ...data,
      status,
    });

    onOpenChange(false);
    form.reset();
    setPassToFinance(false);
  };

  // Group categories for better UX
  const groupedCategories = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof EXPENSE_CATEGORIES>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            New Expense Request
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Section */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="request_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="business_unit_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUSINESS_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {unit.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category and Description */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expense_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(groupedCategories).map(([group, cats]) => (
                          <SelectGroup key={group}>
                            <SelectLabel className="text-xs text-muted-foreground">{group}</SelectLabel>
                            {cats.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bus_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bus Number (Optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "_none" ? undefined : val)} value={field.value || "_none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bus" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">-- No Bus --</SelectItem>
                        {buses?.map((bus) => (
                          <SelectItem key={bus.id} value={bus.id}>
                            <div className="flex items-center gap-2">
                              <Bus className="h-4 w-4" />
                              {bus.bus_no} - {bus.type}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the expense..." 
                      {...field} 
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (LKR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="text-lg font-semibold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Petty Cash Fund Selection */}
            {paymentMethod === "petty_cash" && (
              <FormField
                control={form.control}
                name="petty_cash_fund_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Petty Cash Fund</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fund" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pettyCashFunds?.map((fund) => (
                          <SelectItem key={fund.id} value={fund.id}>
                            {fund.fund_name} (Balance: Rs {fund.current_balance.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* IOU Selection */}
            {paymentMethod === "iou" && (
              <FormField
                control={form.control}
                name="iou_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select IOU to Settle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select IOU" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iouRecords?.map((iou) => (
                          <SelectItem key={iou.id} value={iou.id}>
                            {iou.iou_number} - {iou.staff?.staff_name} (Balance: Rs {iou.balance.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Vendor Section */}
            <Card className="p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Vendor Information
              </h4>
              
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (if known)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "_none" ? undefined : val)} value={field.value || "_none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">-- Unknown Vendor --</SelectItem>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave blank if you don't know the vendor details
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_name_draft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name (Draft)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter vendor name if not in system..." 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Finance will match this to the correct vendor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pass_to_finance"
                  checked={passToFinance}
                  onCheckedChange={(checked) => setPassToFinance(!!checked)}
                />
                <Label htmlFor="pass_to_finance" className="text-sm">
                  I don't know vendor details - Pass to Finance for completion
                </Label>
              </div>
            </Card>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional information..." 
                      {...field} 
                      value={field.value || ""}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload Section (placeholder) */}
            <Card className="p-4 border-dashed">
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <Upload className="h-8 w-8 mb-2" />
                <p className="text-sm">Receipt/Bill Upload</p>
                <p className="text-xs">Drag & drop or click to upload (coming soon)</p>
              </div>
            </Card>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" disabled>
                Save Draft
              </Button>
              <Button type="submit" disabled={createExpense.isPending}>
                {createExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit to Finance
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
