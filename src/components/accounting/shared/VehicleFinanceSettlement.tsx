import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { reverseJournalEntry } from '@/hooks/useEditAccountingMutations';
import { toast } from 'sonner';
import { CheckCircle, Clock, DollarSign, Database, RefreshCw, FileText, ArrowRight, Undo2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GLBreakdownPreview } from './GLBreakdownPreview';
import { 
  postVehiclePaymentToGL, 
  fetchVehicleFinanceSettings, 
  NCG_HOLDING_ID,
  createVehicleCustomer,
  updateOrderFinanceLinks,
  createVehicleARReceipt,
  VehicleModule
} from '@/hooks/useVehicleSalesFinance';

interface VehicleFinanceSettlementProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  module: VehicleModule;
}

export function VehicleFinanceSettlement({ isOpen, onClose, orderId, module }: VehicleFinanceSettlementProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [arInvoice, setArInvoice] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState<string | null>(null);
  
  // GL Review states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReversalReviewModalOpen, setIsReversalReviewModalOpen] = useState(false);
  const [reviewPayment, setReviewPayment] = useState<any>(null);
  const [isConfirmingSync, setIsConfirmingSync] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<{ bankId: string | null; creditId: string | null }>({ bankId: null, creditId: null });

  useEffect(() => {
    if (isOpen && orderId) {
      loadFinanceData();
    }
  }, [isOpen, orderId, module]);

  const loadFinanceData = async () => {
    setIsLoading(true);
    try {
      const orderTable = `${module}_orders`;
      const paymentTable = `${module}_customer_payments`;

      // 1. Load Order
      const { data: order, error: orderError } = await supabase
        .from(orderTable)
        .select(`
          *,
          ${module}_quotations(customer_name, customer_category_id)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrderData(order);

      // 2. Load Payments
      const { data: paymentData, error: paymentError } = await supabase
        .from(paymentTable)
        .select('*')
        .eq('order_id', orderId)
        .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);

      // 3. Load AR Invoice if linked
      if (order.ar_invoice_id) {
        const { data: invoice, error: invoiceError } = await supabase
          .from('ar_invoices')
          .select('*')
          .eq('id', order.ar_invoice_id)
          .single();
        if (!invoiceError) setArInvoice(invoice);
      }

      // 4. Load Live JEs based on payments and AR Invoice
      const jeIds = paymentData?.map(p => p.journal_entry_id).filter(Boolean) || [];
      if (order.ar_invoice_id && arInvoice?.journal_entry_id) {
        jeIds.push(arInvoice.journal_entry_id);
      }
      
      if (jeIds.length > 0) {
        const { data: jeData, error: jeError } = await supabase
          .from('journal_entries')
          .select(`
            *,
            journal_entry_lines(
              id,
              account_id,
              debit,
              credit,
              chart_of_accounts(account_code, account_name)
            )
          `)
          .in('id', jeIds)
          .order('entry_date', { ascending: false });

        if (!jeError) setJournalEntries(jeData || []);
      } else {
        setJournalEntries([]);
      }

    } catch (error: any) {
      console.error('Error loading finance data:', error);
      toast.error('Failed to load finance data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncPaymentToGL = async (payment: any) => {
    setReviewPayment(payment);
    setIsReviewModalOpen(true);
  };

  const confirmSyncPaymentToGL = async () => {
    if (!reviewPayment || isSyncing) return;
    const payment = reviewPayment;
    setIsSyncing(payment.id);
    setIsConfirmingSync(true);
    try {
      const settings = await fetchVehicleFinanceSettings(module, NCG_HOLDING_ID);
      if (!settings) {
        toast.error('Finance settings not configured for this module.');
        return;
      }

      const customerName = orderData?.[`${module}_quotations`]?.customer_name || 'Unknown';
      const orderNo = orderData?.order_no;
      let customerId = orderData?.finance_customer_id;

      if (!customerId && settings.auto_create_customer) {
        const categoryId = orderData?.[`${module}_quotations`]?.customer_category_id;
        customerId = await createVehicleCustomer({
          module,
          customerName,
          customerCategoryId: categoryId || undefined,
          companyId: NCG_HOLDING_ID,
        });

        if (customerId) {
          await updateOrderFinanceLinks({ module, orderId, financeCustomerId: customerId });
          setOrderData((prev: any) => ({ ...prev, finance_customer_id: customerId }));
        }
      }

      const paymentType = orderData?.ar_invoice_id ? 'balance' : 'advance';
      
      const glResult = await postVehiclePaymentToGL({
        module,
        orderNo,
        customerName,
        amount: payment.payment_amount,
        paymentType,
        paymentMethod: payment.payment_method,
        settings,
        effectiveCompanyId: NCG_HOLDING_ID,
        customBankAccountId: manualOverrides.bankId || payment.bank_account_id,
        customCreditAccountId: manualOverrides.creditId || payment.custom_credit_account_id,
        paymentDate: payment.payment_date,
      });

      if (glResult) {
        let arReceiptId;
        if (orderData?.ar_invoice_id) {
          const receiptResult = await createVehicleARReceipt({
            module,
            paymentId: payment.id,
            invoiceId: orderData.ar_invoice_id,
            customerId: customerId,
            amount: payment.payment_amount,
            paymentMethod: payment.payment_method,
            paymentDate: payment.payment_date,
            settings,
            effectiveCompanyId: NCG_HOLDING_ID,
          });
          if (receiptResult) arReceiptId = receiptResult.receiptId;
        }

        const paymentTable = `${module}_customer_payments`;
        await supabase
          .from(paymentTable)
          .update({
            status: 'verified',
            journal_entry_id: glResult.journalEntryId,
            ar_receipt_id: arReceiptId || null,
          })
          .eq('id', payment.id);

        toast.success(`GL Sync Successful: ${glResult.entryNumber}`);
        loadFinanceData();
      }
    } catch (error: any) {
      console.error('Error syncing payment to GL:', error);
      toast.error('Failed to sync to GL');
    } finally {
      setIsSyncing(null);
      setIsConfirmingSync(false);
      setIsReviewModalOpen(false);
      setReviewPayment(null);
    }
  };

  const handleReversePayment = async (payment: any) => {
    setReviewPayment(payment);
    setIsReversalReviewModalOpen(true);
  };

  const confirmReversePayment = async () => {
    if (!reviewPayment) return;
    const payment = reviewPayment;
    setIsReversing(payment.id);
    try {
      if (payment.journal_entry_id) {
        const reversedId = await reverseJournalEntry(payment.journal_entry_id, NCG_HOLDING_ID);
        if (!reversedId) throw new Error('Failed to reverse GL entry');
      }

      const paymentTable = `${module}_customer_payments`;
      await supabase
        .from(paymentTable)
        .update({
          status: 'reversed',
        })
        .eq('id', payment.id);
        
      toast.success('Payment reversed successfully');
      loadFinanceData();
    } catch (error: any) {
      console.error('Error reversing payment:', error);
      toast.error(error.message || 'Failed to reverse payment');
    } finally {
      setIsReversing(null);
      setIsReversalReviewModalOpen(false);
      setReviewPayment(null);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </DialogContent>
      </Dialog>
    );
  }

  const totalBilled = orderData?.total_amount || 0;
  const totalPaid = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.payment_amount, 0);
  const balanceDue = totalBilled - totalPaid;
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.payment_amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Database className="h-6 w-6 text-blue-600" />
            Finance Settlement Hub - {module.toUpperCase()} {orderData?.order_no}
          </DialogTitle>
          <DialogDescription>
            Audit-ready view of operational payments, AR invoices, and General Ledger entries.
          </DialogDescription>
        </DialogHeader>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">LKR {totalBilled.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Billed</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-700">LKR {totalPaid.toLocaleString()}</div>
              <p className="text-sm text-green-600/80">Verified & Posted</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-700">LKR {pendingAmount.toLocaleString()}</div>
              <p className="text-sm text-yellow-600/80">Pending GL Sync</p>
            </CardContent>
          </Card>
          <Card className={balanceDue > 0 ? "bg-red-50/50" : "bg-slate-50"}>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-700' : ''}`}>
                LKR {balanceDue.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Balance Due</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payments" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Payment Lifecycle
            </TabsTrigger>
            <TabsTrigger value="ar" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Master AR
            </TabsTrigger>
            <TabsTrigger value="gl" className="flex items-center gap-2">
              <Database className="h-4 w-4" /> Live JEs
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Operational Payments</CardTitle>
                <CardDescription>All payments recorded against this order.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>GL Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.payment_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="capitalize">{p.payment_method?.replace('_', ' ')}</TableCell>
                        <TableCell className="font-semibold">LKR {p.payment_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {p.status === 'verified' ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
                          ) : p.status === 'reversed' ? (
                            <Badge variant="destructive">Reversed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.journal_entry_id ? (
                            <div className="flex items-center text-green-600 text-sm">
                              <CheckCircle className="h-4 w-4 mr-1" /> Linked
                            </div>
                          ) : (
                            <div className="flex items-center text-muted-foreground text-sm">
                              <Clock className="h-4 w-4 mr-1" /> Unlinked
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {!p.journal_entry_id && p.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleSyncPaymentToGL(p)}
                              disabled={isSyncing === p.id}
                            >
                              {isSyncing === p.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Sync GL
                            </Button>
                          )}
                          {p.status === 'verified' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleReversePayment(p)}
                              disabled={isReversing === p.id}
                            >
                              {isReversing === p.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Undo2 className="h-4 w-4 mr-2" />
                              )}
                              Reverse
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No payments recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AR Invoices Tab */}
          <TabsContent value="ar" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Master AR Invoice</CardTitle>
                <CardDescription>The official Accounts Receivable invoice for this order.</CardDescription>
              </CardHeader>
              <CardContent>
                {arInvoice ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Paid Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>GL Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">{arInvoice.invoice_number}</TableCell>
                        <TableCell>{format(new Date(arInvoice.invoice_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>LKR {arInvoice.total_amount.toLocaleString()}</TableCell>
                        <TableCell>LKR {arInvoice.paid_amount?.toLocaleString() || 0}</TableCell>
                        <TableCell>LKR {arInvoice.balance?.toLocaleString() || 0}</TableCell>
                        <TableCell>
                          <Badge variant={arInvoice.status === 'paid' ? 'default' : 'outline'}>
                            {arInvoice.status?.toUpperCase() || 'UNPAID'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {arInvoice.journal_entry_id ? (
                            <div className="flex items-center text-green-600 text-sm">
                              <CheckCircle className="h-4 w-4 mr-1" /> Linked
                            </div>
                          ) : (
                            <div className="flex items-center text-muted-foreground text-sm">
                              <Clock className="h-4 w-4 mr-1" /> Unlinked
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {!arInvoice.journal_entry_id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                if (!arInvoice || isSyncing === arInvoice.id) return;
                                setIsSyncing(arInvoice.id);
                                try {
                                  const settings = await fetchVehicleFinanceSettings(module, NCG_HOLDING_ID);
                                  if (!settings) {
                                    toast.error('Finance settings not configured for this module.');
                                    return;
                                  }
                                  const { postVehicleInvoiceToGL } = await import('@/hooks/useVehicleSalesFinance');
                                  const customerName = orderData?.[`${module}_quotations`]?.customer_name || 'Unknown';
                                  const result = await postVehicleInvoiceToGL({
                                    module,
                                    orderNo: orderData?.order_no,
                                    customerName,
                                    customerId: orderData?.finance_customer_id,
                                    invoiceAmount: arInvoice.total_amount,
                                    settings,
                                    effectiveCompanyId: NCG_HOLDING_ID,
                                    invoiceNo: arInvoice.invoice_number,
                                    invoiceDate: arInvoice.invoice_date,
                                  });
                                  if (result) {
                                    await supabase.from('ar_invoices').update({ journal_entry_id: result.journalEntryId }).eq('id', arInvoice.id);
                                    toast.success(`Invoice synced to GL successfully: ${result.entryNumber}`);
                                    loadFinanceData();
                                  }
                                } catch (e: any) {
                                  toast.error(e.message || 'Error syncing invoice to GL');
                                } finally {
                                  setIsSyncing(null);
                                }
                              }}
                              disabled={isSyncing === arInvoice.id}
                            >
                              {isSyncing === arInvoice.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Sync GL
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No Master AR Invoice generated yet.</p>
                    <p className="text-sm">Invoices are typically generated when the order is confirmed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GL Tab */}
          <TabsContent value="gl" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Journal Entries</CardTitle>
                <CardDescription>Double-entry accounting records directly linked to this order.</CardDescription>
              </CardHeader>
              <CardContent>
                {journalEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No General Ledger entries posted yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {journalEntries.map((je) => (
                      <div key={je.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
                          <div>
                            <div className="font-medium">{je.entry_number}</div>
                            <div className="text-sm text-muted-foreground">{je.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{format(new Date(je.entry_date), 'MMM dd, yyyy')}</div>
                            <Badge variant="outline" className="mt-1 bg-white">{je.status}</Badge>
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {je.journal_entry_lines?.map((line: any) => (
                              <TableRow key={line.id}>
                                <TableCell>
                                  {line.chart_of_accounts?.account_code} - {line.chart_of_accounts?.account_name}
                                </TableCell>
                                <TableCell className="text-right">
                                  {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-slate-50 font-medium">
                              <TableCell className="text-right">Total:</TableCell>
                              <TableCell className="text-right">{je.total_debit.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{je.total_credit.toLocaleString()}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Review GL Impact
              </DialogTitle>
              <DialogDescription>
                Verify the debit and credit lines before posting to the General Ledger.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {reviewPayment && (
                <GLBreakdownPreview 
                  customerId={orderData?.finance_customer_id || ""}
                  companyId={NCG_HOLDING_ID}
                  amount={reviewPayment.payment_amount}
                  paymentType={orderData?.ar_invoice_id ? 'balance' : 'advance'}
                  customBankAccountId={reviewPayment.bank_account_id}
                  customCreditAccountId={reviewPayment.custom_credit_account_id}
                  paymentMethod={reviewPayment.payment_method}
                  onOverridesChange={setManualOverrides}
                />
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsReviewModalOpen(false)} disabled={isConfirmingSync}>
                Cancel
              </Button>
              <Button 
                onClick={confirmSyncPaymentToGL} 
                disabled={isConfirmingSync}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isConfirmingSync ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isConfirmingSync ? 'Syncing...' : 'Confirm & Post to GL'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GL Reversal Review Modal */}
        <Dialog open={isReversalReviewModalOpen} onOpenChange={setIsReversalReviewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Undo2 className="h-5 w-5 text-orange-600" />
                Reverse GL Transaction
              </DialogTitle>
              <DialogDescription>
                This will create a reversing entry to cancel out the original transaction.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {reviewPayment && (
                <div className="space-y-4">
                  <div className="p-3 bg-orange-50 border border-orange-100 rounded-md text-xs text-orange-800">
                    <strong>Original Entry:</strong> {reviewPayment.journal_entries?.entry_number || 'Linked Entry'}
                  </div>
                  
                  <GLBreakdownPreview 
                    customerId={orderData?.finance_customer_id || ""}
                    companyId={NCG_HOLDING_ID}
                    amount={reviewPayment.payment_amount}
                    paymentType={orderData?.ar_invoice_id ? 'balance' : 'advance'}
                    customBankAccountId={reviewPayment.bank_account_id}
                    customCreditAccountId={reviewPayment.custom_credit_account_id}
                    paymentMethod={reviewPayment.payment_method}
                  />
                  
                  <div className="mt-4 p-4 bg-slate-50 border rounded-lg">
                    <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Reversal Logic
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The system will automatically flip the original Debit and Credit lines. 
                      <strong> Bank</strong> will be Credited, and <strong>{orderData?.ar_invoice_id ? 'Receivable' : 'Advance'}</strong> will be Debited.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsReversalReviewModalOpen(false)} disabled={!!isReversing}>
                Cancel
              </Button>
              <Button 
                onClick={confirmReversePayment} 
                disabled={!!isReversing}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isReversing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Undo2 className="h-4 w-4 mr-2" />
                )}
                {isReversing ? 'Reversing...' : 'Confirm Reversal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
