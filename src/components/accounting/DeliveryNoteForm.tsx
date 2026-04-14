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
import { useSalesOrders, useSalesOrderLines, useCreateDeliveryNote } from "@/hooks/useSalesOrders";
import { useCustomers } from "@/hooks/useAccountingData";

const formSchema = z.object({
  dn_number: z.string().min(1, "DN number is required"),
  sales_order_id: z.string().min(1, "Sales order is required"),
  customer_id: z.string().min(1, "Customer is required"),
  delivery_date: z.string().min(1, "Delivery date is required"),
  shipping_address: z.string().optional(),
  driver_name: z.string().optional(),
  vehicle_number: z.string().optional(),
  notes: z.string().optional(),
});

interface DeliveryNoteFormProps {
  onSuccess?: () => void;
}

export const DeliveryNoteForm = ({ onSuccess }: DeliveryNoteFormProps) => {
  const { data: salesOrders } = useSalesOrders("confirmed");
  const { data: customers } = useCustomers();
  const createDeliveryNote = useCreateDeliveryNote();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedLines, setSelectedLines] = useState<Record<string, { quantity: number; selected: boolean }>>({});
  
  const { data: orderLines } = useSalesOrderLines(selectedOrderId);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dn_number: `DN-${Date.now()}`,
      delivery_date: new Date().toISOString().split("T")[0],
    },
  });
  
  // Auto-populate customer when order is selected
  useEffect(() => {
    if (selectedOrderId) {
      const order = salesOrders?.find(o => o.id === selectedOrderId);
      if (order) {
        form.setValue("customer_id", order.customer_id);
        form.setValue("shipping_address", order.shipping_address || "");
      }
    }
  }, [selectedOrderId, salesOrders, form]);
  
  // Initialize selected lines when order lines load
  useEffect(() => {
    if (orderLines) {
      const initialSelection: Record<string, { quantity: number; selected: boolean }> = {};
      orderLines.forEach(line => {
        const remaining = (line.quantity || 0) - (line.delivered_qty || 0);
        if (remaining > 0) {
          initialSelection[line.id] = {
            quantity: remaining,
            selected: true,
          };
        }
      });
      setSelectedLines(initialSelection);
    }
  }, [orderLines]);
  
  const toggleLine = (lineId: string) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        selected: !prev[lineId]?.selected,
      },
    }));
  };
  
  const updateLineQuantity = (lineId: string, quantity: number) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        quantity,
      },
    }));
  };
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const lines = Object.entries(selectedLines)
      .filter(([_, value]) => value.selected && value.quantity > 0)
      .map(([lineId, value]) => {
        const orderLine = orderLines?.find(l => l.id === lineId);
        return {
          so_line_id: lineId,
          item_id: orderLine?.item_id || "",
          quantity: value.quantity,
        };
      });
    
    if (lines.length === 0) {
      return;
    }
    
    const validatedData = {
      dn_number: data.dn_number,
      sales_order_id: data.sales_order_id,
      customer_id: data.customer_id,
      delivery_date: data.delivery_date,
      shipping_address: data.shipping_address,
      driver_name: data.driver_name,
      vehicle_number: data.vehicle_number,
      notes: data.notes,
      lines,
    };
    
    await createDeliveryNote.mutateAsync(validatedData);
    
    onSuccess?.();
  };
  
  const confirmedOrders = salesOrders?.filter(o => 
    ["confirmed", "processing"].includes(o.status)
  ) || [];
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dn_number">DN Number *</Label>
          <Input {...form.register("dn_number")} />
          {form.formState.errors.dn_number && (
            <p className="text-sm text-destructive">{form.formState.errors.dn_number.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sales_order_id">Sales Order *</Label>
          <Select 
            value={selectedOrderId}
            onValueChange={(value) => {
              setSelectedOrderId(value);
              form.setValue("sales_order_id", value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sales order" />
            </SelectTrigger>
            <SelectContent>
              {confirmedOrders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.so_number} - {order.customers?.customer_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.sales_order_id && (
            <p className="text-sm text-destructive">{form.formState.errors.sales_order_id.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customer_id">Customer *</Label>
          <Select 
            value={form.watch("customer_id")}
            onValueChange={(value) => form.setValue("customer_id", value)}
            disabled
          >
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
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="delivery_date">Delivery Date *</Label>
          <Input type="date" {...form.register("delivery_date")} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="driver_name">Driver Name</Label>
          <Input {...form.register("driver_name")} placeholder="Driver name" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="vehicle_number">Vehicle Number</Label>
          <Input {...form.register("vehicle_number")} placeholder="Vehicle number" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="shipping_address">Shipping Address</Label>
        <Textarea {...form.register("shipping_address")} rows={2} />
      </div>
      
      {/* Line Items from Sales Order */}
      {orderLines && orderLines.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Items to Deliver</h3>
          
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-[100px]">Qty to Ship</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderLines.map((line) => {
                  const remaining = (line.quantity || 0) - (line.delivered_qty || 0);
                  const isDisabled = remaining <= 0;
                  
                  return (
                    <TableRow key={line.id} className={isDisabled ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLines[line.id]?.selected || false}
                          onCheckedChange={() => toggleLine(line.id)}
                          disabled={isDisabled}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.items?.item_code}</p>
                          <p className="text-sm text-muted-foreground">{line.items?.item_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{line.delivered_qty || 0}</TableCell>
                      <TableCell className="text-right">{remaining}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={remaining}
                          value={selectedLines[line.id]?.quantity || 0}
                          onChange={(e) => updateLineQuantity(line.id, parseFloat(e.target.value) || 0)}
                          disabled={isDisabled || !selectedLines[line.id]?.selected}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea {...form.register("notes")} rows={2} placeholder="Delivery instructions..." />
      </div>
      
      <div className="flex justify-end gap-4">
        <Button 
          type="submit" 
          disabled={createDeliveryNote.isPending || !selectedOrderId || Object.values(selectedLines).every(l => !l.selected)}
        >
          {createDeliveryNote.isPending ? "Creating..." : "Create Delivery Note"}
        </Button>
      </div>
    </form>
  );
};
