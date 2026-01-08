import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DollarSign, Edit, Calculator, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface FinancialRecord {
  id: string;
  maintenance_record_id: string;
  bay_id: string | null;
  service_type: string;
  total_staff_hours: number;
  hourly_pay_rate: number;
  labour_cost: number;
  inventory_cost: number;
  total_expenses: number;
  profit_margin_percent: number;
  revenue: number;
  net_income: number;
  override_values: any;
  created_at: string;
  maintenance_records?: {
    maintenance_no: string;
    buses?: {
      bus_no: string;
    };
  } | null;
  maintenance_bays?: {
    bay_number: string;
  } | null;
}

export default function FinancialTable() {
  const { hasRole } = useAuth();
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

  const [formData, setFormData] = useState({
    labour_cost: '',
    inventory_cost: '',
    profit_margin_percent: '20'
  });

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  useEffect(() => {
    fetchFinancialRecords();
  }, []);

  const fetchFinancialRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_financials')
        .select(`
          *,
          maintenance_records!inner(
            maintenance_no,
            buses(bus_no)
          ),
          maintenance_bays(bay_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFinancialRecords(data as any || []);
    } catch (error) {
      console.error('Error fetching financial records:', error);
      toast.error('Failed to load financial records');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record);
    setFormData({
      labour_cost: record.labour_cost.toString(),
      inventory_cost: record.inventory_cost.toString(),
      profit_margin_percent: record.profit_margin_percent?.toString() || '20'
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!isAdmin || !editingRecord) {
      toast.error('Access denied');
      return;
    }

    try {
      const labourCost = parseFloat(formData.labour_cost);
      const inventoryCost = parseFloat(formData.inventory_cost);
      const profitMargin = parseFloat(formData.profit_margin_percent);

      const totalExpenses = labourCost + inventoryCost;
      const revenue = totalExpenses * (1 + profitMargin / 100);
      const netIncome = revenue - totalExpenses;

      const { error } = await supabase
        .from('maintenance_financials')
        .update({
          labour_cost: labourCost,
          inventory_cost: inventoryCost,
          profit_margin_percent: profitMargin,
          total_expenses: totalExpenses,
          revenue: revenue,
          net_income: netIncome,
          override_values: {
            labour_cost_overridden: labourCost !== editingRecord.labour_cost,
            inventory_cost_overridden: inventoryCost !== editingRecord.inventory_cost,
            profit_margin_overridden: profitMargin !== editingRecord.profit_margin_percent,
            last_updated: new Date().toISOString()
          }
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast.success('Financial record updated successfully');
      setIsDialogOpen(false);
      fetchFinancialRecords();
    } catch (error: any) {
      console.error('Error updating financial record:', error);
      toast.error('Failed to update financial record');
    }
  };

  const calculateTotals = () => {
    return financialRecords.reduce((totals, record) => ({
      totalLabour: totals.totalLabour + record.labour_cost,
      totalInventory: totals.totalInventory + record.inventory_cost,
      totalExpenses: totals.totalExpenses + record.total_expenses,
      totalRevenue: totals.totalRevenue + record.revenue,
      totalNetIncome: totals.totalNetIncome + record.net_income
    }), {
      totalLabour: 0,
      totalInventory: 0,
      totalExpenses: 0,
      totalRevenue: 0,
      totalNetIncome: 0
    });
  };

  const totals = calculateTotals();

  const columns: ColumnDef<FinancialRecord>[] = [
    {
      accessorKey: "maintenance_records.maintenance_no",
      header: "Maintenance #",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.maintenance_records?.maintenance_no || '-'}
        </div>
      ),
    },
    {
      accessorKey: "maintenance_bays.bay_number",
      header: "Bay ID",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.maintenance_bays?.bay_number || '-'}
        </Badge>
      ),
    },
    {
      accessorKey: "service_type",
      header: "Service Type",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.getValue("service_type")}
        </Badge>
      ),
    },
    {
      accessorKey: "total_staff_hours",
      header: "Staff Hours",
      cell: ({ row }) => (
        <div className="text-center">
          {(row.getValue("total_staff_hours") as number).toFixed(1)}h
        </div>
      ),
    },
    {
      accessorKey: "hourly_pay_rate",
      header: "Pay Rate",
      cell: ({ row }) => (
        <div className="text-right">
          ₨{(row.getValue("hourly_pay_rate") as number).toLocaleString()}/hr
        </div>
      ),
    },
    {
      accessorKey: "labour_cost",
      header: "Labour Cost",
      cell: ({ row }) => (
        <div className="text-right font-medium">
          ₨{(row.getValue("labour_cost") as number).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "inventory_cost",
      header: "Inventory Cost",
      cell: ({ row }) => (
        <div className="text-right">
          ₨{(row.getValue("inventory_cost") as number).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "total_expenses",
      header: "Total Expenses",
      cell: ({ row }) => (
        <div className="text-right font-medium text-destructive">
          ₨{(row.getValue("total_expenses") as number).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "revenue",
      header: "Revenue",
      cell: ({ row }) => (
        <div className="text-right font-medium text-primary">
          ₨{(row.getValue("revenue") as number).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "net_income",
      header: "Net Income",
      cell: ({ row }) => {
        const netIncome = row.getValue("net_income") as number;
        return (
          <div className={`text-right font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₨{netIncome.toLocaleString()}
          </div>
        );
      },
    },
    ...(isAdmin ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEdit(row.original)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Labour</p>
                <p className="text-lg font-bold">₨{totals.totalLabour.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Inventory</p>
                <p className="text-lg font-bold">₨{totals.totalInventory.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-destructive">₨{totals.totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold text-primary">₨{totals.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Net Income</p>
                <p className="text-lg font-bold text-green-600">₨{totals.totalNetIncome.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Table */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Analysis per Repair/Bay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={financialRecords}
            searchKey="maintenance_records.maintenance_no"
            title={`${financialRecords.length} Financial Records`}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Financial Values</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="labour_cost">Labour Cost (₨)</Label>
              <Input
                id="labour_cost"
                type="number"
                step="100"
                value={formData.labour_cost}
                onChange={(e) => setFormData(prev => ({...prev, labour_cost: e.target.value}))}
              />
            </div>

            <div>
              <Label htmlFor="inventory_cost">Inventory Cost (₨)</Label>
              <Input
                id="inventory_cost"
                type="number"
                step="100"
                value={formData.inventory_cost}
                onChange={(e) => setFormData(prev => ({...prev, inventory_cost: e.target.value}))}
              />
            </div>

            <div>
              <Label htmlFor="profit_margin_percent">Profit Margin (%)</Label>
              <Input
                id="profit_margin_percent"
                type="number"
                step="5"
                value={formData.profit_margin_percent}
                onChange={(e) => setFormData(prev => ({...prev, profit_margin_percent: e.target.value}))}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} className="flex-1">
                Update Financial Record
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}