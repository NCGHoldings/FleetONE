import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { TrendingUp, Calendar, DollarSign, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SalesRecord {
  id: string;
  sale_date: string;
  lss_outside_sale: number;
  lss_inside_sale: number;
  tyre_sale: number;
  pepiliyana_sale: number;
  other_income: any[];
  total_sale: number;
}

interface SalesSummaryTableProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function SalesSummaryTable({ dateRange }: SalesSummaryTableProps) {
  const navigate = useNavigate();
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadSalesData();
  }, [dateRange]);

  const loadSalesData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('nsp_daily_sales')
        .select('*')
        .gte('sale_date', dateRange.from.toISOString().split('T')[0])
        .lte('sale_date', dateRange.to.toISOString().split('T')[0])
        .order('sale_date', { ascending: false });

      if (error) throw error;

      setSalesData((data || []) as any);
    } catch (error: any) {
      console.error('Error loading sales data:', error);
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = () => {
    const totalSales = salesData.reduce((sum, record) => sum + record.total_sale, 0);
    const daysRecorded = salesData.length;
    const avgDailySales = daysRecorded > 0 ? totalSales / daysRecorded : 0;

    return { totalSales, daysRecorded, avgDailySales };
  };

  const formatCurrency = (value: number) => {
    return `Rs. ${value.toLocaleString()}`;
  };

  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  const handleEdit = (record: SalesRecord) => {
    // Navigate to daily sales page with pre-filled data
    navigate(`/nsp-daily-sales?edit=${record.id}&date=${record.sale_date}`);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('nsp_daily_sales')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales record deleted successfully",
      });

      loadSalesData();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete sales record",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading sales data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSales)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Days Recorded</p>
              <p className="text-2xl font-bold text-blue-600">{stats.daysRecorded}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Avg Daily Sales</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.avgDailySales)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      {salesData.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No sales data found</p>
            <p className="text-sm">Try adjusting the date range or add new sales entries</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">LSS Outside</TableHead>
                  <TableHead className="text-right">LSS Inside</TableHead>
                  <TableHead className="text-right">Tyre Sale</TableHead>
                  <TableHead className="text-right">Breakdown</TableHead>
                  <TableHead className="text-right">Other</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((record) => {
                  const otherTotal = record.other_income?.reduce(
                    (sum: number, item: any) => sum + (item.amount || 0),
                    0
                  ) || 0;

                  return (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {format(new Date(record.sale_date + 'T00:00:00'), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">{formatCompact(record.lss_outside_sale)}</TableCell>
                      <TableCell className="text-right">{formatCompact(record.lss_inside_sale)}</TableCell>
                      <TableCell className="text-right">{formatCompact(record.tyre_sale)}</TableCell>
                      <TableCell className="text-right">{formatCompact(record.pepiliyana_sale)}</TableCell>
                      <TableCell className="text-right">{formatCompact(otherTotal)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(record.total_sale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(record.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sales record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
