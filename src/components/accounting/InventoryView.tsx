import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, AlertTriangle, TrendingDown, BarChart3, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useItems, useItemStock, useItemCategories } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { ItemForm } from "./ItemForm";
import { StockAdjustmentForm } from "./StockAdjustmentForm";
import { ItemCategoryForm } from "./ItemCategoryForm";
import { Input } from "@/components/ui/input";

export const InventoryView = () => {
  const { data: items, isLoading } = useItems();
  const { data: stock } = useItemStock();
  const { data: categories } = useItemCategories();
  const [showItemForm, setShowItemForm] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-field search filter for items
  const filteredItems = useMemo(() => {
    if (!items || !searchQuery.trim()) return items || [];
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      item.item_code?.toLowerCase().includes(query) ||
      item.item_name?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.item_categories?.category_name?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Multi-field search filter for stock
  const filteredStock = useMemo(() => {
    if (!stock || !searchQuery.trim()) return stock || [];
    const query = searchQuery.toLowerCase();
    return stock.filter((s) =>
      s.items?.item_code?.toLowerCase().includes(query) ||
      s.items?.item_name?.toLowerCase().includes(query) ||
      s.warehouse_id?.toLowerCase().includes(query)
    );
  }, [stock, searchQuery]);

  const getStockStatus = (quantity: number, reorderLevel: number) => {
    if (quantity <= 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (quantity <= reorderLevel) return { label: "Low Stock", variant: "outline" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const itemColumns = [
    {
      accessorKey: "item_code",
      header: "Item Code",
      cell: ({ row }: any) => (
        <span className="font-mono font-medium">{row.original.item_code}</span>
      ),
    },
    {
      accessorKey: "item_name",
      header: "Item Name",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.item_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.description}</p>
        </div>
      ),
    },
    {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }: any) => row.original.item_categories?.category_name || "Uncategorized",
    },
    {
      accessorKey: "unit_of_measure",
      header: "UOM",
      cell: ({ row }: any) => row.original.unit_of_measure || "EA",
    },
    {
      accessorKey: "last_purchase_price",
      header: "Unit Cost",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.last_purchase_price || 0} />,
    },
    {
      accessorKey: "selling_price",
      header: "Selling Price",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.selling_price || 0} />,
    },
    {
      accessorKey: "reorder_level",
      header: "Reorder Level",
      cell: ({ row }: any) => row.original.reorder_level || 0,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">Edit</Button>
          <Button size="sm" variant="outline">Adjust</Button>
        </div>
      ),
    },
  ];

  const stockColumns = [
    {
      accessorKey: "item_code",
      header: "Item",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.items?.item_name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.original.items?.item_code}</p>
        </div>
      ),
    },
    {
      accessorKey: "warehouse_id",
      header: "Location/Warehouse",
      cell: ({ row }: any) => row.original.warehouse_id || "Main Warehouse",
    },
    {
      accessorKey: "quantity_on_hand",
      header: "Quantity",
      cell: ({ row }: any) => (
        <span className="font-semibold">{row.original.quantity_on_hand || 0}</span>
      ),
    },
    {
      accessorKey: "quantity_reserved",
      header: "Reserved",
      cell: ({ row }: any) => row.original.quantity_reserved || 0,
    },
    {
      accessorKey: "quantity_available",
      header: "Available",
      cell: ({ row }: any) => {
        const available = row.original.quantity_available || 0;
        return <span className="font-semibold text-green-600">{available}</span>;
      },
    },
    {
      accessorKey: "average_cost",
      header: "Avg Cost",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.average_cost || 0} />,
    },
    {
      accessorKey: "total_value",
      header: "Total Value",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.total_value || 0} />,
    },
  ];

  const totalItems = items?.length || 0;
  const totalStockQuantity = stock?.reduce((sum, s) => sum + (s.quantity_on_hand || 0), 0) || 0;
  const lowStockItems = stock?.filter(s => 
    (s.quantity_on_hand || 0) <= 10 && (s.quantity_on_hand || 0) > 0
  ).length || 0;
  const outOfStockItems = stock?.filter(s => (s.quantity_on_hand || 0) <= 0).length || 0;
  const totalStockValue = stock?.reduce((sum, s) => sum + (s.total_value || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage items, stock levels, and inventory movements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdjustmentForm(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Stock Adjustment
          </Button>
          <Button onClick={() => setShowItemForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <h3 className="text-2xl font-bold mt-1">{totalItems}</h3>
            </div>
            <Package className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Alert</p>
              <h3 className="text-2xl font-bold text-yellow-600 mt-1">{lowStockItems}</h3>
            </div>
            <TrendingDown className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <h3 className="text-2xl font-bold text-destructive mt-1">{outOfStockItems}</h3>
            </div>
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Stock Value</p>
              <h3 className="text-xl font-bold text-primary mt-1">
                <CurrencyDisplay amount={totalStockValue} />
              </h3>
            </div>
            <Package className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="p-6">
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Item Master</TabsTrigger>
            <TabsTrigger value="stock">Stock by Location</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <DataTable
              columns={itemColumns}
              data={filteredItems}
            />
          </TabsContent>

          <TabsContent value="stock" className="mt-4">
            <DataTable
              columns={stockColumns}
              data={filteredStock}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowCategoryForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {categories?.map((cat) => (
                <Card key={cat.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{cat.category_name}</h4>
                      <p className="text-sm text-muted-foreground">{cat.category_code}</p>
                    </div>
                    <Badge variant={cat.is_active ? "default" : "secondary"}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Valuation: {cat.valuation_method || "Weighted Average"}
                  </p>
                </Card>
              ))}
              {(!categories || categories.length === 0) && (
                <p className="text-muted-foreground col-span-3 text-center py-8">
                  No categories defined. Click "Add Category" to create one.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <p className="text-center text-muted-foreground py-8">
              Stock movement history coming soon
            </p>
          </TabsContent>
        </Tabs>
      </Card>

      <ItemForm open={showItemForm} onOpenChange={setShowItemForm} />
      <StockAdjustmentForm open={showAdjustmentForm} onOpenChange={setShowAdjustmentForm} />
      <ItemCategoryForm open={showCategoryForm} onOpenChange={setShowCategoryForm} />
    </div>
  );
};
