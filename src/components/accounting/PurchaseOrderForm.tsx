import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Search, UserPlus } from "lucide-react";
import { useVendors, useItems } from "@/hooks/useAccountingData";
import { useCreatePurchaseOrder } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { VendorForm } from "./VendorForm";

const poSchema = z.object({
  po_number: z.string().min(1, "PO number is required"),
  vendor_id: z.string().min(1, "Vendor is required"),
  po_date: z.string().min(1, "PO date is required"),
  expected_date: z.string().optional(),
  currency: z.string().default("LKR"),
  notes: z.string().optional(),
});

type POFormData = z.infer<typeof poSchema>;

interface POLine {
  id: string;
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Category badge helper
const getItemCategory = (item: any): string => {
  const desc = (item.description || "").toLowerCase();
  const code = (item.item_code || "").toLowerCase();
  if (desc.includes("yutong") || code.startsWith("zk") || code.startsWith("ytg")) return "Yutong";
  if (desc.includes("sinotruck") || desc.includes("sinotruk") || code.startsWith("snt-")) return "Sinotruk";
  if (desc.includes("lightvehicle") || desc.includes("light vehicle") || code.startsWith("lv-")) return "Light Vehicle";
  if (item.item_type === "vehicle") return "Vehicle";
  return "Other";
};

const categoryColors: Record<string, string> = {
  Yutong: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Sinotruk: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Light Vehicle": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Vehicle: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export const PurchaseOrderForm = ({ open, onOpenChange }: PurchaseOrderFormProps) => {
  const { data: vendors } = useVendors();
  const { data: items } = useItems();
  const createPO = useCreatePurchaseOrder();
  const generateNumber = useGenerateNumber();
  const numberGenerated = useRef(false);

  const [lines, setLines] = useState<POLine[]>([
    { id: "1", item_id: "", description: "", quantity: 1, unit_price: 0, line_total: 0 },
  ]);

  // Search and filter state
  const [itemSearchTerms, setItemSearchTerms] = useState<Record<string, string>>({});
  const [vendorSearch, setVendorSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showVendorForm, setShowVendorForm] = useState(false);

  const form = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      po_number: "",
      po_date: new Date().toISOString().split("T")[0],
      currency: "LKR",
    },
  });

  const currency = form.watch("currency");

  useEffect(() => {
    if (open && !numberGenerated.current) {
      numberGenerated.current = true;
      generateNumber("po").then(num => form.setValue("po_number", num));
    }
    if (!open) numberGenerated.current = false;
  }, [open]);

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), item_id: "", description: "", quantity: 1, unit_price: 0, line_total: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof POLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      updated.line_total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const handleItemSelect = (lineId: string, itemId: string) => {
    const item = items?.find(i => i.id === itemId);
    if (item) {
      setLines(lines.map(line => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          item_id: itemId,
          description: item.item_name,
          unit_price: item.selling_price || item.last_purchase_price || 0,
          line_total: line.quantity * (item.selling_price || item.last_purchase_price || 0),
        };
      }));
    }
  };

  // Filtered items based on search and category
  const getFilteredItems = (lineId: string) => {
    const search = (itemSearchTerms[lineId] || "").toLowerCase();
    return (items || []).filter((item: any) => {
      const matchesCategory = categoryFilter === "all" || getItemCategory(item) === categoryFilter;
      const matchesSearch = !search ||
        item.item_code?.toLowerCase().includes(search) ||
        item.item_name?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  };

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors || [];
    const s = vendorSearch.toLowerCase();
    return (vendors || []).filter((v: any) =>
      v.vendor_code?.toLowerCase().includes(s) ||
      v.vendor_name?.toLowerCase().includes(s)
    );
  }, [vendors, vendorSearch]);

  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);

  const onSubmit = async (data: POFormData) => {
    await createPO.mutateAsync({
      ...data,
      total_amount: subtotal,
      lines: lines.filter(l => l.item_id),
    });
    onOpenChange(false);
    form.reset();
    setLines([{ id: "1", item_id: "", description: "", quantity: 1, unit_price: 0, line_total: 0 }]);
  };

  const currencySymbol = currency === "USD" ? "$" : "LKR";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-5 gap-4">
                <FormField
                  control={form.control}
                  name="po_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PO Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vendor with search + quick-add */}
                <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Vendor
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-primary hover:text-primary/80"
                          onClick={() => setShowVendorForm(true)}
                          title="Quick Add Vendor"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <div className="px-2 pb-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Search vendors..."
                                className="pl-7 h-8 text-sm"
                                value={vendorSearch}
                                onChange={(e) => setVendorSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          {filteredVendors.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              <span className="font-mono text-xs text-muted-foreground">{vendor.vendor_code}</span>
                              {" — "}
                              <span>{vendor.vendor_name}</span>
                            </SelectItem>
                          ))}
                          {filteredVendors.length === 0 && (
                            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                              No vendors found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="po_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PO Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Delivery</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency Selector */}
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LKR">🇱🇰 LKR - Sri Lankan Rupee</SelectItem>
                          <SelectItem value="USD">🇺🇸 USD - US Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Line Items</h4>
                  <div className="flex gap-2 items-center">
                    {/* Category Filter */}
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Yutong">🚌 Yutong</SelectItem>
                        <SelectItem value="Sinotruk">🚛 Sinotruk</SelectItem>
                        <SelectItem value="Light Vehicle">🚗 Light Vehicle</SelectItem>
                        <SelectItem value="Other">📦 Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Line
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 w-[320px]">Item (Code + Name)</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2 w-24">Qty</th>
                        <th className="text-right p-2 w-44">Unit Price ({currencySymbol})</th>
                        <th className="text-right p-2 w-36">Total</th>
                        <th className="p-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => {
                        const filtered = getFilteredItems(line.id);
                        return (
                          <tr key={line.id} className="border-t">
                            <td className="p-2">
                              <Select
                                value={line.item_id}
                                onValueChange={(value) => handleItemSelect(line.id, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {/* Search inside item dropdown */}
                                  <div className="px-2 pb-2">
                                    <div className="relative">
                                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                      <Input
                                        placeholder="Search items..."
                                        className="pl-7 h-8 text-sm"
                                        value={itemSearchTerms[line.id] || ""}
                                        onChange={(e) => setItemSearchTerms({ ...itemSearchTerms, [line.id]: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>
                                  {filtered.map((item: any) => {
                                    const cat = getItemCategory(item);
                                    return (
                                      <SelectItem key={item.id} value={item.id}>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColors[cat] || categoryColors.Other}`}>
                                            {cat}
                                          </span>
                                          <span className="font-mono text-xs text-muted-foreground">{item.item_code}</span>
                                          <span className="truncate">{item.item_name}</span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                  {filtered.length === 0 && (
                                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                      No items match your filter
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Textarea
                                value={line.description}
                                onChange={(e) => updateLine(line.id, "description", e.target.value)}
                                className="min-h-[36px] resize-none overflow-hidden py-2"
                                rows={1}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                className="text-right"
                                value={line.quantity}
                                onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="p-2">
                              <CurrencyInput
                                value={line.unit_price}
                                onValueChange={(val) => updateLine(line.id, "unit_price", val)}
                                placeholder="0"
                                compact
                              />
                            </td>
                            <td className="p-2 text-right font-semibold">
                              <span className="text-xs text-muted-foreground mr-1">{currencySymbol}</span>
                              {line.line_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLine(line.id)}
                                disabled={lines.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>
                        <span className="text-sm text-muted-foreground mr-1">{currencySymbol}</span>
                        {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPO.isPending}>
                  {createPO.isPending ? "Creating..." : "Create PO"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Vendor Dialog */}
      <Dialog open={showVendorForm} onOpenChange={setShowVendorForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add Vendor</DialogTitle>
          </DialogHeader>
          <VendorForm onSuccess={() => setShowVendorForm(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};
