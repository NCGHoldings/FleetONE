import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Building2, Store } from "lucide-react";
import { toast } from "sonner";

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  payment_terms: number | null;
  wht_applicable: boolean | null;
  wht_rate: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export function VendorMasterView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompanyId, selectedCompany, getEffectiveCompanyId, getBusinessUnitCode, isSubCompanyOfNCGHolding } = useCompany();
  
  // For consolidated GL: use parent company ID for storage, filter by business unit
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = selectedCompanyId && isSubCompanyOfNCGHolding(selectedCompanyId) 
    ? getBusinessUnitCode() 
    : null;

  const [formData, setFormData] = useState({
    vendor_code: "",
    vendor_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    tax_id: "",
    payment_terms: "30",
    wht_applicable: "false",
    wht_rate: "",
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors", effectiveCompanyId, businessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("vendors")
        .select("*")
        .order("vendor_name");
      
      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      // Filter by business unit for sub-company views
      if (businessUnitCode) {
        query = query.eq("business_unit_code", businessUnitCode);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Vendor[];
    },
    enabled: !!selectedCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!selectedCompanyId) throw new Error("Please select a company first");
      const { error } = await supabase.from("vendors").insert([{
        vendor_code: data.vendor_code,
        vendor_name: data.vendor_name,
        contact_person: data.contact_person || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        tax_id: data.tax_id || null,
        payment_terms: parseInt(data.payment_terms) || 30,
        wht_applicable: data.wht_applicable === "true",
        wht_rate: data.wht_rate ? parseFloat(data.wht_rate) : null,
        is_active: true,
        company_id: effectiveCompanyId, // Store under parent company for consolidated GL
        business_unit_code: businessUnitCode, // Tag with business unit for filtering
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create vendor: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("vendors")
        .update({
          vendor_code: data.vendor_code,
          vendor_name: data.vendor_name,
          contact_person: data.contact_person || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          tax_id: data.tax_id || null,
          payment_terms: parseInt(data.payment_terms) || 30,
          wht_applicable: data.wht_applicable === "true",
          wht_rate: data.wht_rate ? parseFloat(data.wht_rate) : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor updated successfully");
      resetForm();
      setIsDialogOpen(false);
      setEditingVendor(null);
    },
    onError: (error) => {
      toast.error(`Failed to update vendor: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete vendor: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      vendor_code: "",
      vendor_name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      tax_id: "",
      payment_terms: "30",
      wht_applicable: "false",
      wht_rate: "",
    });
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_code: vendor.vendor_code,
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      tax_id: vendor.tax_id || "",
      payment_terms: vendor.payment_terms?.toString() || "30",
      wht_applicable: vendor.wht_applicable ? "true" : "false",
      wht_rate: vendor.wht_rate?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredVendors = vendors?.filter(
    (v) =>
      v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendor_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>Vendor Master</CardTitle>
            <Badge variant="secondary">{vendors?.length || 0} vendors</Badge>
            {selectedCompany && (
              <Badge variant="outline" className="ml-2">
                <Building2 className="h-3 w-3 mr-1" />
                {selectedCompany.name}
              </Badge>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingVendor(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor_code">Vendor Code *</Label>
                    <Input
                      id="vendor_code"
                      value={formData.vendor_code}
                      onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor_name">Vendor Name *</Label>
                    <Input
                      id="vendor_name"
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID / VAT No.</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment_terms">Payment Terms (days)</Label>
                    <Input
                      id="payment_terms"
                      type="number"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wht_applicable">WHT Applicable</Label>
                    <Select
                      value={formData.wht_applicable}
                      onValueChange={(value) => setFormData({ ...formData, wht_applicable: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.wht_applicable === "true" && (
                  <div className="space-y-2">
                    <Label htmlFor="wht_rate">WHT Rate (%)</Label>
                    <Input
                      id="wht_rate"
                      type="number"
                      step="0.01"
                      value={formData.wht_rate}
                      onChange={(e) => setFormData({ ...formData, wht_rate: e.target.value })}
                      placeholder="e.g., 5"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingVendor ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {!selectedCompanyId ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Please select a company from the dropdown above</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading vendors...</div>
        ) : filteredVendors?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No vendors found for {selectedCompany?.name}</p>
            <p className="text-sm mt-1">Add a vendor to get started</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>WHT</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors?.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-mono text-sm">{vendor.vendor_code}</TableCell>
                    <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                    <TableCell>{vendor.contact_person || "-"}</TableCell>
                    <TableCell>{vendor.email || "-"}</TableCell>
                    <TableCell>{vendor.tax_id || "-"}</TableCell>
                    <TableCell>{vendor.payment_terms || 30} days</TableCell>
                    <TableCell>
                      {vendor.wht_applicable ? (
                        <Badge variant="outline">{vendor.wht_rate || 0}%</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.is_active ? "default" : "secondary"}>
                        {vendor.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(vendor)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(vendor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
