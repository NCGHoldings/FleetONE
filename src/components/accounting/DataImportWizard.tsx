import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight, Download } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";


interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

interface ImportPreview {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

const IMPORT_TYPES = [
  { value: "customers", label: "Customers", fields: ["customer_code", "customer_name", "email", "phone", "address", "credit_limit", "payment_terms"] },
  { value: "vendors", label: "Vendors", fields: ["vendor_code", "vendor_name", "email", "phone", "address", "payment_terms", "tax_id"] },
  { value: "items", label: "Inventory Items", fields: ["item_code", "item_name", "category", "unit_of_measure", "standard_cost", "selling_price", "reorder_level"] },
  { value: "chart_of_accounts", label: "Chart of Accounts", fields: ["account_code", "account_name", "account_type", "parent_code", "is_active"] },
  { value: "journal_entries", label: "Journal Entries", fields: ["entry_date", "description", "account_code", "debit_amount", "credit_amount", "reference"] },
  { value: "bank_accounts", label: "Bank Accounts (with Opening Balances)", fields: ["account_number", "bank_name", "account_name", "currency", "opening_balance"] },
  { value: "bank_transactions", label: "Bank Transactions (Cashbook)", fields: ["account_number", "transaction_date", "description", "reference", "amount"] },
  { value: "accounts_receivable", label: "Accounts Receivable (Opening Balances)", fields: ["customer_name", "invoice_number", "invoice_date", "due_date", "amount"] },
  { value: "accounts_payable", label: "Accounts Payable (Opening Balances)", fields: ["vendor_name", "invoice_number", "invoice_date", "due_date", "amount"] },
  { value: "fleet_vehicles", label: "Fleet Vehicles", fields: ["bus_no", "chassis_no", "engine_no", "make", "model", "year", "capacity"] },
  { value: "staff_directory", label: "Staff Directory", fields: ["employee_id", "first_name", "last_name", "role", "email", "phone", "join_date"] },
];

export const DataImportWizard = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [importType, setImportType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [fullData, setFullData] = useState<any[][]>([]);
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  const selectedType = IMPORT_TYPES.find(t => t.value === importType);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error("File must contain headers and at least one data row");
        return;
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1, 6); // Preview first 5 rows
      setFullData(jsonData);

      setPreview({
        headers,
        rows,
        totalRows: jsonData.length - 1,
      });

      // Auto-map columns based on name similarity
      const autoMappings: ColumnMapping[] = headers.map(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const matchedField = selectedType?.fields.find(f => 
          f === normalizedHeader || 
          f.includes(normalizedHeader) || 
          normalizedHeader.includes(f.replace("_", ""))
        );
        return {
          sourceColumn: header,
          targetField: matchedField || "",
        };
      });
      setColumnMappings(autoMappings);

      setStep(2);
      toast.success("File parsed successfully");
    } catch (error) {
      toast.error("Failed to parse file. Please ensure it's a valid Excel or CSV file.");
    }
  }, [selectedType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev => prev.map(m => 
      m.sourceColumn === sourceColumn ? { ...m, targetField } : m
    ));
  };

  const handleStartImport = async () => {
    setStep(4);
    setImportProgress(0);
    
    let successCount = 0;
    const errors: string[] = [];

    if (["bank_accounts", "accounts_receivable", "accounts_payable", "customers", "vendors", "items", "fleet_vehicles", "staff_directory", "bank_transactions"].includes(importType)) {
       const totalRows = fullData.length - 1;
       if (!effectiveCompanyId) {
         setImportResult({ success: 0, errors: ["No company selected"]});
         return;
       }

       // Helper to find or create "Opening Balance Equity"
       const { data: equityAccounts } = await supabase.from('chart_of_accounts')
         .select('id, account_code')
         .eq('company_id', effectiveCompanyId)
         .ilike('account_name', '%Opening Balance%')
         .eq('account_type', 'equity');
       
       let equityAccountId = equityAccounts?.[0]?.id;
       if (!equityAccountId) {
          const { data: newEquity } = await supabase.from('chart_of_accounts').insert({
             company_id: effectiveCompanyId,
             account_name: 'Opening Balance Equity',
             account_code: '3999',
             account_type: 'equity',
             is_active: true,
             account_level: 5,
             current_balance: 0
          }).select().single();
          equityAccountId = newEquity?.id;
       }

       // Get Period ID
       const { data: periods } = await supabase.from('financial_periods')
          .select('id')
          .eq('company_id', effectiveCompanyId)
          .eq('status', 'open')
          .order('start_date', { ascending: false })
          .limit(1);
       const periodId = periods?.[0]?.id;

       const mapIdx = (field: string) => {
         const mapping = columnMappings.find(m => m.targetField === field);
         if (!mapping) return -1;
         return preview?.headers.indexOf(mapping.sourceColumn) ?? -1;
       };

       for (let i = 1; i < fullData.length; i++) {
         const row = fullData[i];
         try {
           if (importType === "bank_accounts") {
              const accNumIdx = mapIdx("account_number");
              const bankNameIdx = mapIdx("bank_name");
              const accNameIdx = mapIdx("account_name");
              const currIdx = mapIdx("currency");
              const obIdx = mapIdx("opening_balance");

              const ob = parseFloat(row[obIdx]) || 0;
              
              const { data: bankAcc, error: bankErr } = await supabase.from('bank_accounts').insert({
                 company_id: effectiveCompanyId,
                 business_unit_code: businessUnitCode,
                 account_number: row[accNumIdx]?.toString() || `BANK-${Date.now()}`,
                 bank_name: row[bankNameIdx] || 'Unknown Bank',
                 account_name: row[accNameIdx] || 'Bank Account',
                 currency: row[currIdx] || 'LKR',
                 opening_balance: ob,
                 current_balance: ob,
                 is_active: true
              }).select().single();

              if (bankErr) throw bankErr;

              if (ob !== 0 && periodId && bankAcc.gl_account_id && equityAccountId) {
                 const { data: je } = await supabase.from('journal_entries').insert({
                    company_id: effectiveCompanyId,
                    business_unit_code: businessUnitCode,
                    period_id: periodId,
                    entry_date: new Date().toISOString().split('T')[0],
                    entry_number: `OB-BANK-${Date.now()}-${i}`,
                    description: `Opening Balance for ${bankAcc.bank_name}`,
                    total_debit: ob > 0 ? ob : 0,
                    total_credit: ob < 0 ? Math.abs(ob) : 0,
                    status: 'posted'
                 }).select().single();

                 if (je) {
                    await supabase.from('journal_entry_lines').insert([
                       { journal_entry_id: je.id, account_id: bankAcc.gl_account_id, debit: ob > 0 ? ob : 0, credit: ob < 0 ? Math.abs(ob) : 0, company_id: effectiveCompanyId, business_unit_code: businessUnitCode },
                       { journal_entry_id: je.id, account_id: equityAccountId, debit: ob < 0 ? Math.abs(ob) : 0, credit: ob > 0 ? ob : 0, company_id: effectiveCompanyId, business_unit_code: businessUnitCode }
                    ]);
                 }
              }
           } else if (importType === "bank_transactions") {
               const accNumIdx = mapIdx("account_number");
               const dateIdx = mapIdx("transaction_date");
               const descIdx = mapIdx("description");
               const refIdx = mapIdx("reference");
               const amtIdx = mapIdx("amount");

               const accNum = row[accNumIdx]?.toString();
               if (!accNum) throw new Error("Account number is required");

               // Look up the bank account ID by account number
               const { data: bankAcc } = await supabase.from('bank_accounts')
                  .select('id')
                  .eq('company_id', effectiveCompanyId)
                  .eq('account_number', accNum)
                  .maybeSingle();
               
               if (!bankAcc) throw new Error(`Bank account not found: ${accNum}`);

               const amt = parseFloat(row[amtIdx]) || 0;
               if (amt !== 0) {
                  const { error: txnErr } = await supabase.from('bank_transactions').insert({
                     company_id: effectiveCompanyId,
                     business_unit_code: businessUnitCode,
                     bank_account_id: bankAcc.id,
                     transaction_date: row[dateIdx] || new Date().toISOString().split('T')[0],
                     transaction_type: amt > 0 ? 'deposit' : 'withdrawal',
                     description: row[descIdx] || 'Historical Transaction',
                     reference: row[refIdx]?.toString() || null,
                     cheque_number: row[refIdx]?.toString() || null,
                     debit_amount: amt < 0 ? Math.abs(amt) : 0,
                     credit_amount: amt > 0 ? amt : 0,
                     is_reconciled: false,
                     source_type: 'manual_import'
                  });

                  if (txnErr) throw txnErr;
               }
            } else if (importType === "accounts_receivable") {
              const cNameIdx = mapIdx("customer_name");
              const invNumIdx = mapIdx("invoice_number");
              const invDateIdx = mapIdx("invoice_date");
              const dueDateIdx = mapIdx("due_date");
              const amtIdx = mapIdx("amount");

              const amt = parseFloat(row[amtIdx]) || 0;
              if (amt > 0) {
                 const { data: ar, error: arErr } = await supabase.from('accounts_receivable').insert({
                    company_id: effectiveCompanyId,
                    business_unit_code: businessUnitCode,
                    customer_name: row[cNameIdx] || 'Unknown Customer',
                    invoice_number: row[invNumIdx]?.toString() || `INV-${Date.now()}-${i}`,
                    invoice_date: row[invDateIdx] || new Date().toISOString().split('T')[0],
                    due_date: row[dueDateIdx] || new Date().toISOString().split('T')[0],
                    amount: amt,
                    balance: amt,
                    received_amount: 0,
                    status: 'open'
                 }).select().single();

                 if (arErr) throw arErr;

                 const { data: arAccounts } = await supabase.from('chart_of_accounts')
                    .select('id').eq('company_id', effectiveCompanyId).ilike('account_name', '%Account%Receivable%').limit(1);
                 
                 if (arAccounts?.[0] && equityAccountId && periodId) {
                    const { data: je } = await supabase.from('journal_entries').insert({
                       company_id: effectiveCompanyId, 
                       business_unit_code: businessUnitCode,
                       period_id: periodId,
                       entry_date: ar.invoice_date, entry_number: `OB-AR-${Date.now()}-${i}`,
                       description: `Opening Balance AR - ${ar.invoice_number}`,
                       total_debit: amt, total_credit: amt, status: 'posted'
                    }).select().single();

                    if (je) {
                       await supabase.from('journal_entry_lines').insert([
                          { journal_entry_id: je.id, account_id: arAccounts[0].id, debit: amt, credit: 0, company_id: effectiveCompanyId, business_unit_code: businessUnitCode },
                          { journal_entry_id: je.id, account_id: equityAccountId, debit: 0, credit: amt, company_id: effectiveCompanyId, business_unit_code: businessUnitCode }
                       ]);
                    }
                 }
              }
           } else if (importType === "accounts_payable") {
              const vNameIdx = mapIdx("vendor_name");
              const invNumIdx = mapIdx("invoice_number");
              const invDateIdx = mapIdx("invoice_date");
              const dueDateIdx = mapIdx("due_date");
              const amtIdx = mapIdx("amount");

              const amt = parseFloat(row[amtIdx]) || 0;
              if (amt > 0) {
                 const { data: ap, error: apErr } = await supabase.from('accounts_payable').insert({
                    company_id: effectiveCompanyId,
                    business_unit_code: businessUnitCode,
                    vendor_name: row[vNameIdx] || 'Unknown Vendor',
                    invoice_number: row[invNumIdx]?.toString() || `BILL-${Date.now()}-${i}`,
                    invoice_date: row[invDateIdx] || new Date().toISOString().split('T')[0],
                    due_date: row[dueDateIdx] || new Date().toISOString().split('T')[0],
                    amount: amt,
                    balance: amt,
                    paid_amount: 0,
                    status: 'open'
                 }).select().single();

                 if (apErr) throw apErr;

                 const { data: apAccounts } = await supabase.from('chart_of_accounts')
                    .select('id').eq('company_id', effectiveCompanyId).ilike('account_name', '%Account%Payable%').limit(1);
                 
                 if (apAccounts?.[0] && equityAccountId && periodId) {
                    const { data: je } = await supabase.from('journal_entries').insert({
                       company_id: effectiveCompanyId, 
                       business_unit_code: businessUnitCode,
                       period_id: periodId,
                       entry_date: ap.invoice_date, entry_number: `OB-AP-${Date.now()}-${i}`,
                       description: `Opening Balance AP - ${ap.invoice_number}`,
                       total_debit: amt, total_credit: amt, status: 'posted'
                    }).select().single();

                    if (je) {
                       await supabase.from('journal_entry_lines').insert([
                          { journal_entry_id: je.id, account_id: equityAccountId, debit: amt, credit: 0, company_id: effectiveCompanyId, business_unit_code: businessUnitCode },
                          { journal_entry_id: je.id, account_id: apAccounts[0].id, debit: 0, credit: amt, company_id: effectiveCompanyId, business_unit_code: businessUnitCode }
                       ]);
                    }
                 }
              }
           } else if (importType === "customers") {
              const codeIdx = mapIdx("customer_code");
              const nameIdx = mapIdx("customer_name");
              const emailIdx = mapIdx("email");
              const phoneIdx = mapIdx("phone");
              const addrIdx = mapIdx("address");
              const creditIdx = mapIdx("credit_limit");
              const termsIdx = mapIdx("payment_terms");

              const { error: custErr } = await supabase.from('customers').insert({
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
                customer_code: row[codeIdx]?.toString() || `CUST-${Date.now()}-${i}`,
                customer_name: row[nameIdx] || 'Unknown Customer',
                email: row[emailIdx] || null,
                phone: row[phoneIdx] || null,
                billing_address: row[addrIdx] || null,
                credit_limit: parseFloat(row[creditIdx]) || 0,
                payment_terms: row[termsIdx] || 'Due on Receipt',
                is_active: true
              });

              if (custErr) throw custErr;
           } else if (importType === "vendors") {
              const codeIdx = mapIdx("vendor_code");
              const nameIdx = mapIdx("vendor_name");
              const emailIdx = mapIdx("email");
              const phoneIdx = mapIdx("phone");
              const addrIdx = mapIdx("address");
              const termsIdx = mapIdx("payment_terms");
              const taxIdx = mapIdx("tax_id");

              const { error: vendErr } = await supabase.from('vendors').insert({
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
                vendor_code: row[codeIdx]?.toString() || `VEND-${Date.now()}-${i}`,
                vendor_name: row[nameIdx] || 'Unknown Vendor',
                email: row[emailIdx] || null,
                phone: row[phoneIdx] || null,
                address: row[addrIdx] || null,
                payment_terms: row[termsIdx] || 'Due on Receipt',
                tax_number: row[taxIdx] || null,
                is_active: true
              });

              if (vendErr) throw vendErr;
           } else if (importType === "items") {
              const codeIdx = mapIdx("item_code");
              const nameIdx = mapIdx("item_name");
              const uomIdx = mapIdx("unit_of_measure");
              const costIdx = mapIdx("standard_cost");
              const priceIdx = mapIdx("selling_price");
              const reorderIdx = mapIdx("reorder_level");

              const { error: itemErr } = await supabase.from('inventory_items').insert({
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
                item_code: row[codeIdx]?.toString() || `ITEM-${Date.now()}-${i}`,
                item_name: row[nameIdx] || 'Unknown Item',
                unit_of_measure: row[uomIdx] || 'Nos',
                standard_cost: parseFloat(row[costIdx]) || 0,
                selling_price: parseFloat(row[priceIdx]) || 0,
                reorder_level: parseInt(row[reorderIdx]) || 0,
                is_active: true,
                type: 'inventory'
              });

              if (itemErr) throw itemErr;
           } else if (importType === "fleet_vehicles") {
              const busIdx = mapIdx("bus_no");
              const chasIdx = mapIdx("chassis_no");
              const engIdx = mapIdx("engine_no");
              const makeIdx = mapIdx("make");
              const modelIdx = mapIdx("model");
              const yearIdx = mapIdx("year");
              const capIdx = mapIdx("capacity");

              const { error: fleetErr } = await supabase.from('vehicles').insert({
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
                bus_no: row[busIdx]?.toString() || `BUS-${Date.now()}-${i}`,
                chassis_no: row[chasIdx] || null,
                engine_no: row[engIdx] || null,
                make: row[makeIdx] || 'Unknown',
                model: row[modelIdx] || 'Unknown',
                manufacture_year: parseInt(row[yearIdx]) || new Date().getFullYear(),
                capacity: parseInt(row[capIdx]) || 0,
                status: 'active'
              });

              if (fleetErr) throw fleetErr;
           } else if (importType === "staff_directory") {
              const empIdx = mapIdx("employee_id");
              const fNameIdx = mapIdx("first_name");
              const lNameIdx = mapIdx("last_name");
              const roleIdx = mapIdx("role");
              const emailIdx = mapIdx("email");
              const phoneIdx = mapIdx("phone");
              const joinIdx = mapIdx("join_date");

              const { error: staffErr } = await supabase.from('staff').insert({
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
                employee_id: row[empIdx]?.toString() || `EMP-${Date.now()}-${i}`,
                first_name: row[fNameIdx] || 'Unknown',
                last_name: row[lNameIdx] || 'Employee',
                role: row[roleIdx] || 'staff',
                email: row[emailIdx] || null,
                phone: row[phoneIdx] || null,
                join_date: row[joinIdx] || new Date().toISOString().split('T')[0],
                status: 'active'
              });

              if (staffErr) throw staffErr;
           }

           successCount++;
         } catch (err: any) {
           errors.push(`Row ${i + 1}: ${err.message || 'Import error'}`);
         }
         
         setImportProgress(Math.round(((i) / totalRows) * 100));
       }

       setImportResult({ success: successCount, errors });
       if (errors.length === 0) {
         toast.success(`Import completed: ${successCount} records imported`);
       } else {
         toast.warning(`Imported ${successCount} records with ${errors.length} errors`);
       }
       return;
    }

    // Simulate import process for others
    const totalRows = preview?.totalRows || 0;
    const totalToSimulate = totalRows;

    for (let i = 0; i < totalToSimulate; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setImportProgress(Math.round(((i + 1) / totalToSimulate) * 100));
      
      if (Math.random() < 0.05) {
        errors.push(`Row ${i + 2}: Invalid data format`);
      } else {
        successCount++;
      }
    }

    setImportResult({ success: successCount, errors });
    toast.success(`Import simulated: ${successCount} records processed`);
  };

  const handleDownloadTemplate = () => {
    if (!selectedType) return;
    
    const worksheet = XLSX.utils.aoa_to_sheet([selectedType.fields]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, `${selectedType.value}_template.xlsx`);
    toast.success("Template downloaded");
  };

  const resetWizard = () => {
    setStep(1);
    setImportType("");
    setFile(null);
    setPreview(null);
    setColumnMappings([]);
    setImportProgress(0);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Import Wizard</h2>
          <p className="text-sm text-muted-foreground">Import data from Excel or CSV files</p>
        </div>
        {step > 1 && step < 4 && (
          <Button variant="outline" onClick={resetWizard}>Start Over</Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s, idx) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= s ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground"
            }`}>
              {step > s ? <CheckCircle className="h-5 w-5" /> : s}
            </div>
            <span className={`ml-2 text-sm font-medium ${step >= s ? "" : "text-muted-foreground"}`}>
              {s === 1 && "Select Type"}
              {s === 2 && "Upload File"}
              {s === 3 && "Map Columns"}
              {s === 4 && "Import"}
            </span>
            {idx < 3 && <div className={`flex-1 h-0.5 mx-4 ${step > s ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Import Type */}
      {step === 1 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What would you like to import?</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select import type" />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {importType && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Expected columns:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedType?.fields.map(field => (
                      <Badge key={field} variant="secondary">{field}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadTemplate} variant="outline">
                    <Download className="h-4 w-4 mr-2" />Download Template
                  </Button>
                </div>
              </div>
            )}

            {importType && (
              <div className="pt-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">
                    {isDragActive ? "Drop the file here" : "Drag & drop your file here"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    or click to browse (Excel .xlsx, .xls or CSV)
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Preview Data */}
      {step === 2 && preview && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">{preview.totalRows} rows to import</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-muted">
                    {preview.headers.map((h, i) => (
                      <th key={i} className="py-2 px-3 text-left font-medium border-b">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="py-2 px-3">{cell?.toString() || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">Showing first 5 rows</p>

            <div className="flex justify-end">
              <Button onClick={() => setStep(3)}>
                Continue to Column Mapping <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {step === 3 && (
        <Card className="p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your file columns to the corresponding fields. Unmapped columns will be ignored.
            </p>

            <div className="space-y-3">
              {columnMappings.map(mapping => (
                <div key={mapping.sourceColumn} className="flex items-center gap-4">
                  <div className="w-1/3 font-medium">{mapping.sourceColumn}</div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Select 
                    value={mapping.targetField || "_ignore"} 
                    onValueChange={(v) => handleMappingChange(mapping.sourceColumn, v === "_ignore" ? "" : v)}
                  >
                    <SelectTrigger className="w-1/3">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_ignore">— Ignore —</SelectItem>
                      {selectedType?.fields.map(field => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping.targetField && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleStartImport}>
                Start Import <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Import Progress/Results */}
      {step === 4 && (
        <Card className="p-6">
          {!importResult ? (
            <div className="space-y-4 text-center">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-lg font-medium">Importing data...</p>
              <Progress value={importProgress} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold">Import Complete!</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <Card className="p-4 bg-green-50 dark:bg-green-950/20">
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                </Card>
                <Card className="p-4 bg-red-50 dark:bg-red-950/20">
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-w-lg mx-auto">
                  <Label className="text-destructive">Errors:</Label>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <Button onClick={resetWizard}>Import More Data</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
