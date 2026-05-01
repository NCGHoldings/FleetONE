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
import { Plus, Search, Edit, Trash2, Building2, Store, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { useVendorBankAccounts, useSaveVendorBankAccounts } from "@/hooks/useVendorBankAccounts";
import { useActiveVendorCategories } from "@/hooks/useVendorCategories";
import { DataExportMenu } from "@/components/ui/DataExportMenu";

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
  vendor_category_id: string | null;
  created_at: string | null;
}

interface BankAccountRow {
  account_label: string;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  account_holder_name: string;
  is_default: boolean;
}

export function VendorMasterView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const queryClient = useQueryClient();
  const { selectedCompanyId, selectedCompany, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const generateNumber = useGenerateNumber();
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const saveBankAccounts = useSaveVendorBankAccounts();
  const { data: vendorCategories } = useActiveVendorCategories();
  
  // Fetch bank accounts when editing
  const { data: existingBankAccounts } = useVendorBankAccounts(editingVendor?.id);
  
  // For consolidated GL: use parent company ID for storage, filter by business unit
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  // Load existing bank accounts when editing
  useEffect(() => {
    if (editingVendor && existingBankAccounts) {
      setBankAccounts(existingBankAccounts.map(acc => ({
        account_label: acc.account_label,
        bank_name: acc.bank_name,
        bank_branch: acc.bank_branch || "",
        account_number: acc.account_number,
        account_holder_name: acc.account_holder_name || "",
        is_default: acc.is_default,
      })));
    }
  }, [editingVendor, existingBankAccounts]);

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
    vendor_category_id: "",
  });

  // Bank account helpers
  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, {
      account_label: bankAccounts.length === 0 ? "Primary" : "",
      bank_name: "",
      bank_branch: "",
      account_number: "",
      account_holder_name: "",
      is_default: bankAccounts.length === 0,
    }]);
  };

  const removeBankAccount = (index: number) => {
    const updated = bankAccounts.filter((_, i) => i !== index);
    // If removed the default, make first one default
    if (updated.length > 0 && !updated.some(a => a.is_default)) {
      updated[0].is_default = true;
    }
    setBankAccounts(updated);
  };

  const updateBankAccount = (index: number, field: keyof BankAccountRow, value: string | boolean) => {
    const updated = [...bankAccounts];
    if (field === "is_default" && value === true) {
      updated.forEach(a => a.is_default = false);
    }
    (updated[index] as any)[field] = value;
    setBankAccounts(updated);
  };

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors", effectiveCompanyId, businessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("vendors")
        .select("*, vendor_categories(category_code, category_name)")
        .order("vendor_code", { ascending: false });
      
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
      const finalCode = await generateNumber("vendor");
      const { data: inserted, error } = await supabase.from("vendors").insert([{
        vendor_code: finalCode,
        vendor_name: data.vendor_name,
        contact_person: data.contact_person || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        tax_id: data.tax_id || null,
        payment_terms: parseInt(data.payment_terms) || 30,
        wht_applicable: data.wht_applicable === "true",
        wht_rate: data.wht_rate ? parseFloat(data.wht_rate) : null,
        vendor_category_id: data.vendor_category_id || null,
        is_active: true,
        company_id: effectiveCompanyId,
        business_unit_code: businessUnitCode,
      }]).select().single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: async (inserted) => {
      // Save bank accounts
      if (bankAccounts.length > 0 && inserted?.id) {
        await saveBankAccounts.mutateAsync({
          vendorId: inserted.id,
          accounts: bankAccounts.map(acc => ({
            account_label: acc.account_label,
            bank_name: acc.bank_name,
            bank_branch: acc.bank_branch || null,
            account_number: acc.account_number,
            account_holder_name: acc.account_holder_name || null,
            is_default: acc.is_default,
          })),
        });
      }
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
          vendor_category_id: data.vendor_category_id || null,
        })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (vendorId) => {
      // Save bank accounts
      await saveBankAccounts.mutateAsync({
        vendorId,
        accounts: bankAccounts.map(acc => ({
          account_label: acc.account_label,
          bank_name: acc.bank_name,
          bank_branch: acc.bank_branch || null,
          account_number: acc.account_number,
          account_holder_name: acc.account_holder_name || null,
          is_default: acc.is_default,
        })),
      });
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
      vendor_category_id: "",
    });
    setBankAccounts([]);
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
      vendor_category_id: vendor.vendor_category_id || "",
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
          <Dialog open={isDialogOpen} onOpenChange={async (open) => {
            setIsDialogOpen(open);
            if (open && !editingVendor) {
              // Note: auto-generate code exactly at save to prevent skipped numbers on cancel
            }
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
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor_code">Vendor Code *</Label>
                    <div className="relative">
                      <Input
                        id="vendor_code"
                        value={formData.vendor_code}
                        onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                        required
                        readOnly={!editingVendor}
                        placeholder="Auto-generated"
                        className={!editingVendor ? "bg-muted pr-9" : ""}
                      />
                      {isGeneratingCode && (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
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
                    <Label>Vendor Category</Label>
                    <Select
                      value={formData.vendor_category_id || "_none"}
                      onValueChange={(value) => setFormData({ ...formData, vendor_category_id: value === "_none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">No Category</SelectItem>
                        {vendorCategories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.category_code} - {cat.category_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                {/* Banking Details Section */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Banking Details</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addBankAccount}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Account
                    </Button>
                  </div>
                  {bankAccounts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No bank accounts added. Click "Add Account" to add payment details.</p>
                  )}
                  {bankAccounts.map((acc, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Account {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Star className={`h-3.5 w-3.5 ${acc.is_default ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                            <Label htmlFor={`default-${idx}`} className="text-xs">Default</Label>
                            <Switch
                              id={`default-${idx}`}
                              checked={acc.is_default}
                              onCheckedChange={(checked) => updateBankAccount(idx, "is_default", checked)}
                            />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBankAccount(idx)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Account Label *</Label>
                          <Input
                            value={acc.account_label}
                            onChange={(e) => updateBankAccount(idx, "account_label", e.target.value)}
                            placeholder="e.g., Primary, USD"
                            className="h-8 text-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Bank Name *</Label>
                          <Input
                            value={acc.bank_name}
                            onChange={(e) => updateBankAccount(idx, "bank_name", e.target.value)}
                            placeholder="Bank name"
                            className="h-8 text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Branch</Label>
                          <Input
                            value={acc.bank_branch}
                            onChange={(e) => updateBankAccount(idx, "bank_branch", e.target.value)}
                            placeholder="Branch"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Account Number *</Label>
                          <Input
                            value={acc.account_number}
                            onChange={(e) => updateBankAccount(idx, "account_number", e.target.value)}
                            placeholder="Account number"
                            className="h-8 text-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Account Holder</Label>
                          <Input
                            value={acc.account_holder_name}
                            onChange={(e) => updateBankAccount(idx, "account_holder_name", e.target.value)}
                            placeholder="Holder name"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>
          <DataExportMenu 
            data={filteredVendors || []}
            title="Vendor Master"
            filename="vendors"
            headers={["Vendor Code", "Vendor Name", "Category", "Contact", "Email", "Tax ID", "Terms (Days)", "Status"]}
            transformData={(data) => data.map(v => [
              v.vendor_code || 'N/A',
              v.vendor_name || 'N/A',
              (v as any).vendor_categories?.category_name || 'N/A',
              v.contact_person || 'N/A',
              v.email || 'N/A',
              v.tax_id || 'N/A',
              v.payment_terms?.toString() || '30',
              v.is_active ? "Active" : "Inactive"
            ])}
          />
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
                  <TableHead>Category</TableHead>
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
                    <TableCell className="font-mono text-sm">
                      <div>{vendor.vendor_code}</div>
                      {(vendor as any).legacy_number && (vendor as any).legacy_number !== vendor.vendor_code && (
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">was: {(vendor as any).legacy_number}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                    <TableCell>
                      {(vendor as any).vendor_categories?.category_code 
                        ? <Badge variant="outline">{(vendor as any).vendor_categories.category_code}</Badge>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
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
