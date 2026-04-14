import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Receipt, Download, Eye, CreditCard, CheckCircle } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

interface PaymentInfo {
  id: string;
  amount: number;
  payment_type: string;
  payment_status: string;
  method?: string;
  reference?: string;
  paid_at: string;
  payment_proof_url?: string;
}

interface InvoiceInfo {
  id: string;
  invoice_no: string;
  invoice_type: string;
  amount: number;
  issued_at: string;
}

interface PaymentTimelineProps {
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  payments: PaymentInfo[];
  invoices: InvoiceInfo[];
  adjustmentData?: {
    extra_km?: number;
    extra_km_total_charge?: number;
    total_additional_expenses?: number;
  };
  onViewInvoice: (type: 'advance' | 'final') => void;
  onDownloadInvoice: (type: 'advance' | 'final') => void;
  onViewPaymentProof: (proofUrl: string) => void;
  showActions?: boolean;
}

export function PaymentTimeline({ 
  totalAmount = 0, 
  advancePaid = 0, 
  balanceDue = 0, 
  payments = [], 
  invoices = [],
  adjustmentData,
  onViewInvoice,
  onDownloadInvoice,
  onViewPaymentProof,
  showActions = true
}: PaymentTimelineProps) {
  // Ensure safe calculations
  const safeTotal = totalAmount || 0;
  const safeAdvance = advancePaid || 0;
  const safeBalance = balanceDue || 0;
  const safePayments = payments || [];
  const safeInvoices = invoices || [];
  
  // Calculate total paid amount from all approved payments
  const totalPaidAmount = safePayments
    .filter(payment => payment.payment_status === 'approved' || payment.payment_status === 'confirmed')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  // Use total paid amount for progress calculation, not just advance
  const paymentProgress = safeTotal > 0 ? Math.min((totalPaidAmount / safeTotal) * 100, 100) : 0;
  const isFullyPaid = totalPaidAmount >= safeTotal && safeTotal > 0;

  const getPaymentStatusBadge = (status: string) => {
    // Handle undefined or null status
    const safeStatus = status || 'pending';
    
    const variants = {
      pending: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      completed: { variant: 'default' as const, className: 'bg-green-500 text-white' },
      approved: { variant: 'default' as const, className: 'bg-green-500 text-white' },
    };
    
    const config = variants[safeStatus as keyof typeof variants] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </Badge>
    );
  };

  const hasAdvanceInvoice = safeInvoices.some(inv => inv.invoice_type === 'advance');
  const hasFinalInvoice = safeInvoices.some(inv => inv.invoice_type === 'final');

  return (
    <Card className="professional-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <span>Payment Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Progress</span>
            <span className="font-medium">{Math.round(paymentProgress)}%</span>
          </div>
          <Progress value={paymentProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>LKR 0</span>
            <span>LKR {totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-semibold text-sm">LKR {safeTotal.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="font-semibold text-sm text-green-600">LKR {totalPaidAmount.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Balance</div>
            <div className={`font-semibold text-sm ${(safeTotal - totalPaidAmount) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              LKR {Math.max(0, safeTotal - totalPaidAmount).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Post-Trip Adjustment Badge */}
        {adjustmentData && (adjustmentData.extra_km_total_charge || adjustmentData.total_additional_expenses) && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-blue-900">Post-Trip Adjustments Applied</span>
              <span className="font-semibold text-blue-700">
                +LKR {((adjustmentData.extra_km_total_charge || 0) + (adjustmentData.total_additional_expenses || 0)).toLocaleString()}
              </span>
            </div>
            {adjustmentData.extra_km && adjustmentData.extra_km !== 0 && (
              <div className="text-xs text-blue-700 mt-1">
                Extra KM: {adjustmentData.extra_km > 0 ? '+' : ''}{adjustmentData.extra_km} km
              </div>
            )}
          </div>
        )}

        {/* Payment Status */}
        <div className="flex items-center justify-center space-x-2">
          {isFullyPaid ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <Badge variant="default" className="bg-green-500 text-white">Fully Paid</Badge>
            </>
          ) : totalPaidAmount > 0 ? (
            <>
              <DollarSign className="w-4 h-4 text-orange-500" />
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">Partially Paid</Badge>
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 text-gray-500" />
              <Badge variant="outline">Payment Pending</Badge>
            </>
          )}
        </div>

        {/* Payment History */}
        {safePayments.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Payment History
            </div>
            {safePayments.map((payment, index) => {
              const paymentDate = payment.paid_at ? parseISO(payment.paid_at) : new Date();
              const formattedDate = isValid(paymentDate) ? format(paymentDate, 'MMM dd, yyyy') : 'Invalid Date';
              
              return (
                <div key={payment.id || index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                  <div className="space-y-1">
                    <div className="font-medium">LKR {(payment.amount || 0).toLocaleString()}</div>
                    <div className="text-muted-foreground">
                      {formattedDate}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {getPaymentStatusBadge(payment.payment_status)}
                    {payment.method && (
                      <div className="text-muted-foreground capitalize">{payment.method}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Invoice Actions */}
        {showActions && (hasAdvanceInvoice || hasFinalInvoice) && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Invoice Actions
            </div>
            <div className="flex flex-wrap gap-2">
              {hasAdvanceInvoice && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewInvoice('advance')}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View Advance
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadInvoice('advance')}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </>
              )}
              {hasFinalInvoice && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewInvoice('final')}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View Final
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadInvoice('final')}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}