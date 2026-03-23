import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Search, Download, RefreshCw, TrendingUp, DollarSign, ShoppingCart, Percent, Plus, Pencil, Trash2 } from 'lucide-react';
import { SpreadsheetOrder, NewOrderData } from '@/hooks/useYutongSpreadsheetData';
import { SpreadsheetDOPanel, SpreadsheetPaymentPanel, SpreadsheetCRPanel } from './SpreadsheetQuickActions';
import { SpreadsheetInvoicePanel, SpreadsheetRowActions } from './SpreadsheetInvoiceActions';
import { useSpreadsheetQuickActions } from '@/hooks/useSpreadsheetQuickActions';
import { useYutongCashReceipts, YutongCashReceipt } from '@/hooks/useYutongCashReceipts';
import { YutongCashReceiptModal } from '@/components/yutong/YutongCashReceiptModal';
import * as XLSX from 'xlsx';

interface YutongSpreadsheetCoreProps {
  orders: SpreadsheetOrder[];
  loading: boolean;
  onUpdate: (orderId: string, field: string, value: any) => void;
  onRefresh: () => void;
  onAddOrder?: (data: NewOrderData) => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  isPublic?: boolean;
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'in_progress', 'shipped', 'delivered', 'completed', 'cancelled'];
const PHASE_OPTIONS = ['order_placed', 'lc_issuance', 'production', 'shipping', 'customs', 'processing', 'rmv_registration', 'delivery', 'completed'];
const PAYMENT_MODE_OPTIONS = ['cash', 'lease', 'bank_transfer', 'cheque', 'mixed'];

const formatCurrency = (val: number) => val ? `LKR ${val.toLocaleString()}` : '-';

const emptyForm: NewOrderData = {
  customer_name: '',
  company_name: '',
  bus_model: '',
  quantity: 1,
  unit_price: 0,
  total_amount: 0,
  payment_mode: 'cash',
  expected_delivery_date: '',
  notes: '',
};

export function YutongSpreadsheetCore({ orders, loading, onUpdate, onRefresh, onAddOrder, onDeleteOrder, isPublic }: YutongSpreadsheetCoreProps) {
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState<NewOrderData>({ ...emptyForm });
  const [addLoading, setAddLoading] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [viewReceiptId, setViewReceiptId] = useState<string | null>(null);
  const [viewReceipt, setViewReceipt] = useState<YutongCashReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const quickActions = useSpreadsheetQuickActions(onRefresh);
  const { getCashReceiptsForOrder } = useYutongCashReceipts();

  const handleViewReceipt = useCallback(async (receiptId: string) => {
    const { data, error } = await (await import('@/integrations/supabase/client')).supabase
      .from('yutong_cash_receipts')
      .select('*')
      .eq('id', receiptId)
      .single();
    if (!error && data) {
      setViewReceipt(data as YutongCashReceipt);
      setReceiptModalOpen(true);
    }
  }, []);

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

  const handleAddSubmit = async () => {
    if (!onAddOrder) return;
    setAddLoading(true);
    try {
      await onAddOrder({
        ...addForm,
        total_amount: addForm.total_amount || addForm.unit_price * addForm.quantity,
      });
      setShowAddDialog(false);
      setAddForm({ ...emptyForm });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteOrderId || !onDeleteOrder) return;
    await onDeleteOrder(deleteOrderId);
    setDeleteOrderId(null);
  };

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

  const hasActions = !!onAddOrder || !!onDeleteOrder;
  const colCount = hasActions ? 21 : 20;

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
        {onAddOrder && (
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Order
          </Button>
        )}
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
                {['#', 'Order No', 'Customer', 'Company', 'Bus Model', 'Qty', 'Total Amount', 'Status', 'Phase', 'Invoices', 'DO', 'CR', 'Cheque', 'Cash', 'Bank Txfr', 'Total Paid', 'Balance Due', 'Pay Mode', 'Progress', 'Order Date', 'Exp. Delivery', 'Remark', 'Actions'].map((h) => (
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
                  <td className="px-2 py-1 border-r">
                    <SpreadsheetInvoicePanel
                      orderId={order.id}
                      orderNo={order.order_no}
                      invoiceCount={order.invoice_count}
                    />
                  </td>
                  <td className="px-2 py-1 border-r">
                    <SpreadsheetDOPanel
                      orderId={order.id}
                      displayValue={order.do_summary}
                      fetchDOs={quickActions.fetchDOs}
                      createDO={quickActions.createDO}
                      updateDOStatus={quickActions.updateDOStatus}
                      loading={quickActions.loading}
                    />
                  </td>
                  <td className="px-2 py-1 border-r">
                    <SpreadsheetCRPanel
                      orderId={order.id}
                      displayValue={order.cr_total ? formatCurrency(order.cr_total) : '-'}
                      fetchCRs={quickActions.fetchCRs}
                      loading={quickActions.loading}
                    />
                  </td>
                  <td className="px-2 py-1 border-r">
                    <SpreadsheetPaymentPanel
                      orderId={order.id}
                      displayValue={order.cheque_total ? formatCurrency(order.cheque_total) : '-'}
                      paymentMethod="cheque"
                      fetchPayments={quickActions.fetchPayments}
                      recordPayment={quickActions.recordPayment}
                      verifyPayment={quickActions.verifyPayment}
                      loading={quickActions.loading}
                    />
                  </td>
                  <td className="px-2 py-1 border-r">
                    <SpreadsheetPaymentPanel
                      orderId={order.id}
                      displayValue={order.cash_total ? formatCurrency(order.cash_total) : '-'}
                      paymentMethod="cash"
                      fetchPayments={quickActions.fetchPayments}
                      recordPayment={quickActions.recordPayment}
                      verifyPayment={quickActions.verifyPayment}
                      loading={quickActions.loading}
                    />
                  </td>
                  <td className="px-2 py-1 border-r">
                    <SpreadsheetPaymentPanel
                      orderId={order.id}
                      displayValue="-"
                      paymentMethod="bank_transfer"
                      fetchPayments={quickActions.fetchPayments}
                      recordPayment={quickActions.recordPayment}
                      verifyPayment={quickActions.verifyPayment}
                      loading={quickActions.loading}
                    />
                  </td>
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
                  <td className="px-2 py-1 border-r min-w-[150px]">
                    {renderCell(order, 'notes', true, 'text')}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    <SpreadsheetRowActions
                      orderId={order.id}
                      orderNo={order.order_no}
                      quotationId={order.quotation_id || undefined}
                      hasInvoices={order.invoice_count > 0}
                      onDeleteOrder={onDeleteOrder}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={colCount} className="text-center py-8 text-muted-foreground">No orders found</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="sticky bottom-0 bg-muted/80 backdrop-blur-sm font-semibold">
                <tr>
                  <td colSpan={6} className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.total_amount, 0))}</td>
                  <td colSpan={4} className="px-2 py-2 border-t border-r" />
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.cr_total, 0))}</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.cheque_total, 0))}</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.cash_total, 0))}</td>
                  <td className="px-2 py-2 border-t border-r text-right">-</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.total_paid, 0))}</td>
                  <td className="px-2 py-2 border-t border-r text-right">{formatCurrency(filtered.reduce((s, o) => s + o.balance_due, 0))}</td>
                  <td colSpan={6} className="px-2 py-2 border-t" />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Add Order Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Name</Label>
                <Input value={addForm.customer_name} onChange={(e) => setAddForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Customer name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Name</Label>
                <Input value={addForm.company_name} onChange={(e) => setAddForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Company name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bus Model *</Label>
              <Input value={addForm.bus_model} onChange={(e) => setAddForm(p => ({ ...p, bus_model: e.target.value }))} placeholder="e.g. ZK6122H" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input type="number" min={1} value={addForm.quantity} onChange={(e) => setAddForm(p => ({ ...p, quantity: Number(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit Price</Label>
                <Input type="number" min={0} value={addForm.unit_price} onChange={(e) => setAddForm(p => ({ ...p, unit_price: Number(e.target.value) || 0, total_amount: (Number(e.target.value) || 0) * p.quantity }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Amount</Label>
                <Input type="number" min={0} value={addForm.total_amount} onChange={(e) => setAddForm(p => ({ ...p, total_amount: Number(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Mode</Label>
                <Select value={addForm.payment_mode} onValueChange={(v) => setAddForm(p => ({ ...p, payment_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expected Delivery</Label>
                <Input type="date" value={addForm.expected_delivery_date} onChange={(e) => setAddForm(p => ({ ...p, expected_delivery_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={addForm.notes} onChange={(e) => setAddForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={!addForm.bus_model || addLoading}>
              {addLoading ? 'Adding...' : 'Add Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
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
