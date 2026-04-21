import React, { useState, useEffect } from "react";
import { ArrowLeft, Upload, ListFilter as SelectIcon, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { read, utils } from "xlsx";
import { format, parse } from "date-fns";

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
  const [directAccounts, setDirectAccounts] = useState<{id: string, account_code: string, account_name: string}[]>([]);
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<'ap' | 'iou' | 'petty_cash' | 'direct'>('ap');
  
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

  useEffect(() => {
    // Fetch branches and buses for mapping
    const initData = async () => {
      const { data: bData } = await supabase.from("school_branches").select("id, branch_name").eq("is_active", true);
      if (bData) setBranches(bData);

      const { data: busData } = await supabase.from("buses").select("id, bus_no");
      if (busData) setBuses(busData);
      
      const { data: vData } = await supabase.from("vendors").select("id, vendor_name").eq("is_active", true);
      if (vData) setVendors(vData);

      const { data: pcData } = await supabase.from("petty_cash_funds").select("id, fund_name");
      if (pcData) setPettyCashFunds(pcData);
    };
    initData();
  }, []);

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
        vendorId: paymentMethod === 'ap' ? vendorId : undefined,
        invoiceNumber: paymentMethod === 'ap' ? invoiceNumber : undefined,
        invoiceDate: paymentMethod === 'ap' ? invoiceDate : undefined,
        dueDate: paymentMethod === 'ap' ? dueDate : undefined,
        pettyCashFundId: paymentMethod === 'petty_cash' ? pettyCashFundId : undefined,
        expenses: parsedData.map(d => ({
          expenseDate: d.expenseDate,
          busId: d.busId,
          amount: d.amount,
          fuelLiters: d.fuelLiters,
          odometerEnd: d.odometerEnd,
          notes: d.notes,
          expenseType: d.expenseType,
        }))
      });
      navigate("/school-bus");
    } catch (error: any) {
      console.error(error);
      // Toast displayed inside hook
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/school-bus")}>
             <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Import Fuel Expenses</h1>
            <p className="text-muted-foreground mt-1">Upload daily bulk fuel and maintenance expenses via Excel.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 border-primary/20 bg-primary/5">
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2"><SelectIcon className="h-4 w-4"/> Import Settings</CardTitle>
               <CardDescription>Select Branch and Payment GL mapping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
               <div>
                 <CardTitle className="text-lg">Preview & Validate</CardTitle>
                 <CardDescription>Verify system matching before confirming import.</CardDescription>
               </div>
               
               <Button 
                  onClick={handleConfirmImport} 
                  disabled={isUploading || parsedData.length === 0 || !selectedBranchId || parsedData.some(d => !d.isValid)}
               >
                 {isUploading ? "Processing..." : (
                   <>
                     <CheckCircle2 className="h-4 w-4 mr-2" />
                     Confirm & Post GL
                   </>
                 )}
               </Button>
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
                          <TableHead className="text-right">Fuel Cost</TableHead>
                          <TableHead className="text-right">Liters</TableHead>
                          <TableHead className="text-right">Mileage</TableHead>
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
                            <TableCell className="text-right font-medium">Rs. {row.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{row.fuelLiters}L</TableCell>
                            <TableCell className="text-right text-muted-foreground">{row.odometerEnd ? `${row.odometerEnd} km` : '-'}</TableCell>
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
