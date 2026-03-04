import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle, Clock, FileText, Truck, Receipt, Loader2 } from 'lucide-react';
import { PaymentRecord, DORecord, CRRecord } from '@/hooks/useSpreadsheetQuickActions';

const formatCurrency = (val: number) => val ? `LKR ${val.toLocaleString()}` : '-';

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    received: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    released: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    collected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    draft: 'bg-muted text-muted-foreground',
  };
  return <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
};

// ─── DO Panel ───
interface DOPanelProps {
  orderId: string;
  displayValue: string;
  fetchDOs: (id: string) => Promise<DORecord[]>;
  createDO: (id: string, data: any) => Promise<boolean>;
  updateDOStatus: (doId: string, status: string) => Promise<boolean>;
  loading: boolean;
}

export function SpreadsheetDOPanel({ orderId, displayValue, fetchDOs, createDO, updateDOStatus, loading }: DOPanelProps) {
  const [open, setOpen] = useState(false);
  const [dos, setDOs] = useState<DORecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ issuing_bank: '', do_amount: 0, vehicle_count: 1, notes: '' });

  useEffect(() => {
    if (open) {
      setFetching(true);
      fetchDOs(orderId).then(d => { setDOs(d); setFetching(false); });
    }
  }, [open, orderId, fetchDOs]);

  const handleCreate = async () => {
    if (!form.issuing_bank) return;
    const ok = await createDO(orderId, form);
    if (ok) { setShowForm(false); setForm({ issuing_bank: '', do_amount: 0, vehicle_count: 1, notes: '' }); fetchDOs(orderId).then(setDOs); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:bg-primary/10 rounded px-1 py-0.5 text-xs text-left transition-colors flex items-center gap-1 min-h-[28px] w-full" title="Click to manage DOs">
          <Truck className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate">{displayValue}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Delivery Orders</h4>
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-3 w-3" /> New DO
            </Button>
          </div>

          {fetching ? (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : dos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No delivery orders yet</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {dos.map(d => (
                <div key={d.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-medium">{d.do_no}</span>
                    {statusBadge(d.status)}
                  </div>
                  <div className="text-muted-foreground">{d.issuing_bank} • {d.vehicle_count} units • {formatCurrency(d.do_amount)}</div>
                  {d.status === 'pending' && (
                    <Button size="sm" variant="outline" className="h-5 text-[10px] w-full" onClick={() => updateDOStatus(d.id, 'released').then(() => fetchDOs(orderId).then(setDOs))} disabled={loading}>
                      Release
                    </Button>
                  )}
                  {d.status === 'released' && (
                    <Button size="sm" variant="outline" className="h-5 text-[10px] w-full" onClick={() => updateDOStatus(d.id, 'collected').then(() => fetchDOs(orderId).then(setDOs))} disabled={loading}>
                      Mark Collected
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <div className="border-t pt-2 space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Issuing Bank *</Label>
                <Input className="h-7 text-xs" value={form.issuing_bank} onChange={e => setForm(p => ({ ...p, issuing_bank: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Amount</Label>
                  <Input type="number" className="h-7 text-xs" value={form.do_amount} onChange={e => setForm(p => ({ ...p, do_amount: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Vehicles</Label>
                  <Input type="number" className="h-7 text-xs" value={form.vehicle_count} onChange={e => setForm(p => ({ ...p, vehicle_count: Number(e.target.value) }))} />
                </div>
              </div>
              <Button size="sm" className="h-7 text-xs w-full" onClick={handleCreate} disabled={loading || !form.issuing_bank}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Create DO
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Payment Panel ───
interface PaymentPanelProps {
  orderId: string;
  displayValue: string;
  paymentMethod: 'cheque' | 'cash' | 'bank_transfer';
  fetchPayments: (id: string) => Promise<PaymentRecord[]>;
  recordPayment: (id: string, amount: number, method: string, date: string, ref?: string, notes?: string) => Promise<boolean>;
  verifyPayment: (paymentId: string, orderId: string) => Promise<boolean>;
  loading: boolean;
}

export function SpreadsheetPaymentPanel({ orderId, displayValue, paymentMethod, fetchPayments, recordPayment, verifyPayment, loading }: PaymentPanelProps) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), reference: '', notes: '' });

  useEffect(() => {
    if (open) {
      setFetching(true);
      fetchPayments(orderId).then(p => {
        // Filter by method
        const filtered = paymentMethod === 'bank_transfer' ? p : p.filter(x => x.payment_method === paymentMethod);
        setPayments(filtered);
        setFetching(false);
      });
    }
  }, [open, orderId, fetchPayments, paymentMethod]);

  const handleRecord = async () => {
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) return;
    const ok = await recordPayment(orderId, amt, paymentMethod, form.date, form.reference, form.notes);
    if (ok) {
      setShowForm(false);
      setForm({ amount: '', date: new Date().toISOString().slice(0, 10), reference: '', notes: '' });
      fetchPayments(orderId).then(p => setPayments(paymentMethod === 'bank_transfer' ? p : p.filter(x => x.payment_method === paymentMethod)));
    }
  };

  const methodLabel = paymentMethod === 'cheque' ? 'Cheque' : paymentMethod === 'cash' ? 'Cash' : 'Payment';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:bg-primary/10 rounded px-1 py-0.5 text-xs text-right transition-colors flex items-center justify-end gap-1 min-h-[28px] w-full" title={`Click to manage ${methodLabel} payments`}>
          <span>{displayValue}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{methodLabel} Payments</h4>
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-3 w-3" /> Record
            </Button>
          </div>

          {fetching ? (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : payments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No {methodLabel.toLowerCase()} payments</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {payments.map(p => (
                <div key={p.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{formatCurrency(p.payment_amount)}</span>
                    {statusBadge(p.status)}
                  </div>
                  <div className="text-muted-foreground">{p.payment_date} {p.payment_reference ? `• Ref: ${p.payment_reference}` : ''}</div>
                  {p.status === 'pending' && (
                    <Button size="sm" variant="default" className="h-5 text-[10px] w-full gap-1" onClick={() => verifyPayment(p.id, orderId).then(() => fetchPayments(orderId).then(all => setPayments(paymentMethod === 'bank_transfer' ? all : all.filter(x => x.payment_method === paymentMethod))))} disabled={loading}>
                      <CheckCircle className="h-3 w-3" /> Verify & Post GL
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <div className="border-t pt-2 space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Amount *</Label>
                <Input type="number" className="h-7 text-xs" placeholder="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Date</Label>
                  <Input type="date" className="h-7 text-xs" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Reference</Label>
                  <Input className="h-7 text-xs" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
                </div>
              </div>
              <Button size="sm" className="h-7 text-xs w-full" onClick={handleRecord} disabled={loading || !form.amount}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Record {methodLabel}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── CR Panel ───
interface CRPanelProps {
  orderId: string;
  displayValue: string;
  fetchCRs: (id: string) => Promise<CRRecord[]>;
  loading: boolean;
}

export function SpreadsheetCRPanel({ orderId, displayValue, fetchCRs, loading }: CRPanelProps) {
  const [open, setOpen] = useState(false);
  const [crs, setCRs] = useState<CRRecord[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      setFetching(true);
      fetchCRs(orderId).then(d => { setCRs(d); setFetching(false); });
    }
  }, [open, orderId, fetchCRs]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:bg-primary/10 rounded px-1 py-0.5 text-xs text-right transition-colors flex items-center justify-end gap-1 min-h-[28px] w-full" title="Click to view cash receipts">
          <Receipt className="h-3 w-3 text-muted-foreground shrink-0" />
          <span>{displayValue}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Cash Receipts</h4>

          {fetching ? (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : crs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No cash receipts yet. Verify a payment to auto-generate.</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {crs.map(cr => (
                <div key={cr.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-medium">{cr.receipt_no}</span>
                    {statusBadge(cr.status)}
                  </div>
                  <div className="text-muted-foreground">{cr.receipt_date} • {formatCurrency(cr.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
