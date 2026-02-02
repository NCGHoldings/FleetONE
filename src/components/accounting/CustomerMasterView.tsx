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
import { Plus, Search, Edit, Trash2, Users, Building2 } from "lucide-react";
import { toast } from "sonner";

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
  created_at: string | null;
}

export function CustomerMasterView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompanyId, selectedCompany, getEffectiveCompanyId, getBusinessUnitCode, isSubCompanyOfNCGHolding } = useCompany();
  
  // For consolidated GL: use parent company ID for storage, filter by business unit
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = selectedCompanyId && isSubCompanyOfNCGHolding(selectedCompanyId) 
    ? getBusinessUnitCode() 
    : null;

  const [formData, setFormData] = useState({
    customer_code: "",
    customer_name: "",
    contact_person: "",
    email: "",
    phone: "",
    billing_address: "",
    credit_limit: "",
    payment_terms: "30",
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", effectiveCompanyId, businessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*")
        .order("customer_name");
      
      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      // Filter by business unit for sub-company views
      if (businessUnitCode) {
        query = query.eq("business_unit_code", businessUnitCode);
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
      const { error } = await supabase.from("customers").insert([{
        customer_code: data.customer_code,
        customer_name: data.customer_name,
        contact_person: data.contact_person || null,
        email: data.email || null,
        phone: data.phone || null,
        billing_address: data.billing_address || null,
        credit_limit: data.credit_limit ? parseFloat(data.credit_limit) : null,
        payment_terms: parseInt(data.payment_terms) || 30,
        is_active: true,
        company_id: effectiveCompanyId, // Store under parent company for consolidated GL
        business_unit_code: businessUnitCode, // Tag with business unit for filtering
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
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
                    <Input
                      id="customer_code"
                      value={formData.customer_code}
                      onChange={(e) => setFormData({ ...formData, customer_code: e.target.value })}
                      required
                    />
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
                    <TableCell className="font-mono text-sm">{customer.customer_code}</TableCell>
                    <TableCell className="font-medium">{customer.customer_name}</TableCell>
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
