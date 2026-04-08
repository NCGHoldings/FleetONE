// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ChevronDown, ChevronRight, RefreshCw, Truck, Package } from 'lucide-react';
import { useLightVehicleFinanceManagement } from '@/hooks/useLightVehicleFinanceManagement';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface LightVehicleDeliveryOrderManagementProps {
  onRefresh: () => void;
}

const doStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  released: 'bg-purple-100 text-purple-800',
  collected: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function LightVehicleDeliveryOrderManagement({ onRefresh }: LightVehicleDeliveryOrderManagementProps) {
  const [dos, setDos] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [lcs, setLcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedDO, setSelectedDO] = useState<any>(null);

  const { createDeliveryOrder, updateDOStatus, getDeliveryOrders, getLetterOfCredits, isLoading } = useLightVehicleFinanceManagement();

  const [createForm, setCreateForm] = useState({
    order_id: '', lc_id: '', issuing_bank: '', do_amount: '', currency: 'USD', vehicle_count: '', chassis_numbers: '', engine_numbers: '', commercial_invoice_no: '', bill_of_lading_no: '', packing_list_no: '', notes: '',
  });
  const [statusForm, setStatusForm] = useState({ status: '', release_date: '', collection_date: '', collected_by: '' });

  const loadData = async () => {
    setLoading(true);
    const doResult = await getDeliveryOrders();
    if (doResult.success) setDos(doResult.deliveryOrders || []);
    const lcResult = await getLetterOfCredits();
    if (lcResult.success) setLcs(lcResult.lcs || []);
    const { data: ordersData } = await supabase.from('lightvehicle_orders').select('id, order_no, bus_model, quantity').order('created_at', { ascending: false });
    setOrders(ordersData || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!createForm.order_id || !createForm.issuing_bank || !createForm.do_amount || !createForm.vehicle_count) { toast.error('Please fill all required fields'); return; }
    const chassisArr = createForm.chassis_numbers ? createForm.chassis_numbers.split(',').map(s => s.trim()).filter(Boolean) : [];
    const engineArr = createForm.engine_numbers ? createForm.engine_numbers.split(',').map(s => s.trim()).filter(Boolean) : [];
    const result = await createDeliveryOrder({
      order_id: createForm.order_id, lc_id: createForm.lc_id || undefined, issuing_bank: createForm.issuing_bank, do_amount: parseFloat(createForm.do_amount), currency: createForm.currency, vehicle_count: parseInt(createForm.vehicle_count), chassis_numbers: chassisArr, engine_numbers: engineArr, commercial_invoice_no: createForm.commercial_invoice_no || undefined, bill_of_lading_no: createForm.bill_of_lading_no || undefined, packing_list_no: createForm.packing_list_no || undefined, notes: createForm.notes || undefined,
    });
    if (result.success) { setShowCreateDialog(false); loadData(); onRefresh(); }
  };

  const handleStatusUpdate = async () => {
    if (!selectedDO || !statusForm.status) return;
    const additionalData: any = {};
    if (statusForm.status === 'released' && statusForm.release_date) additionalData.release_date = statusForm.release_date;
    if (statusForm.status === 'collected') { if (statusForm.collection_date) additionalData.collection_date = statusForm.collection_date; if (statusForm.collected_by) additionalData.collected_by = statusForm.collected_by; }
    const result = await updateDOStatus(selectedDO.id, statusForm.status, Object.keys(additionalData).length > 0 ? additionalData : undefined);
    if (result.success) { setShowStatusDialog(false); loadData(); onRefresh(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Delivery Order Management</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New DO</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Delivery Order (Light Vehicle)</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Order *</Label>
                  <Select value={createForm.order_id} onValueChange={v => setCreateForm(f => ({ ...f, order_id: v }))}><SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger><SelectContent>{orders.map(o => (<SelectItem key={o.id} value={o.id}>{o.order_no} - {o.bus_model} ({o.quantity})</SelectItem>))}</SelectContent></Select>
                </div>
                <div><Label>Linked LC</Label><Select value={createForm.lc_id} onValueChange={v => setCreateForm(f => ({ ...f, lc_id: v }))}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{lcs.map(lc => (<SelectItem key={lc.id} value={lc.id}>{lc.lc_no}</SelectItem>))}</SelectContent></Select></div>
                <div><Label>Issuing Bank *</Label><Input value={createForm.issuing_bank} onChange={e => setCreateForm(f => ({ ...f, issuing_bank: e.target.value }))} /></div>
                <div><Label>DO Amount *</Label><Input type="number" value={createForm.do_amount} onChange={e => setCreateForm(f => ({ ...f, do_amount: e.target.value }))} /></div>
                <div><Label>Vehicle Count *</Label><Input type="number" value={createForm.vehicle_count} onChange={e => setCreateForm(f => ({ ...f, vehicle_count: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Chassis Numbers (comma-separated)</Label><Input value={createForm.chassis_numbers} onChange={e => setCreateForm(f => ({ ...f, chassis_numbers: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Engine Numbers (comma-separated)</Label><Input value={createForm.engine_numbers} onChange={e => setCreateForm(f => ({ ...f, engine_numbers: e.target.value }))} /></div>
                <div><Label>Commercial Invoice No</Label><Input value={createForm.commercial_invoice_no} onChange={e => setCreateForm(f => ({ ...f, commercial_invoice_no: e.target.value }))} /></div>
                <div><Label>Bill of Lading No</Label><Input value={createForm.bill_of_lading_no} onChange={e => setCreateForm(f => ({ ...f, bill_of_lading_no: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button><Button onClick={handleCreate} disabled={isLoading}>Create DO</Button></div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : dos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No Delivery Orders found.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead></TableHead><TableHead>DO No</TableHead><TableHead>Order</TableHead><TableHead>LC</TableHead><TableHead>Bank</TableHead><TableHead>Amount</TableHead><TableHead>Vehicles</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dos.map(d => {
                const order = d.lightvehicle_orders;
                const lc = d.lightvehicle_letter_of_credits;
                const isExpanded = expandedId === d.id;
                return (
                  <React.Fragment key={d.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(isExpanded ? null : d.id)}>
                      <TableCell>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-medium">{d.do_no}</TableCell>
                      <TableCell>{order ? `${order.order_no} - ${order.bus_model}` : '-'}</TableCell>
                      <TableCell>{lc ? lc.lc_no : '-'}</TableCell>
                      <TableCell>{d.issuing_bank}</TableCell>
                      <TableCell>{d.currency} {Number(d.do_amount).toLocaleString()}</TableCell>
                      <TableCell><Package className="h-3 w-3 inline mr-1" />{d.vehicle_count}</TableCell>
                      <TableCell><Badge className={doStatusColors[d.status] || 'bg-gray-100'}>{d.status?.toUpperCase()}</Badge></TableCell>
                      <TableCell><Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setSelectedDO(d); setStatusForm({ status: d.status, release_date: '', collection_date: '', collected_by: '' }); setShowStatusDialog(true); }}>Status</Button></TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow><TableCell colSpan={9}>
                        <div className="p-4 bg-muted/30 rounded-lg text-sm grid grid-cols-3 gap-4">
                          <div><span className="text-muted-foreground">Commercial Invoice:</span> {d.commercial_invoice_no || '-'}</div>
                          <div><span className="text-muted-foreground">Bill of Lading:</span> {d.bill_of_lading_no || '-'}</div>
                          <div><span className="text-muted-foreground">Collected By:</span> {d.collected_by || '-'}</div>
                          {d.chassis_numbers?.length > 0 && <div className="col-span-3"><strong>Chassis:</strong> {d.chassis_numbers.join(', ')}</div>}
                          {d.engine_numbers?.length > 0 && <div className="col-span-3"><strong>Engine:</strong> {d.engine_numbers.join(', ')}</div>}
                        </div>
                      </TableCell></TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update DO Status</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Status</Label><Select value={statusForm.status} onValueChange={v => setStatusForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="pending">Pending</SelectItem><SelectItem value="issued">Issued</SelectItem><SelectItem value="released">Released</SelectItem><SelectItem value="collected">Collected</SelectItem>
              </SelectContent></Select></div>
              {statusForm.status === 'released' && <div><Label>Release Date</Label><Input type="date" value={statusForm.release_date} onChange={e => setStatusForm(f => ({ ...f, release_date: e.target.value }))} /></div>}
              {statusForm.status === 'collected' && (<><div><Label>Collection Date</Label><Input type="date" value={statusForm.collection_date} onChange={e => setStatusForm(f => ({ ...f, collection_date: e.target.value }))} /></div><div><Label>Collected By</Label><Input value={statusForm.collected_by} onChange={e => setStatusForm(f => ({ ...f, collected_by: e.target.value }))} /></div></>)}
            </div>
            <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button><Button onClick={handleStatusUpdate} disabled={isLoading}>Update</Button></div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
