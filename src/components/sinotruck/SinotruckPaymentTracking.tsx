/**
 * Sinotruck Payment Tracking Component
 * Handles payment recording, verification, and GL integration
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, CheckCircle, Clock, Plus, RefreshCw, MoreHorizontal, FileText } from 'lucide-react';
import {
  fetchVehicleFinanceSettings,
  createVehicleCustomer,
  createVehicleARInvoice,
  postVehiclePaymentToGL,
  createVehicleARReceipt,
  updateOrderFinanceLinks,
  updatePaymentJournalLink,
  NCG_HOLDING_ID,
} from '@/hooks/useVehicleSalesFinance';

interface SinotruckPaymentTrackingProps {
  orderId: string;
  onRefresh: () => void;
}

export function SinotruckPaymentTracking({ orderId, onRefresh }: SinotruckPaymentTrackingProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_no: '',
    bank_name: '',
    cheque_no: '',
    notes: ''
  });

  useEffect(() => {
    if (orderId) {
      loadPaymentData();
    }
  }, [orderId]);

  const loadPaymentData = async () => {
    setIsLoading(true);
    try {
      // Load order details
      const { data: order, error: orderError } = await supabase
        .from('sinotruck_orders' as any)
        .select('*, sinotruck_quotations(quotation_no, customer_name, contact_number)')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrderDetails(order);

      // Load payment schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('sinotruck_payment_schedules' as any)
        .select('*')
        .eq('order_id', orderId)
        .order('due_date', { ascending: true });

      if (scheduleError) throw scheduleError;
      setSchedules(scheduleData || []);

      // Load customer payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('sinotruck_customer_payments' as any)
        .select('*')
        .eq('order_id', orderId)
        .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);
    } catch (error: any) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    try {
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication error');
        return;
      }

      const { error } = await supabase
        .from('sinotruck_customer_payments' as any)
        .insert({
          order_id: orderId,
          payment_schedule_id: selectedSchedule?.id || null,
          payment_amount: amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.reference_no || null,
          bank_name: paymentForm.bank_name || null,
          cheque_no: paymentForm.cheque_no || null,
          notes: paymentForm.notes || null,
          status: 'pending',
          created_by: user.id
        });

      if (error) throw error;

      toast.success('Payment recorded. Pending verification.');
      setIsRecordModalOpen(false);
      resetForm();
      loadPaymentData();
      onRefresh();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(`Failed to record payment: ${error.message}`);
    }
  };

  const handleVerifyPayment = async (paymentId: string) => {
    setVerifyingPayment(paymentId);
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) {
        toast.error('Payment not found');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication error');
        return;
      }

      // Fetch finance settings
      const settings = await fetchVehicleFinanceSettings('sinotruck', NCG_HOLDING_ID);
      if (!settings) {
        toast.error('Finance settings not configured. Please configure Sinotruck Finance Settings first.');
        return;
      }

      const customerName = orderDetails?.sinotruck_quotations?.customer_name || 'Unknown Customer';
      const customerPhone = orderDetails?.sinotruck_quotations?.contact_number;
      const orderNo = orderDetails?.order_no;

      // 1. Create/Get Finance Customer
      let customerId = orderDetails?.finance_customer_id;
      if (!customerId && settings.auto_create_customer) {
        customerId = await createVehicleCustomer({
          module: 'sinotruck',
          customerName,
          customerPhone,
          companyId: NCG_HOLDING_ID,
        });

        if (customerId) {
          await updateOrderFinanceLinks({
            module: 'sinotruck',
            orderId,
            financeCustomerId: customerId,
          });
        }
      }

      // 2. Create AR Invoice if not exists
      let invoiceId = orderDetails?.ar_invoice_id;
      if (!invoiceId && customerId) {
        const arResult = await createVehicleARInvoice({
          module: 'sinotruck',
          orderId,
          orderNo,
          customerId,
          totalAmount: orderDetails?.total_amount || 0,
          advanceAmount: payment.payment_amount,
          companyId: NCG_HOLDING_ID,
          settings,
        });

        if (arResult) {
          invoiceId = arResult.invoiceId;
          await updateOrderFinanceLinks({
            module: 'sinotruck',
            orderId,
            arInvoiceId: invoiceId,
          });
          toast.success(`AR Invoice created: ${arResult.invoiceNumber}`);
        }
      }

      // 3. Post to GL
      let journalEntryId: string | undefined;
      if (settings.auto_post_on_verify) {
        const paymentType = payment.payment_schedule_id ? 
          (schedules.find(s => s.id === payment.payment_schedule_id)?.milestone_name?.toLowerCase().includes('advance') ? 'advance' : 'balance') :
          'advance';

        const glResult = await postVehiclePaymentToGL({
          module: 'sinotruck',
          orderNo,
          customerName,
          amount: payment.payment_amount,
          paymentType,
          paymentMethod: payment.payment_method,
          settings,
          effectiveCompanyId: NCG_HOLDING_ID,
        });

        if (glResult) {
          journalEntryId = glResult.journalEntryId;
          toast.success(`GL Entry posted: ${glResult.entryNumber}`);
        }
      }

      // 4. Create AR Receipt
      let receiptId: string | undefined;
      if (customerId) {
        const receiptResult = await createVehicleARReceipt({
          module: 'sinotruck',
          paymentId,
          invoiceId,
          customerId,
          amount: payment.payment_amount,
          paymentMethod: payment.payment_method,
          paymentDate: payment.payment_date,
          settings,
          effectiveCompanyId: NCG_HOLDING_ID,
        });

        if (receiptResult) {
          receiptId = receiptResult.receiptId;
        }
      }

      // 5. Update payment status
      await supabase
        .from('sinotruck_customer_payments' as any)
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          journal_entry_id: journalEntryId,
          ar_receipt_id: receiptId,
        })
        .eq('id', paymentId);

      // 6. Update payment schedule if linked
      if (payment.payment_schedule_id) {
        await supabase
          .from('sinotruck_payment_schedules' as any)
          .update({
            is_paid: true,
            paid_date: payment.payment_date,
          })
          .eq('id', payment.payment_schedule_id);
      }

      toast.success('Payment verified and GL posted successfully');
      loadPaymentData();
      onRefresh();
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error(`Failed to verify payment: ${error.message}`);
    } finally {
      setVerifyingPayment(null);
    }
  };

  const resetForm = () => {
    setPaymentForm({
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      reference_no: '',
      bank_name: '',
      cheque_no: '',
      notes: ''
    });
    setSelectedSchedule(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'outline', icon: Clock },
      received: { variant: 'secondary', icon: DollarSign },
      verified: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: FileText }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalPaid = payments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.payment_amount, 0);
  const totalPending = payments
    .filter(p => p.status === 'pending' || p.status === 'received')
    .reduce((sum, p) => sum + p.payment_amount, 0);
  const balanceDue = (orderDetails?.total_amount || 0) - totalPaid;

  return (
    <>
      <div className="space-y-6">
        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">LKR {orderDetails?.total_amount?.toLocaleString() || 0}</div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">LKR {totalPaid.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Verified Payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">LKR {totalPending.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Pending Verification</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">LKR {balanceDue.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Balance Due</p>
            </CardContent>
          </Card>
        </div>

        {/* Record Payment Button */}
        <div className="flex justify-end">
          <Button onClick={() => setIsRecordModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Payment Schedule */}
        {schedules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.milestone_name}</TableCell>
                      <TableCell>{new Date(schedule.due_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">LKR {schedule.amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={schedule.is_paid ? 'default' : 'outline'}>
                          {schedule.is_paid ? 'PAID' : 'PENDING'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments recorded yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>{payment.payment_reference || '-'}</TableCell>
                      <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right font-medium">
                        LKR {payment.payment_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(payment.status === 'pending' || payment.status === 'received') && (
                              <DropdownMenuItem
                                onClick={() => handleVerifyPayment(payment.id)}
                                disabled={verifyingPayment === payment.id}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {verifyingPayment === payment.id ? 'Verifying...' : 'Verify & Post GL'}
                              </DropdownMenuItem>
                            )}
                            {payment.journal_entry_id && (
                              <DropdownMenuItem disabled>
                                <FileText className="h-4 w-4 mr-2" />
                                GL Posted ✓
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Customer Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {schedules.length > 0 && (
              <div className="space-y-2">
                <Label>Link to Schedule (Optional)</Label>
                <Select
                  value={selectedSchedule?.id || ''}
                  onValueChange={(value) => {
                    const schedule = schedules.find(s => s.id === value);
                    setSelectedSchedule(schedule || null);
                    if (schedule) {
                      setPaymentForm({ ...paymentForm, amount: schedule.amount?.toString() || '' });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- No Link --</SelectItem>
                    {schedules.filter(s => !s.is_paid).map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {schedule.milestone_name} - LKR {schedule.amount?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment Amount (LKR) *</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="lc">Letter of Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={paymentForm.bank_name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                  placeholder="Bank name"
                />
              </div>
              <div className="space-y-2">
                <Label>Reference No</Label>
                <Input
                  value={paymentForm.reference_no}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                  placeholder="Transaction reference"
                />
              </div>
            </div>

            {paymentForm.payment_method === 'cheque' && (
              <div className="space-y-2">
                <Label>Cheque Number</Label>
                <Input
                  value={paymentForm.cheque_no}
                  onChange={(e) => setPaymentForm({ ...paymentForm, cheque_no: e.target.value })}
                  placeholder="Cheque number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
