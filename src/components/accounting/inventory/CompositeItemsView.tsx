import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Layers, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";

interface CompositeItem {
  id: string;
  parent_item_id: string;
  component_item_id: string;
  quantity: number;
  component_item?: {
    item_code: string;
    item_name: string;
    standard_cost: number | null;
  };
}

export const CompositeItemsView = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [componentForm, setComponentForm] = useState({
    component_item_id: "",
    quantity: 1,
  });

  // Fetch all items
  const { data: items } = useQuery({
    queryKey: ["items_composite", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("items")
        .select("id, item_code, item_name, selling_price, standard_cost, is_composite")
        .eq("company_id", selectedCompany.id)
        .eq("is_active", true)
        .order("item_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Fetch composite items
  const { data: compositeItems, isLoading } = useQuery({
    queryKey: ["composite_items", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("composite_items")
        .select(`
          id,
          parent_item_id,
          component_item_id,
          quantity,
          component_item:items!composite_items_component_item_id_fkey(item_code, item_name, standard_cost)
        `)
        .eq("company_id", selectedCompany.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as CompositeItem[];
    },
    enabled: !!selectedCompany?.id,
  });

  // Group composite items by parent
  const groupedComposites = useMemo(() => {
    if (!compositeItems || !items) return {};
    
    const grouped: Record<string, { parent: any; components: CompositeItem[] }> = {};
    
    compositeItems.forEach((ci: CompositeItem) => {
      if (!grouped[ci.parent_item_id]) {
        const parentItem = items.find((i: any) => i.id === ci.parent_item_id);
        if (parentItem) {
          grouped[ci.parent_item_id] = {
            parent: parentItem,
            components: [],
          };
        }
      }
      if (grouped[ci.parent_item_id]) {
        grouped[ci.parent_item_id].components.push(ci);
      }
    });
    
    return grouped;
  }, [compositeItems, items]);

  // Add component to composite
  const addComponent = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id || !selectedParentId) throw new Error("Missing data");
      
      const { error } = await supabase.from("composite_items").insert({
        parent_item_id: selectedParentId,
        component_item_id: componentForm.component_item_id,
        quantity: componentForm.quantity,
        company_id: selectedCompany.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composite_items"] });
      toast.success("Component added");
      setComponentForm({ component_item_id: "", quantity: 1 });
    },
    onError: () => toast.error("Failed to add component"),
  });

  // Remove component
  const removeComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("composite_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composite_items"] });
      toast.success("Component removed");
    },
  });

  const calculateTotalCost = (components: CompositeItem[]) => {
    return components.reduce((sum, comp) => {
      const cost = comp.component_item?.standard_cost || 0;
      return sum + (cost * comp.quantity);
    }, 0);
  };

  const compositeParents = items?.filter((i: any) => i.is_composite) || [];
  const availableComponents = items?.filter((i: any) => i.id !== selectedParentId) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Assemblies / Kits</h2>
          <p className="text-muted-foreground">Define composite items and their Bill of Materials (BOM)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Components
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Component to Assembly</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Parent Item (Assembly/Kit) *</Label>
                <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assembly item" />
                  </SelectTrigger>
                  <SelectContent>
                    {compositeParents.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item_code} - {item.item_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only items marked as "Composite" in Item Master appear here
                </p>
              </div>

              <div className="space-y-2">
                <Label>Component Item *</Label>
                <Select
                  value={componentForm.component_item_id}
                  onValueChange={(v) => setComponentForm({ ...componentForm, component_item_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select component" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableComponents.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item_code} - {item.item_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={componentForm.quantity}
                  onChange={(e) => setComponentForm({ ...componentForm, quantity: parseFloat(e.target.value) || 1 })}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => addComponent.mutate()}
                disabled={!selectedParentId || !componentForm.component_item_id || addComponent.isPending}
              >
                {addComponent.isPending ? "Adding..." : "Add Component"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Composite Items List */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading assemblies...</p>
      ) : Object.keys(groupedComposites).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedComposites).map(([parentId, { parent, components }]) => (
            <Card key={parentId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {parent.item_code} - {parent.item_name}
                    </CardTitle>
                    <CardDescription>
                      Selling Price: <CurrencyDisplay amount={parent.selling_price || 0} />
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Component Cost</p>
                    <p className="text-lg font-bold">
                      <CurrencyDisplay amount={calculateTotalCost(components)} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Margin: <CurrencyDisplay amount={(parent.selling_price || 0) - calculateTotalCost(components)} />
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Extended Cost</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map((comp) => (
                      <TableRow key={comp.id}>
                        <TableCell>
                          {comp.component_item?.item_code} - {comp.component_item?.item_name}
                        </TableCell>
                        <TableCell className="text-right">{comp.quantity}</TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={comp.component_item?.standard_cost || 0} />
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={(comp.component_item?.standard_cost || 0) * comp.quantity} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeComponent.mutate(comp.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No composite items configured</p>
              <p className="text-sm">
                First, mark items as "Composite" in the Item Master, then add components here
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
