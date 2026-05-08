import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Wallet, AlertCircle, CheckCircle2, Search, Building2, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBankDeposits } from '@/hooks/useBankDeposits';
import {
  fetchVehicleFinanceSettings,
  createVehicleCustomer,
  postVehiclePaymentToGL,
  updateOrderFinanceLinks,
  createVehicleARReceipt,
  NCG_HOLDING_ID,
} from '@/hooks/useVehicleSalesFinance';

export function YutongFinanceSettlementHub() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [overrideBankAccountId, setOverrideBankAccountId] = useState<string>('default');

  // Bank deposit state
  const { deposits, totalUnsettledCash, loading: depositsLoading, recordDeposit } = useBankDeposits(new Date());
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRef, setDepositRef] = useState("");
  const [depositBank, setDepositBank] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  useEffect(() => {
    loadBankAccounts();
    loadPendingPayments();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .eq('company_id', NCG_HOLDING_ID)
        .eq('account_type', 'asset')
        .eq('is_active', true)
        .order('account_code');
      if (error) throw error;
      setBankAccounts(data || []);
      // Set default bank if available
      if (data && data.length > 0) {
        setDepositBank(data[0].account_name);
      }
    } catch (error) {
      console.error('Error loading asset accounts:', error);
    }
  };

  const loadPendingPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('yutong_customer_payments')
        .select(`
          *,
          yutong_orders (
            order_no,
            finance_customer_id,
            ar_invoice_id,
            yutong_quotations (
              customer_name,
              customer_category_id
            )
          )
        `)
        .eq('status', 'pending')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (err: any) {
      toast.error('Failed to load pending payments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPaymentIds(payments.map(p => p.id));
    } else {
      setSelectedPaymentIds([]);
    }
  };

  const handleSelectPayment = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPaymentIds(prev => [...prev, id]);
    } else {
      setSelectedPaymentIds(prev => prev.filter(pid => pid !== id));
    }
  };

  const handleBulkVerifyAndPost = async () => {
    if (selectedPaymentIds.length === 0) {
      toast.error("Please select at least one payment to process");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const settings = await fetchVehicleFinanceSettings('yutong', NCG_HOLDING_ID);
      if (!settings) throw new Error("Yutong finance settings not found");

      for (const paymentId of selectedPaymentIds) {
        try {
          const payment = payments.find(p => p.id === paymentId);
          if (!payment) continue;

          const orderDetails = payment.yutong_orders;
          const customerName = orderDetails?.yutong_quotations?.customer_name || 'Unknown';
          const orderNo = orderDetails?.order_no;

          let customerId = orderDetails?.finance_customer_id;
          if (!customerId && settings.auto_create_customer) {
            const categoryId = orderDetails?.yutong_quotations?.customer_category_id;
            customerId = await createVehicleCustomer({
              module: 'yutong',
              customerName,
              customerCategoryId: categoryId || undefined,
              companyId: NCG_HOLDING_ID,
            });

            if (customerId) {
              await updateOrderFinanceLinks({
                module: 'yutong',
                orderId: payment.order_id,
                financeCustomerId: customerId,
              });
            }
          }

          const arInvoiceId = orderDetails?.ar_invoice_id;
          const paymentType = arInvoiceId ? 'balance' : 'advance';
          let journalEntryId: string | undefined;
          let arReceiptId: string | undefined;

          const bankAccountIdToUse = overrideBankAccountId !== 'default' ? overrideBankAccountId : payment.bank_account_id;

          const glResult = await postVehiclePaymentToGL({
            module: 'yutong',
            orderNo,
            customerName,
            amount: payment.payment_amount,
            paymentType,
            paymentMethod: payment.payment_method,
            settings,
            effectiveCompanyId: NCG_HOLDING_ID,
            customBankAccountId: bankAccountIdToUse,
            paymentDate: payment.payment_date,
          });

          if (glResult) {
            journalEntryId = glResult.journalEntryId;
            
            if (arInvoiceId && customerId) {
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
              }
            }
          } else {
            throw new Error(`Failed to post GL entry for payment ${paymentId}`);
          }

          const { error: updateError } = await supabase
            .from('yutong_customer_payments')
            .update({
              status: 'verified',
              verified_at: new Date().toISOString(),
              verified_by: user.id,
              journal_entry_id: journalEntryId,
              ar_receipt_id: arReceiptId || null,
            })
            .eq('id', paymentId);

          if (updateError) throw updateError;
          
          successCount++;
        } catch (err: any) {
          console.error(`Error processing payment ${paymentId}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully verified and posted ${successCount} payment(s) to GL.`);
        setSelectedPaymentIds([]);
      }
      if (failCount > 0) {
        toast.error(`Failed to process ${failCount} payment(s). Check console for details.`);
      }

      loadPendingPayments();
    } catch (err: any) {
      toast.error(`Bulk processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBankDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error("Enter a valid amount"); return;
    }
    try {
      setIsDepositing(true);
      await recordDeposit({
        amount: Number(depositAmount),
        bank_account_gl: depositBank,
        reference_no: depositRef,
        status: 'Completed'
      });
      toast.success("Bank deposit recorded!");
      setDepositAmount(""); setDepositRef("");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setIsDepositing(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const orderNo = p.yutong_orders?.order_no?.toLowerCase() || '';
    const customer = p.yutong_orders?.yutong_quotations?.customer_name?.toLowerCase() || '';
    const ref = p.payment_reference?.toLowerCase() || '';
    return orderNo.includes(q) || customer.includes(q) || ref.includes(q);
  });

  const formatCurrency = (val: number) => val?.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Global Settlement Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verify and post pending Yutong payments across all orders to the General Ledger.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search order, customer, ref..." 
            className="pl-8" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Pending Payments Verification</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Receiving GL Account:</Label>
              <Select value={overrideBankAccountId} onValueChange={setOverrideBankAccountId}>
                <SelectTrigger className="w-[250px] h-8 text-sm">
                  <SelectValue placeholder="Use Default/Original Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="font-semibold text-primary">Use Default/Original Account</SelectItem>
                  {bankAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleBulkVerifyAndPost} 
              disabled={isProcessing || selectedPaymentIds.length === 0}
              size="sm"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Bulk Verify & Post ({selectedPaymentIds.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">
                      <Checkbox 
                        checked={selectedPaymentIds.length === filteredPayments.length && filteredPayments.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Order No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount (LKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={selectedPaymentIds.includes(payment.id)}
                          onCheckedChange={(checked) => handleSelectPayment(payment.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{payment.yutong_orders?.order_no || 'N/A'}</TableCell>
                      <TableCell>{payment.yutong_orders?.yutong_quotations?.customer_name || 'N/A'}</TableCell>
                      <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ')}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.payment_reference || '-'}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600">
                        {formatCurrency(payment.payment_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No pending payments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Deposit Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" /> Cash in Hand (Till)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-primary mb-1">
              LKR {formatCurrency(totalUnsettledCash > 0 ? totalUnsettledCash : 0)}
            </p>
            <p className="text-xs text-muted-foreground">Accumulated physical cash minus previous bank deposits</p>
            <div className="mt-4 space-y-3 border-t border-primary/20 pt-4">
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  value={depositAmount} 
                  onChange={e => setDepositAmount(e.target.value)} 
                  placeholder="Amount" 
                  className="font-mono flex-1 bg-white" 
                />
                <Button variant="outline" size="sm" onClick={() => setDepositAmount(String(totalUnsettledCash))}>Max</Button>
              </div>
              <div className="flex gap-2">
                <Input 
                  value={depositBank} 
                  onChange={e => setDepositBank(e.target.value)} 
                  placeholder="Bank Account Name" 
                  className="flex-1 bg-white" 
                />
                <Input 
                  value={depositRef} 
                  onChange={e => setDepositRef(e.target.value)} 
                  placeholder="Slip Ref #" 
                  className="flex-1 bg-white" 
                />
              </div>
              <Button className="w-full" onClick={handleBankDeposit} disabled={isDepositing || totalUnsettledCash <= 0}>
                {isDepositing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Bank Deposit
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Bank Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            {depositsLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : deposits.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No deposits yet today.</p>
            ) : (
              <div className="space-y-2">
                {deposits.map(dep => (
                  <div key={dep.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{dep.bank_account_gl}</p>
                      <p className="text-xs text-muted-foreground">Ref: {dep.reference_no || '—'}</p>
                    </div>
                    <span className="font-mono font-semibold text-green-600">LKR {formatCurrency(dep.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
