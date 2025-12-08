import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface ReferralAgent {
  id: string;
  agent_name: string;
  phone: string | null;
  default_commission_pct: number;
}

interface PendingCommission {
  id: string;
  quotation_id: string;
  commission_amount: number;
  created_at: string;
  quotation?: {
    quotation_no: string;
    customer_name: string;
  };
  selected?: boolean;
}

interface RecordCommissionPaymentModalProps {
  agent: ReferralAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}

export function RecordCommissionPaymentModal({
  agent,
  open,
  onOpenChange,
  onPaymentRecorded
}: RecordCommissionPaymentModalProps) {
  const [pendingCommissions, setPendingCommissions] = useState<PendingCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchPendingCommissions();
    }
  }, [open, agent.id]);

  const fetchPendingCommissions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('referral_commission_payments')
        .select(`
          id,
          quotation_id,
          commission_amount,
          created_at,
          quotation:special_hire_quotations (
            quotation_no,
            customer_name
          )
        `)
        .eq('referral_agent_id', agent.id)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingCommissions(data || []);
      // Select all by default
      setSelectedIds(new Set((data || []).map(c => c.id)));
    } catch (error: any) {
      console.error('Error fetching pending commissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending commissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingCommissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingCommissions.map(c => c.id)));
    }
  };

  const totalSelected = pendingCommissions
    .filter(c => selectedIds.has(c.id))
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'No commissions selected',
        description: 'Please select at least one commission to pay',
        variant: 'destructive'
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: 'Payment method required',
        description: 'Please select a payment method',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);

      // Update all selected commissions to paid
      const { error } = await supabase
        .from('referral_commission_payments')
        .update({
          payment_status: 'paid',
          paid_at: new Date(paymentDate).toISOString(),
          paid_by: user?.id,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Payment recorded',
        description: `Successfully recorded payment of LKR ${totalSelected.toLocaleString()} to ${agent.agent_name}`
      });

      onPaymentRecorded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Record Commission Payment - {agent.agent_name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : pendingCommissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending commissions to pay.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending Commissions Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === pendingCommissions.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(commission.id)}
                          onCheckedChange={() => toggleSelection(commission.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(commission.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-mono">
                        {commission.quotation?.quotation_no || '-'}
                      </TableCell>
                      <TableCell>{commission.quotation?.customer_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(commission.commission_amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Total Selected */}
            <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} commission(s) selected
              </span>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total to Pay</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalSelected)}</p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="mobile_payment">Mobile Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="paymentReference">Payment Reference / Receipt No.</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., Bank ref number, cheque number"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this payment"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || selectedIds.size === 0 || !paymentMethod}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Record Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
