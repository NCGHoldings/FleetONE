import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReferralAgent {
  id: string;
  agent_name: string;
}

interface PendingCommission {
  id: string;
  commission_amount: number;
  commission_pct: number;
  created_at: string;
  sinotruck_quotation: {
    quotation_no: string;
    customer_name: string;
  } | null;
}

interface SinotrukRecordCommissionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: ReferralAgent;
  onPaymentRecorded: () => void;
}

export function SinotrukRecordCommissionPaymentModal({
  open,
  onOpenChange,
  agent,
  onPaymentRecorded
}: SinotrukRecordCommissionPaymentModalProps) {
  const [pendingCommissions, setPendingCommissions] = useState<PendingCommission[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && agent) {
      loadPendingCommissions();
      setSelectedIds([]);
      setPaymentMethod('bank_transfer');
      setPaymentReference('');
      setNotes('');
    }
  }, [open, agent]);

  const loadPendingCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_referral_commission_payments')
        .select(`
          id,
          commission_amount,
          commission_pct,
          created_at,
          sinotruck_quotation:sinotruck_quotations(
            quotation_no,
            customer_name
          )
        `)
        .eq('referral_agent_id', agent.id)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingCommissions(data || []);
    } catch (error) {
      console.error('Error loading pending commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === pendingCommissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingCommissions.map(c => c.id));
    }
  };

  const selectedTotal = pendingCommissions
    .filter(c => selectedIds.includes(c.id))
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one commission to pay');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('sinotruck_referral_commission_payments')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: user?.id,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`Payment recorded for ${selectedIds.length} commission(s)`);
      onPaymentRecorded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Commission Payment - {agent.agent_name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : pendingCommissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending commissions for this agent.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === pendingCommissions.length}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Quotation</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(commission.id)}
                          onCheckedChange={() => toggleSelection(commission.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(commission.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {commission.sinotruck_quotation?.quotation_no || '-'}
                      </TableCell>
                      <TableCell>
                        {commission.sinotruck_quotation?.customer_name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(commission.commission_amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Selected Total</p>
              <p className="text-2xl font-bold">{formatCurrency(selectedTotal)}</p>
              <p className="text-sm text-muted-foreground">{selectedIds.length} commission(s) selected</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Reference</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID / Cheque No"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this payment"
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving || selectedIds.length === 0}
          >
            {saving ? 'Processing...' : `Pay ${formatCurrency(selectedTotal)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
