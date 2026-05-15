import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, DollarSign, FileText, Database, Search, Building2, Banknote, CheckCircle, Clock, RefreshCw } from 'lucide-react';
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
  const [arInvoices, setArInvoices] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
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
    loadAllData();
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
      if (data && data.length > 0) setDepositBank(data[0].account_name);
    } catch (error) {
      console.error('Error loading asset accounts:', error);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Load pending payments
      const { data: payData, error: payError } = await supabase
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
        .order('payment_date', { ascending: false });

      if (payError) throw payError;
      setPayments(payData || []);

      // 2. Load AR invoices linked to yutong orders
      const orderIds = [...new Set((payData || []).map(p => p.order_id).filter(Boolean))];
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from('yutong_orders')
          .select('ar_invoice_id')
          .in('id', orderIds)
          .not('ar_invoice_id', 'is', null);

        const arIds = [...new Set((orders || []).map(o => o.ar_invoice_id).filter(Boolean))];
        if (arIds.length > 0) {
          const { data: arData } = await supabase
            .from('ar_invoices')
            .select('*')
            .in('id', arIds)
            .order('invoice_date', { ascending: false });
          setArInvoices(arData || []);
        } else {
          setArInvoices([]);
        }
      } else {
        setArInvoices([]);
      }

      // 3. Load JEs linked to yutong
      const { data: jeData } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines(
            id, account_id, debit, credit,
            chart_of_accounts(account_code, account_name)
          )
        `)
        .eq('company_id', NCG_HOLDING_ID)
        .ilike('entry_number', 'YUT-%')
        .eq('status', 'posted')
        .order('entry_date', { ascending: false })
        .limit(50);

      setJournalEntries(jeData || []);
    } catch (err: any) {
      toast.error('Failed to load finance data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const pending = filteredPayments.filter(p => p.status === 'pending');
    setSelectedPaymentIds(checked ? pending.map(p => p.id) : []);
  };

  const handleSelectPayment = (id: string, checked: boolean) => {
    setSelectedPaymentIds(prev => checked ? [...prev, id] : prev.filter(pid => pid !== id));
  };

  const handleBulkVerifyAndPost = async () => {
    if (selectedPaymentIds.length === 0) { toast.error("Select at least one payment"); return; }
    setIsProcessing(true);
    let successCount = 0, failCount = 0;

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
            customerId = await createVehicleCustomer({
              module: 'yutong', customerName,
              customerCategoryId: orderDetails?.yutong_quotations?.customer_category_id || undefined,
              companyId: NCG_HOLDING_ID,
            });
            if (customerId) {
              await updateOrderFinanceLinks({ module: 'yutong', orderId: payment.order_id, financeCustomerId: customerId });
            }
          }

          const arInvoiceId = orderDetails?.ar_invoice_id;
          const bankAccountIdToUse = overrideBankAccountId !== 'default' ? overrideBankAccountId : payment.bank_account_id;

          const glResult = await postVehiclePaymentToGL({
            module: 'yutong', orderNo, customerName,
            amount: payment.payment_amount,
            paymentType: arInvoiceId ? 'balance' : 'advance',
            paymentMethod: payment.payment_method,
            settings, effectiveCompanyId: NCG_HOLDING_ID,
            customBankAccountId: bankAccountIdToUse,
            paymentDate: payment.payment_date,
          });

          if (glResult) {
            let arReceiptId: string | undefined;
            if (arInvoiceId && customerId) {
              const receiptResult = await createVehicleARReceipt({
                module: 'yutong', paymentId: payment.id,
                invoiceId: arInvoiceId, customerId,
                amount: payment.payment_amount,
                paymentMethod: payment.payment_method,
                paymentDate: payment.payment_date,
                settings, effectiveCompanyId: NCG_HOLDING_ID,
              });
              if (receiptResult) arReceiptId = receiptResult.receiptId;
            }

            await supabase.from('yutong_customer_payments').update({
              status: 'verified', verified_at: new Date().toISOString(),
              verified_by: user.id, journal_entry_id: glResult.journalEntryId,
              ar_receipt_id: arReceiptId || null,
            }).eq('id', paymentId);
            successCount++;
          } else { throw new Error('GL post failed'); }
        } catch (err) { console.error(`Error processing ${paymentId}:`, err); failCount++; }
      }

      if (successCount > 0) toast.success(`Verified and posted ${successCount} payment(s) to GL.`);
      if (failCount > 0) toast.error(`Failed to process ${failCount} payment(s).`);
      setSelectedPaymentIds([]);
      loadAllData();
    } catch (err: any) {
      toast.error(`Bulk processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBankDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    try {
      setIsDepositing(true);
      await recordDeposit({ amount: Number(depositAmount), bank_account_gl: depositBank, reference_no: depositRef, status: 'Completed' });
      toast.success("Bank deposit recorded!");
      setDepositAmount(""); setDepositRef("");
    } catch (err: any) { toast.error("Failed: " + err.message); }
    finally { setIsDepositing(false); }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const verifiedPayments = payments.filter(p => p.status === 'verified');
  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const orderNo = p.yutong_orders?.order_no?.toLowerCase() || '';
    const customer = p.yutong_orders?.yutong_quotations?.customer_name?.toLowerCase() || '';
    return orderNo.includes(q) || customer.includes(q) || (p.payment_reference?.toLowerCase() || '').includes(q);
  });

  const fmt = (val: number) => val?.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalPending = pendingPayments.reduce((s, p) => s + (p.payment_amount || 0), 0);
  const totalVerified = verifiedPayments.reduce((s, p) => s + (p.payment_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Global Settlement Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Audit-ready view of Yutong payments, AR invoices, and General Ledger entries.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="text" placeholder="Search order, customer, ref..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">LKR {fmt(totalPending + totalVerified)}</div>
          <p className="text-sm text-muted-foreground">Total Collected</p>
        </CardContent></Card>
        <Card className="bg-green-50/50"><CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-700">LKR {fmt(totalVerified)}</div>
          <p className="text-sm text-green-600/80">Verified & Posted</p>
        </CardContent></Card>
        <Card className="bg-yellow-50/50"><CardContent className="pt-6">
          <div className="text-2xl font-bold text-yellow-700">LKR {fmt(totalPending)}</div>
          <p className="text-sm text-yellow-600/80">Pending GL Sync</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{arInvoices.length}</div>
          <p className="text-sm text-muted-foreground">AR Invoices</p>
        </CardContent></Card>
      </div>

      {/* 3-Tab Layout */}
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

        {/* Tab 1: Payment Lifecycle */}
        <TabsContent value="payments" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Pending Payments Verification</CardTitle>
                <CardDescription>Verify and post pending payments to the General Ledger.</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Receiving GL:</Label>
                  <Select value={overrideBankAccountId} onValueChange={setOverrideBankAccountId}>
                    <SelectTrigger className="w-[250px] h-8 text-sm"><SelectValue placeholder="Default Account" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="font-semibold text-primary">Use Default/Original Account</SelectItem>
                      {bankAccounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleBulkVerifyAndPost} disabled={isProcessing || selectedPaymentIds.length === 0} size="sm">
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
                          <Checkbox checked={selectedPaymentIds.length === filteredPayments.filter(p => p.status === 'pending').length && filteredPayments.filter(p => p.status === 'pending').length > 0} onCheckedChange={handleSelectAll} />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Order No</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>GL Status</TableHead>
                        <TableHead className="text-right">Amount (LKR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-center">
                            {payment.status === 'pending' && (
                              <Checkbox checked={selectedPaymentIds.includes(payment.id)} onCheckedChange={(checked) => handleSelectPayment(payment.id, checked as boolean)} />
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="font-medium">{payment.yutong_orders?.order_no || 'N/A'}</TableCell>
                          <TableCell>{payment.yutong_orders?.yutong_quotations?.customer_name || 'N/A'}</TableCell>
                          <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ')}</TableCell>
                          <TableCell>
                            {payment.status === 'verified' ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
                            ) : payment.status === 'reversed' ? (
                              <Badge variant="destructive">Reversed</Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {payment.journal_entry_id ? (
                              <div className="flex items-center text-green-600 text-sm"><CheckCircle className="h-4 w-4 mr-1" /> Linked</div>
                            ) : (
                              <div className="flex items-center text-muted-foreground text-sm"><Clock className="h-4 w-4 mr-1" /> Unlinked</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-600">{fmt(payment.payment_amount)}</TableCell>
                        </TableRow>
                      ))}
                      {filteredPayments.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No payments found.</TableCell></TableRow>
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
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /> Cash in Hand (Till)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-primary mb-1">LKR {fmt(totalUnsettledCash > 0 ? totalUnsettledCash : 0)}</p>
                <p className="text-xs text-muted-foreground">Accumulated physical cash minus previous bank deposits</p>
                <div className="mt-4 space-y-3 border-t border-primary/20 pt-4">
                  <div className="flex gap-2">
                    <Input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Amount" className="font-mono flex-1 bg-white" />
                    <Button variant="outline" size="sm" onClick={() => setDepositAmount(String(totalUnsettledCash))}>Max</Button>
                  </div>
                  <div className="flex gap-2">
                    <Input value={depositBank} onChange={e => setDepositBank(e.target.value)} placeholder="Bank Account Name" className="flex-1 bg-white" />
                    <Input value={depositRef} onChange={e => setDepositRef(e.target.value)} placeholder="Slip Ref #" className="flex-1 bg-white" />
                  </div>
                  <Button className="w-full" onClick={handleBankDeposit} disabled={isDepositing || totalUnsettledCash <= 0}>
                    {isDepositing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Bank Deposit
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Today's Bank Deposits</CardTitle></CardHeader>
              <CardContent>
                {depositsLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                ) : deposits.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No deposits yet today.</p>
                ) : (
                  <div className="space-y-2">
                    {deposits.map(dep => (
                      <div key={dep.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div><p className="font-medium text-sm">{dep.bank_account_gl}</p><p className="text-xs text-muted-foreground">Ref: {dep.reference_no || '—'}</p></div>
                        <span className="font-mono font-semibold text-green-600">LKR {fmt(dep.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Master AR */}
        <TabsContent value="ar" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AR Invoices</CardTitle>
              <CardDescription>Accounts Receivable invoices linked to Yutong orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {arInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No AR Invoices generated yet.</p>
                  <p className="text-sm mt-1">AR Invoices are auto-generated when orders are invoiced via the Finance Settlement on each order.</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>GL Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arInvoices.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                          <TableCell>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right font-semibold">LKR {Number(inv.total_amount).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-600">LKR {Number(inv.paid_amount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-amber-600">LKR {Number(inv.balance || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === 'paid' ? 'default' : 'outline'} className="capitalize">{inv.status?.toUpperCase() || 'UNPAID'}</Badge>
                          </TableCell>
                          <TableCell>
                            {inv.journal_entry_id ? (
                              <div className="flex items-center text-green-600 text-sm"><CheckCircle className="h-4 w-4 mr-1" /> Linked</div>
                            ) : (
                              <div className="flex items-center text-muted-foreground text-sm"><Clock className="h-4 w-4 mr-1" /> Unlinked</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Live JEs */}
        <TabsContent value="gl" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Journal Entries</CardTitle>
              <CardDescription>Double-entry accounting records linked to Yutong operations.</CardDescription>
            </CardHeader>
            <CardContent>
              {journalEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No General Ledger entries posted yet.</div>
              ) : (
                <div className="space-y-6">
                  {journalEntries.map(je => (
                    <div key={je.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
                        <div>
                          <div className="font-medium">{je.entry_number}</div>
                          <div className="text-sm text-muted-foreground">{je.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{format(new Date(je.entry_date), 'dd MMM yyyy')}</div>
                          <Badge variant="outline" className="bg-white mt-1">{je.status}</Badge>
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
                              <TableCell>{line.chart_of_accounts?.account_code} - {line.chart_of_accounts?.account_name}</TableCell>
                              <TableCell className="text-right">{line.debit > 0 ? Number(line.debit).toLocaleString() : '-'}</TableCell>
                              <TableCell className="text-right">{line.credit > 0 ? Number(line.credit).toLocaleString() : '-'}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-50 font-medium">
                            <TableCell className="text-right">Total:</TableCell>
                            <TableCell className="text-right">{Number(je.total_debit).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{Number(je.total_credit).toLocaleString()}</TableCell>
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
    </div>
  );
}
