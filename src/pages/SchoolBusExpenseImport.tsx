import React, { useState, useEffect } from "react";
import { ArrowLeft, Upload, ListFilter as SelectIcon, CheckCircle2, AlertCircle, FileSpreadsheet, Check, ChevronsUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { read, utils } from "xlsx";
import { format, parse } from "date-fns";
import { recalculateCOABalances, fixBalanceDiscrepancies } from "@/lib/gl-posting-utils";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useSchoolBusBulkExpenses, BulkBusExpense } from "@/hooks/useSchoolBusBulkExpenses";
import { useCompany } from "@/contexts/CompanyContext";

interface ParsedRow {
  "Ref."?: string;
  "Date"?: string | number;
  "Liters"?: number;
  "Fuel Cost"?: number;
  "SBU"?: string;
  "Route Code"?: string;
  "Vehicle number"?: string;
  "Mileage"?: number;
  "Bus Route"?: string;
}

interface MappedExpense extends BulkBusExpense {
  originalVehicleNumber: string;
  matchedBusNo?: string;
  routeTitle?: string;
  isValid: boolean;
}

export default function SchoolBusExpenseImport() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<{id: string, branch_name: string}[]>([]);
  const [buses, setBuses] = useState<{id: string, bus_no: string}[]>([]);
  const [vendors, setVendors] = useState<{id: string, vendor_name: string}[]>([]);
  const [pettyCashFunds, setPettyCashFunds] = useState<{id: string, fund_name: string}[]>([]);
  const [directAccounts, setDirectAccounts] = useState<{id: string, account_code: string, account_name: string, current_balance: number}[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<{id: string, account_code: string, account_name: string}[]>([]);
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<'ap' | 'iou' | 'petty_cash' | 'direct'>('ap');
  const [globalExpenseType, setGlobalExpenseType] = useState<'fuel' | 'parking' | 'highway' | 'other'>('fuel');
  const [expenseAccountId, setExpenseAccountId] = useState<string>("default");
  const [expenseAccountOpen, setExpenseAccountOpen] = useState(false);
  
  // AP specific inputs
  const [vendorId, setVendorId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  // Petty Cash inputs
  const [pettyCashFundId, setPettyCashFundId] = useState<string>("");
  
  // Direct Payment inputs
  const [directPaymentAccountId, setDirectPaymentAccountId] = useState<string>("");
  
  const [parsedData, setParsedData] = useState<MappedExpense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { mutateAsync: uploadExpenses, isPending: isUploading } = useSchoolBusBulkExpenses();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  useEffect(() => {
    // Fetch branches and buses for mapping
    const initData = async () => {
      if (!effectiveCompanyId) return;

      const { data: bData } = await supabase.from("school_branches").select("id, branch_name").eq("is_active", true);
      if (bData) setBranches(bData);

      const { data: busData } = await supabase.from("buses").select("id, bus_no");
      if (busData) setBuses(busData);

      const { data: vData } = await supabase
        .from("vendors")
        .select("id, vendor_name")
        .eq("is_active", true)
        .eq("company_id", effectiveCompanyId);
      if (vData) setVendors(vData);

      const { data: pcData } = await supabase
        .from("petty_cash_funds")
        .select("id, fund_name")
        .eq("company_id", effectiveCompanyId);
      if (pcData) setPettyCashFunds(pcData);

      // Fetch expense accounts for explicit mapping
      const { data: expData } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name")
        .eq("company_id", effectiveCompanyId)
        .eq("account_type", "expense")
        .eq("is_active", true)
        .order("account_name");
      if (expData) setExpenseAccounts(expData as any);

      // Fetch float / bank / cash asset accounts for Direct Payment — scoped to active company
      const { data: acctData } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name, current_balance")
        .eq("company_id", effectiveCompanyId)
        .eq("account_type", "asset")
        .eq("is_active", true)
        .or("account_name.ilike.%FLOAT%,account_name.ilike.%BANK%,account_name.ilike.%CASH%")
        .order("account_code");
      if (acctData) {
        setDirectAccounts(acctData as any);
        // Default to FUEL FLOAT - DIALOG TOUCH_SBS (13005002) if available in this company
        const sbsFloat = acctData.find((a: any) => a.account_code === "13005002");
        if (sbsFloat) setDirectPaymentAccountId(sbsFloat.id);
        else setDirectPaymentAccountId("");
      }
    };
    initData();
  }, [effectiveCompanyId]);

  // Auto-suggest the expense account based on type
  useEffect(() => {
    if (globalExpenseType === 'fuel' || expenseAccounts.length === 0) return;
    
    let searchWord = "other expense";
    if (globalExpenseType === 'parking') searchWord = "parking";
    if (globalExpenseType === 'highway') searchWord = "highway";
    
    // Try to find an account matching the word
    const matchedAccount = expenseAccounts.find(a => 
      a.account_name.toLowerCase().includes(searchWord)
    );
    
    if (matchedAccount) {
      setExpenseAccountId(matchedAccount.id);
    } else {
      setExpenseAccountId("default");
    }
  }, [globalExpenseType, expenseAccounts]);

  const parseExcelDate = (excelDate: string | number) => {
    if (!excelDate) return format(new Date(), "yyyy-MM-dd");
    
    // Check if it's an Excel serial number date
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000); // 25569 is diff between 1900 and 1970, +1 for leap year bug in excel. Actually usually it's (excelDate - 25569) * 86400 * 1000
      // safe fallback
      const decodedDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return isNaN(decodedDate.getTime()) ? format(new Date(), "yyyy-MM-dd") : format(decodedDate, "yyyy-MM-dd");
    }
    
    // String processing
    try {
      const d = new Date(excelDate);
      if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
    } catch(e) {}
    return format(new Date(), "yyyy-MM-dd");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to JSON (un-normalized keys)
        const rawData = utils.sheet_to_json<any>(ws);
        
        // Normalize the keys to strip any leading/trailing spaces padding the headers
        const data = rawData.map(r => {
          const nr: any = {};
          for (const k in r) {
            nr[k.trim()] = r[k];
          }
          return nr;
        });
        
        // Map to our structure
        const mapped: MappedExpense[] = data.map((row) => {
          if (globalExpenseType === 'fuel') {
            const vehicleNo = row["Vehicle number"] ? String(row["Vehicle number"]).trim() : "Unknown";
            
            // Try to exact match Bus NO ignoring spaces
            const matchedBus = buses.find(b => 
              b.bus_no.toLowerCase().replace(/\s/g, '') === vehicleNo.toLowerCase().replace(/\s/g, '')
            );

            // We'll capture route loosely if provided
            const route = String(row["Bus Route"] || row["Route Code"] || "-");

            const fuelCost = Number(row["Fuel Cost"]) || 0;
            const liters = Number(row["Liters"]) || 0;
            const mileage = Number(row["Mileage"]) || undefined;

            return {
              expenseDate: parseExcelDate(row["Date"]!),
              busId: matchedBus?.id || "",
              amount: fuelCost,
              fuelLiters: liters,
              odometerEnd: mileage,
              routeTitle: route,
              notes: row["Ref."] ? String(row["Ref."]) : undefined,
              expenseType: 'fuel',
              originalVehicleNumber: vehicleNo,
              matchedBusNo: matchedBus?.bus_no,
              isValid: !!matchedBus?.id && (fuelCost > 0),
            };
          } else {
            // Parking / Highway / Other mapping
            // Expected format: No | Bus No | Route Name | Account Name | Bank Name | Bank Acc No | Bank Branch | Amount
            const vehicleNo = row["Bus No"] ? String(row["Bus No"]).trim() : "Unknown";
            const matchedBus = buses.find(b => 
              b.bus_no.toLowerCase().replace(/\s/g, '') === vehicleNo.toLowerCase().replace(/\s/g, '')
            );
            const route = String(row["Route Name"] || "-");
            const amount = Number(row["Amount"]) || 0;

            return {
              expenseDate: format(new Date(), "yyyy-MM-dd"), // Assuming "Today" since there's no date column
              busId: matchedBus?.id || "",
              amount: amount,
              routeTitle: route,
              notes: row["No"] ? `Ref/No: ${row["No"]}` : undefined,
              expenseType: globalExpenseType,
              originalVehicleNumber: vehicleNo,
              matchedBusNo: matchedBus?.bus_no,
              isValid: !!matchedBus?.id && (amount > 0),
              accountName: row["Account Name"] ? String(row["Account Name"]) : undefined,
              bankName: row["Bank Name"] ? String(row["Bank Name"]) : undefined,
              bankAccNo: row["Bank Acc No"] ? String(row["Bank Acc No"]) : undefined,
              bankBranch: row["Bank Branch"] ? String(row["Bank Branch"]) : undefined,
            };
          }
        });

        // Filter out completely empty/invalid rows that just have 0 cost
        const validRows = mapped.filter(r => r.amount > 0 || r.originalVehicleNumber !== 'Unknown');

        setParsedData(validRows);
      } catch (error) {
        console.error("Error parsing file", error);
        toast.error("Failed to parse Excel file. Ensure columns match the required template.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBusReassign = (index: number, newBusId: string) => {
    const bus = buses.find(b => b.id === newBusId);
    if (!bus) return;
    
    setParsedData(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          busId: bus.id,
          matchedBusNo: bus.bus_no,
          isValid: item.amount > 0, // valid if bus selected and cost > 0
        };
      }
      return item;
    }));
  };

  const handleConfirmImport = async () => {
    if (!selectedBranchId) {
      toast.error("Please select a Branch (SBU).");
      return;
    }

    const invalidItems = parsedData.filter(d => !d.isValid);
    if (invalidItems.length > 0) {
      toast.error(`There are ${invalidItems.length} invalid rows. Please assign a valid Bus or ensure fuel cost > 0.`);
      return;
    }

    if (parsedData.length === 0) {
      toast.error("No data to import.");
      return;
    }

    try {
      await uploadExpenses({
        branchId: selectedBranchId,
        paymentMethod: paymentMethod,
        globalExpenseType: globalExpenseType,
        expenseAccountId: expenseAccountId === 'default' ? undefined : expenseAccountId,
        vendorId: paymentMethod === 'ap' ? vendorId : undefined,
        invoiceNumber: paymentMethod === 'ap' ? invoiceNumber : undefined,
        invoiceDate: paymentMethod === 'ap' ? invoiceDate : undefined,
        dueDate: paymentMethod === 'ap' ? dueDate : undefined,
        pettyCashFundId: paymentMethod === 'petty_cash' ? pettyCashFundId : undefined,
        directPaymentAccountId: paymentMethod === 'direct' ? directPaymentAccountId : undefined,
        expenses: parsedData.map(d => ({
          expenseDate: d.expenseDate,
          busId: d.busId,
          amount: d.amount,
          fuelLiters: d.fuelLiters,
          odometerEnd: d.odometerEnd,
          notes: d.notes,
          expenseType: d.expenseType,
          accountName: d.accountName,
          bankName: d.bankName,
          bankAccNo: d.bankAccNo,
          bankBranch: d.bankBranch,
        }))
      });
      navigate("/school-bus-service");
    } catch (error: any) {
      console.error(error);
      // Toast displayed inside hook
    }
  };

  const cleanupImports = async () => {
    try {
      toast.info("Cleaning up...", { description: "Removing corrupted imports for April 6th." });
      
      // 1. Delete AP Payments for DP-FUEL on April 6
      const { error: apError } = await supabase.from("ap_payments").delete().like("payment_number", "DP-FUEL-%").eq("payment_date", "2026-04-06");
      if (apError) throw new Error("AP Payments: " + apError.message);

      // Get the IDs of the corrupted journal entries
      const { data: jes } = await supabase.from("journal_entries").select("id").eq("source_module", "school_bus_fuel_import").eq("entry_date", "2026-04-06");
      if (jes && jes.length > 0) {
         const jeIds = jes.map(je => je.id);

         // 1.5 Delete AP Invoices created from this import
         const { error: invError } = await supabase.from("ap_invoices").delete().in("journal_entry_id", jeIds);
         if (invError) throw new Error("AP Invoices: " + invError.message);
         
         // 2. Delete Journal Entry Lines
         const { error: lineError } = await supabase.from("journal_entry_lines").delete().in("journal_entry_id", jeIds);
         if (lineError) throw new Error("JE Lines: " + lineError.message);
         
         // 2.5 Delete Journal Entries
         const { error: jeError } = await supabase.from("journal_entries").delete().in("id", jeIds);
         if (jeError) throw new Error("JE: " + jeError.message);
      }
      
      // 3. Delete Route Expenses
      const { error: routeError } = await supabase.from("route_expenses").delete().eq("expense_type", "fuel").eq("expense_date", "2026-04-06");
      if (routeError) throw new Error("Route Expenses: " + routeError.message);
      
      // 4. Delete Daily Bus Expenses
      const { error: dailyError } = await supabase.from("daily_bus_expenses").delete().eq("expense_date", "2026-04-06");
      if (dailyError) throw new Error("Daily Expenses: " + dailyError.message);

      // 5. Restore the Float Balance!
      const effectiveCompanyId = getEffectiveCompanyId("SBO");
      if (effectiveCompanyId) {
         const reconResult = await recalculateCOABalances(effectiveCompanyId);
         if (reconResult.success && reconResult.discrepancies.length > 0) {
            await fixBalanceDiscrepancies(reconResult.discrepancies);
         }
      }

      toast.success("Success!", { description: "All April 6th imports cleared. Your Float Balance has been restored to 5,000,000! Please re-upload your Excel sheet now." });
      
      // Reload after a short delay so the React Query cache refreshes and shows 5M
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e: any) {
      toast.error("Cleanup Error", { description: e.message });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/school-bus")}>
               <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Import Bulk Expenses</h1>
              <p className="text-muted-foreground mt-1">Upload daily bulk fuel, parking, and maintenance expenses via Excel.</p>
            </div>
          </div>
          <Button variant="destructive" onClick={cleanupImports}>
            Fix Missing Float Deductions (Clear April 6)
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 border-primary/20 bg-primary/5">
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2"><SelectIcon className="h-4 w-4"/> Import Settings</CardTitle>
               <CardDescription>Select Type, Branch and Payment mapping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expense Type</Label>
                <Select value={globalExpenseType} onValueChange={(val: any) => setGlobalExpenseType(val)}>
                  <SelectTrigger className="bg-white">
                     <SelectValue placeholder="Select Expense Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fuel">Fuel Expenses</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="highway">Highway Tolls</SelectItem>
                    <SelectItem value="other">Other Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {globalExpenseType !== 'fuel' && (() => {
                const selectedAccount = expenseAccounts.find(a => a.id === expenseAccountId);
                
                return (
                  <div className="space-y-2">
                    <Label>Expense Account (Debit)</Label>
                    <Popover open={expenseAccountOpen} onOpenChange={setExpenseAccountOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={expenseAccountOpen}
                          className="w-full justify-between bg-white border-primary/20"
                        >
                          {expenseAccountId === 'default' 
                            ? <span className="italic">Auto-detect based on type</span>
                            : selectedAccount ? selectedAccount.account_name : "Select GL Account..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search GL account..." />
                          <CommandEmpty>No accounts found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-auto">
                            <CommandItem
                              value="default"
                              onSelect={() => {
                                setExpenseAccountId("default");
                                setExpenseAccountOpen(false);
                              }}
                              className="italic font-medium"
                            >
                              <Check className={cn("mr-2 h-4 w-4", expenseAccountId === "default" ? "opacity-100" : "opacity-0")} />
                              Auto-detect based on type
                            </CommandItem>
                            {expenseAccounts.map((a) => (
                              <CommandItem
                                key={a.id}
                                value={a.account_name}
                                onSelect={() => {
                                  setExpenseAccountId(a.id);
                                  setExpenseAccountOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    expenseAccountId === a.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {a.account_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[10px] text-muted-foreground">Search and select a specific sector or account to override.</p>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label>Branch (SBU)</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="bg-white">
                     <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Mode (Automated ERP Hit)</Label>
                <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                  <SelectTrigger className="bg-white">
                     <SelectValue placeholder="Select Mechanism" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ap">Trade Payable (AP / Credit)</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                    <SelectItem value="iou">IOU Account</SelectItem>
                    <SelectItem value="direct">Direct Payment (Fuel Float / Bank)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This will generate Journal Entries directly to the selected GL.
                </p>
              </div>

              {/* Dynamic AP Fields */}
              {paymentMethod === 'ap' && (
                <div className="space-y-4 pt-2 border-t border-primary/10">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Vendor (Supplier)</Label>
                    <Select value={vendorId} onValueChange={setVendorId}>
                      <SelectTrigger className="bg-white">
                         <SelectValue placeholder="Select Vendor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Master Invoice No.</Label>
                    <Input 
                      placeholder="e.g. INV-FUEL-2026" 
                      value={invoiceNumber} 
                      onChange={e => setInvoiceNumber(e.target.value)} 
                      className="bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Invoice Date</Label>
                      <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-white text-xs"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Due Date</Label>
                      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-white text-xs"/>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Petty Cash Fields */}
              {paymentMethod === 'petty_cash' && (
                <div className="space-y-4 pt-2 border-t border-primary/10">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Deduct from Fund</Label>
                    <Select value={pettyCashFundId} onValueChange={setPettyCashFundId}>
                      <SelectTrigger className="bg-white">
                         <SelectValue placeholder="Select Petty Cash Fund..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pettyCashFunds.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.fund_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Dynamic Direct Payment Fields */}
              {paymentMethod === 'direct' && (() => {
                const selectedAcct = directAccounts.find(a => a.id === directPaymentAccountId);
                const acctBalance = Number(selectedAcct?.current_balance || 0);
                const excelTotal = parsedData.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
                const remaining = acctBalance - excelTotal;
                const insufficient = excelTotal > 0 && remaining < 0;
                const fmt = (n: number) => `Rs ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return (
                <div className="space-y-4 pt-2 border-t border-primary/10">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Pay From Account (Asset)</Label>
                    <Select value={directPaymentAccountId} onValueChange={setDirectPaymentAccountId}>
                      <SelectTrigger className="bg-white">
                         <SelectValue placeholder="Select Float / Bank Account..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px]">
                        {directAccounts.length === 0 && (
                          <div className="p-3 text-xs text-muted-foreground">No asset accounts loaded</div>
                        )}
                        {directAccounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-mono text-xs text-muted-foreground">{a.account_code}</span>
                              <span className="flex-1">{a.account_name}</span>
                              <span className="text-xs font-semibold text-primary ml-2">{fmt(Number(a.current_balance || 0))}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      No AP invoice will be created. Journal Entry: DR Fuel Expense / CR Selected Asset.
                    </p>
                  </div>

                  {selectedAcct && (
                    <div className={`rounded-md border p-3 space-y-1.5 text-xs ${insufficient ? 'bg-destructive/10 border-destructive' : 'bg-muted/50 border-border'}`}>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Selected Account Balance:</span>
                        <span className="font-mono font-semibold">{fmt(acctBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Excel Import Total:</span>
                        <span className="font-mono font-semibold">{fmt(excelTotal)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1.5">
                        <span className="text-muted-foreground">Balance After Posting:</span>
                        <span className={`font-mono font-bold ${insufficient ? 'text-destructive' : 'text-green-600'}`}>{fmt(remaining)}</span>
                      </div>
                      {insufficient && (
                        <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-destructive/30 text-destructive">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span className="font-medium">Insufficient float balance — top up the float account before importing.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })()}
              
              <div className="space-y-2 pt-4">
                <Label>Upload Excel File</Label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Click or Drag Excel File Here"
                  />
                  <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md bg-white group-hover:bg-primary/5 transition-colors duration-200">
                     <div className="text-center pointer-events-none">
                        <FileSpreadsheet className="h-8 w-8 mx-auto text-primary mb-2" />
                        <span className="text-sm font-medium text-gray-700">Click or Drag Excel File Here</span>
                     </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
             <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
               <div className="flex flex-col gap-1">
                 <CardTitle className="text-lg flex items-center gap-2">
                   Preview & Validate {globalExpenseType === 'fuel' ? 'Fuel' : globalExpenseType.charAt(0).toUpperCase() + globalExpenseType.slice(1)} Data
                 </CardTitle>
                 <CardDescription>
                   {globalExpenseType === 'fuel' 
                     ? "Ensure columns match: Ref, Date, Liters, Fuel Cost, Route Code, Vehicle number, Mileage"
                     : "Ensure columns match: No, Bus No, Route Name, Account Name, Bank Name, Bank Acc No, Bank Branch, Amount"}
                 </CardDescription>
               </div>
               
               <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => {
                     const a = document.createElement("a");
                     if (globalExpenseType === 'fuel') {
                        a.href = "data:text/csv;charset=utf-8,Ref.,Date,Liters,Fuel Cost,SBU,Route Code,Vehicle number,Mileage,Bus Route\nREF-001,2026-04-06,50,15000,SBU1,RT-1,NB-1234,12000,Colombo";
                        a.download = "fuel_import_template.csv";
                     } else {
                        a.href = "data:text/csv;charset=utf-8,No,Bus No,Route Name,Account Name,Bank Name,Bank Acc No,Bank Branch,Amount\n01,NB-1234,Colombo,John Doe,BOC,123456789,Colombo 01,5000";
                        a.download = `${globalExpenseType}_import_template.csv`;
                     }
                     a.click();
                  }}>
                     <FileSpreadsheet className="w-4 h-4 mr-2" /> Template
                  </Button>
               
               {(() => {
                 const selectedAcct = directAccounts.find(a => a.id === directPaymentAccountId);
                 const acctBalance = Number(selectedAcct?.current_balance || 0);
                 const excelTotal = parsedData.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
                 const directInvalid = paymentMethod === 'direct' && (!directPaymentAccountId || excelTotal > acctBalance);
                 return (
                   <Button 
                      onClick={handleConfirmImport} 
                      disabled={isUploading || parsedData.length === 0 || !selectedBranchId || parsedData.some(d => !d.isValid) || directInvalid}
                   >
                     {isUploading ? "Processing..." : (
                       <>
                         <CheckCircle2 className="h-4 w-4 mr-2" />
                         Confirm & Post GL
                       </>
                     )}
                   </Button>
                 );
               })()}
               </div>
             </CardHeader>
             <CardContent className="p-0">
               {isProcessing ? (
                 <div className="p-12 text-center text-muted-foreground">Parsing Excel file...</div>
               ) : parsedData.length === 0 ? (
                 <div className="p-12 text-center">
                   <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                   <h3 className="font-semibold text-lg">No Results</h3>
                   <p className="text-sm text-muted-foreground">Upload an excel file to see preview data here.</p>
                 </div>
               ) : (
                 <div className="rounded-md border-0">
                    <Table>
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Vehicle (Excel)</TableHead>
                          <TableHead>Mapped Bus</TableHead>
                          <TableHead>Route</TableHead>
                          {globalExpenseType !== 'fuel' && <TableHead>Bank Details</TableHead>}
                          <TableHead className="text-right">{globalExpenseType === 'fuel' ? 'Fuel Cost' : 'Amount'}</TableHead>
                          {globalExpenseType === 'fuel' && <TableHead className="text-right">Liters</TableHead>}
                          {globalExpenseType === 'fuel' && <TableHead className="text-right">Mileage</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.map((row, idx) => (
                          <TableRow key={idx} className={!row.isValid ? "bg-red-50/50" : ""}>
                            <TableCell>
                              {row.isValid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{row.expenseDate}</TableCell>
                            <TableCell>{row.originalVehicleNumber}</TableCell>
                            <TableCell>
                               {row.matchedBusNo ? (
                                  <span className="text-primary font-medium">{row.matchedBusNo}</span>
                               ) : (
                                  <Select onValueChange={(val) => handleBusReassign(idx, val)}>
                                    <SelectTrigger className="h-8 max-w-[150px] border-red-300">
                                      <SelectValue placeholder="Select Bus" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {buses.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.bus_no}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                               )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.routeTitle}</TableCell>
                            {globalExpenseType !== 'fuel' && (
                              <TableCell className="text-xs">
                                <div className="font-medium">{row.bankName} - {row.bankAccNo}</div>
                                <div className="text-muted-foreground">{row.accountName} {row.bankBranch ? `(${row.bankBranch})` : ''}</div>
                              </TableCell>
                            )}
                            <TableCell className="text-right font-medium">Rs. {row.amount.toLocaleString()}</TableCell>
                            {globalExpenseType === 'fuel' && <TableCell className="text-right">{row.fuelLiters}L</TableCell>}
                            {globalExpenseType === 'fuel' && <TableCell className="text-right text-muted-foreground">{row.odometerEnd ? `${row.odometerEnd} km` : '-'}</TableCell>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                 </div>
               )}
             </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
