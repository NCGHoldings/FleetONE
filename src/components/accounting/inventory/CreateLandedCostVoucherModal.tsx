import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft, ArrowRight, Package, DollarSign, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useCreateLandedCostVoucher } from "@/hooks/useInventoryEnhanced";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";

interface CreateLandedCostVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface VoucherItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  original_cost: number;
  selected: boolean;
  grn_line_id?: string;
}

interface VoucherCharge {
  id: string;
  charge_type: string;
  description: string;
  amount: number;
  vendor_id: string;
  expense_account_id: string;
}

const CHARGE_TYPES = [
  "Freight",
  "Insurance",
  "Customs Duty",
  "Stamp Duty",
  "Port Charges",
  "Clearing Agent Fee",
  "Other",
];

const STEPS = ["Header", "Items", "Charges", "Preview"];

export const CreateLandedCostVoucherModal = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateLandedCostVoucherModalProps) => {
  const { selectedCompanyId } = useCompany();
  const createVoucher = useCreateLandedCostVoucher();

  const [step, setStep] = useState(0);
  const [entryMode, setEntryMode] = useState<"grn" | "manual">("manual");

  // Step 1 - Header
  const [voucherNumber, setVoucherNumber] = useState("");
  const [grnId, setGrnId] = useState("");
  const [postingDate, setPostingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [allocationMethod, setAllocationMethod] = useState<"by_value" | "by_quantity" | "by_weight">("by_value");
  const [notes, setNotes] = useState("");

  // Step 2 - Items
  const [items, setItems] = useState<VoucherItem[]>([]);
  const [manualItemId, setManualItemId] = useState("");
  const [manualQty, setManualQty] = useState(1);
  const [manualUnitCost, setManualUnitCost] = useState(0);

  // Step 3 - Charges
  const [charges, setCharges] = useState<VoucherCharge[]>([]);

  // Generate voucher number on open
  useEffect(() => {
    if (open) {
      const now = new Date();
      setVoucherNumber(`LCV-${format(now, "yyyy-MMdd-HHmm")}`);
      setStep(0);
      setItems([]);
      setCharges([]);
      setNotes("");
      setGrnId("");
      setEntryMode("manual");
      setPostingDate(format(now, "yyyy-MM-dd"));
      setAllocationMethod("by_value");
    }
  }, [open]);

  // Fetch GRNs
  const { data: grns } = useQuery({
    queryKey: ["grns-for-lcv", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipt_notes")
        .select("id, grn_number, received_date, status")
        .eq("company_id", selectedCompanyId!)
        .order("received_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!selectedCompanyId,
  });

  // Fetch items catalog for manual mode
  const { data: catalogItems } = useQuery({
    queryKey: ["items-catalog", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, item_code, item_name, standard_cost")
        .eq("company_id", selectedCompanyId!)
        .eq("is_active", true)
        .order("item_code");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!selectedCompanyId,
  });

  // Fetch GRN lines when GRN selected
  useEffect(() => {
    if (entryMode === "grn" && grnId) {
      const fetchLines = async () => {
        const { data, error } = await supabase
          .from("grn_lines")
          .select("id, item_id, received_quantity, unit_cost, line_total, items(item_code, item_name)")
          .eq("grn_id", grnId);
        if (error) {
          toast.error("Failed to load GRN lines");
          return;
        }
        setItems(
          (data || []).map((line: any) => ({
            id: crypto.randomUUID(),
            item_id: line.item_id,
            item_code: line.items?.item_code || "",
            item_name: line.items?.item_name || "",
            quantity: line.received_quantity || 1,
            unit_cost: line.unit_cost || 0,
            original_cost: line.line_total || 0,
            selected: true,
            grn_line_id: line.id,
          }))
        );
      };
      fetchLines();
    }
  }, [grnId, entryMode]);

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-lcv", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, vendor_name")
        .eq("company_id", selectedCompanyId!)
        .eq("is_active", true)
        .order("vendor_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!selectedCompanyId,
  });

  // Fetch expense accounts
  const { data: expenseAccounts } = useQuery({
    queryKey: ["expense-accounts-for-lcv", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name")
        .eq("company_id", selectedCompanyId!)
        .eq("is_active", true)
        .in("account_type", ["Expense", "Cost of Sales", "Asset"])
        .order("account_code");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!selectedCompanyId,
  });

  const selectedItems = items.filter((i) => i.selected);
  const totalOriginalCost = selectedItems.reduce((s, i) => s + i.original_cost, 0);
  const totalCharges = charges.reduce((s, c) => s + c.amount, 0);

  const getAllocation = (item: VoucherItem) => {
    if (selectedItems.length === 0 || totalCharges === 0) return 0;
    if (allocationMethod === "by_value") {
      return totalOriginalCost > 0 ? (item.original_cost / totalOriginalCost) * totalCharges : 0;
    }
    return totalCharges / selectedItems.length;
  };

  const addManualItem = () => {
    const catalogItem = catalogItems?.find((i) => i.id === manualItemId);
    if (!catalogItem) {
      toast.error("Select an item");
      return;
    }
    if (manualQty <= 0 || manualUnitCost <= 0) {
      toast.error("Quantity and unit cost must be > 0");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        item_id: catalogItem.id,
        item_code: catalogItem.item_code || "",
        item_name: catalogItem.item_name || "",
        quantity: manualQty,
        unit_cost: manualUnitCost,
        original_cost: manualQty * manualUnitCost,
        selected: true,
      },
    ]);
    setManualItemId("");
    setManualQty(1);
    setManualUnitCost(0);
  };

  const addCharge = () => {
    setCharges((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        charge_type: "Freight",
        description: "",
        amount: 0,
        vendor_id: "",
        expense_account_id: "",
      },
    ]);
  };

  const updateCharge = (id: string, field: keyof VoucherCharge, value: any) => {
    setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCharge = (id: string) => {
    setCharges((prev) => prev.filter((c) => c.id !== id));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return voucherNumber && postingDate && allocationMethod;
      case 1:
        return selectedItems.length > 0;
      case 2:
        return charges.length > 0 && charges.every((c) => c.amount > 0);
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      await createVoucher.mutateAsync({
        voucher_number: voucherNumber,
        grn_id: grnId || undefined as any,
        posting_date: postingDate,
        allocation_method: allocationMethod,
        notes: notes || undefined,
        items: selectedItems.map((i) => ({
          grn_line_id: i.grn_line_id,
          item_id: i.item_id,
          original_cost: i.original_cost,
        })),
        charges: charges.map((c) => ({
          charge_type: c.charge_type,
          description: c.description || undefined,
          amount: c.amount,
          expense_account_id: c.expense_account_id || undefined,
        })),
      });
      toast.success("Landed Cost Voucher created as Draft");
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to create voucher");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Landed Cost Voucher</DialogTitle>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <Badge
                variant={i === step ? "default" : i < step ? "secondary" : "outline"}
                className="cursor-pointer"
                onClick={() => i < step && setStep(i)}
              >
                {i + 1}. {label}
              </Badge>
              {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Header */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Voucher Number</Label>
                <Input value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Posting Date</Label>
                <Input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entry Mode</Label>
                <Select value={entryMode} onValueChange={(v: "grn" | "manual") => { setEntryMode(v); setItems([]); setGrnId(""); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grn">From GRN</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allocation Method</Label>
                <Select value={allocationMethod} onValueChange={(v: any) => setAllocationMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="by_value">By Value</SelectItem>
                    <SelectItem value="by_quantity">By Quantity</SelectItem>
                    <SelectItem value="by_weight">By Weight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {entryMode === "grn" && (
              <div className="space-y-2">
                <Label>Select GRN</Label>
                <Select value={grnId} onValueChange={setGrnId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a GRN..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(grns || []).map((grn) => (
                      <SelectItem key={grn.id} value={grn.id}>
                        {grn.grn_number} — {format(new Date(grn.received_date), "MMM dd, yyyy")}
                      </SelectItem>
                    ))}
                    {(!grns || grns.length === 0) && (
                      <div className="p-3 text-sm text-muted-foreground text-center">No GRNs found. Use Manual Entry instead.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>
          </div>
        )}

        {/* Step 2: Items */}
        {step === 1 && (
          <div className="space-y-4">
            {entryMode === "manual" && (
              <Card className="p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Add Item
                </h4>
                <div className="grid grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Item</Label>
                    <Select value={manualItemId} onValueChange={setManualItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(catalogItems || []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.item_code} — {item.item_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min={1} value={manualQty} onChange={(e) => setManualQty(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Cost</Label>
                    <Input type="number" min={0} step="0.01" value={manualUnitCost} onChange={(e) => setManualUnitCost(Number(e.target.value))} />
                  </div>
                  <Button onClick={addManualItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </Card>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{entryMode === "grn" ? "Select a GRN in Step 1 to load items" : "Add items manually above"}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">✓</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    {entryMode === "manual" && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(checked) =>
                            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, selected: !!checked } : i)))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={item.unit_cost} /></TableCell>
                      <TableCell className="text-right font-semibold"><CurrencyDisplay amount={item.original_cost} /></TableCell>
                      {entryMode === "manual" && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="text-right text-sm">
              <strong>Selected Items:</strong> {selectedItems.length} | <strong>Total Original Cost:</strong>{" "}
              <CurrencyDisplay amount={totalOriginalCost} />
            </div>
          </div>
        )}

        {/* Step 3: Charges */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Additional Charges
              </h4>
              <Button size="sm" onClick={addCharge}>
                <Plus className="h-4 w-4 mr-1" /> Add Charge
              </Button>
            </div>

            {charges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Add charges like freight, insurance, customs duties</p>
              </div>
            ) : (
              <div className="space-y-3">
                {charges.map((charge, idx) => (
                  <Card key={charge.id} className="p-3">
                    <div className="grid grid-cols-5 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select value={charge.charge_type} onValueChange={(v) => updateCharge(charge.id, "charge_type", v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHARGE_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={charge.description}
                          onChange={(e) => updateCharge(charge.id, "description", e.target.value)}
                          placeholder="Details..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={charge.amount}
                          onChange={(e) => updateCharge(charge.id, "amount", Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Expense Account</Label>
                        <Select value={charge.expense_account_id} onValueChange={(v) => updateCharge(charge.id, "expense_account_id", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(expenseAccounts || []).map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.account_code} — {acc.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeCharge(charge.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="text-right text-sm font-semibold">
              Total Charges: <CurrencyDisplay amount={totalCharges} />
            </div>
          </div>
        )}

        {/* Step 4: Allocation Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Allocation Preview — {allocationMethod === "by_value" ? "By Value" : allocationMethod === "by_quantity" ? "By Quantity" : "By Weight"}
            </h4>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Original Cost</TableHead>
                  <TableHead className="text-right">Allocated Cost</TableHead>
                  <TableHead className="text-right">Final Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map((item) => {
                  const allocated = getAllocation(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-sm">{item.item_code}</span>
                          <span className="text-muted-foreground ml-2">{item.item_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={item.original_cost} /></TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        <CurrencyDisplay amount={allocated} />
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <CurrencyDisplay amount={item.original_cost + allocated} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="text-right font-bold"><CurrencyDisplay amount={totalOriginalCost} /></TableCell>
                  <TableCell className="text-right font-bold text-blue-600"><CurrencyDisplay amount={totalCharges} /></TableCell>
                  <TableCell className="text-right font-bold"><CurrencyDisplay amount={totalOriginalCost + totalCharges} /></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Card className="p-3 bg-muted/50">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Voucher:</span> {voucherNumber}</div>
                <div><span className="text-muted-foreground">Date:</span> {postingDate}</div>
                <div><span className="text-muted-foreground">Items:</span> {selectedItems.length}</div>
                <div><span className="text-muted-foreground">Charges:</span> {charges.length}</div>
                {notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {notes}</div>}
              </div>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 0 ? "Cancel" : <><ArrowLeft className="h-4 w-4 mr-1" /> Back</>}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createVoucher.isPending}>
              {createVoucher.isPending ? "Creating..." : "Create Draft Voucher"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
