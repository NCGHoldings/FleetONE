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
import { Plus, Trash2 } from "lucide-react";
import { useCustomers, useItems } from "@/hooks/useAccountingData";
import { usePaymentTerms, useCreateSalesOrder } from "@/hooks/useSalesOrders";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useGenerateNumber } from "@/hooks/useNumbering";

const formSchema = z.object({
  so_number: z.string().min(1, "SO number is required"),
  customer_id: z.string().min(1, "Customer is required"),
  order_date: z.string().min(1, "Order date is required"),
  delivery_date: z.string().optional(),
  payment_terms_id: z.string().optional(),
  shipping_address: z.string().optional(),
  billing_address: z.string().optional(),
  notes: z.string().optional(),
});

interface SalesOrderFormProps {
  onSuccess?: () => void;
}

export const SalesOrderForm = ({ onSuccess }: SalesOrderFormProps) => {
  const { data: customers } = useCustomers();
  const { data: paymentTerms } = usePaymentTerms();
  const { data: items } = useItems();
  const createOrder = useCreateSalesOrder();
  const generateNumber = useGenerateNumber();
  
  const [lines, setLines] = useState<{
    item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    tax_rate: number;
  }[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      so_number: "",
      order_date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    generateNumber("so").then(num => form.setValue("so_number", num));
  }, []);
  
  const addLine = () => {
    setLines([...lines, {
      item_id: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_rate: 0,
    }]);
  };
  
  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;
    
    // Auto-fill description and price when item is selected
    if (field === "item_id") {
      const item = items?.find(i => i.id === value);
      if (item) {
        updated[index].description = item.item_name;
        updated[index].unit_price = item.selling_price || 0;
      }
    }
    
    setLines(updated);
  };
  
  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };
  
  const calculateLineTotal = (line: typeof lines[0]) => {
    const subtotal = line.quantity * line.unit_price;
    const discount = subtotal * (line.discount_percent / 100);
    return subtotal - discount;
  };
  
  const subtotal = lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
  const taxAmount = lines.reduce((sum, line) => sum + calculateLineTotal(line) * (line.tax_rate / 100), 0);
  const total = subtotal + taxAmount;
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (lines.length === 0) {
      return;
    }
    
    const validatedData = {
      so_number: data.so_number,
      customer_id: data.customer_id,
      order_date: data.order_date,
      delivery_date: data.delivery_date,
      payment_terms_id: data.payment_terms_id,
      shipping_address: data.shipping_address,
      billing_address: data.billing_address,
      notes: data.notes,
      lines,
    };
    
    await createOrder.mutateAsync(validatedData);
    
    onSuccess?.();
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="so_number">SO Number *</Label>
          <Input {...form.register("so_number")} />
          {form.formState.errors.so_number && (
            <p className="text-sm text-destructive">{form.formState.errors.so_number.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customer_id">Customer *</Label>
          <Select onValueChange={(value) => form.setValue("customer_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers?.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.customer_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.customer_id && (
            <p className="text-sm text-destructive">{form.formState.errors.customer_id.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="order_date">Order Date *</Label>
          <Input type="date" {...form.register("order_date")} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="delivery_date">Expected Delivery Date</Label>
          <Input type="date" {...form.register("delivery_date")} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="payment_terms_id">Payment Terms</Label>
          <Select onValueChange={(value) => form.setValue("payment_terms_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment terms" />
            </SelectTrigger>
            <SelectContent>
              {paymentTerms?.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.term_name} ({term.due_days} days)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shipping_address">Shipping Address</Label>
          <Textarea {...form.register("shipping_address")} rows={2} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="billing_address">Billing Address</Label>
          <Textarea {...form.register("billing_address")} rows={2} />
        </div>
      </div>
      
      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Order Lines</h3>
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
                <TableHead className="w-[80px]">Qty</TableHead>
                <TableHead className="w-[150px]">Unit Price</TableHead>
                <TableHead className="w-[80px]">Disc %</TableHead>
                <TableHead className="w-[80px]">Tax %</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                      <Textarea
                        value={line.description}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Description"
                        className="min-h-[36px] resize-none overflow-hidden py-2"
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
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
                        max="100"
                        value={line.discount_percent}
                        onChange={(e) => updateLine(index, "discount_percent", parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={line.tax_rate}
                        onChange={(e) => updateLine(index, "tax_rate", parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <CurrencyDisplay amount={calculateLineTotal(line)} />
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
        
        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <CurrencyDisplay amount={subtotal} />
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <CurrencyDisplay amount={taxAmount} />
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <CurrencyDisplay amount={total} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea {...form.register("notes")} rows={2} placeholder="Additional notes..." />
      </div>
      
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={createOrder.isPending || lines.length === 0}>
          {createOrder.isPending ? "Creating..." : "Create Sales Order"}
        </Button>
      </div>
    </form>
  );
};
