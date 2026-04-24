import React, { useState } from "react";
import { read, utils } from "xlsx";
import { format } from "date-fns";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { MasterExpenseImport } from "@/hooks/useMasterExpenses";
import { toast } from "sonner";

interface Props {
  onSuccess: (importRecord: MasterExpenseImport) => void;
}

export function MasterExpenseUploader({ onSuccess }: Props) {
  const [sector, setSector] = useState<string>("");
  const [expenseType, setExpenseType] = useState<string>("Fuel");
  const [isProcessing, setIsProcessing] = useState(false);
  const { getEffectiveCompanyId } = useCompany();
  const companyId = getEffectiveCompanyId();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!sector || !expenseType) {
      toast.error("Missing Info", { description: "Please select Sector and Expense Type before uploading." });
      e.target.value = '';
      return;
    }

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(sheet, { defval: "" });

      if (jsonData.length === 0) {
        throw new Error("The uploaded Excel file is empty.");
      }

      const parsedRecords = jsonData.map((row: any) => {
        let amount = 0;
        let expense_date = format(new Date(), "yyyy-MM-dd");

        if (expenseType === "PickMe") {
           // PickMe format: TOTAL FARE, PICKUP TIME
           amount = Number(row["TOTAL FARE"]) || 0;
           if (row["PICKUP TIME"]) {
              try {
                // Assuming format like "2026-04-24 10:00:00" or Excel serial
                if (typeof row["PICKUP TIME"] === "number") {
                   const date = new Date(Math.round((row["PICKUP TIME"] - 25569) * 86400 * 1000));
                   expense_date = format(date, "yyyy-MM-dd");
                } else {
                   expense_date = format(new Date(row["PICKUP TIME"]), "yyyy-MM-dd");
                }
              } catch (err) { }
           }
        } else if (expenseType === "Fuel") {
           // Fuel format: TRNX_Rs_Value, TRNX_Time
           amount = Number(row["TRNX_Rs_Value"]) || 0;
           if (row["TRNX_Time"]) {
              try {
                if (typeof row["TRNX_Time"] === "number") {
                   const date = new Date(Math.round((row["TRNX_Time"] - 25569) * 86400 * 1000));
                   expense_date = format(date, "yyyy-MM-dd");
                } else {
                   // Split out the date part if it's "YYYY-MM-DD HH:mm:ss"
                   expense_date = format(new Date(row["TRNX_Time"].toString().split(" ")[0]), "yyyy-MM-dd");
                }
              } catch (err) { }
           }
        }

        return {
          raw_data: row,
          amount,
          expense_date,
          is_confirmed: false,
        };
      });

      if (!companyId) throw new Error("No active company");

      const totalAmount = parsedRecords.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

      // 1. Create import record
      const { data: importData, error: importError } = await (supabase as any)
        .from("master_expense_imports")
        .insert({
          company_id: companyId,
          file_name: file.name,
          sector,
          expense_type: expenseType,
          total_amount: totalAmount,
          status: "Pending Mapping"
        })
        .select()
        .single();

      if (importError) throw importError;

      // 2. Insert records in chunks
      const mappedRecords = parsedRecords.map((r: any) => ({
        import_id: importData.id,
        raw_data: r.raw_data,
        expense_date: r.expense_date,
        amount: r.amount || 0,
        is_confirmed: false
      }));

      const CHUNK_SIZE = 500;
      for (let i = 0; i < mappedRecords.length; i += CHUNK_SIZE) {
        const chunk = mappedRecords.slice(i, i + CHUNK_SIZE);
        const { error: chunkError } = await (supabase as any)
          .from("master_expense_records")
          .insert(chunk);
        if (chunkError) throw chunkError;
      }

      toast.success(`Uploaded ${parsedRecords.length} records successfully`);
      onSuccess(importData as MasterExpenseImport);
    } catch (err: any) {
      toast.error("Failed to parse file", { description: err.message });
      console.error(err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const sectors = ["Special Hire", "Yutong", "Sinotruck", "Light Vehicle", "NCG Holding", "NCG Express"];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
       <div className="max-w-xl w-full space-y-8">
         <div className="text-center">
            <h2 className="text-2xl font-bold">Upload External Expenses</h2>
            <p className="text-muted-foreground mt-2">
              Select the target sector and upload a PickMe or Fuel Excel sheet.
            </p>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Sector</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="bg-white">
                   <SelectValue placeholder="Select Sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Data Source (Format)</Label>
              <Select value={expenseType} onValueChange={setExpenseType}>
                <SelectTrigger className="bg-white">
                   <SelectValue placeholder="Select Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fuel">Fuel (Lanka IOC / Ceypetco)</SelectItem>
                  <SelectItem value="PickMe">PickMe Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
         </div>

         <div className="relative group mt-8">
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            />
            <div className={`flex items-center justify-center p-12 border-2 border-dashed rounded-lg bg-white transition-colors duration-200 ${isProcessing ? 'border-primary/20 bg-primary/5' : 'border-gray-300 group-hover:border-primary/50 group-hover:bg-primary/5'}`}>
               <div className="text-center pointer-events-none">
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                  ) : (
                    <FileSpreadsheet className="h-10 w-10 mx-auto text-primary/60 mb-4" />
                  )}
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {isProcessing ? "Processing Excel File..." : "Click or Drag Excel File Here"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Supports .xlsx, .xls, .csv
                  </p>
               </div>
            </div>
         </div>

         <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <strong>Intelligent Mapping:</strong> After upload, if you select <em>Special Hire</em> Fuel, the system will attempt to auto-map fuel logs to specific active Quotations and Vehicles based on the transaction date and fuel amount heuristics.
            </div>
         </div>
       </div>
    </div>
  );
}
