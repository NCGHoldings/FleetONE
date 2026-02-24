import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Warehouse, ChevronDown, ChevronRight, MapPin, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export const WarehouseManagementView = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [expandedWarehouse, setExpandedWarehouse] = useState<string | null>(null);
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [binDialogOpen, setBinDialogOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  
  const [warehouseForm, setWarehouseForm] = useState({
    warehouse_code: "",
    warehouse_name: "",
    address: "",
  });
  
  const [binForm, setBinForm] = useState({
    bin_code: "",
    bin_name: "",
    aisle: "",
    rack: "",
    level: "",
  });

  // Fetch warehouses
  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["warehouses_management", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("warehouses")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .order("warehouse_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Fetch bin locations for expanded warehouse
  const { data: bins } = useQuery({
    queryKey: ["bin_locations_management", expandedWarehouse],
    queryFn: async () => {
      if (!expandedWarehouse) return [];
      const { data, error } = await (supabase as any)
        .from("bin_locations")
        .select("*")
        .eq("warehouse_id", expandedWarehouse)
        .order("bin_code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!expandedWarehouse,
  });

  // Create warehouse
  const createWarehouse = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error("No company selected");
      const { error } = await supabase.from("warehouses").insert({
        ...warehouseForm,
        company_id: selectedCompany.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses_management"] });
      toast.success("Warehouse created");
      setWarehouseDialogOpen(false);
      setWarehouseForm({ warehouse_code: "", warehouse_name: "", address: "" });
    },
    onError: () => toast.error("Failed to create warehouse"),
  });

  // Create bin location
  const createBin = useMutation({
    mutationFn: async () => {
      if (!selectedWarehouseId || !selectedCompany?.id) throw new Error("Missing warehouse");
      const { error } = await supabase.from("bin_locations").insert({
        ...binForm,
        warehouse_id: selectedWarehouseId,
        company_id: selectedCompany.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bin_locations_management"] });
      toast.success("Bin location created");
      setBinDialogOpen(false);
      setBinForm({ bin_code: "", bin_name: "", aisle: "", rack: "", level: "" });
    },
    onError: () => toast.error("Failed to create bin location"),
  });

  // Delete warehouse
  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses_management"] });
      toast.success("Warehouse deleted");
    },
    onError: () => toast.error("Cannot delete warehouse with existing stock"),
  });

  // Delete bin
  const deleteBin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bin_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bin_locations_management"] });
      toast.success("Bin location deleted");
    },
    onError: () => toast.error("Cannot delete bin with existing stock"),
  });

  const openBinDialog = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    setBinDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Warehouse Management</h2>
          <p className="text-muted-foreground">Manage warehouses and bin locations</p>
        </div>
        <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Warehouse</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Warehouse Code *</Label>
                <Input
                  value={warehouseForm.warehouse_code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_code: e.target.value })}
                  placeholder="WH-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Warehouse Name *</Label>
                <Input
                  value={warehouseForm.warehouse_name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_name: e.target.value })}
                  placeholder="Main Warehouse"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={warehouseForm.address}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                  placeholder="Warehouse address..."
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createWarehouse.mutate()}
                disabled={!warehouseForm.warehouse_code || !warehouseForm.warehouse_name || createWarehouse.isPending}
              >
                {createWarehouse.isPending ? "Creating..." : "Create Warehouse"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bin Location Dialog */}
      <Dialog open={binDialogOpen} onOpenChange={setBinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bin Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bin Code *</Label>
                <Input
                  value={binForm.bin_code}
                  onChange={(e) => setBinForm({ ...binForm, bin_code: e.target.value })}
                  placeholder="A-01-01"
                />
              </div>
              <div className="space-y-2">
                <Label>Bin Name</Label>
                <Input
                  value={binForm.bin_name}
                  onChange={(e) => setBinForm({ ...binForm, bin_name: e.target.value })}
                  placeholder="Shelf A Row 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Aisle</Label>
                <Input
                  value={binForm.aisle}
                  onChange={(e) => setBinForm({ ...binForm, aisle: e.target.value })}
                  placeholder="A"
                />
              </div>
              <div className="space-y-2">
                <Label>Rack</Label>
                <Input
                  value={binForm.rack}
                  onChange={(e) => setBinForm({ ...binForm, rack: e.target.value })}
                  placeholder="01"
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Input
                  value={binForm.level}
                  onChange={(e) => setBinForm({ ...binForm, level: e.target.value })}
                  placeholder="01"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => createBin.mutate()}
              disabled={!binForm.bin_code || createBin.isPending}
            >
              {createBin.isPending ? "Creating..." : "Create Bin Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warehouses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Warehouses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading warehouses...</p>
          ) : warehouses && warehouses.length > 0 ? (
            <div className="space-y-2">
              {warehouses.map((warehouse: any) => (
                <Collapsible
                  key={warehouse.id}
                  open={expandedWarehouse === warehouse.id}
                  onOpenChange={(open) => setExpandedWarehouse(open ? warehouse.id : null)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {expandedWarehouse === warehouse.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <p className="font-medium">{warehouse.warehouse_code} - {warehouse.warehouse_name}</p>
                            {warehouse.address && (
                              <p className="text-sm text-muted-foreground">{warehouse.address}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                            {warehouse.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); deleteWarehouse.mutate(warehouse.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-4 bg-muted/30">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Bin Locations
                          </h4>
                          <Button variant="outline" size="sm" onClick={() => openBinDialog(warehouse.id)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Bin
                          </Button>
                        </div>
                        {bins && bins.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Bin Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Aisle</TableHead>
                                <TableHead>Rack</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bins.map((bin: any) => (
                                <TableRow key={bin.id}>
                                  <TableCell className="font-medium">{bin.bin_code}</TableCell>
                                  <TableCell>{bin.bin_name || "-"}</TableCell>
                                  <TableCell>{bin.aisle || "-"}</TableCell>
                                  <TableCell>{bin.rack || "-"}</TableCell>
                                  <TableCell>{bin.level || "-"}</TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" onClick={() => deleteBin.mutate(bin.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No bin locations defined for this warehouse
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No warehouses configured</p>
              <p className="text-sm">Add a warehouse to start managing inventory locations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
