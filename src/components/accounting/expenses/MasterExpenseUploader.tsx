import React, { useState } from "react";
import { read, utils } from "xlsx";
import { format } from "date-fns";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertCircle, FileJson, Table2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { MasterExpenseImport, useMasterExpenses } from "@/hooks/useMasterExpenses";
import { toast } from "sonner";
import { SmartColumnMapper } from "./SmartColumnMapper";

interface Props {
  onSuccess: (importRecord: MasterExpenseImport) => void;
}

export function MasterExpenseUploader({ onSuccess }: Props) {
  const [sector, setSector] = useState<string>("");
  const [expenseType, setExpenseType] = useState<string>("Fuel");
  const [importCategory, setImportCategory] = useState<string>("Expense");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  
  const { getEffectiveCompanyId } = useCompany();
  const companyId = getEffectiveCompanyId();
  const { uploadExpenseSheet } = useMasterExpenses();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!sector || !expenseType) {
      toast.error("Missing Info", { description: "Please select Sector and Expense Type before uploading." });
      e.target.value = '';
      return;
    }

    if (expenseType === "Master_Data") {
      setPendingFile(file);
      setShowMapper(true);
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
           amount = Number(row["TOTAL FARE"]) || 0;
           if (row["PICKUP TIME"]) {
              try {
                if (typeof row["PICKUP TIME"] === "number") {
                   const date = new Date(Math.round((row["PICKUP TIME"] - 25569) * 86400 * 1000));
                   expense_date = format(date, "yyyy-MM-dd");
                } else {
                   expense_date = format(new Date(row["PICKUP TIME"]), "yyyy-MM-dd");
                }
              } catch (err) { }
           }
        } else if (expenseType === "Fuel") {
           amount = Number(row["TRNX_Rs_Value"]) || 0;
           if (row["TRNX_Time"]) {
              try {
                if (typeof row["TRNX_Time"] === "number") {
                   const date = new Date(Math.round((row["TRNX_Time"] - 25569) * 86400 * 1000));
                   expense_date = format(date, "yyyy-MM-dd");
                } else {
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

      const result = await uploadExpenseSheet.mutateAsync({
        fileName: file.name,
        sector,
        expenseType,
        importCategory,
        records: parsedRecords
      });

      onSuccess(result as MasterExpenseImport);
    } catch (err: any) {
      toast.error("Failed to parse file", { description: err.message });
      console.error(err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleMappingComplete = async (mappings: any[], mappedData: any[]) => {
    if (!pendingFile) return;
    
    setIsProcessing(true);
    try {
      const result = await uploadExpenseSheet.mutateAsync({
        fileName: pendingFile.name,
        sector,
        expenseType,
        importCategory,
        mappingConfig: mappings,
        records: mappedData
      });

      setShowMapper(false);
      setPendingFile(null);
      onSuccess(result as MasterExpenseImport);
    } catch (err: any) {
      toast.error("Failed to upload data");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const sectors = ["Special Hire", "Yutong", "Sinotruck", "Light Vehicle", "NCG Holding", "NCG Express"];

  if (showMapper && pendingFile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <SmartColumnMapper 
          file={pendingFile}
          importCategory={importCategory}
          onMappingComplete={handleMappingComplete}
          onCancel={() => {
            setShowMapper(false);
            setPendingFile(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
       <div className="max-w-xl w-full space-y-8">
         <div className="text-center">
            <h2 className="text-2xl font-bold">Upload External Records</h2>
            <p className="text-muted-foreground mt-2">
              Select the target sector and upload your data sheet.
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
              <Select value={expenseType} onValueChange={(v) => {
                setExpenseType(v);
                if (v !== "Master_Data") {
                  setImportCategory("Expense");
                }
              }}>
                <SelectTrigger className="bg-white">
                   <SelectValue placeholder="Select Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fuel">Fuel (Lanka IOC / Ceypetco)</SelectItem>
                  <SelectItem value="PickMe">PickMe Corporate</SelectItem>
                  <SelectItem value="Master_Data">
                    <div className="flex items-center gap-2">
                      <Table2 className="h-4 w-4" />
                      <span>Smart Data Mapper (Dynamic)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
         </div>

         {expenseType === "Master_Data" && (
           <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
             <Label>Record Type</Label>
             <Select value={importCategory} onValueChange={setImportCategory}>
               <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select Type" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="Expense">General Expenses</SelectItem>
                 <SelectItem value="AP_Invoice">AP Invoices (Bills)</SelectItem>
                 <SelectItem value="AP_Payment">AP Payments (Vouchers)</SelectItem>
                 <SelectItem value="Master_Data">Other Master Data</SelectItem>
               </SelectContent>
             </Select>
           </div>
         )}

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
                    {isProcessing ? "Processing..." : "Click or Drag Excel File Here"}
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
              <strong>Dynamic Pipeline:</strong> The Smart Data Mapper allows you to upload any Excel layout. You'll be able to map your columns (e.g. "Bill Date", "Vendor") directly to ERP fields in the next step.
            </div>
         </div>
       </div>
    </div>
  );
}
