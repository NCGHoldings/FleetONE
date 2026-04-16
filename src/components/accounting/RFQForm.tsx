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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useVendors, useItems } from "@/hooks/useAccountingData";
import { useCreateRFQ } from "@/hooks/useRFQ";
import { useGenerateNumber } from "@/hooks/useNumbering";

const formSchema = z.object({
  rfq_number: z.string().min(1, "RFQ number is required"),
  rfq_date: z.string().min(1, "RFQ date is required"),
  response_deadline: z.string().optional(),
  notes: z.string().optional(),
});

interface RFQFormProps {
  onSuccess?: () => void;
}

export const RFQForm = ({ onSuccess }: RFQFormProps) => {
  const { data: vendors } = useVendors();
  const { data: items } = useItems();
  const createRFQ = useCreateRFQ();
  const generateNumber = useGenerateNumber();
  
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [lines, setLines] = useState<{
    item_id: string;
    description: string;
    quantity: number;
    uom: string;
  }[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rfq_number: "",
      rfq_date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    generateNumber("rfq").then(num => form.setValue("rfq_number", num));
  }, []);
  
  const toggleVendor = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };
  
  const addLine = () => {
    setLines([...lines, {
      item_id: "",
      description: "",
      quantity: 1,
      uom: "Each",
    }]);
  };
  
  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;
    
    if (field === "item_id") {
      const item = items?.find(i => i.id === value);
      if (item) {
        updated[index].description = item.item_name;
        updated[index].uom = item.unit_of_measure || "Each";
      }
    }
    
    setLines(updated);
  };
  
  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (lines.length === 0 || selectedVendors.length === 0) {
      return;
    }
    
    await createRFQ.mutateAsync({
      rfq_number: data.rfq_number,
      rfq_date: data.rfq_date,
      response_deadline: data.response_deadline,
      notes: data.notes,
      vendor_ids: selectedVendors,
      lines,
    });
    
    onSuccess?.();
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rfq_number">RFQ Number *</Label>
          <Input {...form.register("rfq_number")} />
          {form.formState.errors.rfq_number && (
            <p className="text-sm text-destructive">{form.formState.errors.rfq_number.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="rfq_date">RFQ Date *</Label>
          <Input type="date" {...form.register("rfq_date")} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="response_deadline">Response Deadline</Label>
          <Input type="date" {...form.register("response_deadline")} />
        </div>
      </div>
      
      {/* Vendor Selection */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Select Vendors ({selectedVendors.length} selected)</h3>
        </div>
        
        <div className="border rounded-lg max-h-48 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>Vendor Code</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors?.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedVendors.includes(vendor.id)}
                      onCheckedChange={() => toggleVendor(vendor.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                  <TableCell>{vendor.vendor_name}</TableCell>
                  <TableCell>{vendor.email || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Items to Quote</h3>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
        
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Quantity</TableHead>
                <TableHead className="w-[100px]">UoM</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No items added. Click "Add Item" to add line items.
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={line.item_id}
                        onValueChange={(value) => updateLine(index, "item_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.item_code} - {item.item_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.uom}
                        onChange={(e) => updateLine(index, "uom", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea {...form.register("notes")} rows={2} placeholder="Additional instructions..." />
      </div>
      
      <div className="flex justify-end gap-4">
        <Button 
          type="submit" 
          disabled={createRFQ.isPending || lines.length === 0 || selectedVendors.length === 0}
        >
          {createRFQ.isPending ? "Creating..." : "Create RFQ"}
        </Button>
      </div>
    </form>
  );
};
