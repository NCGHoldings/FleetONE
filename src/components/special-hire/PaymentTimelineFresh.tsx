import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  created_at: string;
  payment_date?: string;
  payment_method?: string;
  reference_number?: string;
}

interface PaymentTimelineFreshProps {
  quotationId: string;
  totalPayable?: number;
  className?: string;
  /** Callback with fresh total paid from DB */
  onTotalPaidFetched?: (totalPaid: number) => void;
}

export function PaymentTimelineFresh({
  quotationId,
  totalPayable,
  className = '',
  onTotalPaidFetched,
}: PaymentTimelineFreshProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quotationId) {
      fetchPayments();
    }
  }, [quotationId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('special_hire_payments')
        .select('id, amount, payment_type, status, created_at, payment_method, reference_number')
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const fetched = (data || []) as unknown as Payment[];
      setPayments(fetched);

      // Notify parent with fresh total
      const approvedTotal = fetched
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      onTotalPaidFetched?.(approvedTotal);
    } catch (err) {
      console.error('Error fetching payment timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const approvedPayments = payments.filter(p => p.status === 'approved');
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balance = totalPayable != null ? totalPayable - totalPaid : null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending_finance': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="default" className="bg-green-600 text-xs">Approved</Badge>;
      case 'pending_finance': return <Badge variant="secondary" className="text-xs">Pending Finance</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatPaymentType = (type: string) => {
    switch (type) {
      case 'advance': return 'Advance Payment';
      case 'balance': return 'Balance Payment';
      case 'full': return 'Full Payment';
      default: return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Payment';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Loading payment history...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Payment History ({payments.length} payment{payments.length !== 1 ? 's' : ''})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 flex-shrink-0">
                  {getStatusIcon(payment.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatPaymentType(payment.payment_type)}</span>
                    <span className="font-semibold whitespace-nowrap">
                      LKR {(payment.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStatusBadge(payment.status)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(payment.created_at), 'MMM dd, HH:mm')}
                    </span>
                    {payment.payment_method && (
                      <span className="text-xs text-muted-foreground">
                        via {payment.payment_method}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between font-semibold">
            <span>Total Paid (Approved)</span>
            <span className="text-green-600">LKR {totalPaid.toLocaleString()}</span>
          </div>
          {totalPayable != null && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Payable</span>
                <span>LKR {totalPayable.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{balance != null && balance <= 0 ? 'Overpaid Credit' : 'Balance Due'}</span>
                <span className={balance != null && balance <= 0 ? 'text-green-600' : 'text-primary'}>
                  LKR {balance != null ? (balance <= 0 ? Math.abs(balance) : balance).toLocaleString() : '—'}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
