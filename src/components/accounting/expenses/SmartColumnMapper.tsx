import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ArrowRight, AlertCircle, HelpCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  columnIndex: number;
}

interface SmartColumnMapperProps {
  file: File;
  importCategory: string;
  onMappingComplete: (mappings: ColumnMapping[], mappedData: any[]) => void;
  onCancel: () => void;
}

const TARGET_FIELDS = [
  { value: "expense_date", label: "Posting Date", description: "The date of the transaction", required: true },
  { value: "amount", label: "Amount / Total", description: "The financial value of the record", required: true },
  { value: "document_number", label: "Document Number", description: "The system invoice or voucher number" },
  { value: "vendor_name", label: "Vendor Name", description: "Name of the supplier or service provider" },
  { value: "customer_name", label: "Customer Name", description: "Name of the client or recipient" },
  { value: "external_reference", label: "Reference / BP No.", description: "External reference or Business Partner number" },
  { value: "mapped_vehicle_id", label: "Vehicle No / Bus No", description: "The vehicle identifier for cost tracking" },
  { value: "chassis_no", label: "Chassis No", description: "Vehicle chassis number" },
  { value: "business_unit", label: "Business Unit / Sector", description: "The organizational unit (e.g., SBO, YUT)" },
  { value: "notes", label: "Remarks / Notes", description: "Additional comments or descriptions" },
];

export const SmartColumnMapper = ({ file, importCategory, onMappingComplete, onCancel }: SmartColumnMapperProps) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [fullData, setFullData] = useState<any[]>([]);

  useEffect(() => {
    const parseFile = async () => {
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast.error("File must contain headers and at least one data row");
          onCancel();
          return;
        }

        const fileHeaders = (jsonData[0] as string[]).filter(h => !!h);
        setHeaders(fileHeaders);
        setPreviewRows(jsonData.slice(1, 4));
        
        // Convert to objects for easier processing later
        const objects = XLSX.utils.sheet_to_json(worksheet);
        setFullData(objects);

        // Auto-match mappings, ensuring each field is only used once
        const usedFields = new Set<string>();
        const initialMappings: ColumnMapping[] = fileHeaders.map((header, index) => {
          const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "");
          const match = TARGET_FIELDS.find(f => {
            if (usedFields.has(f.value)) return false;
            const fieldNorm = f.label.toLowerCase().replace(/[^a-z0-9]/g, "");
            const valueNorm = f.value.toLowerCase().replace(/[^a-z0-9]/g, "");
            return normalized.includes(fieldNorm) || fieldNorm.includes(normalized) || 
                   normalized.includes(valueNorm) || valueNorm.includes(normalized);
          });
          
          if (match) usedFields.add(match.value);
          
          return {
            sourceColumn: header,
            targetField: match?.value || "",
            columnIndex: index
          };
        });
        setMappings(initialMappings);

      } catch (error) {
        console.error("Parse error:", error);
        toast.error("Failed to parse file");
        onCancel();
      }
    };

    parseFile();
  }, [file]);

  const [duplicateFields, setDuplicateFields] = useState<string[]>([]);

  useEffect(() => {
    const activeTargets = mappings.filter(m => !!m.targetField).map(m => m.targetField);
    const counts = activeTargets.reduce((acc, field) => {
      acc[field] = (acc[field] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    setDuplicateFields(Object.keys(counts).filter(f => counts[f] > 1));
  }, [mappings]);

  const handleMappingChange = (columnIndex: number, targetField: string) => {
    setMappings(prev => prev.map(m => 
      m.columnIndex === columnIndex ? { ...m, targetField } : m
    ));
  };

  const handleComplete = () => {
    // Validate required fields (at least one mapping)
    const activeMappings = mappings.filter(m => !!m.targetField);
    if (activeMappings.length === 0) {
      toast.error("Please map at least one column");
      return;
    }

    // Check for duplicate target fields
    if (duplicateFields.length > 0) {
      toast.error("Please resolve duplicate mappings before proceeding");
      return;
    }

    // Check for required system fields
    const missingRequired = TARGET_FIELDS
      .filter(f => f.required)
      .filter(f => !mappings.some(m => m.targetField === f.value));

    if (missingRequired.length > 0) {
      toast.error(`Missing required fields: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    // Map the data
    const mappedData = fullData.map(row => {
      const mappedRow: any = { raw_data: row };
      activeMappings.forEach(m => {
        let val = row[m.sourceColumn];
        
        // Normalize Dates
        if (m.targetField === 'expense_date' && val) {
          try {
            // 1. Try standard JS parsing
            let dateObj = new Date(val);
            
            // 2. If invalid, try parsing DD/MM/YY or DD/MM/YYYY (common in SL)
            if (isNaN(dateObj.getTime()) && typeof val === 'string') {
              const parts = val.split(/[-/]/);
              if (parts.length === 3) {
                const p1 = parseInt(parts[0], 10);
                const p2 = parseInt(parts[1], 10);
                let p3 = parseInt(parts[2], 10);
                
                // Assuming DD/MM/YY(YY)
                if (p1 > 0 && p1 <= 31 && p2 > 0 && p2 <= 12) {
                  if (p3 < 100) p3 += 2000; // Convert 2-digit year
                  dateObj = new Date(p3, p2 - 1, p1);
                }
              }
            }

            if (!isNaN(dateObj.getTime())) {
              // Ensure timezone offset doesn't shift the day backwards
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              val = `${year}-${month}-${day}`;
            }
          } catch (e) {
            console.error("Date normalization error:", e);
          }
        }
        
        mappedRow[m.targetField] = val;
      });
      return mappedRow;
    });

    onMappingComplete(mappings, mappedData);
  };

  const isFieldInUse = (fieldValue: string) => {
    return mappings.some(m => m.targetField === fieldValue);
  };

  const missingRequiredFields = TARGET_FIELDS
    .filter(f => f.required)
    .filter(f => !mappings.some(m => m.targetField === f.value));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Smart Column Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Map columns from <strong>{file.name}</strong> to system fields
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {importCategory.replace('_', ' ')}
        </Badge>
      </div>

      {duplicateFields.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">
              Mapping Conflict: Multiple columns are mapped to the same field. 
              Please ensure each system field is mapped only once.
            </div>
          </div>
        </Card>
      )}

      {duplicateFields.length === 0 && missingRequiredFields.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">
              Missing Required Fields: Please map columns for <strong>{missingRequiredFields.map(f => f.label).join(", ")}</strong> to continue.
            </div>
          </div>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-primary">How it works:</p>
            <p className="text-muted-foreground">
              Select the matching system field for each column in your Excel sheet. 
              We've tried to auto-match them based on header names.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted rounded-t-lg text-sm font-medium">
          <div className="col-span-5">Source Column (Excel)</div>
          <div className="col-span-1 flex justify-center">→</div>
          <div className="col-span-6">System Field</div>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
          {headers.map((header, index) => {
            const currentMapping = mappings.find(m => m.columnIndex === index);
            const previewVal = previewRows[0]?.[index]?.toString() || "—";
            const isDuplicate = currentMapping?.targetField && duplicateFields.includes(currentMapping.targetField);

            return (
              <div 
                key={`${header}-${index}`} 
                className={`grid grid-cols-12 gap-4 items-center p-3 border rounded-lg transition-all
                  ${isDuplicate ? 'border-red-300 bg-red-50/30' : 'hover:bg-muted/50'}
                `}
              >
                <div className="col-span-5">
                  <p className="font-medium truncate">{header}</p>
                  <p className="text-sm text-muted-foreground truncate opacity-70">Preview: {previewVal}</p>
                </div>
                
                <div className="col-span-1 flex justify-center">
                  <ArrowRight className={`h-4 w-4 ${isDuplicate ? 'text-red-400' : 'text-muted-foreground'}`} />
                </div>

                <div className="col-span-6 flex gap-2 items-center">
                  <Select 
                    value={currentMapping?.targetField || "_ignore"} 
                    onValueChange={(v) => handleMappingChange(index, v === "_ignore" ? "" : v)}
                  >
                    <SelectTrigger className={`
                      ${currentMapping?.targetField ? "border-primary bg-primary/5" : ""}
                      ${isDuplicate ? "border-red-500 ring-red-500 text-red-900" : ""}
                    `}>
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_ignore">— Ignore —</SelectItem>
                      {TARGET_FIELDS.map(field => {
                        const inUse = isFieldInUse(field.value);
                        const isCurrentlySelected = currentMapping?.targetField === field.value;
                        
                        return (
                          <SelectItem key={field.value} value={field.value}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="flex items-center gap-1.5">
                                {field.label}
                                {field.required && <span className="text-red-500">*</span>}
                              </span>
                              <div className="flex items-center gap-1">
                                {field.required && (
                                  <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-amber-200 text-amber-700 bg-amber-50">REQ</Badge>
                                )}
                                {inUse && !isCurrentlySelected && (
                                  <Badge variant="secondary" className="text-[9px] px-1 h-3.5 opacity-50">IN USE</Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {currentMapping?.targetField && !isDuplicate && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>Mapped Successfully</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {isDuplicate && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 animate-pulse" />
                        </TooltipTrigger>
                        <TooltipContent>Field mapped to multiple columns</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={handleComplete} 
          className="px-8 shadow-md"
          disabled={duplicateFields.length > 0 || missingRequiredFields.length > 0}
        >
          {duplicateFields.length > 0 
            ? "Resolve Conflicts" 
            : missingRequiredFields.length > 0 
              ? "Mapping Incomplete" 
              : "Complete Mapping"} 
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
