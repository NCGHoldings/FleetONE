import { useState } from "react";
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
import { Plus, Tag, Trash2, Edit, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const PRICE_TYPES = [
  { id: "fixed", label: "Fixed Price" },
  { id: "percentage_discount", label: "Discount %" },
  { id: "percentage_markup", label: "Markup %" },
];

export const PriceListsView = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_type: "fixed",
    effective_from: "",
    effective_to: "",
  });

  // Fetch price lists
  const { data: priceLists, isLoading } = useQuery({
    queryKey: ["price_lists", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("price_lists")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Create price list
  const createPriceList = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error("No company selected");
      const { error } = await supabase.from("price_lists").insert({
        name: formData.name,
        description: formData.description || null,
        price_type: formData.price_type,
        effective_from: formData.effective_from || null,
        effective_to: formData.effective_to || null,
        currency: "LKR",
        is_active: true,
        company_id: selectedCompany.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price_lists"] });
      toast.success("Price list created");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create price list"),
  });

  // Delete price list
  const deletePriceList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price_lists"] });
      toast.success("Price list deleted");
    },
    onError: () => toast.error("Failed to delete price list"),
  });

  // Toggle default
  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      // First unset all defaults
      await (supabase as any)
        .from("price_lists")
        .update({ is_default: false })
        .eq("company_id", selectedCompany?.id);
      
      // Then set the new default
      const { error } = await supabase
        .from("price_lists")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price_lists"] });
      toast.success("Default price list updated");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_type: "fixed",
      effective_from: "",
      effective_to: "",
    });
  };

  const getPriceTypeLabel = (type: string) => {
    return PRICE_TYPES.find(t => t.id === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Price Lists</h2>
          <p className="text-muted-foreground">Manage customer-specific pricing and volume discounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Price List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Price List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VIP Customer Pricing"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Special pricing for VIP customers..."
                />
              </div>
              <div className="space-y-2">
                <Label>Price Type</Label>
                <Select value={formData.price_type} onValueChange={(v) => setFormData({ ...formData, price_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective To</Label>
                  <Input
                    type="date"
                    value={formData.effective_to}
                    onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createPriceList.mutate()}
                disabled={!formData.name || createPriceList.isPending}
              >
                {createPriceList.isPending ? "Creating..." : "Create Price List"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Price Lists
          </CardTitle>
          <CardDescription>Define different pricing strategies for your customers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading price lists...</p>
          ) : priceLists && priceLists.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Effective Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.map((list: any) => (
                  <TableRow key={list.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{list.name}</p>
                        {list.description && (
                          <p className="text-xs text-muted-foreground">{list.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPriceTypeLabel(list.price_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {list.effective_from || list.effective_to ? (
                        <span className="text-sm">
                          {list.effective_from ? format(new Date(list.effective_from), "dd MMM yyyy") : "Start"} -{" "}
                          {list.effective_to ? format(new Date(list.effective_to), "dd MMM yyyy") : "Ongoing"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Always Active</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={list.is_active ? "default" : "secondary"}>
                          {list.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {list.is_default && (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!list.is_default && (
                          <Button variant="ghost" size="sm" onClick={() => setDefault.mutate(list.id)}>
                            Set Default
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deletePriceList.mutate(list.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No price lists created</p>
              <p className="text-sm">Create a price list to offer custom pricing to your customers</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
