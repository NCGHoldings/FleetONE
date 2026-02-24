import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Pencil, Upload, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  short_code?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_registration_number?: string;
  registration_number?: string;
  default_currency?: string;
  fiscal_year_start?: number;
  is_active: boolean;
  display_order?: number;
}

export const CompanySettingsView = () => {
  const queryClient = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({});

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as Company[];
    },
  });

  const createCompany = useMutation({
    mutationFn: async (company: Partial<Company>) => {
      const { data, error } = await supabase
        .from("companies")
        .insert([{
          name: company.name,
          short_code: company.short_code,
          address: company.address,
          phone: company.phone,
          email: company.email,
          website: company.website,
          tax_registration_number: company.tax_registration_number,
          registration_number: company.registration_number,
          default_currency: company.default_currency || "LKR",
          is_active: true,
          display_order: (companies?.length || 0) + 1,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies-all"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created successfully");
      setIsDialogOpen(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create company");
    },
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies-all"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated successfully");
      setEditingCompany(null);
      setIsDialogOpen(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update company");
    },
  });

  const toggleCompanyStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("companies")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies-all"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      // Dispatch event to notify CompanySwitcher
      window.dispatchEvent(new CustomEvent("companiesUpdated"));
    },
  });

  const uploadLogo = async (file: File, companyId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/logo.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from("document-headers")
      .upload(fileName, file, { upsert: true });
    
    if (error) {
      toast.error("Failed to upload logo");
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from("document-headers")
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, companyId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (companyId) {
      const url = await uploadLogo(file, companyId);
      if (url) {
        await updateCompany.mutateAsync({ id: companyId, logo_url: url });
      }
    } else {
      // For new company, just store locally until save
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData(company);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingCompany(null);
    setFormData({ default_currency: "LKR" });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingCompany) {
      updateCompany.mutate({ id: editingCompany.id, ...formData });
    } else {
      createCompany.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading companies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Company Management</h2>
          <p className="text-muted-foreground mt-1">
            Add, edit, and manage companies. Disabled companies won't appear in dropdown selectors.
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <div className="grid gap-4">
        {companies?.map((company, index) => (
          <Card key={company.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className="text-muted-foreground cursor-grab">
                <GripVertical className="h-5 w-5" />
              </div>
              
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{company.name}</h3>
                  {company.short_code && (
                    <Badge variant="outline" className="font-mono">{company.short_code}</Badge>
                  )}
                  {!company.is_active && (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {company.email && <span>{company.email}</span>}
                  {company.phone && <span>{company.phone}</span>}
                  {company.tax_registration_number && (
                    <span>TIN: {company.tax_registration_number}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`active-${company.id}`} className="text-sm text-muted-foreground">
                    Active
                  </Label>
                  <Switch
                    id={`active-${company.id}`}
                    checked={company.is_active}
                    onCheckedChange={(checked) => toggleCompanyStatus.mutate({ id: company.id, is_active: checked })}
                  />
                </div>
                
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(company)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        
        {(!companies || companies.length === 0) && (
          <Card className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No companies configured yet.</p>
            <Button className="mt-4" onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Company
            </Button>
          </Card>
        )}
      </div>

      {/* Add/Edit Company Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Company" : "Add New Company"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Logo Upload */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    {formData.logo_url ? "Change Logo" : "Upload Logo"}
                  </div>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e, editingCompany?.id)}
                />
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or GIF. Max 5MB.</p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_code">Short Code</Label>
                <Input
                  id="short_code"
                  value={formData.short_code || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_code: e.target.value.toUpperCase() }))}
                  placeholder="NAS"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+94 11 234 5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://www.company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Company Address"
                rows={2}
              />
            </div>

            {/* Registration Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_registration_number">Tax Registration Number (TIN)</Label>
                <Input
                  id="tax_registration_number"
                  value={formData.tax_registration_number || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_registration_number: e.target.value }))}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration_number">Business Registration Number</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                  placeholder="PV12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_currency">Default Currency</Label>
                <Input
                  id="default_currency"
                  value={formData.default_currency || "LKR"}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_currency: e.target.value.toUpperCase() }))}
                  placeholder="LKR"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscal_year_start">Fiscal Year Start Month</Label>
                <Input
                  id="fiscal_year_start"
                  type="number"
                  min={1}
                  max={12}
                  value={formData.fiscal_year_start || 1}
                  onChange={(e) => setFormData(prev => ({ ...prev, fiscal_year_start: parseInt(e.target.value) }))}
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || createCompany.isPending || updateCompany.isPending}
            >
              {(createCompany.isPending || updateCompany.isPending) ? "Saving..." : "Save Company"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
