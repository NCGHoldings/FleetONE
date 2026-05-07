import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, CheckCircle, Clock, FileText, Plus, RefreshCw, Eye, Download, MoreHorizontal, Receipt, Landmark, Upload, Image } from 'lucide-react';
import { useYutongOrderInvoiceManagement } from '@/hooks/useYutongOrderInvoiceManagement';
import { useYutongCashReceipts, YutongCashReceipt } from '@/hooks/useYutongCashReceipts';
import { YutongCashReceiptModal } from './YutongCashReceiptModal';
import { VehicleFinanceSettlement } from '@/components/accounting/shared/VehicleFinanceSettlement';
import { SearchableAccountSelector } from '@/components/accounting/shared/SearchableAccountSelector';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  fetchVehicleFinanceSettings,
  createVehicleCustomer,
  postVehiclePaymentToGL,
  updateOrderFinanceLinks,
  createVehicleARReceipt,
  NCG_HOLDING_ID,
} from '@/hooks/useVehicleSalesFinance';

interface YutongPaymentTrackingProps {
  orderId?: string;
  onRefresh: () => void;
}

export function YutongPaymentTracking({ orderId, onRefresh }: YutongPaymentTrackingProps) {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(orderId);
  const [payments, setPayments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isFinanceHubOpen, setIsFinanceHubOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const { regenerateInvoice } = useYutongOrderInvoiceManagement();
  const { createCashReceipt, getCashReceiptByPaymentId, regenerateCashReceipt } = useYutongCashReceipts();
  
  // Cash receipt states
  const [cashReceipts, setCashReceipts] = useState<Record<string, YutongCashReceipt>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<YutongCashReceipt | null>(null);
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
        .in('company_id', [NCG_HOLDING_ID, 'a0000000-0000-0000-0000-000000000003'])
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
        .from('yutong_orders')
        .select('id, order_no, yutong_quotations(customer_name)')
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
      // Load order details
      const { data: order, error: orderError } = await supabase
        .from('yutong_orders')
        .select('*, yutong_quotations(quotation_no, customer_name, customer_category_id)')
        .eq('id', selectedOrderId)
        .single();

      if (orderError) throw orderError;
      setOrderDetails(order);

      // Load payment schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('yutong_payment_schedules')
        .select('*')
        .eq('order_id', selectedOrderId)
        .order('due_date', { ascending: true });

      if (scheduleError) throw scheduleError;
      setSchedules(scheduleData || []);

      // Load customer payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('yutong_customer_payments')
        .select('*')
        .eq('order_id', selectedOrderId)
        .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);

      // Load cash receipts for each payment
      if (paymentData && paymentData.length > 0) {
        console.log('Loading cash receipts for order:', selectedOrderId);
        const { data: receiptsData, error: receiptsError } = await supabase
          .from('yutong_cash_receipts')
          .select('*')
          .eq('order_id', selectedOrderId);

        if (receiptsError) {
          console.error('Error loading cash receipts:', receiptsError);
        } else if (receiptsData) {
          console.log('Loaded cash receipts:', receiptsData.length, 'receipts');
          const receiptsMap: Record<string, YutongCashReceipt> = {};
          receiptsData.forEach((receipt: YutongCashReceipt) => {
            receiptsMap[receipt.payment_id] = receipt;
          });
          setCashReceipts(receiptsMap);
        }
      } else {
        // Clear cash receipts if no payments
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
        return;
      }

      if (!selectedOrderId) {
        toast.error('No order selected');
        return;
      }

      if (!paymentForm.bank_account_id) {
        toast.error(paymentForm.payment_method === 'opening_balance' ? 'Please select an equity account' : 'Please select a bank account');
        return;
      }

      // Get current user for created_by field
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Authentication error. Please log in again.');
        return;
      }

      // Upload payment proof if provided
      let paymentSlipUrl: string | null = null;
      if (paymentProofFile) {
        setIsUploading(true);
        const fileExt = paymentProofFile.name.split('.').pop();
        const filePath = `yutong/${selectedOrderId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, paymentProofFile);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Failed to upload payment proof');
          setIsUploading(false);
          return;
        }
        
        const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
        paymentSlipUrl = urlData?.publicUrl || null;
        setIsUploading(false);
      }

      // Get selected bank account name
      const selectedBank = paymentForm.payment_method === 'opening_balance'
        ? equityAccounts.find(b => b.id === paymentForm.bank_account_id)
        : bankAccounts.find(b => b.id === paymentForm.bank_account_id);

      const bankNameStr = paymentForm.payment_method === 'opening_balance'
        ? selectedBank ? `${selectedBank.account_code} - ${selectedBank.account_name}` : null
        : selectedBank ? `${selectedBank.bank_name} - ${selectedBank.account_name}` : null;

      // Insert payment record with created_by
      const { data: payment, error: paymentError } = await supabase
        .from('yutong_customer_payments')
        .insert({
          order_id: selectedOrderId,
          payment_schedule_id: selectedSchedule?.id || null,
          payment_amount: amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.reference_no || null,
          bank_account_id: paymentForm.bank_account_id,
          bank_name: bankNameStr,
          custom_credit_account_id: paymentForm.custom_credit_account_id || null,
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

  /**
   * PROPER ACCOUNTING FLOW:
   * Cash Receipt (Payment Verification) = GL Entry ONLY (DR Bank / CR Customer Advance)
   * AR Invoice is created when SYSTEM INVOICE is approved, NOT at payment time
   */
  const handleVerifyPayment = async (paymentId: string) => {
    if (verifyingId === paymentId) return;
    setVerifyingId(paymentId);
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) {
        toast.error('Payment not found');
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      // Fetch finance settings
      const settings = await fetchVehicleFinanceSettings('yutong', NCG_HOLDING_ID);
      if (!settings) {
        toast.error('Finance settings not configured. Please configure Yutong Finance Settings first.');
        return;
      }

      // Validate required accounts for advance payment GL posting
      if (!settings.default_bank_account_id) {
        toast.error('Bank Account not configured. Go to Finance → Settings → Yutong Finance.');
        return;
      }
      if (!settings.customer_advance_account_id) {
        toast.error('Customer Advance Account not configured. Go to Finance → Settings → Yutong Finance.');
        return;
      }

      const customerName = orderDetails?.yutong_quotations?.customer_name || 'Unknown';
      const orderNo = orderDetails?.order_no;

      // 1. Create/Get Finance Customer
      let customerId = orderDetails?.finance_customer_id;
      if (!customerId && settings.auto_create_customer) {
        const categoryId = (orderDetails as any)?.customer_category_id 
          || orderDetails?.yutong_quotations?.customer_category_id;
        customerId = await createVehicleCustomer({
          module: 'yutong',
          customerName,
          customerCategoryId: categoryId || undefined,
          companyId: NCG_HOLDING_ID,
        });

        if (customerId) {
          await updateOrderFinanceLinks({
            module: 'yutong',
            orderId: selectedOrderId!,
            financeCustomerId: customerId,
          });
          // Update local state to reflect the customer
          setOrderDetails((prev: any) => ({ ...prev, finance_customer_id: customerId }));
        }
      }

      // 2. Re-fetch order to get latest ar_invoice_id (may have been approved after modal opened)
      const { data: freshOrder, error: freshError } = await supabase
        .from('yutong_orders')
        .select('ar_invoice_id, finance_customer_id')
        .eq('id', selectedOrderId!)
        .single();

      if (freshError || !freshOrder) {
        toast.error('Failed to load latest order state. Please try again.');
        setVerifyingId(null);
        return;
      }

      // Use fresh data only - no stale fallback
      const arInvoiceId = freshOrder.ar_invoice_id;
      const paymentType = arInvoiceId ? 'balance' : 'advance';
      // Also use fresh customer ID if available
      if (freshOrder.finance_customer_id) {
        customerId = freshOrder.finance_customer_id;
      }
      
      let journalEntryId: string | undefined;
      let arReceiptId: string | undefined;
      
      if (settings.auto_post_on_verify) {
        // If pre-invoice -> advance (Liability). If post-invoice -> balance (Trade Receivable).
        const glResult = await postVehiclePaymentToGL({
          module: 'yutong',
          orderNo,
          customerName,
          amount: payment.payment_amount,
          paymentType,
          paymentMethod: payment.payment_method,
          settings,
          effectiveCompanyId: NCG_HOLDING_ID,
          customBankAccountId: payment.bank_account_id,
          customCreditAccountId: payment.custom_credit_account_id || undefined,
        });

        if (glResult) {
          journalEntryId = glResult.journalEntryId;
          const label = arInvoiceId ? 'Trade Receivable' : 'Customer Advance';
          toast.success(`GL Entry posted: ${glResult.entryNumber} (DR Bank / CR ${label})`);
          
          // If AR invoice exists, also create an AR Receipt immediately to reduce balance
          if (arInvoiceId) {
            const receiptResult = await createVehicleARReceipt({
              module: 'yutong',
              paymentId: payment.id,
              invoiceId: arInvoiceId,
              customerId: customerId,
              amount: payment.payment_amount,
              paymentMethod: payment.payment_method,
              paymentDate: payment.payment_date,
              settings,
              effectiveCompanyId: NCG_HOLDING_ID,
            });
            if (receiptResult) {
              arReceiptId = receiptResult.receiptId;
              toast.success(`AR Receipt Created: ${receiptResult.receiptNumber}`);
            }
          }
        } else {
          toast.error('Failed to post GL entry. Check Finance Settings.');
          setVerifyingId(null);
          return;
        }
      }

      // 3. Update payment status with GL link and AR Receipt link
      const { error } = await supabase
        .from('yutong_customer_payments')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          journal_entry_id: journalEntryId,
          ar_receipt_id: arReceiptId || null,
        })
        .eq('id', paymentId);

      if (error) throw error;

      // 4. Update order totals
      await updateOrderFinancials();

      // 5. Regenerate all invoices for this order with updated payment data
      await regenerateOrderInvoices();

      toast.success('Payment verified successfully. GL entry posted (Bank vs Customer Advance).');
      loadPaymentData();
      onRefresh();
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    } finally {
      setVerifyingId(null);
    }
  };

  const updateOrderFinancials = async () => {
    if (!selectedOrderId) return;
    
    try {
      // Calculate total verified payments
      const { data: verifiedPayments, error: paymentsError } = await supabase
        .from('yutong_customer_payments')
        .select('payment_amount')
        .eq('order_id', selectedOrderId)
        .eq('status', 'verified');

      if (paymentsError) throw paymentsError;

      const totalPaid = verifiedPayments?.reduce((sum, p) => sum + p.payment_amount, 0) || 0;
      const balanceDue = (orderDetails?.total_amount || 0) - totalPaid;

      // Update order
      const { error: updateError } = await supabase
        .from('yutong_orders')
        .update({
          total_paid: totalPaid,
          balance_due: balanceDue
        })
        .eq('id', selectedOrderId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating order financials:', error);
    }
  };

  const regenerateOrderInvoices = async () => {
    if (!selectedOrderId) return;
    
    try {
      // Get all invoice documents for this order
      const { data: invoiceRecords, error: recordsError } = await supabase
        .from('yutong_invoice_records')
        .select('id')
        .eq('order_id', selectedOrderId);

      if (recordsError) throw recordsError;

      // Get documents for these records
      if (invoiceRecords && invoiceRecords.length > 0) {
        const recordIds = invoiceRecords.map(r => r.id);
        const { data: documents, error: docsError } = await supabase
          .from('yutong_invoice_documents')
          .select('id')
          .in('invoice_record_id', recordIds);

        if (docsError) throw docsError;

        // Regenerate each invoice
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

  // Cash Receipt handlers
  const handleGenerateReceipt = async (payment: any) => {
    if (!selectedOrderId) return;
    
    const receipt = await createCashReceipt(
      payment.id,
      selectedOrderId,
      payment.payment_amount,
      payment.payment_method,
      payment.payment_date
    );
    
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

  // Handle regenerating a cash receipt with updated format
  const handleRegenerateReceipt = async (paymentId: string) => {
    const receipt = cashReceipts[paymentId];
    if (!receipt) {
      toast.error('Receipt not found');
      return;
    }
    
    const updatedReceipt = await regenerateCashReceipt(receipt.id);
    if (updatedReceipt) {
      setCashReceipts(prev => ({ ...prev, [paymentId]: updatedReceipt }));
      // If this receipt is currently selected, update it
      if (selectedReceipt?.id === updatedReceipt.id) {
        setSelectedReceipt(updatedReceipt);
      }
    }
  };

  const handleRefreshReceipts = async () => {
    // Reload cash receipts
    if (selectedOrderId) {
      const { data: receiptsData, error } = await supabase
        .from('yutong_cash_receipts')
        .select('*')
        .eq('order_id', selectedOrderId);

      if (!error && receiptsData) {
        const receiptsMap: Record<string, YutongCashReceipt> = {};
        receiptsData.forEach((receipt: YutongCashReceipt) => {
          receiptsMap[receipt.payment_id] = receipt;
        });
        setCashReceipts(receiptsMap);
        
        // Update selected receipt if it's open
        if (selectedReceipt) {
          const updatedReceipt = receiptsData.find((r: YutongCashReceipt) => r.id === selectedReceipt.id);
          if (updatedReceipt) {
            setSelectedReceipt(updatedReceipt);
          }
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'outline', icon: Clock },
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
                        {order.order_no} - {order.yutong_quotations?.customer_name}
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

          {/* Payment Schedule */}
          {schedules.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Payment Schedule</h3>
              <Table className="erp-table-professional">
                <TableHeader>
                  <TableRow>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right" data-column-type="number">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.milestone_name}</TableCell>
                      <TableCell>{new Date(schedule.due_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right" data-column-type="number">LKR {schedule.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Payment History */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Payment History</h3>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments recorded yet
              </div>
            ) : (
              <Table className="erp-table-professional">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right" data-column-type="number">Amount</TableHead>
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
                      <TableCell className="text-right font-semibold" data-column-type="number">
                        LKR {payment.payment_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payment.payment_slip_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(payment.payment_slip_url, '_blank')}
                              title="View Payment Proof"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyPayment(payment.id)}
                              disabled={verifyingId === payment.id}
                            >
                              {verifyingId === payment.id ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              {verifyingId === payment.id ? 'Verifying...' : 'Verify'}
                            </Button>
                          )}
                          
                          {/* Cash Receipt Actions */}
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
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Receipt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedReceipt(cashReceipts[payment.id]);
                                      setIsReceiptModalOpen(true);
                                    }}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRegenerateReceipt(payment.id)}>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Regenerate Receipt
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGenerateReceipt(payment)}
                                >
                                  <Receipt className="h-4 w-4 mr-1" />
                                  Generate Receipt
                                </Button>
                              )}
                            </>
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
          <DialogHeader>
            <DialogTitle>Record Customer Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>Payment Amount (LKR) *</Label>
               <CurrencyInput
                value={paymentForm.amount}
                onValueChange={(num) => setPaymentForm({ ...paymentForm, amount: num.toString() })}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </div>
            <div>
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
                  <SelectItem value="online">Online Payment</SelectItem>
                  <SelectItem value="opening_balance">Opening Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {paymentForm.payment_method === 'opening_balance' ? (
              <div>
                <Label>Equity COA Account *</Label>
                <Select
                  value={paymentForm.bank_account_id}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, bank_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equity account" />
                  </SelectTrigger>
                  <SelectContent>
                    {equityAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <Landmark className="h-3 w-3 text-muted-foreground" />
                          {account.account_code} - {account.account_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Bank Account *</Label>
                <Select
                  value={paymentForm.bank_account_id}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, bank_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <Landmark className="h-3 w-3 text-muted-foreground" />
                          {bank.bank_name} - {bank.account_name} ({bank.account_number})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Reference Number</Label>
              <Input
                value={paymentForm.reference_no}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                placeholder="Transaction/cheque reference"
              />
            </div>
            <div>
              <Label>Payment Proof (Optional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPaymentProofFile(file);
                    if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
                    setPaymentProofPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
                  }}
                  className="flex-1"
                />
                {paymentProofFile && (
                  <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                    <Image className="h-3 w-3" />
                    {paymentProofFile.name.slice(0, 15)}...
                  </Badge>
                )}
              </div>
              {paymentProofPreview && (
                <img src={paymentProofPreview} alt="Payment proof preview" className="mt-2 max-h-32 rounded border object-contain" />
              )}
              <p className="text-xs text-muted-foreground mt-1">Upload bank slip, receipt photo, or transfer confirmation</p>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-blue-600 font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                GL Credit Account Override (Optional)
              </Label>
              <SearchableAccountSelector
                companyId={NCG_HOLDING_ID}
                value={paymentForm.custom_credit_account_id}
                onValueChange={(val) => setPaymentForm({ ...paymentForm, custom_credit_account_id: val })}
                placeholder="Select custom credit account (e.g. specific liability or revenue)"
              />
              <p className="text-[10px] text-muted-foreground italic">
                * By default, payments hit 'Customer Advances' (before invoice) or 'Trade Receivables' (after invoice). Use this to override.
              </p>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={isUploading || isSubmitting}>
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Recording...' : isUploading ? 'Uploading...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Receipt Modal */}
      <YutongCashReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={selectedReceipt}
        onRefresh={handleRefreshReceipts}
      />
      
      {/* Finance Hub Modal */}
      {selectedOrderId && (
        <VehicleFinanceSettlement
          isOpen={isFinanceHubOpen}
          onClose={() => setIsFinanceHubOpen(false)}
          orderId={selectedOrderId}
          module="yutong"
        />
      )}
    </>
  );
}
