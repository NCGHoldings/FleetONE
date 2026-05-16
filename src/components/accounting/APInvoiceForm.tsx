import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useVendors, useTaxCodes, useBankAccounts } from "@/hooks/useAccountingData";
import { useCreateAPInvoice, useUpdateAPInvoice, useCreateAPPayment } from "@/hooks/useAccountingMutations";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { Plus, Trash2, Check, ChevronsUpDown, Bus, Route, Banknote, CreditCard, Split, Lock, Unlock } from "lucide-react";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { SearchableAccountSelector } from "./shared/SearchableAccountSelector";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { SearchableVendorSelector } from "./shared/SearchableVendorSelector";
import { BusinessUnitSelector } from "./shared/BusinessUnitSelector";

const invoiceSchema = z.object({
  invoice_number: z.string().optional(),
  vendor_bill_number: z.string().optional(),
  vendor_id: z.string().min(1, "Vendor is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  apply_wht: z.boolean().optional(),
  wht_rate: z.number().optional(),
  wht_category: z.string().optional(),
  notes: z.string().optional(),
  business_unit_code: z.string().optional(),
  agent_reference: z.string().optional(),
});

const WHT_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'service_fee', label: 'Service Fee' },
  { value: 'vehicle_rent', label: 'Vehicle Rent' },
  { value: 'interest', label: 'Interest' },
  { value: 'commission', label: 'Commission' },
  { value: 'other', label: 'Other' },
  { value: 'non_liable', label: 'Non-Liable' },
] as const;

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_code?: string;
  tax_rate: number;
  line_total: number;
  account_id?: string;
}

interface APInvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingInvoice?: any;
}

export interface SingleInvoiceData {
  formValues: InvoiceFormData;
  lines: InvoiceLine[];
  allocations: any[];
  routeId: string;
  busId: string;
  schoolRouteId: string;
}

interface SingleAPInvoiceFormProps {
  initialData?: SingleInvoiceData;
  editingInvoice?: any;
  isActive: boolean;
  open: boolean;
  onDataChange?: (data: SingleInvoiceData) => void;
}

const SingleAPInvoiceForm = forwardRef(({ initialData, editingInvoice, isActive, open, onDataChange }: SingleAPInvoiceFormProps, ref) => {
  const { data: vendors } = useVendors();
  const { data: taxCodes } = useTaxCodes();
  const { data: bankAccounts } = useBankAccounts();
  const createInvoice = useCreateAPInvoice();
  const updateInvoice = useUpdateAPInvoice();
  const createPayment = useCreateAPPayment();
  const { getEffectiveCompanyId, getBusinessUnitCode, isSubCompany, selectedCompany } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();
  const isParentView = selectedCompany && !isSubCompany(selectedCompany.id);
  const queryClient = useQueryClient();
  const generatePayNum = useGenerateNumber();
  const submitLock = useRef(false);

  const isEditing = !!editingInvoice;

  // Pay Now state
  const [payNow, setPayNow] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentBankAccountId, setPaymentBankAccountId] = useState("");
  const [paymentChequeNumber, setPaymentChequeNumber] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  // Cost Allocation state
  const [allocateToUnits, setAllocateToUnits] = useState(false);
  const [allocationMode, setAllocationMode] = useState<"amount" | "percentage">("amount");
  const [costAllocations, setCostAllocations] = useState<Array<{id: string; unit_code: string; amount: number; percentage: number;}>>(initialData?.allocations || []);



  const addAllocation = () => {
    setCostAllocations(prev => [...prev, {
      id: Date.now().toString(),
      unit_code: "",
      amount: 0,
      percentage: 0,
    }]);
  };

  const removeAllocation = (id: string) => {
    setCostAllocations(prev => prev.filter(a => a.id !== id));
  };

  const updateAllocation = (id: string, field: string, value: any) => {
    setCostAllocations(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: value };
      if (field === "percentage" && allocationMode === "percentage") {
        updated.amount = Math.round((subtotal * (updated.percentage / 100)) * 100) / 100;
      }
      if (field === "amount" && allocationMode === "amount" && subtotal > 0) {
        updated.percentage = Math.round((updated.amount / subtotal) * 100 * 100) / 100;
      }
      return updated;
    }));
  };


  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 },
  ]);

  // Route/Bus/School Route state
  const [selectedRouteId, setSelectedRouteId] = useState<string>(initialData?.routeId || "");
  const [selectedBusId, setSelectedBusId] = useState<string>(initialData?.busId || "");
  const [selectedSchoolRouteId, setSelectedSchoolRouteId] = useState<string>(initialData?.schoolRouteId || "");
  const [routePopoverOpen, setRoutePopoverOpen] = useState(false);
  const [busPopoverOpen, setBusPopoverOpen] = useState(false);
  const [schoolRoutePopoverOpen, setSchoolRoutePopoverOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newBusNumber, setNewBusNumber] = useState("");
  const [newSchoolRouteName, setNewSchoolRouteName] = useState("");
  const [addingRoute, setAddingRoute] = useState(false);
  const [addingBus, setAddingBus] = useState(false);
  const [addingSchoolRoute, setAddingSchoolRoute] = useState(false);

  // Fetch routes
  const { data: routes } = useQuery({
    queryKey: ["routes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, route_name, route_no")
        .eq("company_id", effectiveCompanyId!)
        .eq("is_active", true)
        .order("route_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!effectiveCompanyId,
  });

  // Fetch buses
  const { data: buses } = useQuery({
    queryKey: ["buses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_no")
        .eq("company_id", effectiveCompanyId!)
        .order("bus_no");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!effectiveCompanyId,
  });

  // Fetch school routes
  const { data: schoolRoutes } = useQuery({
    queryKey: ["school-routes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_routes")
        .select("id, route_name, route_code")
        .eq("company_id", effectiveCompanyId!)
        .order("route_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!effectiveCompanyId,
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialData?.formValues || {
      invoice_number: "",
      vendor_bill_number: "",
      invoice_date: format(new Date(), "yyyy-MM-dd"),
      due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      apply_wht: false,
      wht_rate: 5,
      wht_category: "",
      notes: "",
      business_unit_code: initialData?.formValues?.business_unit_code || businessUnitCode || "",
      agent_reference: initialData?.formValues?.agent_reference || "",
    },
  });

  useEffect(() => {
    if (editingInvoice) {
      form.reset({
        invoice_number: editingInvoice.invoice_number || "",
        vendor_bill_number: editingInvoice.vendor_bill_number || "",
        vendor_id: editingInvoice.vendor_id || "",
        invoice_date: editingInvoice.invoice_date || format(new Date(), "yyyy-MM-dd"),
        due_date: editingInvoice.due_date || format(addDays(new Date(), 30), "yyyy-MM-dd"),
        apply_wht: (editingInvoice.wht_amount || 0) > 0,
        wht_rate: editingInvoice.wht_amount && editingInvoice.subtotal
          ? Math.round((editingInvoice.wht_amount / editingInvoice.subtotal) * 100 * 100) / 100
          : 5,
        wht_category: (editingInvoice as any).wht_category || "",
        notes: editingInvoice.notes || "",
        business_unit_code: editingInvoice.business_unit_code || "",
        agent_reference: editingInvoice.agent_reference || "",
      });
      setSelectedRouteId(editingInvoice.route_id || "");
      setSelectedBusId(editingInvoice.bus_id || "");
      setSelectedSchoolRouteId(editingInvoice.school_route_id || "");

      const fetchLines = async () => {
        const { data: existingLines } = await supabase
          .from("ap_invoice_lines")
          .select("*")
          .eq("invoice_id", editingInvoice.id);
        if (existingLines && existingLines.length > 0) {
          setLines(existingLines.map((l: any) => {
            const taxCode = l.tax_code || undefined;
            const currentTaxRate = taxCode && taxCodes 
              ? taxCodes.find(t => t.tax_code === taxCode)?.rate || 0 
              : (l.tax_rate || 0);
            
            const subtotal = (l.quantity || 1) * (l.unit_price || 0);
            const calculatedTotal = subtotal + (subtotal * currentTaxRate / 100);

            return {
              id: l.id,
              description: l.description || "",
              quantity: l.quantity || 1,
              unit_price: l.unit_price || 0,
              tax_code: taxCode,
              tax_rate: currentTaxRate,
              line_total: l.line_total || calculatedTotal,
              account_id: l.account_id || undefined,
            };
          }));
        }
      };
      fetchLines();
    } else if (open) {
      // === FULL RESET for new invoice ===
      // Reset the react-hook-form to fresh defaults
      form.reset({
        invoice_number: "",
        vendor_bill_number: "",
        vendor_id: "",
        invoice_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        apply_wht: false,
        wht_rate: 5,
        wht_category: "",
        notes: "",
        business_unit_code: businessUnitCode || "",
        agent_reference: "",
      });
      // Reset invoice lines to a single empty line
      setLines([{ id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 }]);
      // Reset route/bus/school route selections
      setSelectedRouteId("");
      setSelectedBusId("");
      setSelectedSchoolRouteId("");
      // Reset Pay Now state
      setPayNow(false);
      setPaymentMethod("bank_transfer");
      setPaymentBankAccountId("");
      setPaymentChequeNumber("");
      setPaymentReference("");
      // Reset cost allocation state
      setAllocateToUnits(false);
      setCostAllocations([]);
      // Reset submit lock
      submitLock.current = false;
    }
  }, [open, editingInvoice]);

  useImperativeHandle(ref, () => ({
    validateAndGetData: async () => {
      const isValid = await form.trigger();
      if (!isValid) return null;
      return {
        formValues: form.getValues(),
        lines,
        allocations: costAllocations,
        routeId: selectedRouteId,
        busId: selectedBusId,
        schoolRouteId: selectedSchoolRouteId,
        netPayable,
        whtAmount,
        grossTotal,
        totalTax,
        subtotal
      };
    }
  }));

  useEffect(() => {
    if (isActive && onDataChange) {
      const subscription = form.watch((value) => {
        onDataChange({
          formValues: form.getValues(),
          lines,
          allocations: costAllocations,
          routeId: selectedRouteId,
          busId: selectedBusId,
          schoolRouteId: selectedSchoolRouteId
        });
      });
      return () => subscription.unsubscribe();
    }
  }, [isActive, form.watch, lines, costAllocations, selectedRouteId, selectedBusId, selectedSchoolRouteId]);

  const applyWht = form.watch("apply_wht");
  const whtRate = form.watch("wht_rate") || 5;

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((l) => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    setLines(
      lines.map((line) => {
        if (line.id === id) {
          const updated = { ...line, [field]: value };
          if (field === "quantity" || field === "unit_price" || field === "tax_rate") {
            const subtotal = updated.quantity * updated.unit_price;
            const tax = subtotal * (updated.tax_rate / 100);
            updated.line_total = subtotal + tax;
          }
          return updated;
        }
        return line;
      })
    );
  };

  const handleTaxCodeChange = (lineId: string, taxCode: string) => {
    if (!taxCode) {
      updateLine(lineId, "tax_code", undefined);
      updateLine(lineId, "tax_rate", 0);
      return;
    }
    const tax = taxCodes?.find((t) => t.tax_code === taxCode);
    if (tax) {
      updateLine(lineId, "tax_code", taxCode);
      updateLine(lineId, "tax_rate", tax.rate || 0);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    form.setValue("vendor_id", vendorId);
    const vendor = vendors?.find((v) => v.id === vendorId);
    if (vendor?.wht_rate) {
      form.setValue("wht_rate", vendor.wht_rate);
    }
  };

  const handleAddRoute = async () => {
    if (!newRouteName.trim()) return;
    setAddingRoute(true);
    try {
      const { data, error } = await (supabase as any)
        .from("routes")
        .insert([{ 
          route_name: newRouteName.trim(), 
          route_no: 'NEW', 
          start_location: 'TBD', 
          end_location: 'TBD', 
          is_active: true,
          company_id: effectiveCompanyId
        }])
        .select("id")
        .single();
      if (error) throw error;
      setSelectedRouteId(data.id);
      setNewRouteName("");
      queryClient.invalidateQueries({ queryKey: ["routes-list"] });
      toast.success("Route added");
    } catch (err: any) {
      toast.error(`Failed to add route: ${err.message}`);
    } finally {
      setAddingRoute(false);
    }
  };

  const handleAddBus = async () => {
    if (!newBusNumber.trim()) return;
    setAddingBus(true);
    try {
      const { data, error } = await (supabase as any)
        .from("buses")
        .insert([{ 
          bus_no: newBusNumber.trim(), 
          capacity: 0, 
          year: new Date().getFullYear(),
          company_id: effectiveCompanyId
        }])
        .select("id")
        .single();
      if (error) throw error;
      setSelectedBusId(data.id);
      setNewBusNumber("");
      queryClient.invalidateQueries({ queryKey: ["buses-list"] });
      toast.success("Bus added");
    } catch (err: any) {
      toast.error(`Failed to add bus: ${err.message}`);
    } finally {
      setAddingBus(false);
    }
  };

  const handleAddSchoolRoute = async () => {
    if (!newSchoolRouteName.trim()) return;
    setAddingSchoolRoute(true);
    try {
      const { data, error } = await (supabase as any)
        .from("school_routes")
        .insert([{ 
          route_name: newSchoolRouteName.trim(), 
          route_code: 'NEW-' + Date.now().toString().slice(-4),
          company_id: effectiveCompanyId
        }])
        .select("id")
        .single();
      if (error) throw error;
      setSelectedSchoolRouteId(data.id);
      setNewSchoolRouteName("");
      queryClient.invalidateQueries({ queryKey: ["school-routes-list"] });
      toast.success("School route added");
    } catch (err: any) {
      toast.error(`Failed to add school route: ${err.message}`);
    } finally {
      setAddingSchoolRoute(false);
    }
  };

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const totalTax = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price * line.tax_rate) / 100, 0);
  const grossTotal = subtotal + totalTax;
  const whtAmount = applyWht ? (subtotal * whtRate) / 100 : 0;
  const netPayable = grossTotal - whtAmount;

  const totalAllocated = costAllocations.reduce((sum, a) => sum + a.amount, 0);
  const unallocatedAmount = subtotal - totalAllocated;

  const selectedRoute = routes?.find(r => r.id === selectedRouteId);
  const selectedBus = buses?.find(b => b.id === selectedBusId);
  const selectedSchoolRoute = schoolRoutes?.find(r => r.id === selectedSchoolRouteId);

  const isPending = isEditing ? updateInvoice.isPending : (createInvoice.isPending || createPayment.isPending);

  return (
    <div className={cn("space-y-6", !isActive && "hidden")}>
        <Form {...form}>
          <form className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AP Invoice #</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Auto-generating..." readOnly className="bg-muted/50 font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_bill_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Bill #</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Vendor's invoice no." className="font-mono" />
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
                    <SearchableVendorSelector
                      value={field.value}
                      onValueChange={handleVendorChange}
                      showQuickAdd={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agent_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Vendor / Agent</FormLabel>
                    <SearchableVendorSelector
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder="Select agent..."
                      showQuickAdd={true}
                      valueType="name"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isParentView && (
                <FormField
                  control={form.control}
                  name="business_unit_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Unit</FormLabel>
                      <BusinessUnitSelector
                        value={field.value || "HQ"}
                        onChange={field.onChange}
                        showAllOption={false}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Route className="h-3.5 w-3.5" /> Route
                </label>
                <Popover open={routePopoverOpen} onOpenChange={setRoutePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between font-normal", !selectedRouteId && "text-muted-foreground")}
                    >
                      {selectedRoute
                        ? `${selectedRoute.route_no ? selectedRoute.route_no + " - " : ""}${selectedRoute.route_name}`
                        : "Select route..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-[100]">
                    <Command>
                      <CommandInput placeholder="Search routes..." className="border-b" />
                      <CommandList>
                        <CommandEmpty>No routes found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__clear__"
                            onSelect={() => { setSelectedRouteId(""); setRoutePopoverOpen(false); }}
                          >
                            <span className="text-muted-foreground">— None —</span>
                          </CommandItem>
                          {routes?.map((route) => (
                            <CommandItem
                              key={route.id}
                              value={`${route.route_no || ""} ${route.route_name}`}
                              onSelect={() => { setSelectedRouteId(route.id); setRoutePopoverOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedRouteId === route.id ? "opacity-100" : "opacity-0")} />
                              {route.route_no ? `${route.route_no} - ` : ""}{route.route_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Add New" forceMount>
                          <div className="flex items-center gap-1 px-2 py-1">
                            <Input
                              placeholder="New route name"
                              value={newRouteName}
                              onChange={(e) => setNewRouteName(e.target.value)}
                              className="h-7 text-xs"
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRoute())}
                            />
                            <Button size="sm" variant="ghost" onClick={handleAddRoute} disabled={addingRoute || !newRouteName.trim()} className="h-7 px-2">
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Bus className="h-3.5 w-3.5" /> Bus
                </label>
                <Popover open={busPopoverOpen} onOpenChange={setBusPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between font-normal", !selectedBusId && "text-muted-foreground")}
                    >
                      {selectedBus
                        ? selectedBus.bus_no
                        : "Select bus..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-[100]">
                    <Command>
                      <CommandInput placeholder="Search buses..." className="border-b" />
                      <CommandList>
                        <CommandEmpty>No buses found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__clear__"
                            onSelect={() => { setSelectedBusId(""); setBusPopoverOpen(false); }}
                          >
                            <span className="text-muted-foreground">— None —</span>
                          </CommandItem>
                          {buses?.map((bus) => (
                            <CommandItem
                              key={bus.id}
                              value={bus.bus_no}
                              onSelect={() => { setSelectedBusId(bus.id); setBusPopoverOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedBusId === bus.id ? "opacity-100" : "opacity-0")} />
                              {bus.bus_no}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Add New" forceMount>
                          <div className="flex items-center gap-1 px-2 py-1">
                            <Input
                              placeholder="New bus number"
                              value={newBusNumber}
                              onChange={(e) => setNewBusNumber(e.target.value)}
                              className="h-7 text-xs"
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddBus())}
                            />
                            <Button size="sm" variant="ghost" onClick={handleAddBus} disabled={addingBus || !newBusNumber.trim()} className="h-7 px-2">
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Route className="h-3.5 w-3.5" /> School Route
                </label>
                <Popover open={schoolRoutePopoverOpen} onOpenChange={setSchoolRoutePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between font-normal", !selectedSchoolRouteId && "text-muted-foreground")}
                    >
                      {selectedSchoolRoute
                        ? `${selectedSchoolRoute.route_code ? selectedSchoolRoute.route_code + " - " : ""}${selectedSchoolRoute.route_name}`
                        : "Select school route..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-[100]">
                    <Command>
                      <CommandInput placeholder="Search school routes..." className="border-b" />
                      <CommandList>
                        <CommandEmpty>No school routes found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__clear__"
                            onSelect={() => { setSelectedSchoolRouteId(""); setSchoolRoutePopoverOpen(false); }}
                          >
                            <span className="text-muted-foreground">— None —</span>
                          </CommandItem>
                          {schoolRoutes?.map((route) => (
                            <CommandItem
                              key={route.id}
                              value={`${route.route_code || ""} ${route.route_name}`}
                              onSelect={() => { setSelectedSchoolRouteId(route.id); setSchoolRoutePopoverOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedSchoolRouteId === route.id ? "opacity-100" : "opacity-0")} />
                              {route.route_code ? `${route.route_code} - ` : ""}{route.route_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Add New" forceMount>
                          <div className="flex items-center gap-1 px-2 py-1">
                            <Input
                              placeholder="New school route name"
                              value={newSchoolRouteName}
                              onChange={(e) => setNewSchoolRouteName(e.target.value)}
                              className="h-7 text-xs"
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSchoolRoute())}
                            />
                            <Button size="sm" variant="ghost" onClick={handleAddSchoolRoute} disabled={addingSchoolRoute || !newSchoolRouteName.trim()} className="h-7 px-2">
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Invoice Lines</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[800px] table-fixed">
                  <colgroup>
                    <col style={{ width: 180 }} />
                    <col />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 40 }} />
                  </colgroup>
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium">GL Account</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">Description</th>
                      <th className="px-3 py-2 text-center text-sm font-medium">Qty</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Unit Price</th>
                      <th className="px-3 py-2 text-center text-sm font-medium">Tax Code</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Line Total</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-t">
                        <td className="px-3 py-2">
                          <SearchableAccountSelector
                            value={line.account_id || ""}
                            onValueChange={(val) => updateLine(line.id, "account_id", val)}
                            placeholder="Select GL account"
                            accountTypes={["expense", "asset", "equity"]}
                            className="h-9 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Textarea
                            value={line.description}
                            onChange={(e) => updateLine(line.id, "description", e.target.value)}
                            placeholder="Item/service description"
                            className="min-h-[36px] resize-none overflow-hidden text-sm py-2"
                            rows={1}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                            className="h-9 text-center"
                            min={1}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <CurrencyInput
                            value={line.unit_price}
                            onValueChange={(val) => updateLine(line.id, "unit_price", val)}
                            placeholder="0"
                            compact
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={line.tax_code || "_none"}
                            onValueChange={(val) => handleTaxCodeChange(line.id, val === "_none" ? "" : val)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">None</SelectItem>
                              {taxCodes?.map((tax) => (
                                <SelectItem key={tax.tax_code} value={tax.tax_code}>
                                  {tax.tax_code} ({tax.rate}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          <CurrencyDisplay amount={line.line_total} />
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <FormField
                  control={form.control}
                  name="apply_wht"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Apply Withholding Tax (WHT)</FormLabel>
                    </FormItem>
                  )}
                />
                {applyWht && (
                  <>
                    <FormField
                      control={form.control}
                      name="wht_rate"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormLabel className="!mt-0">Rate:</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="w-20 h-8"
                              min={0}
                              max={100}
                              step="0.5"
                            />
                          </FormControl>
                          <span>%</span>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wht_category"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormLabel className="!mt-0">Category:</FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <SelectTrigger className="w-40 h-8">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {WHT_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium"><CurrencyDisplay amount={subtotal} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (VAT):</span>
                    <span className="font-medium"><CurrencyDisplay amount={totalTax} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Total:</span>
                    <span className="font-medium"><CurrencyDisplay amount={grossTotal} /></span>
                  </div>
                  {applyWht && (
                    <div className="flex justify-between text-orange-600">
                      <span>Less: WHT ({whtRate}%):</span>
                      <span className="font-medium">-<CurrencyDisplay amount={whtAmount} /></span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Net Payable:</span>
                    <span className="font-bold text-lg"><CurrencyDisplay amount={netPayable} /></span>
                  </div>
                </div>
              </div>
            </div>

            {!isEditing && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Allocate to Business Units (Optional)</span>
                  </div>
                  <Switch checked={allocateToUnits} onCheckedChange={(checked) => {
                    setAllocateToUnits(checked);
                    if (!checked) setCostAllocations([]);
                  }} />
                </div>

                {allocateToUnits && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">Mode:</label>
                      <Select value={allocationMode} onValueChange={(v: "amount" | "percentage") => setAllocationMode(v)}>
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">By Amount</SelectItem>
                          <SelectItem value="percentage">By Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {costAllocations.map((alloc) => (
                      <div key={alloc.id} className="flex items-center gap-3">
                        <Select value={alloc.unit_code} onValueChange={(v) => updateAllocation(alloc.id, "unit_code", v)}>
                          <SelectTrigger className="w-48 h-9">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_UNITS.filter(bu => 
                              bu.code === alloc.unit_code || !costAllocations.some(a => a.id !== alloc.id && a.unit_code === bu.code)
                            ).map(bu => (
                              <SelectItem key={bu.code} value={bu.code}>{bu.code} — {bu.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {allocationMode === "percentage" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={alloc.percentage}
                              onChange={(e) => updateAllocation(alloc.id, "percentage", parseFloat(e.target.value) || 0)}
                              className="w-24 h-9"
                              min={0} max={100} step={0.01}
                            />
                            <span className="text-sm">%</span>
                          </div>
                        ) : (
                          <CurrencyInput
                            value={alloc.amount}
                            onValueChange={(val) => updateAllocation(alloc.id, "amount", val)}
                            placeholder="0"
                            compact
                          />
                        )}

                        <span className="text-sm text-muted-foreground min-w-[100px] text-right">
                          = <CurrencyDisplay amount={alloc.amount} />
                        </span>

                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAllocation(alloc.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={addAllocation} disabled={costAllocations.length >= BUSINESS_UNITS.length}>
                      <Plus className="h-4 w-4 mr-1" /> Add Unit
                    </Button>

                    {costAllocations.length > 0 && (
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                        <span>Allocated: <CurrencyDisplay amount={totalAllocated} /> / <CurrencyDisplay amount={subtotal} /></span>
                        {Math.abs(unallocatedAmount) > 0.01 && (
                          <span className="text-destructive font-medium">
                            Unallocated: <CurrencyDisplay amount={unallocatedAmount} />
                          </span>
                        )}
                        {Math.abs(unallocatedAmount) <= 0.01 && (
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Fully allocated
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
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



            {!isEditing && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Pay Now (Optional)</span>
                  </div>
                  <Switch checked={payNow} onCheckedChange={setPayNow} />
                </div>

                {payNow && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Payment Method</label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bank Account</label>
                      <Select value={paymentBankAccountId} onValueChange={setPaymentBankAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts?.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.account_name} - {acc.bank_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentMethod === "cheque" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cheque Number</label>
                        <Input
                          value={paymentChequeNumber}
                          onChange={(e) => setPaymentChequeNumber(e.target.value)}
                          placeholder="Cheque number"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reference</label>
                      <Input
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Payment reference"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </Form>
      </div>
  );
});

export const APInvoiceForm = ({ open, onOpenChange, editingInvoice }: APInvoiceFormProps) => {
  const [numCopies, setNumCopies] = useState(1);
  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [copiesData, setCopiesData] = useState<SingleInvoiceData[]>([]);
  const formRefs = useRef<any[]>([]);

  const createInvoice = useCreateAPInvoice();
  const updateInvoice = useUpdateAPInvoice();
  const createPayment = useCreateAPPayment();
  const generatePayNum = useGenerateNumber();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingInvoice) {
        setNumCopies(1);
        setCopiesData([]);
      } else {
        setNumCopies(1);
        setIsLocked(true);
        setActiveTab(0);
        setCopiesData([
          {
            formValues: {
              invoice_number: "",
              vendor_bill_number: "",
              vendor_id: "",
              invoice_date: format(new Date(), "yyyy-MM-dd"),
              due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
              apply_wht: false,
              wht_rate: 5,
              wht_category: "",
              notes: "",
              business_unit_code: getBusinessUnitCode() || "",
              agent_reference: "",
            },
            lines: [{ id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 }],
            allocations: [],
            routeId: "",
            busId: "",
            schoolRouteId: ""
          }
        ]);
      }
    }
  }, [open, editingInvoice]);

  const handleNumCopiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val > 0 && val <= 20) {
      setNumCopies(val);
      setCopiesData(prev => {
        const newData = [...prev];
        const templateData = prev[activeTab] || prev[0];
        while (newData.length < val) {
          newData.push(JSON.parse(JSON.stringify(templateData)));
        }
        if (newData.length > val) {
          newData.length = val;
          if (activeTab >= val) setActiveTab(val - 1);
        }
        return newData;
      });
    }
  };

  const handleDataChange = (index: number, data: SingleInvoiceData) => {
    setCopiesData(prev => {
      const newData = [...prev];
      newData[index] = data;
      return newData;
    });
  };

  const handleSaveAll = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const validatedData = [];
      const validationCount = isLocked && numCopies > 1 ? 1 : numCopies;
      
      for (let i = 0; i < validationCount; i++) {
        const ref = formRefs.current[i];
        if (ref) {
          const data = await ref.validateAndGetData();
          if (!data) {
            toast.error(isLocked ? "Please fix the errors before saving copies" : `Please fix the errors in Copy ${i + 1}`);
            setActiveTab(i);
            setIsSubmitting(false);
            return;
          }
          validatedData.push(data);
        }
      }

      if (isLocked && numCopies > 1 && validatedData.length === 1) {
        const template = validatedData[0];
        while (validatedData.length < numCopies) {
          validatedData.push(JSON.parse(JSON.stringify(template)));
        }
      }

      let successCount = 0;
      for (let i = 0; i < validatedData.length; i++) {
        const data = validatedData[i];
        
        const lineData = data.lines
          .filter((l: any) => l.description.trim() || l.unit_price > 0)
          .map((l: any) => ({
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            tax_amount: (l.quantity * l.unit_price * l.tax_rate) / 100,
            tax_code: l.tax_code,
            line_total: l.line_total,
            account_id: l.account_id,
          }));

        const effectiveCompanyId = getEffectiveCompanyId();
        const businessUnitCode = getBusinessUnitCode();

        if (editingInvoice) {
          await updateInvoice.mutateAsync({
            id: editingInvoice.id,
            data: {
              invoice_number: data.formValues.invoice_number,
              vendor_bill_number: data.formValues.vendor_bill_number || undefined,
              vendor_id: data.formValues.vendor_id,
              invoice_date: data.formValues.invoice_date,
              due_date: data.formValues.due_date,
              subtotal: data.subtotal,
              total_amount: data.grossTotal,
              tax_amount: data.totalTax,
              wht_amount: data.whtAmount,
              wht_category: data.formValues.wht_category || undefined,
              notes: data.formValues.notes,
              route_id: data.routeId || undefined,
              bus_id: data.busId || undefined,
              school_route_id: data.schoolRouteId || undefined,
              company_id: effectiveCompanyId,
              business_unit_code: data.formValues.business_unit_code || businessUnitCode,
              agent_reference: data.formValues.agent_reference,
            },
            lines: lineData,
          });
        } else {
          let finalInvoiceNumber = data.formValues.invoice_number;
          if (!finalInvoiceNumber) {
            finalInvoiceNumber = await generatePayNum("ap_invoice");
          }

          const validAllocations = data.allocations.filter((a: any) => a.unit_code && a.amount > 0).map((a: any) => ({ unit_code: a.unit_code, amount: a.amount }));

          await createInvoice.mutateAsync({
            invoice_number: finalInvoiceNumber,
            vendor_bill_number: data.formValues.vendor_bill_number || undefined,
            vendor_id: data.formValues.vendor_id,
            invoice_date: data.formValues.invoice_date,
            due_date: data.formValues.due_date,
            subtotal: data.subtotal,
            total_amount: data.grossTotal,
            tax_amount: data.totalTax,
            wht_amount: data.whtAmount,
            wht_category: data.formValues.wht_category || undefined,
            notes: data.formValues.notes,
            route_id: data.routeId || undefined,
            bus_id: data.busId || undefined,
            school_route_id: data.schoolRouteId || undefined,
            company_id: effectiveCompanyId,
            business_unit_code: data.formValues.business_unit_code || businessUnitCode,
            agent_reference: data.formValues.agent_reference,
            lines: lineData,
            cost_allocations: validAllocations.length > 0 ? validAllocations : undefined,
          });
        }
        successCount++;
      }
      
      toast.success(`Successfully saved ${successCount} invoice(s)`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to save invoices: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle>{editingInvoice ? "Edit AP Invoice" : "Record AP Invoice (Vendor Bill)"}</DialogTitle>
            
            {!editingInvoice && (
              <div className="flex items-center gap-6 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    Identical Copies:
                  </span>
                  <Switch 
                    checked={isLocked}
                    onCheckedChange={(checked) => {
                      setIsLocked(checked);
                      if (!checked && copiesData.length > 1 && formRefs.current[0]) {
                        // When unlocking, ensure copies have the latest data from Copy 1
                        formRefs.current[0].validateAndGetData().then((latestData: any) => {
                          if (latestData) {
                            setCopiesData(prev => {
                              const newData = [...prev];
                              for (let i = 1; i < newData.length; i++) {
                                newData[i] = JSON.parse(JSON.stringify(latestData));
                              }
                              return newData;
                            });
                          }
                        });
                      } else if (checked) {
                        // When locking, immediately switch to the first tab
                        setActiveTab(0);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Number of Copies:</span>
                  <Input 
                    type="number" 
                    min={1} 
                    max={20} 
                    value={numCopies} 
                    onChange={handleNumCopiesChange}
                    className="w-20 h-8"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
          {!editingInvoice && numCopies > 1 && !isLocked && (
            <div className="flex gap-1 mb-4 overflow-x-auto pb-2 border-b">
              {Array.from({ length: numCopies }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2",
                    activeTab === i 
                      ? "bg-background border-primary text-primary" 
                      : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  Copy {i + 1}
                </button>
              ))}
            </div>
          )}

          {editingInvoice ? (
             <SingleAPInvoiceForm 
               ref={el => formRefs.current[0] = el}
               editingInvoice={editingInvoice}
               isActive={true}
               open={open}
             />
          ) : (
            copiesData.slice(0, isLocked ? 1 : copiesData.length).map((data, i) => (
              <SingleAPInvoiceForm 
                key={i}
                ref={el => formRefs.current[i] = el}
                initialData={data}
                isActive={isLocked ? true : activeTab === i}
                open={open}
                onDataChange={(newData) => handleDataChange(i, newData)}
              />
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center"><Check className="h-4 w-4 mr-2 animate-spin" /> Saving...</span>
            ) : (
              <span className="flex items-center"><Check className="h-4 w-4 mr-2" /> Save {numCopies > 1 ? `All (${numCopies})` : 'Invoice'}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
