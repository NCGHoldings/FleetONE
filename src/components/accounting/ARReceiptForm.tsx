import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCustomers, useARInvoices, useBankAccounts, useVendors } from "@/hooks/useAccountingData";
import { useCreateARReceipt } from "@/hooks/useAccountingMutations";
import { format } from "date-fns";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle, ChevronsUpDown, Check, Info, Landmark, UserPlus } from "lucide-react";
import { SearchableAccountSelector } from "./shared/SearchableAccountSelector";
import { VehicleSelector } from "./shared/VehicleSelector";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CustomerForm } from "./CustomerForm";
import { useCompany } from "@/contexts/CompanyContext";

const receiptSchema = z.object({
  receipt_number: z.string().min(1, "Receipt number is required"),
  customer_id: z.string().min(1, "Customer/Vendor is required"),
  receipt_date: z.string().min(1, "Receipt date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.string().min(1, "Payment method is required"),
  bank_account_id: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  is_advance: z.boolean().optional(),
  override_gl_account_id: z.string().optional(),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

interface InvoiceAllocation {
  invoice_id: string;
  invoice_number: string;
  due_date: string;
  balance: number;
  allocated_amount: number;
  write_off_amount: number;
  selected: boolean;
}

interface ARReceiptFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCustomerId?: string;
  isAdvanceMode?: boolean;
}

interface PartyOption {
  id: string;
  name: string;
  type: "customer" | "vendor";
  categoryName: string;
}

export const ARReceiptForm = ({ open, onOpenChange, preselectedCustomerId, isAdvanceMode = false }: ARReceiptFormProps) => {
  const { data: customers } = useCustomers();
  const { data: vendors } = useVendors();
  const { data: bankAccounts } = useBankAccounts();
  const { data: allInvoices } = useARInvoices();
  const createReceipt = useCreateARReceipt();
  const generateNumber = useGenerateNumber();
  const { getEffectiveCompanyId } = useCompany();

  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || "");
  const [selectedPartyType, setSelectedPartyType] = useState<"customer" | "vendor">("customer");
  const [isAdvance, setIsAdvance] = useState(isAdvanceMode);
  const [globalWriteOffAccountId, setGlobalWriteOffAccountId] = useState("");
  const [partyOpen, setPartyOpen] = useState(false);
  const [resolvedGL, setResolvedGL] = useState<{ accountCode: string; accountName: string } | null>(null);
  const [overrideGLAccountId, setOverrideGLAccountId] = useState("");
  const [selectedBusId, setSelectedBusId] = useState("");
  const [selectedBusNo, setSelectedBusNo] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] = useState<"fleet" | "external" | "">("");
  const [includeBankFee, setIncludeBankFee] = useState(false);
  const [bankFeeAmount, setBankFeeAmount] = useState(0);
  const [bankFeeType, setBankFeeType] = useState("bank_charge");
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Build grouped party options
  const partyOptions = useMemo(() => {
    const options: PartyOption[] = [];

    // Group customers by category
    if (customers) {
      for (const c of customers) {
        options.push({
          id: c.id,
          name: c.customer_name,
          type: "customer",
          categoryName: (c as any).customer_categories?.category_name || "Uncategorized",
        });
      }
    }

    // Group vendors by category
    if (vendors) {
      for (const v of vendors) {
        options.push({
          id: v.id,
          name: v.vendor_name,
          type: "vendor",
          categoryName: (v as any).vendor_categories?.category_name || "Uncategorized",
        });
      }
    }

    return options;
  }, [customers, vendors]);

  // Group by type then category
  const groupedOptions = useMemo(() => {
    const customersByCategory = new Map<string, PartyOption[]>();
    const vendorsByCategory = new Map<string, PartyOption[]>();

    for (const opt of partyOptions) {
      const map = opt.type === "customer" ? customersByCategory : vendorsByCategory;
      if (!map.has(opt.categoryName)) map.set(opt.categoryName, []);
      map.get(opt.categoryName)!.push(opt);
    }

    return { customersByCategory, vendorsByCategory };
  }, [partyOptions]);

  const selectedParty = partyOptions.find(p => p.id === selectedCustomerId);

  // Resolve GL account when party changes
  useEffect(() => {
    if (!selectedCustomerId || !open) {
      setResolvedGL(null);
      return;
    }

    const resolveGL = async () => {
      try {
        const effectiveCompanyId = getEffectiveCompanyId();
        if (selectedPartyType === "customer") {
          const { resolveCustomerARAccounts } = await import("@/hooks/useCustomerCategories");
          const resolved = await resolveCustomerARAccounts(selectedCustomerId, effectiveCompanyId);
          if (resolved.arAccountId) {
            const { data: account } = await supabase
              .from("chart_of_accounts")
              .select("account_code, account_name")
              .eq("id", isAdvance && resolved.advanceAccountId ? resolved.advanceAccountId : resolved.arAccountId)
              .single();
            if (account) setResolvedGL({ accountCode: account.account_code, accountName: account.account_name });
          }
        } else {
          const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
          const resolved = await resolveVendorAPAccounts(selectedCustomerId, effectiveCompanyId);
          if (resolved.apAccountId) {
            const { data: account } = await supabase
              .from("chart_of_accounts")
              .select("account_code, account_name")
              .eq("id", isAdvance && resolved.advanceAccountId ? resolved.advanceAccountId : resolved.apAccountId)
              .single();
            if (account) setResolvedGL({ accountCode: account.account_code, accountName: account.account_name });
          }
        }
      } catch {
        setResolvedGL(null);
      }
    };

    resolveGL();
  }, [selectedCustomerId, selectedPartyType, isAdvance, open]);

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      receipt_number: "",
      customer_id: preselectedCustomerId || "",
      receipt_date: format(new Date(), "yyyy-MM-dd"),
      amount: 0,
      payment_method: "bank_transfer",
      reference: "",
      notes: "",
      is_advance: isAdvanceMode,
    },
  });

  useEffect(() => {
    if (open) {
      generateNumber("receipt").then(num => form.setValue("receipt_number", num));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setIsAdvance(isAdvanceMode);
      form.setValue("is_advance", isAdvanceMode);
      if (!isAdvanceMode) {
        form.setValue("amount", 0);
      }
    }
  }, [open, isAdvanceMode, form]);

  // Filter invoices for selected party
  useEffect(() => {
    if (selectedCustomerId && !isAdvance) {
      if (selectedPartyType === "customer" && allInvoices) {
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
            write_off_amount: 0,
            selected: false,
          }))
        );
      } else {
        // Vendor selected — no AR invoices to allocate
        setAllocations([]);
      }
    } else {
      setAllocations([]);
    }
  }, [selectedCustomerId, selectedPartyType, allInvoices, isAdvance]);

  const handlePartyChange = (partyId: string) => {
    const party = partyOptions.find(p => p.id === partyId);
    if (party) {
      setSelectedCustomerId(partyId);
      setSelectedPartyType(party.type);
      form.setValue("customer_id", partyId);
    }
    setPartyOpen(false);
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

  const updateAllocation = (invoiceId: string, field: "allocated_amount" | "write_off_amount", value: number) => {
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

  useEffect(() => {
    if (!isAdvance) {
      form.setValue("amount", totalAllocated);
    }
  }, [totalAllocated, form, isAdvance]);

  const handleAdvanceToggle = (checked: boolean) => {
    setIsAdvance(checked);
    form.setValue("is_advance", checked);
    if (checked) {
      setAllocations([]);
    }
  };

  const effectiveBankFee = includeBankFee ? bankFeeAmount : 0;

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
        party_type: selectedPartyType,
        override_gl_account_id: overrideGLAccountId || undefined,
        bus_id: selectedBusId || undefined,
        bus_no: selectedBusNo || undefined,
        vehicle_type: selectedVehicleType || undefined,
        bank_fee_amount: effectiveBankFee > 0 ? effectiveBankFee : undefined,
        bank_fee_type: effectiveBankFee > 0 ? bankFeeType : undefined,
        allocations: selectedAllocations.map((a) => ({
          invoice_id: a.invoice_id,
          allocated_amount: a.allocated_amount,
          write_off_amount: a.write_off_amount,
          write_off_account_id: globalWriteOffAccountId || undefined,
        })),
      });
      onOpenChange(false);
      form.reset();
      setAllocations([]);
      setIsAdvance(false);
      setResolvedGL(null);
      setSelectedBusId("");
      setSelectedBusNo("");
      setSelectedVehicleType("");
      setIncludeBankFee(false);
      setBankFeeAmount(0);
      setBankFeeType("bank_charge");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const canSubmit = isAdvance 
    ? form.watch("amount") > 0 && selectedCustomerId 
    : selectedPartyType === "vendor" 
      ? form.watch("amount") > 0 && selectedCustomerId
      : totalAllocated > 0 || (form.watch("amount") > 0 && selectedCustomerId);

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
                render={() => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Customer / Vendor</FormLabel>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <Popover open={partyOpen} onOpenChange={setPartyOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={partyOpen}
                              className={cn(
                                "w-full justify-between font-normal",
                                !selectedCustomerId && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate">
                                {selectedParty ? (
                                  <span className="flex items-center gap-1.5 truncate">
                                    <Badge variant={selectedParty.type === "customer" ? "default" : "secondary"} className="shrink-0 text-[10px] px-1 py-0">
                                      {selectedParty.type === "customer" ? "C" : "V"}
                                    </Badge>
                                    <span className="truncate">{selectedParty.name}</span>
                                  </span>
                                ) : "Select customer or vendor..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0 z-[200] bg-popover border shadow-lg" align="start" sideOffset={4} style={{ pointerEvents: 'auto' }} onOpenAutoFocus={(e) => e.preventDefault()}>
                        <Command shouldFilter={true}>
                          <CommandInput placeholder="Search customer or vendor..." />
                          <CommandList className="max-h-[400px] overflow-y-auto">
                            <CommandEmpty>No match found.</CommandEmpty>
                            {/* Customer groups */}
                            {Array.from(groupedOptions.customersByCategory.entries()).map(([category, items]) => (
                              <CommandGroup key={`c-${category}`} heading={`🟢 ${category}`}>
                                {items.map(item => (
                                  <CommandItem
                                    key={item.id}
                                    value={`customer ${item.name} ${category}`}
                                    onSelect={() => handlePartyChange(item.id)}
                                    className="cursor-pointer"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === item.id ? "opacity-100" : "opacity-0")} />
                                    {item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                            {/* Vendor groups */}
                            {Array.from(groupedOptions.vendorsByCategory.entries()).map(([category, items]) => (
                              <CommandGroup key={`v-${category}`} heading={`🔵 ${category}`}>
                                {items.map(item => (
                                  <CommandItem
                                    key={item.id}
                                    value={`vendor ${item.name} ${category}`}
                                    onSelect={() => handlePartyChange(item.id)}
                                    className="cursor-pointer"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === item.id ? "opacity-100" : "opacity-0")} />
                                    {item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-primary hover:text-primary/80"
                    onClick={() => setShowCustomerForm(true)}
                    title="Quick Add Customer"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                    {/* GL Code Badge — shows override if set, otherwise auto-resolved */}
                    {(overrideGLAccountId || resolvedGL) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Info className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs text-blue-600 font-mono">
                          {overrideGLAccountId ? "GL Override Applied" : `GL: ${resolvedGL?.accountCode} - ${resolvedGL?.accountName}`}
                        </span>
                      </div>
                    )}
                    {selectedParty && (
                      <Badge variant="outline" className="w-fit text-[10px] mt-0.5">
                        {selectedParty.type === "customer" ? "Customer" : "Vendor"} • {selectedParty.categoryName}
                      </Badge>
                    )}
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

            {/* GL Account Override */}
            {selectedCustomerId && (
              <div className="p-3 border rounded-lg bg-muted/30">
                <FormLabel className="text-sm font-medium mb-2 block">GL Account Override (Optional)</FormLabel>
                <SearchableAccountSelector
                  value={overrideGLAccountId}
                  onValueChange={setOverrideGLAccountId}
                  placeholder="Leave empty to use auto-resolved GL account..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Override takes priority over category mapping and global settings
                </p>
              </div>
            )}

            {/* Vehicle Selector */}
            <VehicleSelector
              busId={selectedBusId}
              busNo={selectedBusNo}
              vehicleType={selectedVehicleType}
              onSelect={(bId, bNo, vType) => { setSelectedBusId(bId); setSelectedBusNo(bNo); setSelectedVehicleType(vType); }}
              onClear={() => { setSelectedBusId(""); setSelectedBusNo(""); setSelectedVehicleType(""); }}
            />

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
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="text-2xl h-14 font-bold"
                          placeholder="Enter advance amount"
                          min={0}
                          step="0.01"
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
                  <h3 className="font-semibold">
                    {selectedPartyType === "vendor" ? "Vendor Allocation (Manual)" : "Allocate to Invoices"}
                  </h3>
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
                {selectedPartyType === "vendor" ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                    Vendor selected — enter amount directly or switch to Advance mode
                  </p>
                ) : allocations.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-medium w-10"></th>
                          <th className="px-3 py-2 text-left text-sm font-medium">Invoice #</th>
                          <th className="px-3 py-2 text-left text-sm font-medium">Due Date</th>
                          <th className="px-3 py-2 text-right text-sm font-medium">Balance</th>
                          <th className="px-3 py-2 text-right text-sm font-medium w-36">Write-off</th>
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
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                      No outstanding invoices for this customer
                    </p>
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">Receipt Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="text-2xl h-14 font-bold"
                                placeholder="Enter receipt amount"
                                min={0}
                                step="0.01"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-6">
                  {(allocations.some(a => a.write_off_amount > 0)) && (
                    <div className="bg-muted p-4 rounded-lg">
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
                  <div className="bg-muted p-4 rounded-lg flex items-center">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">Total Receipt Amount:</span>
                      <span className="text-2xl font-bold text-primary">
                        <CurrencyDisplay amount={selectedPartyType === "vendor" ? form.watch("amount") : (totalAllocated > 0 ? totalAllocated : form.watch("amount"))} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Direct amount for vendor non-advance */}
            {!isAdvance && selectedPartyType === "vendor" && selectedCustomerId && (
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">Receipt Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="text-2xl h-14 font-bold"
                          placeholder="Enter receipt amount"
                          min={0}
                          step="0.01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Bank Fee Section */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Landmark className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Include Bank Fee</p>
                  <p className="text-sm text-muted-foreground">
                    Deduct bank charges from this receipt
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

      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm onSuccess={() => setShowCustomerForm(false)} />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
