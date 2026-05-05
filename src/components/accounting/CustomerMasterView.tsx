import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveCustomerCategories } from "@/hooks/useCustomerCategories";
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
import { Plus, Search, Edit, Trash2, Users, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGenerateNumber } from "@/hooks/useNumbering";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(amount).replace("LKR", "Rs");
};

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  credit_limit: number | null;
  payment_terms: number | null;
  is_active: boolean | null;
  customer_category_id: string | null;
  is_global: boolean;
}

export function CustomerMasterView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompanyId, selectedCompany, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const generateNumber = useGenerateNumber();
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const { data: categories } = useActiveCustomerCategories();
  
  // For consolidated GL: use parent company ID for storage, filter by business unit
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  const [formData, setFormData] = useState({
    customer_code: "",
    customer_name: "",
    contact_person: "",
    email: "",
    phone: "",
    billing_address: "",
    credit_limit: "",
    payment_terms: "30",
    customer_category_id: "",
    is_global: false,
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", selectedCompanyId, effectiveCompanyId, businessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*, customer_categories(category_code, category_name)")
        .order("customer_code", { ascending: false });
      
      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      // Filter by business unit for sub-company views
      if (businessUnitCode) {
        query = query.or(`business_unit_code.eq.${businessUnitCode},is_global.eq.true`);
      } else if (selectedCompany && !selectedCompany.name.includes("Holding") && !selectedCompany.parent_company_id) {
        // Parent companies skip module filtering
      } else if (selectedCompany) {
        // Fallback to source_module mapping since legacy bridged records use source_module instead of business_unit_code
        const cName = selectedCompany.name.toLowerCase();
        if (cName.includes("yutong")) {
          query = query.or(`source_module.eq.yutong,is_global.eq.true`);
        } else if (cName.includes("sinotruck")) {
          query = query.or(`source_module.eq.sinotruck,is_global.eq.true`);
        } else if (cName.includes("special hire")) {
          query = query.or(`source_module.eq.special_hire,is_global.eq.true`);
        } else if (cName.includes("school bus")) {
          query = query.or(`source_module.eq.school_bus,is_global.eq.true`);
        } else if (cName.includes("light vehicle")) {
          query = query.or(`source_module.eq.light_vehicle,is_global.eq.true`);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!selectedCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!selectedCompanyId) throw new Error("Please select a company first");
      const finalCode = await generateNumber("customer");
      const { error } = await supabase.from("customers").insert([{
        customer_code: finalCode,
        customer_name: data.customer_name,
        contact_person: data.contact_person || null,
        email: data.email || null,
        phone: data.phone || null,
        billing_address: data.billing_address || null,
        credit_limit: data.credit_limit ? parseFloat(data.credit_limit) : null,
        payment_terms: parseInt(data.payment_terms) || 30,
        is_active: true,
        company_id: effectiveCompanyId,
        business_unit_code: businessUnitCode,
        customer_category_id: data.customer_category_id || null,
        is_global: data.is_global,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create customer: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("customers")
        .update({
          customer_code: data.customer_code,
          customer_name: data.customer_name,
          contact_person: data.contact_person || null,
          email: data.email || null,
          phone: data.phone || null,
          billing_address: data.billing_address || null,
          credit_limit: data.credit_limit ? parseFloat(data.credit_limit) : null,
          payment_terms: parseInt(data.payment_terms) || 30,
          customer_category_id: data.customer_category_id || null,
          is_global: data.is_global,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated successfully");
      resetForm();
      setIsDialogOpen(false);
      setEditingCustomer(null);
    },
    onError: (error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete customer: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      customer_code: "",
      customer_name: "",
      contact_person: "",
      email: "",
      phone: "",
      billing_address: "",
      credit_limit: "",
      payment_terms: "30",
      customer_category_id: "",
      is_global: false,
    });
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_code: customer.customer_code,
      customer_name: customer.customer_name,
      contact_person: customer.contact_person || "",
      email: customer.email || "",
      phone: customer.phone || "",
      billing_address: customer.billing_address || "",
      credit_limit: customer.credit_limit?.toString() || "",
      payment_terms: customer.payment_terms?.toString() || "30",
      customer_category_id: customer.customer_category_id || "",
      is_global: customer.is_global || false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredCustomers = customers?.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Customer Master</CardTitle>
            <Badge variant="secondary">{customers?.length || 0} customers</Badge>
            {selectedCompany && (
              <Badge variant="outline" className="ml-2">
                <Building2 className="h-3 w-3 mr-1" />
                {selectedCompany.name}
              </Badge>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={async (open) => {
            setIsDialogOpen(open);
            if (open && !editingCustomer) {
              // Note: auto-generate code exactly at save to prevent skipped numbers on cancel
            }
            if (!open) {
              resetForm();
              setEditingCustomer(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_code">Customer Code *</Label>
                    <div className="relative">
                      <Input
                        id="customer_code"
                        value={formData.customer_code}
                        onChange={(e) => setFormData({ ...formData, customer_code: e.target.value })}
                        required
                        readOnly={!editingCustomer}
                        placeholder="Auto-generated"
                        className={!editingCustomer ? "bg-muted pr-9" : ""}
                      />
                      {isGeneratingCode && (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
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
                    <Label htmlFor="credit_limit">Credit Limit (Rs)</Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    />
                  </div>
                </div>
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
                  <Label htmlFor="billing_address">Address</Label>
                  <Input
                    id="billing_address"
                    value={formData.billing_address}
                    onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_category">Customer Category</Label>
                  <Select
                    value={formData.customer_category_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_category_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.category_code} - {cat.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Global Customer</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Share this customer across all branches and sub-units.
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_global}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_global: checked })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingCustomer ? "Update" : "Create"}
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
              placeholder="Search customers..."
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
          <div className="text-center py-8 text-muted-foreground">Loading customers...</div>
        ) : filteredCustomers?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No customers found for {selectedCompany?.name}</p>
            <p className="text-sm mt-1">Add a customer to get started</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Credit Limit</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-sm">
                      <div>{customer.customer_code}</div>
                      {(customer as any).legacy_number && (customer as any).legacy_number !== customer.customer_code && (
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">was: {(customer as any).legacy_number}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {customer.customer_name}
                        {customer.is_global && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Global</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(customer as any).customer_categories?.category_code 
                        ? <Badge variant="outline">{(customer as any).customer_categories.category_code}</Badge>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{customer.contact_person || "-"}</TableCell>
                    <TableCell>{customer.email || "-"}</TableCell>
                    <TableCell className="text-right">
                      {customer.credit_limit ? formatLKR(customer.credit_limit) : "-"}
                    </TableCell>
                    <TableCell>{customer.payment_terms || 30} days</TableCell>
                    <TableCell>
                      <Badge variant={customer.is_active ? "default" : "secondary"}>
                        {customer.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(customer.id)}
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
