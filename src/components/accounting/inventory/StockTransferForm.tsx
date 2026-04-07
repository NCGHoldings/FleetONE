import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, Truck, Package, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateNumber } from "@/hooks/useNumbering";

interface TransferLine {
  item_id: string;
  item_name: string;
  quantity: number;
  batch_number?: string;
}

interface Warehouse {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
}

interface BinLocation {
  id: string;
  bin_code: string;
  bin_name: string | null;
}

interface Item {
  id: string;
  item_code: string;
  item_name: string;
}

export const StockTransferForm = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
    from_bin_id: "",
    to_bin_id: "",
    transfer_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });
  const [transferLines, setTransferLines] = useState<TransferLine[]>([]);
  const [newLine, setNewLine] = useState({ item_id: "", quantity: 1, batch_number: "" });

  // Fetch warehouses
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses_for_transfer", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("warehouses")
        .select("id, warehouse_code, warehouse_name")
        .eq("company_id", selectedCompany.id);
      if (error) throw error;
      return (data || []) as Warehouse[];
    },
    enabled: !!selectedCompany?.id,
  });

  // Fetch bin locations for source warehouse
  const { data: fromBins } = useQuery({
    queryKey: ["from_bins", formData.from_warehouse_id],
    queryFn: async () => {
      if (!formData.from_warehouse_id) return [];
      const { data, error } = await (supabase as any)
        .from("bin_locations")
        .select("id, bin_code, bin_name")
        .eq("warehouse_id", formData.from_warehouse_id);
      if (error) throw error;
      return (data || []) as BinLocation[];
    },
    enabled: !!formData.from_warehouse_id,
  });

  // Fetch bin locations for destination warehouse
  const { data: toBins } = useQuery({
    queryKey: ["to_bins", formData.to_warehouse_id],
    queryFn: async () => {
      if (!formData.to_warehouse_id) return [];
      const { data, error } = await (supabase as any)
        .from("bin_locations")
        .select("id, bin_code, bin_name")
        .eq("warehouse_id", formData.to_warehouse_id);
      if (error) throw error;
      return (data || []) as BinLocation[];
    },
    enabled: !!formData.to_warehouse_id,
  });

  // Fetch items
  const { data: items } = useQuery({
    queryKey: ["items_for_transfer", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("items")
        .select("id, item_code, item_name")
        .eq("company_id", selectedCompany.id);
      if (error) throw error;
      return (data || []) as Item[];
    },
    enabled: !!selectedCompany?.id,
  });

  // Fetch existing transfers
  const { data: transfers, isLoading } = useQuery({
    queryKey: ["stock_transfers", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("stock_transfers")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Create transfer mutation
  const createTransfer = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error("No company selected");
      if (formData.from_warehouse_id === formData.to_warehouse_id) {
        throw new Error("Source and destination warehouses must be different");
      }
      if (transferLines.length === 0) {
        throw new Error("Add at least one item to transfer");
      }

      const transferNumber = await generateNumber("stock_transfer");

      const { data: transfer, error: transferError } = await supabase
        .from("stock_transfers")
        .insert({
          transfer_number: transferNumber,
          from_warehouse_id: formData.from_warehouse_id,
          to_warehouse_id: formData.to_warehouse_id,
          from_bin_id: formData.from_bin_id || null,
          to_bin_id: formData.to_bin_id || null,
          transfer_date: formData.transfer_date,
          notes: formData.notes || null,
          status: "draft",
          company_id: selectedCompany.id,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      const lines = transferLines.map((line) => ({
        transfer_id: transfer.id,
        item_id: line.item_id,
        quantity: line.quantity,
        batch_number: line.batch_number || null,
      }));

      const { error: linesError } = await supabase
        .from("stock_transfer_lines")
        .insert(lines);

      if (linesError) throw linesError;
      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
      toast.success("Stock transfer created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create transfer");
    },
  });

  // Update transfer status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("stock_transfers")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
      toast.success("Transfer status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const resetForm = () => {
    setFormData({
      from_warehouse_id: "",
      to_warehouse_id: "",
      from_bin_id: "",
      to_bin_id: "",
      transfer_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    setTransferLines([]);
    setNewLine({ item_id: "", quantity: 1, batch_number: "" });
  };

  const addLine = () => {
    if (!newLine.item_id) return;
    const item = items?.find((i) => i.id === newLine.item_id);
    if (!item) return;

    setTransferLines([
      ...transferLines,
      {
        item_id: newLine.item_id,
        item_name: `${item.item_code} - ${item.item_name}`,
        quantity: newLine.quantity,
        batch_number: newLine.batch_number,
      },
    ]);
    setNewLine({ item_id: "", quantity: 1, batch_number: "" });
  };

  const removeLine = (index: number) => {
    setTransferLines(transferLines.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      in_transit: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getWarehouseName = (warehouseId: string | null) => {
    if (!warehouseId) return "-";
    const wh = warehouses?.find((w) => w.id === warehouseId);
    return wh?.warehouse_name || "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Stock Transfers</h2>
          <p className="text-muted-foreground">Transfer inventory between warehouses and bins</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Stock Transfer</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Warehouse *</Label>
                  <Select
                    value={formData.from_warehouse_id}
                    onValueChange={(v) => setFormData({ ...formData, from_warehouse_id: v, from_bin_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.warehouse_code} - {w.warehouse_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Warehouse *</Label>
                  <Select
                    value={formData.to_warehouse_id}
                    onValueChange={(v) => setFormData({ ...formData, to_warehouse_id: v, to_bin_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses
                        ?.filter((w) => w.id !== formData.from_warehouse_id)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.warehouse_code} - {w.warehouse_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {fromBins && fromBins.length > 0 && (
                  <div className="space-y-2">
                    <Label>From Bin (Optional)</Label>
                    <Select
                      value={formData.from_bin_id || "_none"}
                      onValueChange={(v) => setFormData({ ...formData, from_bin_id: v === "_none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">-- No Bin --</SelectItem>
                        {fromBins.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.bin_code} - {b.bin_name || ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {toBins && toBins.length > 0 && (
                  <div className="space-y-2">
                    <Label>To Bin (Optional)</Label>
                    <Select
                      value={formData.to_bin_id || "_none"}
                      onValueChange={(v) => setFormData({ ...formData, to_bin_id: v === "_none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">-- No Bin --</SelectItem>
                        {toBins.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.bin_code} - {b.bin_name || ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Transfer Date</Label>
                  <Input
                    type="date"
                    value={formData.transfer_date}
                    onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Transfer Items</h4>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Item</Label>
                    <Select value={newLine.item_id} onValueChange={(v) => setNewLine({ ...newLine, item_id: v })}>
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
                  </div>
                  <div className="w-24">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newLine.quantity}
                      onChange={(e) => setNewLine({ ...newLine, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="w-32">
                    <Label>Batch #</Label>
                    <Input
                      value={newLine.batch_number}
                      onChange={(e) => setNewLine({ ...newLine, batch_number: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <Button type="button" onClick={addLine} disabled={!newLine.item_id}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {transferLines.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Batch #</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferLines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>{line.item_name}</TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell>{line.batch_number || "-"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createTransfer.mutate()} disabled={createTransfer.isPending}>
                  {createTransfer.isPending ? "Creating..." : "Create Transfer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Transfer History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading transfers...</p>
          ) : transfers && transfers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer: any) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                    <TableCell>{format(new Date(transfer.transfer_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{getWarehouseName(transfer.from_warehouse_id)}</TableCell>
                    <TableCell>{getWarehouseName(transfer.to_warehouse_id)}</TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {transfer.status === "draft" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus.mutate({ id: transfer.id, status: "in_transit" })}
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Ship
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus.mutate({ id: transfer.id, status: "cancelled" })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {transfer.status === "in_transit" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: transfer.id, status: "completed" })}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stock transfers yet</p>
              <p className="text-sm">Create your first transfer to move inventory between locations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
