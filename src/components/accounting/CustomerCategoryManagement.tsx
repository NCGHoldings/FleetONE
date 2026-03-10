import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { SearchableAccountSelector } from "@/components/accounting/shared/SearchableAccountSelector";
import {
  useCustomerCategories,
  useCreateCustomerCategory,
  useUpdateCustomerCategory,
  useDeleteCustomerCategory,
  type CustomerCategory,
} from "@/hooks/useCustomerCategories";
import { useChartOfAccounts } from "@/hooks/useAccountingData";

interface CategoryFormData {
  category_code: string;
  category_name: string;
  description: string;
  ar_account_id: string | null;
  revenue_account_id: string | null;
  advance_account_id: string | null;
  is_active: boolean;
}

const emptyForm: CategoryFormData = {
  category_code: "",
  category_name: "",
  description: "",
  ar_account_id: null,
  revenue_account_id: null,
  advance_account_id: null,
  is_active: true,
};

export function CustomerCategoryManagement() {
  const { data: categories, isLoading } = useCustomerCategories();
  const { data: accounts } = useChartOfAccounts();
  const createCategory = useCreateCustomerCategory();
  const updateCategory = useUpdateCustomerCategory();
  const deleteCategory = useDeleteCustomerCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomerCategory | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (cat: CustomerCategory) => {
    setEditingCategory(cat);
    setForm({
      category_code: cat.category_code,
      category_name: cat.category_name,
      description: cat.description || "",
      ar_account_id: cat.ar_account_id,
      revenue_account_id: cat.revenue_account_id,
      advance_account_id: cat.advance_account_id,
      is_active: cat.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.category_code || !form.category_name) return;

    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        ...form,
      });
    } else {
      await createCategory.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure? Customers using this category will lose their GL mapping.")) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const getAccountLabel = (accountId: string | null) => {
    if (!accountId || !accounts) return "—";
    const acc = accounts.find((a) => a.id === accountId);
    return acc ? `${acc.account_code} - ${acc.account_name}` : "—";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Customer Categories</CardTitle>
              <CardDescription>
                Map customer categories to specific GL accounts. Categories override the global Core GL Settings defaults.
              </CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Category" : "New Customer Category"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category Code *</Label>
                    <Input
                      value={form.category_code}
                      onChange={(e) => setForm({ ...form, category_code: e.target.value })}
                      placeholder="EXT"
                      disabled={!!editingCategory}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category Name *</Label>
                    <Input
                      value={form.category_name}
                      onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                      placeholder="External Customer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Trade Receivable Account</Label>
                  <SearchableAccountSelector
                    value={form.ar_account_id || ""}
                    onValueChange={(v) => setForm({ ...form, ar_account_id: v || null })}
                    placeholder="Select AR account..."
                    accountTypes={["asset"]}
                  />
                  <p className="text-xs text-muted-foreground">Overrides the global Trade Receivable for customers in this category</p>
                </div>

                <div className="space-y-2">
                  <Label>Revenue Account</Label>
                  <SearchableAccountSelector
                    value={form.revenue_account_id || ""}
                    onValueChange={(v) => setForm({ ...form, revenue_account_id: v || null })}
                    placeholder="Select revenue account..."
                    accountTypes={["revenue"]}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Advance Liability Account</Label>
                  <SearchableAccountSelector
                    value={form.advance_account_id || ""}
                    onValueChange={(v) => setForm({ ...form, advance_account_id: v || null })}
                    placeholder="Select advance account..."
                    accountTypes={["liability"]}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Active</Label>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleSave}
                    disabled={!form.category_code || !form.category_name || createCategory.isPending || updateCategory.isPending}
                  >
                    {createCategory.isPending || updateCategory.isPending ? "Saving..." : editingCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !categories?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No customer categories yet. Add one to map different customer types to specific GL accounts.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>AR Account</TableHead>
                <TableHead>Revenue Account</TableHead>
                <TableHead>Advance Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-mono text-xs">{cat.category_code}</TableCell>
                  <TableCell className="font-medium">{cat.category_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getAccountLabel(cat.ar_account_id)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getAccountLabel(cat.revenue_account_id)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getAccountLabel(cat.advance_account_id)}</TableCell>
                  <TableCell>
                    <Badge variant={cat.is_active ? "default" : "secondary"}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(cat.id)}
                        disabled={deleteCategory.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
