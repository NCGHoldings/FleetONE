import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Search } from "lucide-react";
import { useItems, useCostCenters } from "@/hooks/useAccountingData";
import { useCreatePurchaseRequisition } from "@/hooks/useAccountingMutations";
import { format } from "date-fns";
import { toast } from "sonner";

interface PRLine {
  id: string;
  item_id: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_of_measure: string;
  estimated_unit_price: number;
  estimated_total: number;
  required_date: string;
}

interface PurchaseRequisitionFormProps {
  onSuccess: () => void;
}

// Category detection helper
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

export const PurchaseRequisitionForm = ({
  onSuccess,
}: PurchaseRequisitionFormProps) => {
  const { data: items = [] } = useItems();
  const { data: costCenters = [] } = useCostCenters();
  const createPR = useCreatePurchaseRequisition();

  const [formData, setFormData] = useState({
    requisition_date: format(new Date(), "yyyy-MM-dd"),
    required_date: "",
    department: "",
    cost_center_id: "",
    purpose: "",
    notes: "",
    priority: "normal",
  });

  const [lines, setLines] = useState<PRLine[]>([]);
  const [newLine, setNewLine] = useState<Partial<PRLine>>({
    item_id: "",
    description: "",
    quantity: 1,
    unit_of_measure: "EA",
    estimated_unit_price: 0,
  });

  // Search and filter state
  const [itemSearch, setItemSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Filtered items
  const filteredItems = useMemo(() => {
    const search = itemSearch.toLowerCase();
    return items.filter((item: any) => {
      const matchesCategory = categoryFilter === "all" || getItemCategory(item) === categoryFilter;
      const matchesSearch = !search ||
        item.item_code?.toLowerCase().includes(search) ||
        item.item_name?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [items, itemSearch, categoryFilter]);

  const addLine = () => {
    if (!newLine.description) {
      toast.error("Please enter a description");
      return;
    }

    const item = items.find((i: any) => i.id === newLine.item_id);
    const estimatedTotal =
      (newLine.quantity || 0) * (newLine.estimated_unit_price || 0);

    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        item_id: newLine.item_id || "",
        item_name: item?.item_name || "",
        description: newLine.description || "",
        quantity: newLine.quantity || 1,
        unit_of_measure: newLine.unit_of_measure || "EA",
        estimated_unit_price: newLine.estimated_unit_price || 0,
        estimated_total: estimatedTotal,
        required_date: formData.required_date,
      },
    ]);

    setNewLine({
      item_id: "",
      description: "",
      quantity: 1,
      unit_of_measure: "EA",
      estimated_unit_price: 0,
    });
  };

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const handleItemSelect = (itemId: string) => {
    const item = items.find((i: any) => i.id === itemId);
    if (item) {
      setNewLine({
        ...newLine,
        item_id: itemId,
        description: item.item_name,
        unit_of_measure: item.unit_of_measure || "EA",
        estimated_unit_price: item.selling_price || item.last_purchase_price || 0,
      });
    }
  };

  const totalEstimate = lines.reduce((sum, line) => sum + line.estimated_total, 0);

  const handleSubmit = async (status: "draft" | "pending") => {
    if (lines.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      await createPR.mutateAsync({
        ...formData,
        status,
        estimated_total: totalEstimate,
        lines: lines.map((l) => ({
          item_id: l.item_id || null,
          description: l.description,
          quantity: l.quantity,
          unit_of_measure: l.unit_of_measure,
          estimated_unit_price: l.estimated_unit_price,
          estimated_total: l.estimated_total,
          required_date: l.required_date || null,
        })),
      } as any);
      onSuccess();
    } catch (error) {
      toast.error("Failed to create purchase requisition");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Requisition Date</Label>
          <Input
            type="date"
            value={formData.requisition_date}
            onChange={(e) =>
              setFormData({ ...formData, requisition_date: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Required By Date</Label>
          <Input
            type="date"
            value={formData.required_date}
            onChange={(e) =>
              setFormData({ ...formData, required_date: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Input
            placeholder="e.g., Operations, Maintenance"
            value={formData.department}
            onChange={(e) =>
              setFormData({ ...formData, department: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Cost Center</Label>
          <Select
            value={formData.cost_center_id}
            onValueChange={(value) =>
              setFormData({ ...formData, cost_center_id: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select cost center" />
            </SelectTrigger>
            <SelectContent>
              {costCenters.map((cc: any) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.center_code} - {cc.center_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) =>
              setFormData({ ...formData, priority: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Purpose</Label>
          <Input
            placeholder="Reason for requisition"
            value={formData.purpose}
            onChange={(e) =>
              setFormData({ ...formData, purpose: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Additional notes or instructions..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      {/* Line Items */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Line Items</h3>
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
            </div>

            {/* Add New Line */}
            <div className="grid grid-cols-6 gap-2 items-end">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Item (Optional)</Label>
                <Select
                  value={newLine.item_id}
                  onValueChange={handleItemSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {/* Search bar inside dropdown */}
                    <div className="px-2 pb-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search items..."
                          className="pl-7 h-8 text-sm"
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {filteredItems.map((item: any) => {
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
                    {filteredItems.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No items match your filter
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Description *</Label>
                <Input
                  placeholder="Description"
                  value={newLine.description}
                  onChange={(e) =>
                    setNewLine({ ...newLine, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={newLine.quantity}
                  onChange={(e) =>
                    setNewLine({
                      ...newLine,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Est. Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newLine.estimated_unit_price}
                  onChange={(e) =>
                    setNewLine({
                      ...newLine,
                      estimated_unit_price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>

            {/* Lines Table */}
            {lines.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead className="text-right">Est. Price</TableHead>
                    <TableHead className="text-right">Est. Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.item_name || "-"}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell>{line.unit_of_measure}</TableCell>
                      <TableCell className="text-right font-mono">
                        {line.estimated_unit_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {line.estimated_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-medium">
                      Total Estimate:
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      Rs. {totalEstimate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => handleSubmit("draft")}>
          Save as Draft
        </Button>
        <Button onClick={() => handleSubmit("pending")}>
          Submit for Approval
        </Button>
      </div>
    </div>
  );
};
