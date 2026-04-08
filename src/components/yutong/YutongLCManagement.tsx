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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, ChevronRight, FileEdit, RefreshCw } from 'lucide-react';
import { useYutongFinanceManagement } from '@/hooks/useYutongFinanceManagement';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface YutongLCManagementProps {
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  amended: 'bg-yellow-100 text-yellow-800',
  negotiating: 'bg-purple-100 text-purple-800',
  utilized: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  closed: 'bg-gray-200 text-gray-700',
};

export function YutongLCManagement({ onRefresh }: YutongLCManagementProps) {
  const [lcs, setLcs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAmendDialog, setShowAmendDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedLC, setSelectedLC] = useState<any>(null);

  const { createLetterOfCredit, updateLCStatus, addLCAmendment, getLetterOfCredits, isLoading } = useYutongFinanceManagement();

  // Create form state
  const [createForm, setCreateForm] = useState({
    order_id: '',
    issuing_bank_name: '',
    issuing_bank_branch: '',
    issuing_bank_contact: '',
    beneficiary_bank: '',
    lc_amount: '',
    currency: 'USD',
    lc_type: 'Irrevocable Documentary Credit',
    issue_date: '',
    expiry_date: '',
    latest_shipment_date: '',
    notes: '',
  });

  const [amendForm, setAmendForm] = useState({
    amendment_type: '',
    description: '',
    old_value: '',
    new_value: '',
    amendment_date: new Date().toISOString().split('T')[0],
  });

  const [statusForm, setStatusForm] = useState({
    status: '',
    utilized_amount: '',
  });

  const loadData = async () => {
    setLoading(true);
    const result = await getLetterOfCredits();
    if (result.success) {
      setLcs(result.lcs || []);
    }

    const { data: ordersData } = await supabase
      .from('yutong_orders')
      .select('id, order_no, bus_model, quantity, total_amount')
      .order('created_at', { ascending: false });
    setOrders(ordersData || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!createForm.order_id || !createForm.issuing_bank_name || !createForm.lc_amount || !createForm.issue_date || !createForm.expiry_date) {
      toast.error('Please fill all required fields');
      return;
    }
    const result = await createLetterOfCredit({
      ...createForm,
      lc_amount: parseFloat(createForm.lc_amount),
    });
    if (result.success) {
      setShowCreateDialog(false);
      setCreateForm({ order_id: '', issuing_bank_name: '', issuing_bank_branch: '', issuing_bank_contact: '', beneficiary_bank: '', lc_amount: '', currency: 'USD', lc_type: 'Irrevocable Documentary Credit', issue_date: '', expiry_date: '', latest_shipment_date: '', notes: '' });
      loadData();
      onRefresh();
    }
  };

  const handleAmend = async () => {
    if (!selectedLC || !amendForm.amendment_type || !amendForm.description) {
      toast.error('Please fill all required fields');
      return;
    }
    const result = await addLCAmendment(selectedLC.id, amendForm);
    if (result.success) {
      setShowAmendDialog(false);
      setAmendForm({ amendment_type: '', description: '', old_value: '', new_value: '', amendment_date: new Date().toISOString().split('T')[0] });
      loadData();
      onRefresh();
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedLC || !statusForm.status) return;
    const utilized = statusForm.utilized_amount ? parseFloat(statusForm.utilized_amount) : undefined;
    const result = await updateLCStatus(selectedLC.id, statusForm.status, utilized);
    if (result.success) {
      setShowStatusDialog(false);
      setStatusForm({ status: '', utilized_amount: '' });
      loadData();
      onRefresh();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Letter of Credit Management</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New LC</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Letter of Credit</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Order *</Label>
                  <Select value={createForm.order_id} onValueChange={(v) => setCreateForm(f => ({ ...f, order_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                    <SelectContent>
                      {orders.map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.order_no} - {o.bus_model} (Qty: {o.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Issuing Bank Name *</Label>
                  <Input value={createForm.issuing_bank_name} onChange={e => setCreateForm(f => ({ ...f, issuing_bank_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Issuing Bank Branch</Label>
                  <Input value={createForm.issuing_bank_branch} onChange={e => setCreateForm(f => ({ ...f, issuing_bank_branch: e.target.value }))} />
                </div>
                <div>
                  <Label>Bank Contact</Label>
                  <Input value={createForm.issuing_bank_contact} onChange={e => setCreateForm(f => ({ ...f, issuing_bank_contact: e.target.value }))} />
                </div>
                <div>
                  <Label>Beneficiary Bank</Label>
                  <Input value={createForm.beneficiary_bank} onChange={e => setCreateForm(f => ({ ...f, beneficiary_bank: e.target.value }))} />
                </div>
                <div>
                  <Label>LC Amount *</Label>
                  <Input type="number" value={createForm.lc_amount} onChange={e => setCreateForm(f => ({ ...f, lc_amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={createForm.currency} onValueChange={(v) => setCreateForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="LKR">LKR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>LC Type</Label>
                  <Select value={createForm.lc_type} onValueChange={(v) => setCreateForm(f => ({ ...f, lc_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Irrevocable Documentary Credit">Irrevocable Documentary Credit</SelectItem>
                      <SelectItem value="Sight LC">Sight LC</SelectItem>
                      <SelectItem value="Usance LC">Usance LC</SelectItem>
                      <SelectItem value="Back-to-Back LC">Back-to-Back LC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Issue Date *</Label>
                  <Input type="date" value={createForm.issue_date} onChange={e => setCreateForm(f => ({ ...f, issue_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Expiry Date *</Label>
                  <Input type="date" value={createForm.expiry_date} onChange={e => setCreateForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Latest Shipment Date</Label>
                  <Input type="date" value={createForm.latest_shipment_date} onChange={e => setCreateForm(f => ({ ...f, latest_shipment_date: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isLoading}>Create LC</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading LCs...</div>
        ) : lcs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No Letters of Credit found. Click "New LC" to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>LC No</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Utilized</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Amendments</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lcs.map(lc => {
                const order = lc.yutong_orders;
                const isExpanded = expandedId === lc.id;
                return (
                  <React.Fragment key={lc.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(isExpanded ? null : lc.id)}>
                      <TableCell>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{lc.lc_no}</TableCell>
                      <TableCell>
                        {order ? `${order.order_no} - ${order.bus_model} (${order.quantity})` : '-'}
                      </TableCell>
                      <TableCell>{lc.issuing_bank_name}</TableCell>
                      <TableCell>{lc.currency} {Number(lc.lc_amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {lc.currency} {Number(lc.utilized_amount || 0).toLocaleString()}
                        <div className="text-xs text-muted-foreground">
                          Rem: {lc.currency} {Number(lc.remaining_amount || lc.lc_amount).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[lc.status] || 'bg-gray-100'}>
                          {lc.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{lc.issue_date ? format(new Date(lc.issue_date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{lc.expiry_date ? format(new Date(lc.expiry_date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{lc.amendment_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedLC(lc); setStatusForm({ status: lc.status, utilized_amount: '' }); setShowStatusDialog(true); }}>
                            Status
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedLC(lc); setShowAmendDialog(true); }}>
                            <FileEdit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={11}>
                          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div><span className="text-muted-foreground">LC Type:</span> {lc.lc_type}</div>
                              <div><span className="text-muted-foreground">Branch:</span> {lc.issuing_bank_branch || '-'}</div>
                              <div><span className="text-muted-foreground">Contact:</span> {lc.issuing_bank_contact || '-'}</div>
                              <div><span className="text-muted-foreground">Beneficiary Bank:</span> {lc.beneficiary_bank || '-'}</div>
                              <div><span className="text-muted-foreground">Latest Shipment:</span> {lc.latest_shipment_date ? format(new Date(lc.latest_shipment_date), 'dd/MM/yyyy') : '-'}</div>
                              <div><span className="text-muted-foreground">Notes:</span> {lc.notes || '-'}</div>
                            </div>
                            {lc.amendments && lc.amendments.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Amendment History</h4>
                                <div className="space-y-2">
                                  {lc.amendments.map((a: any, i: number) => (
                                    <div key={i} className="bg-background p-2 rounded border text-sm">
                                      <div className="flex justify-between">
                                        <Badge variant="outline">Amendment #{a.amendment_no}</Badge>
                                        <span className="text-muted-foreground">{a.amendment_date}</span>
                                      </div>
                                      <div className="mt-1"><strong>{a.amendment_type}:</strong> {a.description}</div>
                                      {a.old_value && <div className="text-muted-foreground">Old: {a.old_value} → New: {a.new_value}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update LC Status</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={statusForm.status} onValueChange={v => setStatusForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="utilized">Utilized</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {statusForm.status === 'utilized' && (
                <div>
                  <Label>Utilized Amount ({selectedLC?.currency})</Label>
                  <Input type="number" value={statusForm.utilized_amount} onChange={e => setStatusForm(f => ({ ...f, utilized_amount: e.target.value }))} placeholder={`Max: ${selectedLC?.lc_amount}`} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
              <Button onClick={handleStatusUpdate} disabled={isLoading}>Update</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Amendment Dialog */}
        <Dialog open={showAmendDialog} onOpenChange={setShowAmendDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add LC Amendment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amendment Type *</Label>
                <Select value={amendForm.amendment_type} onValueChange={v => setAmendForm(f => ({ ...f, amendment_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Amount Change">Amount Change</SelectItem>
                    <SelectItem value="Expiry Extension">Expiry Extension</SelectItem>
                    <SelectItem value="Shipment Date Change">Shipment Date Change</SelectItem>
                    <SelectItem value="Document Change">Document Change</SelectItem>
                    <SelectItem value="Beneficiary Change">Beneficiary Change</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea value={amendForm.description} onChange={e => setAmendForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Old Value</Label>
                  <Input value={amendForm.old_value} onChange={e => setAmendForm(f => ({ ...f, old_value: e.target.value }))} />
                </div>
                <div>
                  <Label>New Value</Label>
                  <Input value={amendForm.new_value} onChange={e => setAmendForm(f => ({ ...f, new_value: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Amendment Date</Label>
                <Input type="date" value={amendForm.amendment_date} onChange={e => setAmendForm(f => ({ ...f, amendment_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAmendDialog(false)}>Cancel</Button>
              <Button onClick={handleAmend} disabled={isLoading}>Add Amendment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
