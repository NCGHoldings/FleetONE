import React, { useEffect, useState, useMemo } from "react";
import { MasterExpenseImport, MasterExpenseRecord } from "@/hooks/useMasterExpenses";
import { supabase } from "@/integrations/supabase/client";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Search, Wand2, FileSpreadsheet, MapPin, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { SearchableSelect } from "@/components/accounting/expenses/SearchableSelect";
import { toast } from "sonner";
import { useChartOfAccounts } from "@/hooks/useAccountingData";
import { useCreateJournalEntry, usePostJournalEntry, useCreateAPInvoice, useCreateAPPayment } from "@/hooks/useAccountingMutations";
import { useCompany } from "@/contexts/CompanyContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useVendors, useCustomers } from "@/hooks/useAccountingData";
import { 
  Building2, 
  User, 
  Receipt, 
  CreditCard, 
  ArrowRightLeft, 
  FileText,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

interface Props {
  importData: MasterExpenseImport;
}

export function ExpenseMappingGrid({ importData }: Props) {
  const [records, setRecords] = useState<MasterExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Accounting mapping hooks
  const { data: accounts } = useChartOfAccounts();
  const createJournal = useCreateJournalEntry();
  const createAPInvoice = useCreateAPInvoice();
  const createAPPayment = useCreateAPPayment();
  const postJournal = usePostJournalEntry();
  const { selectedCompanyId, currentCompany } = useCompany();
  
  // Memoized Account Options
  const expenseOptions = useMemo(() => {
    return (accounts || [])
      .filter(a => a.account_type === "expense" || a.account_type === "cost_of_goods_sold")
      .map(a => ({ value: a.id, label: `${a.account_code || ""} - ${a.account_name}`.replace(/^ - /, "") }));
  }, [accounts]);

  const paymentOptions = useMemo(() => {
    return (accounts || [])
      .filter(a => a.account_type === "asset" || a.account_type === "liability" || a.account_type === "equity")
      .map(a => ({ value: a.id, label: `${a.account_code || ""} - ${a.account_name}`.replace(/^ - /, "") }));
  }, [accounts]);

  const apAccounts = useMemo(() => {
    return (accounts || [])
      .filter(a => a.account_type === "liability" && a.account_name.toLowerCase().includes("payable"))
      .map(a => ({ value: a.id, label: `${a.account_code || ""} - ${a.account_name}`.replace(/^ - /, "") }));
  }, [accounts]);

  const arAccounts = useMemo(() => {
    return (accounts || [])
      .filter(a => a.account_type === "asset" && a.account_name.toLowerCase().includes("receivable"))
      .map(a => ({ value: a.id, label: `${a.account_code || ""} - ${a.account_name}`.replace(/^ - /, "") }));
  }, [accounts]);

  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();

  const vendorOptions = useMemo(() => {
    return (vendors || []).map(v => ({ value: v.id, label: v.vendor_name }));
  }, [vendors]);

  const customerOptions = useMemo(() => {
    return (customers || []).map(c => ({ value: c.id, label: c.customer_name }));
  }, [customers]);
  
  // Mapping options
  const [vehicles, setVehicles] = useState<{id: string, bus_no: string}[]>([]);
  const [quotations, setQuotations] = useState<{id: string, quotation_no: string, pickup_datetime: string, drop_datetime: string, customer_name?: string}[]>([]);
  
  const [isAutoSuggesting, setIsAutoSuggesting] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const [bulkExpenseAccountId, setBulkExpenseAccountId] = useState<string>("");
  const [bulkPaymentAccountId, setBulkPaymentAccountId] = useState<string>("");

  // Move hooks above early returns!
  const vehicleOptions = useMemo(() => vehicles.map(v => ({ value: v.id, label: v.bus_no })), [vehicles]);
  const quotationOptions = useMemo(() => quotations.map(q => {
    const custName = (q as any).customer_name || "No Customer";
    const start = q.pickup_datetime ? format(new Date(q.pickup_datetime), "MMM d") : "";
    const end = q.drop_datetime ? format(new Date(q.drop_datetime), "MMM d") : "";
    return { 
      value: q.id, 
      label: `${q.quotation_no} - ${custName} (${start} - ${end})` 
    };
  }), [quotations]);

  // Global search filter
  const [searchTerm, setSearchTerm] = useState("");
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const q = searchTerm.toLowerCase();
    return records.filter(r => {
      const raw = JSON.stringify(r.raw_data).toLowerCase();
      const amt = String(r.amount);
      const date = r.expense_date || "";
      return raw.includes(q) || amt.includes(q) || date.includes(q);
    });
  }, [records, searchTerm]);

  useEffect(() => {
    loadData();
    if (importData.sector === "Special Hire") {
      fetchMappingDictionaries();
    }
  }, [importData.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("master_expense_records")
        .select("*")
        .eq("import_id", importData.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      const loaded = (data || []) as MasterExpenseRecord[];
      console.log(`[MasterExpenses] Loaded ${loaded.length} records for import ${importData.id}`);
      setRecords(loaded);
    } catch (e: any) {
      console.error("[MasterExpenses] Failed to load records:", e);
      toast.error("Failed to load records", { description: e?.message || "Unknown error" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRecordInDb = async (recordId: string, updates: any) => {
    const { error } = await (supabase as any)
      .from("master_expense_records")
      .update(updates)
      .eq("id", recordId);
    if (error) throw error;
  };

  const fetchMappingDictionaries = async () => {
    // Fetch buses
    const { data: bData } = await supabase.from("buses").select("id, bus_no");
    if (bData) setVehicles(bData);
    
    // Fetch ALL Special Hire quotations (paginated to bypass PostgREST 1000-row default)
    // Each record is ~200 bytes, so even 5000 records = ~1MB — well within limits
    let allQuotations: typeof quotations = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data: qData, error } = await supabase
        .from("special_hire_quotations")
        .select("id, quotation_no, pickup_datetime, drop_datetime, customer_name")
        .order("created_at", { ascending: false })
        .range(from, to);
        
      if (error) {
        console.error("Failed to load quotations page:", error);
        break;
      }
      
      if (qData && qData.length > 0) {
        allQuotations = [...allQuotations, ...qData];
        hasMore = qData.length === PAGE_SIZE; // More pages if we hit the limit
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`[MasterExpenses] Loaded ${allQuotations.length} quotations for mapping`);
    setQuotations(allQuotations as any);
  };

  const runAutoSuggest = async () => {
    setIsAutoSuggesting(true);
    let mappedCount = 0;
    
    try {
      const newRecords = [...records];
      
      for (let i = 0; i < newRecords.length; i++) {
        const record = newRecords[i];
        if (record.is_confirmed) continue; 
        
        let updates: Partial<MasterExpenseRecord> = {};
        
        if (importData.expense_type === "Fuel" && record.raw_data["Card_ID"]) {
           const cardStr = String(record.raw_data["Card_ID"]).toUpperCase();
           const matchedBus = vehicles.find(v => cardStr.includes(v.bus_no.toUpperCase().replace(/\s/g, "")));
           if (matchedBus) {
             updates.mapped_vehicle_id = matchedBus.id;
             newRecords[i].buses = { bus_no: matchedBus.bus_no };
           }
        }
        
        if (importData.expense_type === "Fuel" && record.expense_date) {
           const expDate = new Date(record.expense_date).getTime();
           
           const matchedQuotation = quotations.find(q => {
             const start = new Date(q.pickup_datetime).getTime() - (86400 * 1000); 
             const end = new Date(q.drop_datetime).getTime() + (86400 * 1000);   
             return expDate >= start && expDate <= end;
           });
           
           if (matchedQuotation) {
             updates.mapped_quotation_id = matchedQuotation.id;
             newRecords[i].special_hire_quotations = { quotation_no: matchedQuotation.quotation_no, customer_id: "" };
           }
        }
        
        if (Object.keys(updates).length > 0) {
          await updateRecordInDb(record.id, updates);
          newRecords[i] = { ...newRecords[i], ...updates };
          mappedCount++;
        }
      }
      
      setRecords(newRecords);
      toast.success(`Auto-suggest completed. Mapped ${mappedCount} records.`);
    } catch (e: any) {
      toast.error("Auto-suggest failed", { description: e.message });
    } finally {
      setIsAutoSuggesting(false);
    }
  };

  const handleConfirmRecord = async (record: MasterExpenseRecord) => {
    try {
      await updateRecordInDb(record.id, { is_confirmed: true });
      setRecords(records.map(r => r.id === record.id ? { ...r, is_confirmed: true } : r));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
      toast.success("Record mapping confirmed.");
    } catch (e: any) {
      toast.error("Failed to confirm", { description: e.message });
    }
  };
  
  const handleManualMapping = async (recordId: string, field: string, value: string | null) => {
     try {
       await updateRecordInDb(recordId, { [field]: value });
       setRecords(records.map(r => {
         if (r.id === recordId) {
            const upd = { ...r, [field]: value };
            if (field === "mapped_vehicle_id") upd.buses = value ? { bus_no: vehicles.find(v => v.id === value)?.bus_no || "" } : undefined;
            if (field === "mapped_quotation_id") upd.special_hire_quotations = value ? { quotation_no: quotations.find(q => q.id === value)?.quotation_no || "", customer_id: "" } : undefined;
            return upd;
         }
         return r;
       }));
     } catch (e: any) {
       toast.error("Update failed", { description: e.message });
     }
  };

  const postSingleToGL = async (record: MasterExpenseRecord) => {
    const category = importData.import_category || "Expense";
    
    let drAccountId: string | undefined;
    let crAccountId: string | undefined;
    let description = "";

    // Smart Routing: If a vendor is mapped, force AP Invoice flow (unless explicitly an AP Payment)
    const isAPInvoiceFlow = category === "AP_Invoice" || (record.mapped_vendor_id && category !== "AP_Payment");

    if (isAPInvoiceFlow) {
      drAccountId = record.mapped_expense_account_id || undefined;
      description = `AP Invoice: ${record.vendor_name || record.raw_data["Vendor"] || "Unknown"} - ${record.document_number || "Import"}`;
      
      if (!drAccountId || !record.mapped_vendor_id) {
        throw new Error(`Missing Expense Account or Vendor for AP Invoice`);
      }

      const invoiceNumber = record.document_number || `INV-${record.id.substring(0, 8).toUpperCase()}`;

      await createAPInvoice.mutateAsync({
        invoice_number: invoiceNumber,
        vendor_id: record.mapped_vendor_id,
        invoice_date: record.expense_date || new Date().toISOString().split('T')[0],
        due_date: record.expense_date || new Date().toISOString().split('T')[0],
        total_amount: record.amount,
        notes: description,
        lines: [
          {
            description: description,
            quantity: 1,
            unit_price: record.amount,
            line_total: record.amount,
            account_id: drAccountId,
            cost_center_id: record.mapped_vehicle_id || undefined
          }
        ]
      });

      // We still need to mark the record as confirmed. There is no gl_journal_id for AP Invoices at this step.
      await updateRecordInDb(record.id, { 
        is_confirmed: true
      });

      return "AP-INVOICE";
    } else if (category === "AP_Payment") {
      crAccountId = record.mapped_payment_account_id || undefined; // Bank/Cash selected in payment column
      description = `AP Payment: ${record.vendor_name || record.raw_data["Vendor"] || "Unknown"} - ${record.document_number || "Import"}`;
      
      if (!crAccountId || !record.mapped_vendor_id) {
        throw new Error(`Missing Bank/Cash Account or Vendor for AP Payment`);
      }

      await createAPPayment.mutateAsync({
        payment_number: record.document_number || `PMT-${record.id.substring(0, 8).toUpperCase()}`,
        vendor_id: record.mapped_vendor_id,
        payment_date: record.expense_date || new Date().toISOString().split('T')[0],
        amount: record.amount,
        payment_method: "bank_transfer",
        bank_account_id: crAccountId,
        notes: description,
        is_direct_payment: true
      });

      await updateRecordInDb(record.id, { 
        is_confirmed: true
      });

      return "AP-PAYMENT";
    } else {
      // Default Expense flow (Journal Entry)
      drAccountId = record.mapped_expense_account_id || undefined;
      crAccountId = record.mapped_payment_account_id || undefined;
      description = `Expense Import: ${importData.expense_type} - ${record.raw_data["TRIP ID"] || record.raw_data["TRNX_ID"] || "Generic"}`;
    }

    if (!drAccountId || !crAccountId) {
      throw new Error(`Missing Account Mappings for ${category}`);
    }

    const journalEntry = await createJournal.mutateAsync({
      entry_number: `${category.substring(0, 3).toUpperCase()}-${record.id.substring(0, 8).toUpperCase()}`,
      entry_date: record.expense_date || new Date().toISOString().split('T')[0],
      description: description,
      company_id: selectedCompanyId,
      source_module: category.toLowerCase(),
      total_debit: record.amount,
      total_credit: record.amount,
      lines: [
        {
          account_id: drAccountId,
          debit_amount: record.amount,
          credit_amount: 0,
          description: description,
          cost_center_id: record.mapped_vehicle_id || undefined
        },
        {
          account_id: crAccountId,
          debit_amount: 0,
          credit_amount: record.amount,
          description: description,
          cost_center_id: record.mapped_vehicle_id || undefined
        }
      ]
    });

    if (journalEntry?.id) {
      await postJournal.mutateAsync(journalEntry.id);
      await updateRecordInDb(record.id, { 
        is_confirmed: true,
        gl_journal_id: journalEntry.id 
      });
      return journalEntry.id;
    }
    throw new Error("Failed to create Journal Entry");
  };

  const handlePostToGL = async (record: MasterExpenseRecord) => {
    try {
      const gl_journal_id = await postSingleToGL(record);
      setRecords(records.map(r => r.id === record.id ? { ...r, is_confirmed: true, gl_journal_id } : r));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
      toast.success("Expense successfully posted to General Ledger");
    } catch (e: any) {
      toast.error("Failed to post to GL", { description: e.message });
    }
  };

  // Bulk Operations
  const [bulkVendorId, setBulkVendorId] = useState<string>("");
  const [bulkCustomerId, setBulkCustomerId] = useState<string>("");
  const [bulkVehicleId, setBulkVehicleId] = useState<string>("");

  const handleApplyBulkMapping = async () => {
    if (!bulkExpenseAccountId && !bulkPaymentAccountId && !bulkVendorId && !bulkCustomerId && !bulkVehicleId) return;
    
    let successCount = 0;
    try {
      const updates: any = {};
      if (bulkExpenseAccountId) updates.mapped_expense_account_id = bulkExpenseAccountId;
      if (bulkPaymentAccountId) updates.mapped_payment_account_id = bulkPaymentAccountId;
      if (bulkVendorId) updates.mapped_vendor_id = bulkVendorId;
      if (bulkCustomerId) updates.mapped_customer_id = bulkCustomerId;
      if (bulkVehicleId) updates.mapped_vehicle_id = bulkVehicleId;

      const targetRecords = records.filter(r => selectedIds.has(r.id) && !r.is_confirmed);
      
      for (const record of targetRecords) {
        await updateRecordInDb(record.id, updates);
        successCount++;
      }
      
      setRecords(records.map(r => {
        if (selectedIds.has(r.id) && !r.is_confirmed) {
          return { ...r, ...updates };
        }
        return r;
      }));
      
      toast.success(`Applied mapping to ${successCount} records.`);
      setBulkExpenseAccountId("");
      setBulkPaymentAccountId("");
      setBulkVendorId("");
      setBulkCustomerId("");
    } catch (e: any) {
      toast.error("Failed to apply bulk mapping", { description: e.message });
    }
  };

  const handleBulkConfirm = async () => {
    setIsBulkProcessing(true);
    let successCount = 0;
    const errors: string[] = [];
    
    try {
      const targetRecords = records.filter(r => selectedIds.has(r.id) && !r.is_confirmed);
      
      for (const record of targetRecords) {
        if (!record.mapped_quotation_id || !record.mapped_vehicle_id) {
          errors.push(`Record ${record.id} is missing mapping`);
          continue;
        }
        
        try {
          await updateRecordInDb(record.id, { is_confirmed: true });
          successCount++;
        } catch (e: any) {
          errors.push(`Record ${record.id}: ${e.message}`);
        }
      }
      
      // Refresh local state for successful ones
      setRecords(records.map(r => {
        if (selectedIds.has(r.id) && r.mapped_quotation_id && r.mapped_vehicle_id) {
          return { ...r, is_confirmed: true };
        }
        return r;
      }));
      
      setSelectedIds(new Set());
      
      if (successCount > 0) {
        toast.success(`Successfully confirmed ${successCount} records.`);
      }
      if (errors.length > 0) {
        toast.error(`Failed to confirm ${errors.length} records. Check missing mappings.`);
      }
      
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkPostToGL = async () => {
    setIsBulkProcessing(true);
    let successCount = 0;
    const errors: string[] = [];
    
    try {
      const targetRecords = records.filter(r => selectedIds.has(r.id) && !r.is_confirmed);
      const newRecords = [...records];
      
      for (const record of targetRecords) {
        try {
          const gl_journal_id = await postSingleToGL(record);
          const index = newRecords.findIndex(r => r.id === record.id);
          if (index !== -1) {
             newRecords[index] = { ...newRecords[index], is_confirmed: true, gl_journal_id };
          }
          successCount++;
        } catch (e: any) {
          errors.push(`Failed for record ${record.id.substring(0, 8)}: ${e.message}`);
        }
      }
      
      setRecords(newRecords);
      setSelectedIds(new Set());
      
      if (successCount > 0) {
        toast.success(`Successfully posted ${successCount} records to GL.`);
      }
      if (errors.length > 0) {
        toast.error(`Failed to post ${errors.length} records. Ensure all accounts are mapped.`);
      }
      
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const toggleAllSelection = () => {
    const processableRecords = filteredRecords.filter(r => !r.is_confirmed);
    if (selectedIds.size === processableRecords.length && processableRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processableRecords.map(r => r.id)));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground flex-1 flex items-center justify-center">Loading records...</div>;
  }

  const isSpecialHire = importData.sector === "Special Hire";
  const isSchoolBus = importData.sector === "School Bus";
  const unconfirmedCount = records.filter(r => !r.is_confirmed).length;
  const processableFiltered = filteredRecords.filter(r => !r.is_confirmed);

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="py-4 border-b flex flex-row items-center justify-between bg-muted/10 shrink-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {importData.file_name}
          </CardTitle>
          <CardDescription className="flex gap-2 items-center mt-1">
             <Badge variant="outline">{importData.sector}</Badge>
             <Badge variant="outline">{importData.expense_type}</Badge>
             <span>|</span>
             <span>Uploaded on {format(new Date(importData.upload_date), "MMM d, yyyy")}</span>
             <span>|</span>
             <span>{unconfirmedCount} Pending</span>
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button 
              onClick={handleBulkPostToGL} 
              disabled={isBulkProcessing || createJournal.isPending || postJournal.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Bulk Post to GL ({selectedIds.size})
            </Button>
          )}

          {(isSpecialHire || isSchoolBus) && (
             <Button 
               variant="secondary" 
               onClick={runAutoSuggest} 
               disabled={isAutoSuggesting || unconfirmedCount === 0}
               className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
             >
               <Wand2 className="h-4 w-4 mr-2" />
               {isAutoSuggesting ? "Analyzing..." : "Auto-Suggest Mapping"}
             </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-auto">
        <div className="p-3 border-b bg-muted/10 sticky top-0 z-20 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-1/3 shrink-0">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all columns..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-white w-full"
            />
          </div>
          
          {!isSpecialHire && selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto bg-blue-50/50 p-2 rounded-md border border-blue-100">
              <span className="text-xs font-medium text-blue-800 whitespace-nowrap pl-2">Bulk Map ({selectedIds.size}):</span>
              
              {(isSchoolBus || isSpecialHire) && (
                <div className="w-[180px]">
                  <SearchableSelect
                    options={vehicleOptions}
                    value={bulkVehicleId || "none"}
                    onValueChange={(val) => setBulkVehicleId(val === "none" ? "" : val)}
                    placeholder="Map Vehicle..."
                    searchPlaceholder="Search bus number..."
                    triggerClassName="h-8 text-xs bg-white"
                  />
                </div>
              )}
              
              {(importData.import_category === "AP_Invoice" || importData.import_category === "AP_Payment" || isSpecialHire || isSchoolBus) && (
                <div className="w-[180px]">
                  <SearchableSelect
                    options={vendorOptions}
                    value={bulkVendorId || "none"}
                    onValueChange={(val) => setBulkVendorId(val === "none" ? "" : val)}
                    placeholder="Select Vendor..."
                    searchPlaceholder="Search vendors..."
                    triggerClassName="h-8 text-xs bg-white"
                  />
                </div>
              )}

              <div className="w-[180px]">
                <SearchableSelect
                  options={importData.import_category === "AP_Payment" ? apAccounts : expenseOptions}
                  value={bulkExpenseAccountId || "none"}
                  onValueChange={(val) => setBulkExpenseAccountId(val === "none" ? "" : val)}
                  placeholder={importData.import_category === "AP_Payment" ? "Select AP Account..." : "Select Expense..."}
                  searchPlaceholder="Search..."
                  triggerClassName="h-8 text-xs bg-white"
                />
              </div>
              <div className="w-[180px]">
                <SearchableSelect
                  options={importData.import_category === "AP_Invoice" ? apAccounts : paymentOptions}
                  value={bulkPaymentAccountId || "none"}
                  onValueChange={(val) => setBulkPaymentAccountId(val === "none" ? "" : val)}
                  placeholder={importData.import_category === "AP_Invoice" ? "Select AP Account..." : "Select Payment..."}
                  searchPlaceholder="Search..."
                  triggerClassName="h-8 text-xs bg-white"
                />
              </div>
              <Button 
                size="sm" 
                variant="default"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={handleApplyBulkMapping}
                disabled={!bulkExpenseAccountId && !bulkPaymentAccountId && !bulkVendorId && !bulkCustomerId && !bulkVehicleId}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
        <Table>
          <TableHeader className="bg-white sticky top-[52px] z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Checkbox 
                  checked={processableFiltered.length > 0 && selectedIds.size === processableFiltered.length}
                  onCheckedChange={toggleAllSelection}
                  disabled={processableFiltered.length === 0}
                />
              </TableHead>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount (Rs)</TableHead>
              <TableHead>Raw Detail</TableHead>
              
              {(isSchoolBus || isSpecialHire) && (
                <TableHead className="w-[180px]">Vehicle Mapping</TableHead>
              )}
              {isSpecialHire && (
                <TableHead className="w-[180px]">Quotation Mapping</TableHead>
              )}
              {(importData.import_category === "AP_Invoice" || importData.import_category === "AP_Payment" || isSpecialHire || isSchoolBus) && (
                <TableHead className="w-[180px]">Vendor</TableHead>
              )}
              <TableHead className="w-[180px]">
                {importData.import_category === "AP_Payment" ? "AP Account" : "Expense Account"}
              </TableHead>
              <TableHead className="w-[180px]">
                {importData.import_category === "AP_Invoice" ? "AP Account" : "Payment Mode"}
              </TableHead>
              <TableHead className="w-[120px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSpecialHire ? 8 : 5} className="text-center py-12 text-muted-foreground">
                  No records found for this import. The records may not have been saved during upload. Try re-uploading the file.
                </TableCell>
              </TableRow>
            ) : filteredRecords.map((r, idx) => {
              let rawSummary = "";
              if (importData.expense_type === "Fuel") {
                rawSummary = `${r.raw_data["TRNX_ID"] || ''} | ${r.raw_data["Card_ID"] || ''} | ${r.raw_data["Stn_Name"] || ''}`;
              } else if (importData.expense_type === "PickMe") {
                rawSummary = `Trip ${r.raw_data["TRIP ID"] || ''} | ${r.raw_data["PASSENGER NAME"] || ''}`;
              } else {
                rawSummary = JSON.stringify(r.raw_data).substring(0, 50) + "...";
              }

              return (
                <TableRow key={r.id} className={r.is_confirmed ? "bg-green-50/50" : (selectedIds.has(r.id) ? "bg-blue-50/30" : "")}>
                  <TableCell className="text-center">
                    {!r.is_confirmed && (
                      <Checkbox 
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={() => toggleSelection(r.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{r.expense_date ? format(new Date(r.expense_date), "MMM d, yyyy") : "-"}</TableCell>
                  <TableCell className="font-mono">{r.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate block max-w-[250px]" title={rawSummary}>
                      {rawSummary}
                    </span>
                  </TableCell>
                  
                  {(isSchoolBus || isSpecialHire) && (
                    <TableCell>
                       <SearchableSelect
                         options={vehicleOptions}
                         value={r.mapped_vehicle_id || "none"}
                         onValueChange={(val) => handleManualMapping(r.id, "mapped_vehicle_id", val === "none" ? null : val)}
                         disabled={r.is_confirmed}
                         placeholder="Map Vehicle..."
                         searchPlaceholder="Search bus number..."
                         emptyLabel="None"
                       />
                    </TableCell>
                  )}
                  {isSpecialHire && (
                    <TableCell>
                       <SearchableSelect
                         options={quotationOptions}
                         value={r.mapped_quotation_id || "none"}
                         onValueChange={(val) => handleManualMapping(r.id, "mapped_quotation_id", val === "none" ? null : val)}
                         disabled={r.is_confirmed}
                         placeholder="Map Quotation..."
                         searchPlaceholder="Search quotation no..."
                         emptyLabel="None"
                       />
                    </TableCell>
                  )}
                  {(importData.import_category === "AP_Invoice" || importData.import_category === "AP_Payment" || isSpecialHire || isSchoolBus) && (
                    <TableCell>
                       <SearchableSelect
                         options={vendorOptions}
                         value={r.mapped_vendor_id || "none"}
                         onValueChange={(val) => handleManualMapping(r.id, "mapped_vendor_id", val === "none" ? null : val)}
                         disabled={r.is_confirmed}
                         placeholder="Select Vendor..."
                         searchPlaceholder="Search vendors..."
                         emptyLabel="None"
                       />
                    </TableCell>
                  )}
                  <TableCell>
                     <SearchableSelect
                       options={importData.import_category === "AP_Payment" ? apAccounts : expenseOptions}
                       value={r.mapped_expense_account_id || "none"}
                       onValueChange={(val) => handleManualMapping(r.id, "mapped_expense_account_id", val === "none" ? null : val)}
                       disabled={r.is_confirmed || createJournal.isPending || postJournal.isPending}
                       placeholder="Select Account..."
                       searchPlaceholder="Search account..."
                       emptyLabel="None"
                     />
                  </TableCell>
                  <TableCell>
                     <SearchableSelect
                       options={importData.import_category === "AP_Invoice" ? apAccounts : paymentOptions}
                       value={r.mapped_payment_account_id || "none"}
                       onValueChange={(val) => handleManualMapping(r.id, "mapped_payment_account_id", val === "none" ? null : val)}
                       disabled={r.is_confirmed || createJournal.isPending || postJournal.isPending}
                       placeholder="Select Account..."
                       searchPlaceholder="Search account..."
                       emptyLabel="None"
                     />
                  </TableCell>
                  <TableCell className="text-right">
                     {r.is_confirmed ? (
                       <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200" title={`Posted: ${r.gl_journal_id || 'AP Module'}`}>
                         <CheckCircle2 className="h-3 w-3 mr-1" /> Posted
                       </Badge>
                     ) : (
                       <Button 
                         size="sm" 
                         variant="outline"
                         className="h-8 text-xs bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                         onClick={() => handlePostToGL(r)}
                         disabled={createJournal.isPending || postJournal.isPending || !r.mapped_expense_account_id || (!r.mapped_payment_account_id && !r.mapped_vendor_id)}
                       >
                         Post
                       </Button>
                     )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </div>
  );
}
