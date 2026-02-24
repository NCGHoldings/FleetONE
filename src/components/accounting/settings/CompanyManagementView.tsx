import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Building2, Edit, Trash2, ChevronRight, Building, Bus, Truck, Car, Factory } from "lucide-react";

interface Company {
  id: string;
  name: string;
  short_code?: string | null;
  company_code?: string | null;
  parent_company_id?: string | null;
  business_unit_type?: string | null;
  tax_registration?: string | null;
  fiscal_year_start?: number | null;
  default_currency?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

const BUSINESS_UNIT_TYPES = [
  { value: "holding", label: "Holding Company", icon: Building2 },
  { value: "school_bus", label: "School Bus Operations", icon: Bus },
  { value: "special_hire", label: "Special Hire", icon: Bus },
  { value: "yutong", label: "Yutong Sales", icon: Bus },
  { value: "sinotruck", label: "Sinotruck Sales", icon: Truck },
  { value: "light_vehicle", label: "Light Vehicle Sales", icon: Car },
  { value: "manufacturing", label: "Manufacturing", icon: Factory },
  { value: "other", label: "Other", icon: Building },
];

const getBusinessUnitIcon = (type?: string | null) => {
  const unit = BUSINESS_UNIT_TYPES.find(u => u.value === type);
  const IconComponent = unit?.icon || Building;
  return <IconComponent className="h-4 w-4" />;
};

export function CompanyManagementView() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    short_code: "",
    company_code: "",
    parent_company_id: "",
    business_unit_type: "",
    tax_registration: "",
    fiscal_year_start: 1,
    default_currency: "LKR",
    is_active: true,
  });

  // Fetch all companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-management"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("companies")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  // Get parent companies (those without a parent or are holding companies)
  const parentCompanies = companies.filter(c => !c.parent_company_id || c.business_unit_type === "holding");
  
  // Get sub-companies for a parent
  const getSubCompanies = (parentId: string) => companies.filter(c => c.parent_company_id === parentId);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        short_code: data.short_code || null,
        company_code: data.company_code || null,
        parent_company_id: data.parent_company_id || null,
        business_unit_type: data.business_unit_type || null,
        tax_registration: data.tax_registration || null,
        fiscal_year_start: data.fiscal_year_start || 1,
        default_currency: data.default_currency || "LKR",
        is_active: data.is_active,
      };

      if (editingCompany) {
        const { error } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", editingCompany.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("companies")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies-management"] });
      queryClient.invalidateQueries({ queryKey: ["companies-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success(editingCompany ? "Company updated successfully" : "Company created successfully");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Failed to save company: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies-management"] });
      queryClient.invalidateQueries({ queryKey: ["companies-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete company: ${error.message}`);
    },
  });

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name || "",
        short_code: company.short_code || "",
        company_code: company.company_code || "",
        parent_company_id: company.parent_company_id || "",
        business_unit_type: company.business_unit_type || "",
        tax_registration: company.tax_registration || "",
        fiscal_year_start: company.fiscal_year_start || 1,
        default_currency: company.default_currency || "LKR",
        is_active: company.is_active ?? true,
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: "",
        short_code: "",
        company_code: "",
        parent_company_id: "",
        business_unit_type: "",
        tax_registration: "",
        fiscal_year_start: 1,
        default_currency: "LKR",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCompany(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const renderCompanyRow = (company: Company, level: number = 0) => {
    const subCompanies = getSubCompanies(company.id);
    
    return (
      <>
        <TableRow key={company.id}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {level > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {getBusinessUnitIcon(company.business_unit_type)}
              <span className="font-medium">{company.name}</span>
            </div>
          </TableCell>
          <TableCell>{company.short_code || "-"}</TableCell>
          <TableCell>{company.company_code || "-"}</TableCell>
          <TableCell>
            <Badge variant={company.business_unit_type === "holding" ? "default" : "secondary"}>
              {BUSINESS_UNIT_TYPES.find(t => t.value === company.business_unit_type)?.label || "Not Set"}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={company.is_active ? "default" : "outline"}>
              {company.is_active ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => handleOpenDialog(company)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-destructive"
                onClick={() => {
                  if (confirm(`Delete ${company.name}?`)) {
                    deleteMutation.mutate(company.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {subCompanies.map(sub => renderCompanyRow(sub, level + 1))}
      </>
    );
  };

  // Get root companies (no parent)
  const rootCompanies = companies.filter(c => !c.parent_company_id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Management
          </CardTitle>
          <CardDescription>
            Manage your company hierarchy and business units
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingCompany ? "Edit Company" : "Add New Company"}</DialogTitle>
                <DialogDescription>
                  {editingCompany ? "Update company details" : "Create a new company or business unit"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., NCG Holdings Ltd"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="short_code">Short Code</Label>
                    <Input
                      id="short_code"
                      value={formData.short_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, short_code: e.target.value }))}
                      placeholder="e.g., NCG"
                      maxLength={10}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company_code">Company Code</Label>
                    <Input
                      id="company_code"
                      value={formData.company_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_code: e.target.value }))}
                      placeholder="e.g., NCG-001"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="parent">Parent Company</Label>
                  <Select
                    value={formData.parent_company_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, parent_company_id: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (Root Company)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Root Company)</SelectItem>
                      {companies
                        .filter(c => c.id !== editingCompany?.id)
                        .map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="business_unit_type">Business Unit Type</Label>
                  <Select
                    value={formData.business_unit_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, business_unit_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_UNIT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="tax_registration">Tax Registration Number</Label>
                  <Input
                    id="tax_registration"
                    value={formData.tax_registration}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_registration: e.target.value }))}
                    placeholder="e.g., VAT1234567"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fiscal_year_start">Fiscal Year Start Month</Label>
                    <Select
                      value={String(formData.fiscal_year_start)}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fiscal_year_start: Number(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="default_currency">Default Currency</Label>
                    <Select
                      value={formData.default_currency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, default_currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingCompany ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-muted-foreground">Loading companies...</span>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No companies configured yet</p>
            <Button variant="outline" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Company
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Short Code</TableHead>
                <TableHead>Company Code</TableHead>
                <TableHead>Business Unit Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rootCompanies.map(company => renderCompanyRow(company, 0))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}