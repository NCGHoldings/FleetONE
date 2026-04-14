// @ts-nocheck
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ReferralAgent {
  id: string;
  agent_name: string;
}

interface CommissionRecord {
  id: string;
  commission_amount: number;
  commission_pct: number;
  payment_status: string;
  paid_at: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  created_at: string;
  sinotruck_quotation: {
    quotation_no: string;
    customer_name: string;
    total_price: number;
  } | null;
}

interface SinotrukReferralHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: ReferralAgent;
}

export function SinotrukReferralHistoryModal({
  open,
  onOpenChange,
  agent
}: SinotrukReferralHistoryModalProps) {
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && agent) {
      loadHistory();
    }
  }, [open, agent]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinotruck_referral_commission_payments')
        .select(`
          *,
          sinotruck_quotation:sinotruck_quotations(
            quotation_no,
            customer_name,
            total_price
          )
        `)
        .eq('referral_agent_id', agent.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const totalPending = records
    .filter(r => r.payment_status === 'pending')
    .reduce((sum, r) => sum + Number(r.commission_amount), 0);

  const totalPaid = records
    .filter(r => r.payment_status === 'paid')
    .reduce((sum, r) => sum + Number(r.commission_amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commission History - {agent.agent_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-xl font-bold">{records.length}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No commission records found for this agent.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Quotation</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Sale Amount</TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Paid Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(new Date(record.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {record.sinotruck_quotation?.quotation_no || '-'}
                  </TableCell>
                  <TableCell>
                    {record.sinotruck_quotation?.customer_name || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.sinotruck_quotation?.total_price 
                      ? formatCurrency(Number(record.sinotruck_quotation.total_price))
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.commission_pct}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(record.commission_amount))}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={record.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {record.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.paid_at 
                      ? format(new Date(record.paid_at), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
