import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useVendors, useCustomers, useAPInvoices, useBankAccounts } from "@/hooks/useAccountingData";
import { useCreateAPPayment, useApproveAPInvoice } from "@/hooks/useAccountingMutations";
import { useVendorBankAccounts } from "@/hooks/useVendorBankAccounts";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { useNextChequeNumber, useActiveChequeBook } from "@/hooks/useChequeBooks";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Wallet, CheckCircle, AlertCircle, AlertTriangle, BookOpen, Landmark, FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { SearchableAccountSelector } from "./shared/SearchableAccountSelector";
import { VehicleSelector } from "./shared/VehicleSelector";
import { SearchableVendorSelector } from "./shared/SearchableVendorSelector";

const paymentSchema = z.object({
  payment_number: z.string().optional(),
  vendor_id: z.string().min(1, "Vendor is required"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_method: z.string().min(1, "Payment method is required"),
  amount: z.number().optional(),
  bank_account_id: z.string().optional(),
  cheque_number: z.string().optional(),
  cheque_date: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  is_advance: z.boolean().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface InvoiceAllocation {
  invoice_id: string;
  invoice_number: string;
  due_date: string;
  balance: number;
  balanced_amount?: number;
  wht_amount: number;
  allocated_amount: number;
  wht_deducted: number;
  write_off_amount: number;
  selected: boolean;
}

interface DirectPaymentLine {
  id: string;
  account_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

interface APPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedVendorId?: string;
  isAdvanceMode?: boolean;
}

const createEmptyLine = (): DirectPaymentLine => ({
  id: crypto.randomUUID(),
  account_id: "",
  description: "",
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  tax_amount: 0,
  line_total: 0,
});

export const APPaymentForm = ({ open, onOpenChange, preselectedVendorId, isAdvanceMode = false }: APPaymentFormProps) => {
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();
  const { data: bankAccounts } = useBankAccounts();
  const { data: allInvoices } = useAPInvoices();
  const { selectedCompanyId } = useCompany();
  
  const createPayment = useCreateAPPayment();
  const approveInvoice = useApproveAPInvoice();
  const generateNumber = useGenerateNumber();

  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState(preselectedVendorId || "");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [isAdvance, setIsAdvance] = useState(isAdvanceMode);
  const [isDirectPayment, setIsDirectPayment] = useState(false);
  const [directLines, setDirectLines] = useState<DirectPaymentLine[]>([createEmptyLine()]);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [includeBankFee, setIncludeBankFee] = useState(false);
  const [bankFeeAmount, setBankFeeAmount] = useState(0);
  const [bankFeeType, setBankFeeType] = useState("bank_charge");
  const [globalWriteOffAccountId, setGlobalWriteOffAccountId] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [vendorBillNumber, setVendorBillNumber] = useState("");
  const [selectedBusId, setSelectedBusId] = useState("");
  const [selectedBusNo, setSelectedBusNo] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] = useState<"fleet" | "external" | "">("");

  const { data: vendorBankAccounts } = useVendorBankAccounts(selectedVendorId || undefined);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_number: `PAY-${format(new Date(), "yyyyMMdd")}`,
      vendor_id: preselectedVendorId || "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "bank_transfer",
      reference: "",
      notes: "",
      is_advance: isAdvanceMode,
    },
  });

  const paymentMethod = form.watch("payment_method");
  const watchedBankAccountId = form.watch("bank_account_id");
  const nextChequeNumber = useNextChequeNumber();
  const { data: activeChequeBook } = useActiveChequeBook(
    paymentMethod === "cheque" ? watchedBankAccountId : undefined
  );

  // Track previous bank account to detect changes
  const prevBankAccountRef = useRef<string | undefined>();

  // Auto-fetch cheque number when payment method is cheque and bank is selected
  useEffect(() => {
    if (paymentMethod === "cheque" && watchedBankAccountId && open) {
      const bankChanged = prevBankAccountRef.current !== watchedBankAccountId;
      const currentCheque = form.getValues("cheque_number");
      
      // Fetch if no cheque number OR bank account changed
      if (!currentCheque || bankChanged) {
        nextChequeNumber.mutate(watchedBankAccountId, {
          onSuccess: (result) => {
            if (result.cheque_number) {
              form.setValue("cheque_number", result.cheque_number);
            }
          },
        });
      }
      prevBankAccountRef.current = watchedBankAccountId;
    }
  }, [paymentMethod, watchedBankAccountId, open]);

  const hasGeneratedNumber = useRef(false);

  // Reset form and generate payment number when dialog opens
  useEffect(() => {
    if (open) {
      if (!hasGeneratedNumber.current) {
        setIsAdvance(isAdvanceMode);
        setIsDirectPayment(false);
        setDirectLines([createEmptyLine()]);
        form.setValue("is_advance", isAdvanceMode);
        setAdvanceAmount(0);
        setSelectedBankAccountId("");
        setIncludeBankFee(false);
        setBankFeeAmount(0);
        setBankFeeType("bank_charge");
        // Note: auto-generate payment number exactly on save to prevent skipped sequences on cancel.
        hasGeneratedNumber.current = true;
      }
    } else {
      hasGeneratedNumber.current = false;
      prevBankAccountRef.current = undefined;
    }
  }, [open, isAdvanceMode, form, generateNumber]);

  // Get pending invoices for selected vendor
  const pendingInvoices = useMemo(() => {
    if (!selectedVendorId || !allInvoices) return [];
    return allInvoices.filter(
      (inv) => inv.vendor_id === selectedVendorId && inv.approval_status === "pending" && (inv.balance || 0) > 0
    );
  }, [selectedVendorId, allInvoices]);

  const pendingTotal = useMemo(() => {
    return pendingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  }, [pendingInvoices]);

  // Filter invoices for selected vendor
  useEffect(() => {
    if (selectedVendorId && allInvoices && !isAdvance && !isDirectPayment) {
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
          write_off_amount: 0,
          selected: false,
        }))
      );
    } else {
      setAllocations([]);
    }
  }, [selectedVendorId, allInvoices, isAdvance, isDirectPayment]);

  // Auto-select default bank account when vendor changes
  useEffect(() => {
    if (vendorBankAccounts && vendorBankAccounts.length > 0) {
      const defaultAcc = vendorBankAccounts.find((a) => a.is_default) || vendorBankAccounts[0];
      setSelectedBankAccountId(defaultAcc.id);
    }
  }, [vendorBankAccounts]);

  // Approve all pending invoices for selected vendor
  const handleApproveAllPending = async () => {
    for (const inv of pendingInvoices) {
      await approveInvoice.mutateAsync(inv.id);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedBankAccountId("");
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

  const updateAllocation = (invoiceId: string, field: "allocated_amount" | "wht_deducted" | "write_off_amount", value: number) => {
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

  const handleAdvanceToggle = (checked: boolean) => {
    setIsAdvance(checked);
    setIsDirectPayment(false);
    form.setValue("is_advance", checked);
    if (checked) {
      setAllocations([]);
      setDirectLines([createEmptyLine()]);
    }
  };

  const handleDirectPaymentToggle = (checked: boolean) => {
    setIsDirectPayment(checked);
    setIsAdvance(false);
    form.setValue("is_advance", false);
    if (checked) {
      setAllocations([]);
    } else {
      setDirectLines([createEmptyLine()]);
    }
  };

  // Direct payment line management
  const addLine = () => setDirectLines([...directLines, createEmptyLine()]);
  const removeLine = (id: string) => {
    if (directLines.length <= 1) return;
    setDirectLines(directLines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof DirectPaymentLine, value: any) => {
    setDirectLines(
      directLines.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        // Recalculate
        const subtotal = updated.quantity * updated.unit_price;
        updated.tax_amount = subtotal * (updated.tax_rate / 100);
        updated.line_total = subtotal + updated.tax_amount;
        return updated;
      })
    );
  };

  const directLinesTotal = directLines.reduce((sum, l) => sum + l.line_total, 0);

  const totalPayment = isDirectPayment
    ? directLinesTotal
    : isAdvance
    ? advanceAmount
    : allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
  const totalWhtDeducted = allocations.reduce((sum, a) => sum + a.wht_deducted, 0);
  const effectiveBankFee = includeBankFee ? bankFeeAmount : 0;
  const totalWithFees = totalPayment + effectiveBankFee;

  const onSubmit = async (data: PaymentFormData) => {
    const selectedAllocations = isAdvance || isDirectPayment
      ? [] 
      : allocations.filter((a) => a.selected && a.allocated_amount > 0);
    
    try {
      const finalPaymentNumber = data.payment_number || await generateNumber("payment");
      
      const paymentResult = await createPayment.mutateAsync({
        payment_number: finalPaymentNumber,
        vendor_id: data.vendor_id,
        payment_date: data.payment_date,
        amount: totalPayment,
        payment_method: data.payment_method,
        bank_account_id: data.bank_account_id,
        cheque_number: data.cheque_number,
        cheque_date: data.cheque_date,
        reference: data.reference,
        notes: data.notes,
        is_advance: isAdvance,
        is_direct_payment: isDirectPayment,
        vendor_bank_account_id: selectedBankAccountId || undefined,
        vendor_bill_number: vendorBillNumber || undefined,
        bus_id: selectedBusId || undefined,
        bus_no: selectedBusNo || undefined,
        vehicle_type: selectedVehicleType || undefined,
        bank_fee_amount: effectiveBankFee > 0 ? effectiveBankFee : undefined,
        bank_fee_type: effectiveBankFee > 0 ? bankFeeType : undefined,
        allocations: selectedAllocations.map((a) => ({
          invoice_id: a.invoice_id,
          allocated_amount: a.allocated_amount,
          wht_deducted: a.wht_deducted,
          write_off_amount: a.write_off_amount,
          write_off_account_id: globalWriteOffAccountId || undefined,
        })),
        direct_lines: isDirectPayment
          ? directLines.filter((l) => l.account_id && l.line_total > 0).map((l) => ({
              account_id: l.account_id,
              description: l.description,
              quantity: l.quantity,
              unit_price: l.unit_price,
              tax_rate: l.tax_rate,
              tax_amount: l.tax_amount,
              line_total: l.line_total,
            }))
          : undefined,
      });

      // Upload supporting document if selected
      if (documentFile && paymentResult?.id) {
        const filePath = `ap_payments/${paymentResult.id}/${documentFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("documents")
          .upload(filePath, documentFile, { upsert: true });
        if (!uploadErr) {
          await supabase.from("ap_payments").update({ document_url: filePath }).eq("id", paymentResult.id);
        }
      }

      // Auto-create cheque register entry for cheque payments
      if (data.payment_method === "cheque" && data.cheque_number) {
        const vendorName = vendors?.find((v) => v.id === data.vendor_id)?.vendor_name || "Unknown";
        try {
          await supabase.from("cheque_register").insert({
            cheque_number: data.cheque_number,
            cheque_date: data.cheque_date || data.payment_date,
            payee: vendorName,
            amount: totalPayment,
            bank_account_id: data.bank_account_id || null,
            company_id: selectedCompanyId || null,
            payment_id: paymentResult?.id || null,
            cheque_type: "outgoing",
            status: "draft",
            reference: data.reference || null,
            memo: data.notes || null,
          });
        } catch (chequeErr) {
          console.error("Failed to auto-create cheque register entry:", chequeErr);
        }
      }
      onOpenChange(false);
      form.reset();
      setAllocations([]);
      setIsAdvance(false);
      setIsDirectPayment(false);
      setDirectLines([createEmptyLine()]);
      setAdvanceAmount(0);
      setIncludeBankFee(false);
      setBankFeeAmount(0);
      setDocumentFile(null);
      setVendorBillNumber("");
      setSelectedBusId("");
      setSelectedBusNo("");
      setSelectedVehicleType("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const canSubmit = isDirectPayment
    ? directLinesTotal > 0 && selectedVendorId && directLines.some((l) => l.account_id)
    : isAdvance 
    ? advanceAmount > 0 && selectedVendorId 
    : totalPayment > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDirectPayment ? (
              <>
                <FileText className="h-5 w-5 text-blue-600" />
                Direct Payment (Without Invoice)
              </>
            ) : isAdvance ? (
              <>
                <Wallet className="h-5 w-5 text-orange-600" />
                Record Advance Payment
              </>
            ) : (
              "Record AP Payment"
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Mode Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Advance Payment</p>
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

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-blue-200 dark:border-blue-800" style={{ borderWidth: isDirectPayment ? 2 : 1 }}>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Direct Payment</p>
                    <p className="text-sm text-muted-foreground">
                      Pay directly with line items — no invoice needed
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDirectPayment}
                  onCheckedChange={handleDirectPaymentToggle}
                />
              </div>
            </div>

            {/* Header Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="payment_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment #</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono bg-muted/50" readOnly placeholder="Auto-generated on save" />
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
                    <FormLabel>Vendor / Payee</FormLabel>
                    <SearchableVendorSelector
                      value={selectedVendorId}
                      onValueChange={handleVendorChange}
                      placeholder="Select vendor or customer"
                      showQuickAdd={true}
                      includeCustomers={true}
                      customers={customers || []}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vendor Bank Account Selector */}
              {selectedVendorId && vendorBankAccounts && vendorBankAccounts.length > 0 && (
                <FormItem>
                  <FormLabel>Pay To Account</FormLabel>
                  <Select onValueChange={setSelectedBankAccountId} value={selectedBankAccountId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendorBankAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.bank_name} - {acc.account_number} {acc.is_default ? "(Default)" : ""} {acc.account_label ? `[${acc.account_label}]` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}

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

              <FormItem>
                <FormLabel>Vendor Bill #</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Vendor's bill/invoice number"
                    value={vendorBillNumber}
                    onChange={(e) => setVendorBillNumber(e.target.value)}
                    className="font-mono"
                  />
                </FormControl>
              </FormItem>
            </div>

            {/* Vehicle Selector */}
            <VehicleSelector
              busId={selectedBusId}
              busNo={selectedBusNo}
              vehicleType={selectedVehicleType}
              onSelect={(bId, bNo, vType) => { setSelectedBusId(bId); setSelectedBusNo(bNo); setSelectedVehicleType(vType); }}
              onClear={() => { setSelectedBusId(""); setSelectedBusNo(""); setSelectedVehicleType(""); }}
            />

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
                <>
                  <FormField
                    control={form.control}
                    name="cheque_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Cheque Number
                          {activeChequeBook && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder={activeChequeBook ? "Auto-assigned" : "Cheque #"} />
                        </FormControl>
                        {activeChequeBook && (() => {
                          const remaining = activeChequeBook.end_number - activeChequeBook.next_number + 1;
                          if (remaining <= 10 && remaining > 0) {
                            return (
                              <p className="text-xs text-orange-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {remaining} cheque leaves remaining
                              </p>
                            );
                          }
                          if (remaining <= 0) {
                            return (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Cheque book exhausted
                              </p>
                            );
                          }
                          return null;
                        })()}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cheque_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cheque Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Transfer ref..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bank Fee Section */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Landmark className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Include Bank Fee</p>
                  <p className="text-sm text-muted-foreground">
                    Add bank charges to this payment
                  </p>
                </div>
              </div>
              <Switch
                checked={includeBankFee}
                onCheckedChange={setIncludeBankFee}
              />
            </div>

            {includeBankFee && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <Label className="text-sm font-medium">Fee Amount</Label>
                  <Input
                    type="number"
                    value={bankFeeAmount}
                    onChange={(e) => setBankFeeAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Fee Type</Label>
                  <Select value={bankFeeType} onValueChange={setBankFeeType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_charge">Bank Charge</SelectItem>
                      <SelectItem value="swift_fee">SWIFT Fee</SelectItem>
                      <SelectItem value="stamp_duty">Stamp Duty</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Advance Mode: Direct Amount Input */}
            {isAdvance && (
              <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Advance Amount</FormLabel>
                  <Input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                    className="text-2xl h-14 font-bold"
                    placeholder="Enter advance amount"
                    min={0}
                    step="0.01"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This amount will be recorded as an advance and can be allocated to invoices later.
                  </p>
                </FormItem>
              </div>
            )}

            {/* Direct Payment: Line Items */}
            {isDirectPayment && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Payment Line Items
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" /> Add Line
                  </Button>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col style={{ width: 180 }} />
                      <col />
                      <col style={{ width: 90 }} />
                      <col style={{ width: 150 }} />
                      <col style={{ width: 80 }} />
                      <col style={{ width: 130 }} />
                      <col style={{ width: 40 }} />
                    </colgroup>
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium">GL Account</th>
                        <th className="px-3 py-2 text-left text-sm font-medium">Description</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">Qty</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">Unit Price</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">Tax %</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {directLines.map((line) => (
                        <tr key={line.id} className="border-t">
                          <td className="px-2 py-2">
                            <SearchableAccountSelector
                              value={line.account_id}
                              onValueChange={(val) => updateLine(line.id, "account_id", val)}
                              placeholder="Select account"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(line.id, "description", e.target.value)}
                              placeholder="Description"
                              className="h-8"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              value={line.quantity}
                              onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                              className="h-8 text-right"
                              min={0}
                              step="1"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <CurrencyInput
                              value={line.unit_price}
                              onValueChange={(val) => updateLine(line.id, "unit_price", val)}
                              placeholder="0"
                              compact
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              value={line.tax_rate}
                              onChange={(e) => updateLine(line.id, "tax_rate", parseFloat(e.target.value) || 0)}
                              className="h-8 text-right"
                              min={0}
                              step="0.01"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-sm">
                            <CurrencyDisplay amount={line.line_total} />
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeLine(line.id)}
                              disabled={directLines.length <= 1}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Direct payment total */}
                <div className="flex justify-end">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between gap-8">
                      <span className="font-semibold">Total:</span>
                      <span className="text-2xl font-bold text-primary">
                        <CurrencyDisplay amount={directLinesTotal} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Allocation (only when not advance or direct payment mode) */}
            {!isAdvance && !isDirectPayment && selectedVendorId && (
              <div className="space-y-3">
                {/* Pending Invoices Alert */}
                {pendingInvoices.length > 0 && (
                  <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800 dark:text-yellow-400">Pending Approval</AlertTitle>
                    <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                      <span>
                        {pendingInvoices.length} invoice{pendingInvoices.length > 1 ? "s" : ""} pending approval totaling{" "}
                        <CurrencyDisplay amount={pendingTotal} className="font-semibold" />.
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-3 border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                        onClick={handleApproveAllPending}
                        disabled={approveInvoice.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {approveInvoice.isPending ? "Approving..." : "Approve All"}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

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
                          <th className="px-3 py-2 text-right text-sm font-medium w-32">Write-off</th>
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
                                  value={alloc.write_off_amount}
                                  onChange={(e) => updateAllocation(alloc.invoice_id, "write_off_amount", parseFloat(e.target.value) || 0)}
                                  className="h-8 text-right"
                                  min={0}
                                  step="0.01"
                                  placeholder="0.00"
                                />
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
                  {(allocations.some(a => a.write_off_amount > 0)) && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground whitespace-nowrap">Write-off Account:</span>
                          <SearchableAccountSelector
                            value={globalWriteOffAccountId}
                            onValueChange={setGlobalWriteOffAccountId}
                            placeholder="Select Discount/Write-off GL"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">Total Write-off:</span>
                          <span className="text-lg font-semibold text-primary">
                            <CurrencyDisplay amount={allocations.reduce((sum, a) => sum + a.write_off_amount, 0)} />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="bg-muted/50 p-4 rounded-lg flex items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">WHT Deducted:</span>
                      <span className="text-lg font-semibold text-orange-600">
                        <CurrencyDisplay amount={totalWhtDeducted} />
                      </span>
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg space-y-1">
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-sm text-muted-foreground">Payment Amount:</span>
                      <span className="font-semibold">
                        <CurrencyDisplay amount={totalPayment} />
                      </span>
                    </div>
                    {includeBankFee && bankFeeAmount > 0 && (
                      <div className="flex items-center justify-between gap-8">
                        <span className="text-sm text-muted-foreground">Bank Fee:</span>
                        <span className="font-semibold text-orange-600">
                          <CurrencyDisplay amount={bankFeeAmount} />
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-8 border-t pt-1">
                      <span className="font-semibold">Total (Bank Deduction):</span>
                      <span className="text-2xl font-bold text-primary">
                        <CurrencyDisplay amount={totalWithFees} />
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

            {/* Supporting Document Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Supporting Document
              </Label>
              {documentFile ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1 truncate">{documentFile.name}</span>
                  <span className="text-xs text-muted-foreground">{(documentFile.size / 1024).toFixed(0)} KB</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDocumentFile(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload bank slip, receipt, or invoice</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setDocumentFile(file);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending || !canSubmit}>
                {createPayment.isPending ? "Processing..." : isDirectPayment ? "Process Direct Payment" : isAdvance ? "Record Advance" : "Process Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
