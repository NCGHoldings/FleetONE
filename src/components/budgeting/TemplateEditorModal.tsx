import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { useState } from "react";
import { BudgetTemplate } from "@/hooks/useBudgetTemplates";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LineItem {
  name: string;
  account_code?: string;
  category: string;
  subcategory: string;
  department: string;
  default_amount?: number;
}

interface TemplateEditorModalProps {
  template: BudgetTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedTemplate: BudgetTemplate) => void;
}

export function TemplateEditorModal({ template, open, onClose, onSave }: TemplateEditorModalProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (!template) return [];
    const structure = template.template_structure as any;
    return (structure?.line_items || []) as LineItem[];
  });

  const [newItem, setNewItem] = useState<LineItem>({
    name: "",
    account_code: "",
    category: "Expense",
    subcategory: "Operating Expenses",
    department: "Administration",
    default_amount: 0,
  });

  const categories = ["Revenue", "Expense", "Cash Flow"];
  const subcategories = {
    Revenue: ["Operating Revenue", "Other Income"],
    Expense: ["Fixed Expenses", "Operating Expenses", "Maintenance", "Discretionary", "Capital Expenditure"],
    "Cash Flow": ["Cash Inflows", "Cash Outflows"],
  };

  const departments = [
    "Fleet Operations",
    "Maintenance & Repairs",
    "Fuel Management",
    "Staff & Payroll",
    "Administration",
    "Customer Service",
  ];

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      toast.error("Please enter a line item name");
      return;
    }

    setLineItems([...lineItems, { ...newItem }]);
    setNewItem({
      name: "",
      account_code: "",
      category: "Expense",
      subcategory: "Operating Expenses",
      department: "Administration",
      default_amount: 0,
    });
    toast.success("Line item added");
  };

  const handleDeleteItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
    toast.success("Line item removed");
  };

  const handleSave = () => {
    if (!template) return;

    const updatedTemplate: BudgetTemplate = {
      ...template,
      template_structure: {
        ...(template.template_structure as any),
        line_items: lineItems,
      },
    };

    onSave(updatedTemplate);
  };

  const getItemsBySubcategory = (subcategory: string) => {
    return lineItems.filter((item) => item.subcategory === subcategory);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Edit Template: {template?.template_name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Add New Item Form */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="text-sm font-semibold mb-3">Add New Line Item</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Item Name</Label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Enter line item name"
                  />
                </div>
                <div>
                  <Label>Account Code</Label>
                  <Input
                    value={newItem.account_code}
                    onChange={(e) => setNewItem({ ...newItem, account_code: e.target.value })}
                    placeholder="e.g., 401"
                  />
                </div>
                <div>
                  <Label>Default Amount (LKR)</Label>
                  <Input
                    type="number"
                    value={newItem.default_amount}
                    onChange={(e) => setNewItem({ ...newItem, default_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newItem.category}
                    onValueChange={(value) =>
                      setNewItem({
                        ...newItem,
                        category: value,
                        subcategory: subcategories[value as keyof typeof subcategories][0],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <Select
                    value={newItem.subcategory}
                    onValueChange={(value) => setNewItem({ ...newItem, subcategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories[newItem.category as keyof typeof subcategories]?.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Department</Label>
                  <Select value={newItem.department} onValueChange={(value) => setNewItem({ ...newItem, department: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddItem} className="w-full mt-3" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {/* Existing Items by Subcategory */}
            <div className="space-y-4">
              {Object.keys(subcategories).map((category) =>
                subcategories[category as keyof typeof subcategories].map((subcategory) => {
                  const items = getItemsBySubcategory(subcategory);
                  if (items.length === 0) return null;

                  return (
                    <div key={subcategory} className="border rounded-lg p-4">
                      <h3 className="text-sm font-semibold mb-3 text-primary">
                        {subcategory} ({items.length} items)
                      </h3>
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 border rounded bg-background hover:bg-muted/50 transition-colors"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            {item.account_code && (
                              <span className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                                {item.account_code}
                              </span>
                            )}
                            <div className="flex-1 text-sm">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-muted-foreground ml-2">• {item.department}</span>
                              {item.default_amount !== undefined && item.default_amount > 0 && (
                                <span className="text-muted-foreground ml-2">
                                  • LKR {item.default_amount.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(lineItems.indexOf(item))}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Count */}
            <div className="text-center text-sm text-muted-foreground">
              Total Line Items: <span className="font-semibold text-foreground">{lineItems.length}</span>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
