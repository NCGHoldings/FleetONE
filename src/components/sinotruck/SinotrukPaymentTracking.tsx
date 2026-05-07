import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  DollarSign, CheckCircle, Clock, FileText, Plus, RefreshCw, Eye, 
  Download, MoreHorizontal, Receipt, Landmark, Upload, Image, 
  Database, AlertCircle, Undo2 
} from 'lucide-react';
import { useSinotrukOrderInvoiceManagement } from '@/hooks/useSinotrukOrderInvoiceManagement';
import { useSinotrukCashReceipts, SinotrukCashReceipt } from '@/hooks/useSinotrukCashReceipts';
import { SinotrukCashReceiptModal } from './SinotrukCashReceiptModal';
import { VehicleFinanceSettlement } from '@/components/accounting/shared/VehicleFinanceSettlement';
import { SearchableAccountSelector } from '@/components/accounting/shared/SearchableAccountSelector';
import { GLBreakdownPreview } from '@/components/accounting/shared/GLBreakdownPreview';
import { reverseJournalEntry } from '@/hooks/useEditAccountingMutations';
import {
  fetchVehicleFinanceSettings,
  createVehicleCustomer,
  postVehiclePaymentToGL,
  updateOrderFinanceLinks,
  createVehicleARReceipt,
  NCG_HOLDING_ID,
} from '@/hooks/useVehicleSalesFinance';

interface SinotrukPaymentTrackingProps {
  orderId?: string;
  onRefresh: () => void;
}

export function SinotrukPaymentTracking({ orderId, onRefresh }: SinotrukPaymentTrackingProps) {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(orderId);
  const [payments, setPayments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isFinanceHubOpen, setIsFinanceHubOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const { regenerateInvoice } = useSinotrukOrderInvoiceManagement();
  const { createCashReceipt, regenerateCashReceipt } = useSinotrukCashReceipts();
  
  // Cash receipt states
  const [cashReceipts, setCashReceipts] = useState<Record<string, SinotrukCashReceipt>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<SinotrukCashReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [equityAccounts, setEquityAccounts] = useState<any[]>([]);
  
  // Payment proof upload state
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  
  // GL Review states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReversalReviewModalOpen, setIsReversalReviewModalOpen] = useState(false);
  const [reviewPayment, setReviewPayment] = useState<any>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<{ bankId: string | null; creditId: string | null }>({ bankId: null, creditId: null });
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_no: '',
    bank_account_id: '',
    custom_credit_account_id: '',
    notes: ''
  });

  useEffect(() => {
    loadBankAccounts();
    loadEquityAccounts();
  }, []);

  useEffect(() => {
    if (orderId) {
      setSelectedOrderId(orderId);
      loadPaymentData();
    } else {
      loadAllOrders();
    }
  }, [orderId]);

  useEffect(() => {
    if (selectedOrderId) {
      loadPaymentData();
    }
  }, [selectedOrderId]);

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, account_name, bank_name, account_number')
        .in('company_id', [NCG_HOLDING_ID, 'a0000000-0000-0000-0000-000000000004'])
        .eq('is_active', true)
        .order('bank_name');
      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const loadEquityAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .eq('company_id', NCG_HOLDING_ID)
        .eq('account_type', 'equity')
        .eq('is_active', true)
        .order('account_code');
      if (error) throw error;
      setEquityAccounts(data || []);
    } catch (error) {
      console.error('Error loading equity accounts:', error);
    }
  };

  const loadAllOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_orders')
        .select('id, order_no, sinotruck_quotations(customer_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllOrders(data || []);
      if (data && data.length > 0 && !selectedOrderId) {
        setSelectedOrderId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    }
  };

  const loadPaymentData = async () => {
    if (!selectedOrderId) return;
    
    setIsLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('sinotruck_orders')
        .select('*, sinotruck_quotations(quotation_no, customer_name, customer_category_id)')
        .eq('id', selectedOrderId)
        .single();

      if (orderError) throw orderError;
      setOrderDetails(order);

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('sinotruck_payment_schedules')
        .select('*')
        .eq('order_id', selectedOrderId)
        .order('due_date', { ascending: true });

      if (scheduleError) throw scheduleError;
      setSchedules(scheduleData || []);

      const { data: paymentData, error: paymentError } = await supabase
        .from('sinotruck_customer_payments')
        .select('*, journal_entries(entry_number)')
        .eq('order_id', selectedOrderId)
        .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);

      if (paymentData && paymentData.length > 0) {
        const { data: receiptsData, error: receiptsError } = await supabase
          .from('sinotruck_cash_receipts')
          .select('*')
          .eq('order_id', selectedOrderId);

        if (receiptsError) {
          console.error('Error loading cash receipts:', receiptsError);
        } else if (receiptsData) {
          const receiptsMap: Record<string, SinotrukCashReceipt> = {};
          receiptsData.forEach((receipt: SinotrukCashReceipt) => {
            receiptsMap[receipt.payment_id] = receipt;
          });
          setCashReceipts(receiptsMap);
        }
      } else {
        setCashReceipts({});
      }

    } catch (error: any) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid payment amount');
        setIsSubmitting(false);
        return;
      }

      if (!selectedOrderId) {
        toast.error('No order selected');
        setIsSubmitting(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Authentication error. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      let paymentSlipUrl: string | null = null;
      if (paymentProofFile) {
        setIsUploading(true);
        const fileExt = paymentProofFile.name.split('.').pop();
        const filePath = `sinotruck/${selectedOrderId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, paymentProofFile);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Failed to upload payment proof');
          setIsUploading(false);
          setIsSubmitting(false);
          return;
        }
        
        const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
        paymentSlipUrl = urlData?.publicUrl || null;
        setIsUploading(false);
      }

      const selectedBank = paymentForm.payment_method === 'opening_balance'
        ? equityAccounts.find(b => b.id === paymentForm.bank_account_id)
        : bankAccounts.find(b => b.id === paymentForm.bank_account_id);

      const bankNameStr = paymentForm.payment_method === 'opening_balance'
        ? selectedBank ? `${selectedBank.account_code} - ${selectedBank.account_name}` : null
        : selectedBank ? `${selectedBank.bank_name} - ${selectedBank.account_name}` : null;

      const { data: payment, error: paymentError } = await supabase
        .from('sinotruck_customer_payments')
        .insert({
          order_id: selectedOrderId,
          payment_schedule_id: selectedSchedule?.id || null,
          payment_amount: amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.reference_no || null,
          bank_account_id: paymentForm.payment_method === 'opening_balance' ? null : paymentForm.bank_account_id,
          bank_name: bankNameStr,
          custom_credit_account_id: paymentForm.payment_method === 'opening_balance' ? paymentForm.bank_account_id : (paymentForm.custom_credit_account_id || null),
          payment_slip_url: paymentSlipUrl,
          notes: paymentForm.notes || null,
          status: 'pending',
          created_by: user.id
        } as any)
        .select()
        .single();

      if (paymentError) {
        console.error('Payment insert error:', paymentError);
        toast.error(`Failed to record payment: ${paymentError.message}`);
        setIsSubmitting(false);
        return;
      }

      toast.success('Payment recorded successfully. Please verify the payment to update financials.');
      setIsRecordModalOpen(false);
      resetForm();
      loadPaymentData();
      onRefresh();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(`Failed to record payment: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReversePayment = async (payment: any) => {
    setReviewPayment(payment);
    setIsReversalReviewModalOpen(true);
  };

  const confirmReversePayment = async () => {
    if (!reviewPayment || isReversing) return;
    const payment = reviewPayment;
    setIsReversing(true);
    try {
      if (payment.journal_entry_id) {
        const reversedId = await reverseJournalEntry(payment.journal_entry_id, NCG_HOLDING_ID);
        if (!reversedId) throw new Error('Failed to reverse GL entry');
      }

      await supabase
        .from('sinotruck_customer_payments')
        .update({
          status: 'reversed',
        })
        .eq('id', payment.id);
        
      toast.success('Payment reversed successfully');
      loadPaymentData();
    } catch (error: any) {
      console.error('Error reversing payment:', error);
      toast.error(error.message || 'Failed to reverse payment');
    } finally {
      setIsReversing(false);
      setIsReversalReviewModalOpen(false);
      setReviewPayment(null);
    }
  };

  const handleResyncPayment = async (paymentId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('sinotruck_customer_payments')
        .update({
          status: 'pending',
          journal_entry_id: null,
          ar_receipt_id: null,
          verified_at: null,
          verified_by: null
        })
        .eq('id', paymentId);

      if (error) throw error;
      
      toast.success('Payment reset to pending. You can now re-verify it.');
      loadPaymentData();
      onRefresh();
    } catch (error: any) {
      console.error('Error resyncing payment:', error);
      toast.error('Failed to resync payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    setReviewPayment(payment);
    setIsReviewModalOpen(true);
  };

  const confirmVerifyPayment = async () => {
    if (!reviewPayment || verifyingId) return;
    const paymentId = reviewPayment.id;
    setVerifyingId(paymentId);
    setIsReviewing(true);
    try {
      const payment = reviewPayment;
      if (!payment) {
        toast.error('Payment not found');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      const settings = await fetchVehicleFinanceSettings('sinotruck', NCG_HOLDING_ID);
      if (!settings) {
        toast.error('Finance settings not configured.');
        return;
      }

      const customerName = orderDetails?.sinotruck_quotations?.customer_name || 'Unknown';
      const orderNo = orderDetails?.order_no;

      let customerId = orderDetails?.finance_customer_id;
      if (!customerId && settings.auto_create_customer) {
        const categoryId = (orderDetails as any)?.customer_category_id 
          || orderDetails?.sinotruck_quotations?.customer_category_id;
        customerId = await createVehicleCustomer({
          module: 'sinotruck',
          customerName,
          customerCategoryId: categoryId || undefined,
          companyId: NCG_HOLDING_ID,
        });

        if (customerId) {
          await updateOrderFinanceLinks({
            module: 'sinotruck',
            orderId: selectedOrderId!,
            financeCustomerId: customerId,
          });
          setOrderDetails((prev: any) => ({ ...prev, finance_customer_id: customerId }));
        }
      }

      const { data: freshOrder } = await supabase
        .from('sinotruck_orders')
        .select('ar_invoice_id, finance_customer_id')
        .eq('id', selectedOrderId!)
        .single();

      const arInvoiceId = freshOrder?.ar_invoice_id;
      const paymentType = arInvoiceId ? 'balance' : 'advance';
      if (freshOrder?.finance_customer_id) customerId = freshOrder.finance_customer_id;
      
      let journalEntryId: string | undefined;
      let arReceiptId: string | undefined;
      
      if (settings.auto_post_on_verify) {
        const glResult = await postVehiclePaymentToGL({
          module: 'sinotruck',
          orderNo,
          customerName,
          amount: payment.payment_amount,
          paymentType,
          paymentMethod: payment.payment_method,
          settings,
          effectiveCompanyId: NCG_HOLDING_ID,
          customBankAccountId: manualOverrides.bankId || payment.bank_account_id,
          customCreditAccountId: manualOverrides.creditId || payment.custom_credit_account_id || undefined,
          customerId,
        });

        if (glResult) {
          journalEntryId = glResult.journalEntryId;
          if (arInvoiceId) {
            const receiptResult = await createVehicleARReceipt({
              module: 'sinotruck',
              paymentId: payment.id,
              invoiceId: arInvoiceId,
              customerId: customerId,
              amount: payment.payment_amount,
              paymentMethod: payment.payment_method,
              paymentDate: payment.payment_date,
              settings,
              effectiveCompanyId: NCG_HOLDING_ID,
            });
            if (receiptResult) arReceiptId = receiptResult.receiptId;
          }
        } else {
          toast.error('Failed to post GL entry.');
          setVerifyingId(null);
          setIsReviewing(false);
          return;
        }
      }

      await supabase
        .from('sinotruck_customer_payments')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          journal_entry_id: journalEntryId,
          ar_receipt_id: arReceiptId || null,
        })
        .eq('id', paymentId);

      await updateOrderFinancials();
      await regenerateOrderInvoices();

      toast.success('Payment verified successfully.');
      loadPaymentData();
      onRefresh();
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    } finally {
      setVerifyingId(null);
      setIsReviewing(false);
      setIsReviewModalOpen(false);
      setReviewPayment(null);
    }
  };

  const updateOrderFinancials = async () => {
    if (!selectedOrderId) return;
    try {
      const { data: verifiedPayments } = await supabase
        .from('sinotruck_customer_payments')
        .select('payment_amount')
        .eq('order_id', selectedOrderId)
        .eq('status', 'verified');

      const totalPaid = verifiedPayments?.reduce((sum, p) => sum + p.payment_amount, 0) || 0;
      const balanceDue = (orderDetails?.total_amount || 0) - totalPaid;

      await supabase
        .from('sinotruck_orders')
        .update({ total_paid: totalPaid, balance_due: balanceDue })
        .eq('id', selectedOrderId);
    } catch (error) {
      console.error('Error updating order financials:', error);
    }
  };

  const regenerateOrderInvoices = async () => {
    if (!selectedOrderId) return;
    try {
      const { data: invoiceRecords } = await supabase
        .from('sinotruck_invoice_records')
        .select('id')
        .eq('order_id', selectedOrderId);

      if (invoiceRecords && invoiceRecords.length > 0) {
        const recordIds = invoiceRecords.map(r => r.id);
        const { data: documents } = await supabase
          .from('sinotruck_invoice_documents')
          .select('id')
          .in('invoice_record_id', recordIds);

        for (const doc of documents || []) {
          await regenerateInvoice(doc.id);
        }
      }
    } catch (error) {
      console.error('Error regenerating invoices:', error);
    }
  };

  const resetForm = () => {
    setPaymentForm({
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      reference_no: '',
      bank_account_id: '',
      custom_credit_account_id: '',
      notes: ''
    });
    setSelectedSchedule(null);
    setPaymentProofFile(null);
    if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
    setPaymentProofPreview(null);
  };

  const handleGenerateReceipt = async (payment: any) => {
    if (!selectedOrderId) return;
    const receipt = await createCashReceipt(payment.id, selectedOrderId, payment.payment_amount, payment.payment_method, payment.payment_date);
    if (receipt) {
      setCashReceipts(prev => ({ ...prev, [payment.id]: receipt }));
      setSelectedReceipt(receipt);
      setIsReceiptModalOpen(true);
    }
  };

  const handleViewReceipt = (paymentId: string) => {
    const receipt = cashReceipts[paymentId];
    if (receipt) {
      setSelectedReceipt(receipt);
      setIsReceiptModalOpen(true);
    }
  };

  const handleRegenerateReceipt = async (paymentId: string) => {
    const receipt = cashReceipts[paymentId];
    if (!receipt) return;
    const updatedReceipt = await regenerateCashReceipt(receipt.id);
    if (updatedReceipt) {
      setCashReceipts(prev => ({ ...prev, [paymentId]: updatedReceipt }));
      if (selectedReceipt?.id === updatedReceipt.id) setSelectedReceipt(updatedReceipt);
    }
  };

  const handleRefreshReceipts = async () => {
    if (selectedOrderId) {
      const { data: receiptsData } = await supabase
        .from('sinotruck_cash_receipts')
        .select('*')
        .eq('order_id', selectedOrderId);

      if (receiptsData) {
        const receiptsMap: Record<string, SinotrukCashReceipt> = {};
        receiptsData.forEach((receipt: SinotrukCashReceipt) => {
          receiptsMap[receipt.payment_id] = receipt;
        });
        setCashReceipts(receiptsMap);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'outline', icon: Clock },
      verified: { variant: 'default', icon: CheckCircle },
      reversed: { variant: 'destructive', icon: Undo2 }
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
        <CardHeader>
          <CardTitle>Payment Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPaid = payments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.payment_amount, 0);
  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.payment_amount, 0);
  const balanceDue = (orderDetails?.total_amount || 0) - totalPaid;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Tracking</CardTitle>
            <div className="flex gap-2">
              {!orderId && allOrders.length > 0 && (
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    {allOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_no} - {order.sinotruck_quotations?.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={() => setIsFinanceHubOpen(true)} size="sm" variant="secondary" disabled={!selectedOrderId}>
                <Landmark className="h-4 w-4 mr-2" />
                Finance Hub
              </Button>
              <Button onClick={() => setIsRecordModalOpen(true)} size="sm" disabled={!selectedOrderId}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {schedules.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Payment Schedule</h3>
              <Table className="erp-table-professional">
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
                      <TableCell className="text-right">LKR {schedule.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-3">Payment History</h3>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payments recorded yet</div>
            ) : (
              <Table className="erp-table-professional">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>{payment.payment_reference || '-'}</TableCell>
                      <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right font-semibold">LKR {payment.payment_amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payment.payment_slip_url && (
                            <Button size="sm" variant="ghost" onClick={() => window.open(payment.payment_slip_url, '_blank')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {payment.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => handleVerifyPayment(payment.id)} disabled={verifyingId === payment.id}>
                              {verifyingId === payment.id ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              {verifyingId === payment.id ? 'Verifying...' : 'Verify'}
                            </Button>
                          )}
                          
                          {payment.status === 'verified' && (
                            <>
                              {cashReceipts[payment.id] ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Receipt className="h-4 w-4 mr-1" />
                                      Receipt
                                      <MoreHorizontal className="h-4 w-4 ml-1" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewReceipt(payment.id)}>
                                      <Eye className="h-4 w-4 mr-2" /> View Receipt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedReceipt(cashReceipts[payment.id]); setIsReceiptModalOpen(true); }}>
                                      <Download className="h-4 w-4 mr-2" /> Download PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRegenerateReceipt(payment.id)}>
                                      <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleGenerateReceipt(payment)}>
                                  <Receipt className="h-4 w-4 mr-1" /> Receipt
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => handleReversePayment(payment)} className="text-orange-600 hover:text-orange-700">
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {payment.status === 'reversed' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleResyncPayment(payment.id)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Resync
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Customer Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>Payment Amount (LKR) *</Label>
               <CurrencyInput value={paymentForm.amount} onValueChange={(num) => setPaymentForm({ ...paymentForm, amount: num.toString() })} placeholder="Enter amount" />
            </div>
            <div>
              <Label>Payment Date *</Label>
              <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
            </div>
            <div>
              <Label>Payment Method *</Label>
              <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                  <SelectItem value="opening_balance">Opening Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {paymentForm.payment_method === 'opening_balance' ? (
              <div>
                <Label>Equity COA Account *</Label>
                <Select value={paymentForm.bank_account_id} onValueChange={(value) => setPaymentForm({ ...paymentForm, bank_account_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select equity account" /></SelectTrigger>
                  <SelectContent>
                    {equityAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.account_code} - {account.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Bank Account (Optional)</Label>
                <Select value={paymentForm.bank_account_id} onValueChange={(value) => setPaymentForm({ ...paymentForm, bank_account_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>{bank.bank_name} - {bank.account_name} ({bank.account_number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Reference Number</Label>
              <Input value={paymentForm.reference_no} onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })} placeholder="Transaction/cheque reference" />
            </div>
            <div>
              <Label>Payment Proof (Optional)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => { const file = e.target.files?.[0] || null; setPaymentProofFile(file); if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview); setPaymentProofPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null); }} />
              {paymentProofPreview && <img src={paymentProofPreview} alt="Preview" className="mt-2 max-h-32 rounded border object-contain" />}
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-blue-600 font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />GL Credit Override</Label>
              <SearchableAccountSelector companyId={NCG_HOLDING_ID} value={paymentForm.custom_credit_account_id} onValueChange={(val) => setPaymentForm({ ...paymentForm, custom_credit_account_id: val })} placeholder="Override credit account" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Additional notes" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={isUploading || isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SinotrukCashReceiptModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} receipt={selectedReceipt} onRefresh={handleRefreshReceipts} />
      
      {selectedOrderId && (
        <VehicleFinanceSettlement isOpen={isFinanceHubOpen} onClose={() => setIsFinanceHubOpen(false)} orderId={selectedOrderId} module="sinotruck" />
      )}

      {/* GL Verification Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-blue-600" />Verify GL Transaction</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {reviewPayment && (
              <GLBreakdownPreview 
                customerId={orderDetails?.finance_customer_id || ""}
                companyId={NCG_HOLDING_ID}
                amount={reviewPayment.payment_amount}
                paymentType={orderDetails?.ar_invoice_id ? 'balance' : 'advance'}
                customBankAccountId={reviewPayment.bank_account_id}
                customCreditAccountId={reviewPayment.custom_credit_account_id}
                paymentMethod={reviewPayment.payment_method}
                onOverridesChange={setManualOverrides}
              />
            )}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> System Guidance</h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                Verifying this payment will sync it to the <strong>General Ledger</strong>. 
                {orderDetails?.ar_invoice_id ? ' It will credit Trade Receivables.' : ' It will credit Customer Advances.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewModalOpen(false)} disabled={isReviewing}>Cancel</Button>
            <Button onClick={confirmVerifyPayment} disabled={isReviewing} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isReviewing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {isReviewing ? 'Verifying...' : 'Confirm & Post to GL'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GL Reversal Review Modal */}
      <Dialog open={isReversalReviewModalOpen} onOpenChange={setIsReversalReviewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Undo2 className="h-5 w-5 text-orange-600" />Reverse GL Transaction</DialogTitle>
            <DialogDescription>This will create a reversing entry to cancel out the original transaction.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {reviewPayment && (
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-md text-xs text-orange-800">
                  <strong>Original Entry:</strong> {reviewPayment.journal_entries?.entry_number || 'Linked Entry'}
                </div>
                <GLBreakdownPreview 
                  customerId={orderDetails?.finance_customer_id || ""}
                  companyId={NCG_HOLDING_ID}
                  amount={reviewPayment.payment_amount}
                  paymentType={orderDetails?.ar_invoice_id ? 'balance' : 'advance'}
                  customBankAccountId={reviewPayment.bank_account_id}
                  customCreditAccountId={reviewPayment.custom_credit_account_id}
                  paymentMethod={reviewPayment.payment_method}
                />
                <div className="mt-4 p-4 bg-slate-50 border rounded-lg">
                  <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Reversal Logic</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The system will automatically flip the original Debit and Credit lines. 
                    <strong> Bank</strong> will be Credited, and <strong>{orderDetails?.ar_invoice_id ? 'Receivable' : 'Advance'}</strong> will be Debited.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReversalReviewModalOpen(false)} disabled={isReversing}>Cancel</Button>
            <Button onClick={confirmReversePayment} disabled={isReversing} className="bg-orange-600 hover:bg-orange-700 text-white">
              {isReversing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
              {isReversing ? 'Reversing...' : 'Confirm Reversal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
