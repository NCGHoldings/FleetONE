import React, { useEffect, useState, useMemo } from "react";
import { MasterExpenseImport, MasterExpenseRecord } from "@/hooks/useMasterExpenses";
import { supabase } from "@/integrations/supabase/client";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Search, Wand2, FileSpreadsheet, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { SearchableSelect } from "@/components/accounting/expenses/SearchableSelect";
import { toast } from "sonner";

interface Props {
  importData: MasterExpenseImport;
}

export function ExpenseMappingGrid({ importData }: Props) {
  const [records, setRecords] = useState<MasterExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mapping options
  const [vehicles, setVehicles] = useState<{id: string, bus_no: string}[]>([]);
  const [quotations, setQuotations] = useState<{id: string, quotation_no: string, trip_start_date: string, trip_end_date: string}[]>([]);
  
  const [isAutoSuggesting, setIsAutoSuggesting] = useState(false);

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
    
    // Fetch recent Special Hire quotations
    const { data: qData } = await supabase
      .from("special_hire_quotations")
      .select("id, quotation_no, trip_start_date, trip_end_date")
      .in("status", ["approved", "ongoing", "completed"]) // relevant statuses
      .order("created_at", { ascending: false })
      .limit(500);
      
    if (qData) setQuotations(qData);
  };

  const runAutoSuggest = async () => {
    setIsAutoSuggesting(true);
    let mappedCount = 0;
    
    try {
      // Create a copy to update local state without full reload
      const newRecords = [...records];
      
      for (let i = 0; i < newRecords.length; i++) {
        const record = newRecords[i];
        if (record.is_confirmed) continue; // Skip already confirmed
        
        let updates: Partial<MasterExpenseRecord> = {};
        
        // 1. Vehicle Auto-Suggest based on Card_ID (for Fuel)
        if (importData.expense_type === "Fuel" && record.raw_data["Card_ID"]) {
           // Heuristic: Does the Card_ID contain the bus number? (e.g., card "LIOC-NB-1234" -> Bus NB-1234)
           const cardStr = String(record.raw_data["Card_ID"]).toUpperCase();
           const matchedBus = vehicles.find(v => cardStr.includes(v.bus_no.toUpperCase().replace(/\s/g, "")));
           if (matchedBus) {
             updates.mapped_vehicle_id = matchedBus.id;
             newRecords[i].buses = { bus_no: matchedBus.bus_no };
           }
        }
        
        // 2. Quotation Auto-Suggest based on TRNX_Time and Trip Dates
        if (importData.expense_type === "Fuel" && record.expense_date) {
           const expDate = new Date(record.expense_date).getTime();
           
           // Find quotations that were active on or around this date
           const matchedQuotation = quotations.find(q => {
             const start = new Date(q.trip_start_date).getTime() - (86400 * 1000); // 1 day before
             const end = new Date(q.trip_end_date).getTime() + (86400 * 1000);   // 1 day after
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
      toast.success("Record mapping confirmed.");
    } catch (e: any) {
      toast.error("Failed to confirm", { description: e.message });
    }
  };
  
  const handleManualMapping = async (recordId: string, field: "mapped_vehicle_id" | "mapped_quotation_id", value: string) => {
     try {
       await updateRecordInDb(recordId, { [field]: value });
       // Optimistic UI update
       setRecords(records.map(r => {
         if (r.id === recordId) {
            const upd = { ...r, [field]: value };
            if (field === "mapped_vehicle_id") upd.buses = { bus_no: vehicles.find(v => v.id === value)?.bus_no || "" };
            if (field === "mapped_quotation_id") upd.special_hire_quotations = { quotation_no: quotations.find(q => q.id === value)?.quotation_no || "", customer_id: "" };
            return upd;
         }
         return r;
       }));
     } catch (e: any) {
       toast.error("Update failed", { description: e.message });
     }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground flex-1 flex items-center justify-center">Loading records...</div>;
  }

  const isSpecialHire = importData.sector === "Special Hire";

  // Build option arrays for the searchable selects
  const vehicleOptions = useMemo(() => vehicles.map(v => ({ value: v.id, label: v.bus_no })), [vehicles]);
  const quotationOptions = useMemo(() => quotations.map(q => ({ value: q.id, label: q.quotation_no })), [quotations]);

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
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-2">
          {isSpecialHire && (
             <Button 
               variant="secondary" 
               onClick={runAutoSuggest} 
               disabled={isAutoSuggesting || records.every(r => r.is_confirmed)}
               className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
             >
               <Wand2 className="h-4 w-4 mr-2" />
               {isAutoSuggesting ? "Analyzing..." : "Auto-Suggest Mapping"}
             </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-auto">
        {/* Global search bar */}
        <div className="p-3 border-b bg-muted/10 sticky top-0 z-20">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all columns..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-white sticky top-[52px] z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount (Rs)</TableHead>
              <TableHead>Raw Detail</TableHead>
              
              {isSpecialHire && (
                <>
                  <TableHead className="w-[200px]">Vehicle Mapping</TableHead>
                  <TableHead className="w-[200px]">Quotation Mapping</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSpecialHire ? 7 : 4} className="text-center py-12 text-muted-foreground">
                  No records found for this import. The records may not have been saved during upload. Try re-uploading the file.
                </TableCell>
              </TableRow>
            ) : filteredRecords.map((r, idx) => {
              // Extract primary identifier from raw data based on type
              let rawSummary = "";
              if (importData.expense_type === "Fuel") {
                rawSummary = `${r.raw_data["TRNX_ID"] || ''} | ${r.raw_data["Card_ID"] || ''} | ${r.raw_data["Stn_Name"] || ''}`;
              } else if (importData.expense_type === "PickMe") {
                rawSummary = `Trip ${r.raw_data["TRIP ID"] || ''} | ${r.raw_data["PASSENGER NAME"] || ''}`;
              } else {
                rawSummary = JSON.stringify(r.raw_data).substring(0, 50) + "...";
              }

              return (
                <TableRow key={r.id} className={r.is_confirmed ? "bg-green-50/50" : ""}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{r.expense_date ? format(new Date(r.expense_date), "MMM d, yyyy") : "-"}</TableCell>
                  <TableCell className="font-mono">{r.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate block max-w-[250px]" title={rawSummary}>
                      {rawSummary}
                    </span>
                  </TableCell>
                  
                  {isSpecialHire && (
                    <>
                      <TableCell>
                         <SearchableSelect
                           options={vehicleOptions}
                           value={r.mapped_vehicle_id || "none"}
                           onValueChange={(val) => handleManualMapping(r.id, "mapped_vehicle_id", val === "none" ? "" : val)}
                           disabled={r.is_confirmed}
                           placeholder="Map Vehicle..."
                           searchPlaceholder="Search bus number..."
                           emptyLabel="None"
                         />
                      </TableCell>
                      <TableCell>
                         <SearchableSelect
                           options={quotationOptions}
                           value={r.mapped_quotation_id || "none"}
                           onValueChange={(val) => handleManualMapping(r.id, "mapped_quotation_id", val === "none" ? "" : val)}
                           disabled={r.is_confirmed}
                           placeholder="Map Quotation..."
                           searchPlaceholder="Search quotation no..."
                           emptyLabel="None"
                         />
                      </TableCell>
                      <TableCell className="text-right">
                         {r.is_confirmed ? (
                           <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                             <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
                           </Badge>
                         ) : (
                           <Button 
                             size="sm" 
                             variant="outline"
                             className="h-8 text-xs"
                             onClick={() => handleConfirmRecord(r)}
                             disabled={!r.mapped_quotation_id || !r.mapped_vehicle_id}
                           >
                             Confirm
                           </Button>
                         )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </div>
  );
}
