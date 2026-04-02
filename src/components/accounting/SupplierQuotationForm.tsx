import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVendors } from "@/hooks/useAccountingData";
import { useRFQs, useRFQLines, useCreateSupplierQuotation } from "@/hooks/useRFQ";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { CurrencyInput } from "@/components/ui/currency-input";

const formSchema = z.object({
  sq_number: z.string().min(1, "SQ number is required"),
  rfq_id: z.string().min(1, "RFQ is required"),
  vendor_id: z.string().min(1, "Vendor is required"),
  quotation_date: z.string().min(1, "Quotation date is required"),
  valid_until: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

interface SupplierQuotationFormProps {
  onSuccess?: () => void;
}

export const SupplierQuotationForm = ({ onSuccess }: SupplierQuotationFormProps) => {
  const { data: vendors } = useVendors();
  const { data: rfqs } = useRFQs("sent");
  const createQuotation = useCreateSupplierQuotation();
  
  const [selectedRFQId, setSelectedRFQId] = useState<string>("");
  const [lines, setLines] = useState<{
    rfq_line_id: string;
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    lead_time_days: number;
  }[]>([]);
  
  const { data: rfqLines } = useRFQLines(selectedRFQId);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sq_number: `SQ-${Date.now()}`,
      quotation_date: new Date().toISOString().split("T")[0],
      currency: "LKR",
    },
  });
  
  // Initialize lines when RFQ lines load
  useEffect(() => {
    if (rfqLines) {
      setLines(rfqLines.map(line => ({
        rfq_line_id: line.id,
        item_id: line.item_id,
        item_name: line.items?.item_name || line.description || "",
        quantity: line.quantity,
        unit_price: 0,
        lead_time_days: 0,
      })));
    }
  }, [rfqLines]);
  
  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;
    setLines(updated);
  };
  
  const total = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (lines.length === 0) {
      return;
    }
    
    await createQuotation.mutateAsync({
      sq_number: data.sq_number,
      rfq_id: data.rfq_id,
      vendor_id: data.vendor_id,
      quotation_date: data.quotation_date,
      valid_until: data.valid_until,
      currency: data.currency,
      notes: data.notes,
      lines: lines.map(line => ({
        rfq_line_id: line.rfq_line_id,
        item_id: line.item_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        lead_time_days: line.lead_time_days,
      })),
    });
    
    onSuccess?.();
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sq_number">SQ Number *</Label>
          <Input {...form.register("sq_number")} />
          {form.formState.errors.sq_number && (
            <p className="text-sm text-destructive">{form.formState.errors.sq_number.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="rfq_id">RFQ *</Label>
          <Select 
            value={selectedRFQId}
            onValueChange={(value) => {
              setSelectedRFQId(value);
              form.setValue("rfq_id", value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select RFQ" />
            </SelectTrigger>
            <SelectContent>
              {rfqs?.map((rfq) => (
                <SelectItem key={rfq.id} value={rfq.id}>
                  {rfq.rfq_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.rfq_id && (
            <p className="text-sm text-destructive">{form.formState.errors.rfq_id.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="vendor_id">Vendor *</Label>
          <Select onValueChange={(value) => form.setValue("vendor_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors?.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.vendor_id && (
            <p className="text-sm text-destructive">{form.formState.errors.vendor_id.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="quotation_date">Quotation Date *</Label>
          <Input type="date" {...form.register("quotation_date")} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="valid_until">Valid Until</Label>
          <Input type="date" {...form.register("valid_until")} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select 
            defaultValue="LKR"
            onValueChange={(value) => form.setValue("currency", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LKR">LKR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Line Items from RFQ */}
      {lines.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Quote Line Items</h3>
          
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="w-[150px]">Unit Price</TableHead>
                  <TableHead className="w-[100px]">Lead Time (Days)</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{line.item_name}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell>
                      <CurrencyInput
                        value={line.unit_price}
                        onValueChange={(val) => updateLine(index, "unit_price", val)}
                        placeholder="0"
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={line.lead_time_days}
                        onChange={(e) => updateLine(index, "lead_time_days", parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <CurrencyDisplay amount={line.quantity * line.unit_price} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Total */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <CurrencyDisplay amount={total} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea {...form.register("notes")} rows={2} placeholder="Additional notes..." />
      </div>
      
      <div className="flex justify-end gap-4">
        <Button 
          type="submit" 
          disabled={createQuotation.isPending || lines.length === 0}
        >
          {createQuotation.isPending ? "Recording..." : "Record Quotation"}
        </Button>
      </div>
    </form>
  );
};
