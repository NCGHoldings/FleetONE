import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, RefreshCw, TrendingUp, DollarSign, ShoppingCart, Percent } from 'lucide-react';
import { SpreadsheetOrder } from '@/hooks/useYutongSpreadsheetData';
import * as XLSX from 'xlsx';

interface YutongSpreadsheetCoreProps {
  orders: SpreadsheetOrder[];
  loading: boolean;
  onUpdate: (orderId: string, field: string, value: any) => void;
  onRefresh: () => void;
  isPublic?: boolean;
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'in_progress', 'shipped', 'delivered', 'completed', 'cancelled'];
const PHASE_OPTIONS = ['order_placed', 'lc_issuance', 'production', 'shipping', 'customs', 'processing', 'rmv_registration', 'delivery', 'completed'];
const PAYMENT_MODE_OPTIONS = ['cash', 'lease', 'bank_transfer', 'cheque', 'mixed'];

const formatCurrency = (val: number) => val ? `LKR ${val.toLocaleString()}` : '-';

export function YutongSpreadsheetCore({ orders, loading, onUpdate, onRefresh, isPublic }: YutongSpreadsheetCoreProps) {
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      o.order_no.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.company_name.toLowerCase().includes(q) ||
      o.bus_model.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  }, [orders, search]);

  // KPIs
  const totalOrders = orders.length;
  const totalValue = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalPaid = orders.reduce((s, o) => s + o.total_paid, 0);
  const collectionRate = totalValue > 0 ? (totalPaid / totalValue) * 100 : 0;

  const startEdit = useCallback((id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ''));
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    let val: any = editValue;
    if (field === 'progress_percentage') val = Math.min(100, Math.max(0, Number(val) || 0));
    onUpdate(id, field, val || null);
    setEditingCell(null);
  }, [editingCell, editValue, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingCell(null);
  }, [commitEdit]);

  const handleDropdownChange = useCallback((id: string, field: string, value: string) => {
    onUpdate(id, field, value);
  }, [onUpdate]);

  const exportToExcel = useCallback(() => {
    const data = filtered.map((o, i) => ({
      '#': i + 1,
      'Order No': o.order_no,
      'Customer': o.customer_name,
      'Company': o.company_name,
      'Bus Model': o.bus_model,
      'Qty': o.quantity,
      'Total Amount': o.total_amount,
      'Status': o.status,
      'Phase': o.current_phase,
      'DO': o.do_summary,
      'Cash Receipt': o.cr_total,
      'Cheque': o.cheque_total,
      'Cash': o.cash_total,
      'Total Paid': o.total_paid,
      'Balance Due': o.balance_due,
      'Payment Mode': o.payment_mode,
      'Progress %': o.progress_percentage,
      'Order Date': o.order_date,
      'Expected Delivery': o.expected_delivery_date || '',
      'Remark': o.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yutong Orders');
    XLSX.writeFile(wb, `Yutong_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [filtered]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'delivered': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'in_progress': case 'shipped': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getBalanceColor = (balance: number, total: number) => {
    if (balance <= 0) return 'text-emerald-600 dark:text-emerald-400';
    if (balance < total * 0.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const renderCell = (order: SpreadsheetOrder, field: string, editable: boolean, type: 'text' | 'dropdown' | 'number' | 'date' = 'text', options?: string[]) => {
    const isEditing = editingCell?.id === order.id && editingCell?.field === field;
    const value = (order as any)[field];

    if (editable && type === 'dropdown' && options) {
      return (
        <Select value={value || ''} onValueChange={(v) => handleDropdownChange(order.id, field, v)}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent shadow-none p-1 min-w-[100px]">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt} value={opt} className="text-xs">{opt.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (editable && isEditing) {
      return (
        <Input
          autoFocus
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs border-0 bg-primary/5 shadow-none p-1"
        />
      );
    }

    if (editable) {
      return (
        <div
          className="cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5 min-h-[28px] flex items-center text-xs transition-colors"
          onClick={() => startEdit(order.id, field, value)}
          title="Click to edit"
        >
          {type === 'number' && field === 'progress_percentage'
            ? <div className="flex items-center gap-1 w-full">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${value || 0}%` }} />
                </div>
                <span className="text-[10px] w-8 text-right">{value || 0}%</span>
              </div>
            : <span>{value || '-'}</span>
          }
        </div>
      );
    }

    return <span className="text-xs px-1">{value ?? '-'}</span>;
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold">{totalOrders}</p>
              </div>
              <ShoppingCart className="h-5 w-5 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">LKR {(totalValue / 1e6).toFixed(1)}M</p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold">LKR {(totalPaid / 1e6).toFixed(1)}M</p>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Collection Rate</p>
                <p className="text-xl font-bold">{collectionRate.toFixed(1)}%</p>
              </div>
              <Percent className="h-5 w-5 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1">
          <Download className="h-3.5 w-3.5" /> Export Excel
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {orders.length} orders</span>
      </div>

      {/* Spreadsheet Grid */}
      <div className="border rounded-lg overflow-auto max-h-[70vh] bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr>
                {['#', 'Order No', 'Customer', 'Company', 'Bus Model', 'Qty', 'Total Amount', 'Status', 'Phase', 'DO', 'CR', 'Cheque', 'Cash', 'Total Paid', 'Balance Due', 'Pay Mode', 'Progress', 'Order Date', 'Exp. Delivery', 'Remark'].map((h, i) => (
                  <th key={h} className="px-2 py-2 text-left font-semibold text-muted-foreground border-b border-r last:border-r-0 whitespace-nowrap select-none">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, idx) => (
                <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-2 py-1 border-r text-muted-foreground">{idx + 1}</td>
                  <td className="px-2 py-1 border-r font-mono font-medium">{order.order_no}</td>
                  <td className="px-2 py-1 border-r max-w-[120px] truncate" title={order.customer_name}>{order.customer_name || '-'}</td>
                  <td className="px-2 py-1 border-r max-w-[120px] truncate" title={order.company_name}>{order.company_name || '-'}</td>
                  <td className="px-2 py-1 border-r">{order.bus_model}</td>
                  <td className="px-2 py-1 border-r text-center">{order.quantity}</td>
                  <td className="px-2 py-1 border-r text-right font-medium">{formatCurrency(order.total_amount)}</td>
                  <td className="px-2 py-1 border-r">
                    {renderCell(order, 'status', true, 'dropdown', STATUS_OPTIONS)}
                  </td>
                  <td className="px-2 py-1 border-r">
                    {renderCell(order, 'current_phase', true, 'dropdown', PHASE_OPTIONS)}
                  </td>
                  <td className="px-2 py-1 border-r text-muted-foreground">{order.do_summary}</td>
                  <td className="px-2 py-1 border-r text-right">{order.cr_total ? formatCurrency(order.cr_total) : '-'}</td>
                  <td className="px-2 py-1 border-r text-right">{order.cheque_total ? formatCurrency(order.cheque_total) : '-'}</td>
                  <td className="px-2 py-1 border-r text-right">{order.cash_total ? formatCurrency(order.cash_total) : '-'}</td>
                  <td className="px-2 py-1 border-r text-right font-medium">{formatCurrency(order.total_paid)}</td>
                  <td className={`px-2 py-1 border-r text-right font-semibold ${getBalanceColor(order.balance_due, order.total_amount)}`}>
                    {formatCurrency(order.balance_due)}
                  </td>
                  <td className="px-2 py-1 border-r">
                    {renderCell(order, 'payment_mode', true, 'dropdown', PAYMENT_MODE_OPTIONS)}
                  </td>
                  <td className="px-2 py-1 border-r w-[100px]">
                    {renderCell(order, 'progress_percentage', true, 'number')}
                  </td>
                  <td className="px-2 py-1 border-r whitespace-nowrap">{order.order_date || '-'}</td>
                  <td className="px-2 py-1 border-r">
                    {renderCell(order, 'expected_delivery_date', true, 'date')}
                  </td>
                  <td className="px-2 py-1 min-w-[150px]">
                    {renderCell(order, 'notes', true, 'text')}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={20} className="text-center py-8 text-muted-foreground">No orders found</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="sticky bottom-0 bg-muted/80 backdrop-blur-sm font-semibold">
                <tr>
                  <td colSpan={5} className="px-2 py-2 border-t border-r">Totals</td>
                  <td className="px-2 py-2 border-t border-r text-center">{filtered.reduce((s, o) => s + o.quantity, 0)}</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.total_amount, 0))}</td>
                  <td colSpan={3} className="px-2 py-2 border-t border-r" />
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.cr_total, 0))}</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.cheque_total, 0))}</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.cash_total, 0))}</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.total_paid, 0))}</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.balance_due, 0))}</td>
                  <td colSpan={5} className="px-2 py-2 border-t" />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
