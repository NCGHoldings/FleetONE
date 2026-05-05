import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, Clock, XCircle, DollarSign, Database, RefreshCw, Undo2, BookOpen, Trash2, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePostPaymentToGL, syncPaymentToFinanceAR, useReallocateAdvancePayment, useStudentsForBulkAR } from '@/hooks/useSchoolBusFinance';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DeleteSchoolPaymentDialog } from './DeleteSchoolPaymentDialog';

interface SchoolBusFinanceSettlementProps {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SchoolBusFinanceSettlement({
  studentId,
  isOpen,
  onClose
}: SchoolBusFinanceSettlementProps) {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  
  const postPaymentToGL = usePostPaymentToGL();
  const reallocatePayment = useReallocateAdvancePayment();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [student, setStudent] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  const [assetAccounts, setAssetAccounts] = useState<any[]>([]);
  const [overrideBankAccountId, setOverrideBankAccountId] = useState<string>('');
  
  const [allocationDialog, setAllocationDialog] = useState<{
    isOpen: boolean;
    invoiceId: string;
    invoiceNumber: string;
    invoiceAmount: number;
    payment: any;
  } | null>(null);

  const [glSyncDialog, setGlSyncDialog] = useState<{
    isOpen: boolean;
    payment: any;
  } | null>(null);

  const [reallocateDialog, setReallocateDialog] = useState<{
    isOpen: boolean;
    payment: any;
    targetStudentId: string;
    amount: string;
  } | null>(null);

  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);

  const { data: activeStudents = [] } = useStudentsForBulkAR(student?.branch_id || null);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchFinanceData();
    }
  }, [isOpen, studentId]);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Student details
      const { data: stdData, error: stdError } = await supabase
        .from('school_students')
        .select('*')
        .eq('id', studentId)
        .single();
        
      if (stdError) throw stdError;
      setStudent(stdData);

      // 1.5 Fetch Branch Settings for exact Bank/Cash accounts
      if (stdData.branch_id) {
        const { data: settingsData } = await supabase
          .from('school_bus_finance_settings')
          .select('*')
          .eq('branch_id', stdData.branch_id)
          .maybeSingle();
          
        if (settingsData) {
          if (settingsData.branch_gl_account_id) {
            const { data: b } = await supabase.from('chart_of_accounts').select('account_name').eq('id', settingsData.branch_gl_account_id).single();
            settingsData.bank_account_name = b?.account_name;
            settingsData.bank_account_id = settingsData.branch_gl_account_id;
          } else if (settingsData.bank_account_id) {
            // fallback for legacy
            const { data: b } = await supabase.from('chart_of_accounts').select('account_name').eq('id', settingsData.bank_account_id).maybeSingle();
            settingsData.bank_account_name = b?.account_name;
          }
          if (settingsData.cash_account_id) {
            const { data: c } = await supabase.from('chart_of_accounts').select('account_name').eq('id', settingsData.cash_account_id).maybeSingle();
            settingsData.cash_account_name = c?.account_name;
          }
          setSettings(settingsData);
        } else {
          // Attempt legacy fetch if finance settings don't exist
          const { data: legacySettings } = await supabase
            .from('school_bus_settings')
            .select('*')
            .eq('branch_id', stdData.branch_id)
            .maybeSingle();
          if (legacySettings) {
            if (legacySettings.bank_account_id) {
              const { data: b } = await supabase.from('chart_of_accounts').select('account_name').eq('id', legacySettings.bank_account_id).maybeSingle();
              legacySettings.bank_account_name = b?.account_name;
            }
            if (legacySettings.cash_account_id) {
              const { data: c } = await supabase.from('chart_of_accounts').select('account_name').eq('id', legacySettings.cash_account_id).maybeSingle();
              legacySettings.cash_account_name = c?.account_name;
            }
            setSettings(legacySettings);
          }
        }
      }

      // 2. Fetch Payments
      const { data: payData, error: payError } = await supabase
        .from('school_payment_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (payError) throw payError;
      setPayments(payData || []);

      // 3. Fetch AR Invoices
      const { data: invData, error: invError } = await supabase
        .from('school_ar_invoices')
        .select(`
          *,
          ar_invoice:ar_invoice_id (
            id, status, paid_amount, balance, invoice_number
          )
        `)
        .eq('student_id', studentId)
        .neq('status', 'void')
        .order('invoice_month', { ascending: false });
        
      if (invError) throw invError;
      setInvoices(invData || []);

      // 4. Fetch linked Journal Entries (from both Payments AND Invoices)
      const paymentJeIds = (payData || []).map(p => p.journal_entry_id).filter(Boolean);
      const invoiceJeIds = (invData || []).map(i => i.journal_entry_id).filter(Boolean);
      const jeIds = [...new Set([...paymentJeIds, ...invoiceJeIds])];
      
      if (jeIds.length > 0) {
        const { data: jeData, error: jeError } = await supabase
          .from('journal_entries')
          .select(`
            *,
            lines:journal_entry_lines(
              id,
              account_id,
              debit,
              credit,
              account:chart_of_accounts(account_name, account_type)
            )
          `)
          .in('id', jeIds)
          .order('created_at', { ascending: false });
          
        if (jeError) throw jeError;
        setJournalEntries(jeData || []);
      } else {
        setJournalEntries([]);
      }

      // 5. Fetch Asset Accounts for GL Override
      const { data: assetAccs } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .in('account_type', ['asset', 'liability', 'equity'])
        .eq('company_id', effectiveCompanyId)
        .order('account_name');
        
      if (assetAccs) {
        setAssetAccounts(assetAccs);
      }

    } catch (err: any) {
      console.error('Error fetching finance settlement data:', err);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToGL = async () => {
    if (!glSyncDialog || !glSyncDialog.payment) return;
    const payment = glSyncDialog.payment;

    if (!student?.branch_id) {
      toast.error("Student has no branch assigned.");
      return;
    }

    setActionLoading(true);
    try {
      const amountPaid = Number(payment.amount_paid);
      
      // Calculate TRUE AR debt for this exact payment instance
      // 1. Current outstanding debt that hasn't been allocated yet
      const unallocatedOwed = Number(student?.current_amount_due || 0);
      // 2. Any amount from this payment that was ALREADY allocated to invoices (in case they allocated before syncing GL)
      const allocatedToThisPayment = invoices
        .filter((inv: any) => inv.payment_id === payment.id)
        .reduce((sum: number, inv: any) => sum + Number(inv.paid_amount || 0), 0);
      
      const trueArDebt = unallocatedOwed + allocatedToThisPayment;
      
      // The AR credit cannot exceed what the payment actually was
      const arCredit = Math.min(amountPaid, trueArDebt);
      const calculatedOverpayment = amountPaid > arCredit ? amountPaid - arCredit : undefined;

      await postPaymentToGL.mutateAsync({
        paymentId: payment.id,
        amount: amountPaid,
        branchId: student.branch_id,
        studentName: student.student_name,
        paymentMethod: payment.payment_method || 'Cash',
        referenceNo: payment.reference_no,
        customBankAccountId: overrideBankAccountId || undefined,
        fixedAmount: arCredit,
        overpaymentAmount: calculatedOverpayment,
        previousBalance: Number(payment.payment_balance_before || 0),
        studentId: student.id,
      });

      toast.success("Successfully posted to General Ledger");
      setGlSyncDialog(null);
      await fetchFinanceData();
    } catch (error: any) {
      console.error("GL Sync failed:", error);
      toast.error(error.message || "Failed to sync to General Ledger");
    } finally {
      setActionLoading(false);
    }
  };



  const initiateAllocation = (invoiceId: string, invoiceNumber: string, invoiceAmount: number) => {
    const unallocatedPayment = payments.find(p => p.gl_posted && !invoices.some(inv => inv.payment_id === p.id));
    if (!unallocatedPayment) {
      toast.error("No unallocated GL-posted payments found for this student.");
      return;
    }
    setAllocationDialog({
      isOpen: true,
      invoiceId,
      invoiceNumber,
      invoiceAmount,
      payment: unallocatedPayment
    });
  };

  const handleAllocatePayment = async () => {
    if (!allocationDialog) return;
    
    const { invoiceId, invoiceNumber, invoiceAmount, payment: unallocatedPayment } = allocationDialog;

    setActionLoading(true);
    try {
      const applyAmount = Math.min(Number(unallocatedPayment.amount_paid), invoiceAmount);
      const status = applyAmount >= invoiceAmount ? 'paid' : 'partial';

      // 1. Update operational invoice
      const { error: invErr } = await supabase
        .from('school_ar_invoices')
        .update({
          payment_id: unallocatedPayment.id,
          paid_amount: applyAmount,
          status: status
        })
        .eq('id', invoiceId);

      if (invErr) throw invErr;

      // 2. Find customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', effectiveCompanyId || '')
        .eq('customer_code', 'SBS-DEFAULT')
        .maybeSingle();

      if (customer) {
        // 3. Sync to Finance AR
        await syncPaymentToFinanceAR(
          invoiceId,
          applyAmount,
          invoiceAmount,
          effectiveCompanyId || '',
          'SBO',
          customer.id
        );
      }

      toast.success("Payment successfully allocated and synced to Finance AR");
      setAllocationDialog(null);
      await fetchFinanceData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to allocate payment: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReallocatePayment = async () => {
    if (!reallocateDialog) return;
    
    const { payment, targetStudentId, amount } = reallocateDialog;
    const transferAmount = Number(amount);

    if (!targetStudentId) {
      toast.error("Please select a target student");
      return;
    }
    
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    
    if (transferAmount > Number(payment.amount_paid)) {
      toast.error(`Amount cannot exceed the original payment of LKR ${Number(payment.amount_paid).toLocaleString()}`);
      return;
    }

    setActionLoading(true);
    try {
      await reallocatePayment.mutateAsync({
        paymentId: payment.id,
        targetStudentId,
        amount: transferAmount
      });

      toast.success("Advance credit successfully reallocated");
      setReallocateDialog(null);
      await fetchFinanceData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reallocate advance credit");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  
  // Real balance
  const isCredit = (student?.payment_balance || 0) > 0;
  const isOwed = (student?.payment_balance || 0) < 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="w-6 h-6 text-primary" />
            Finance Settlement Hub - {student?.student_name}
          </DialogTitle>
          <DialogDescription>
            Comprehensive financial breakdown, approvals, and General Ledger tracking for this student.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-slate-500">Fixed Monthly Amount</p>
                  <p className="text-2xl font-bold mt-1">LKR {Number(student?.fixed_monthly_amount || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-blue-600">Total Billed Ever</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">LKR {totalInvoiced.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">{invoices.length} Invoices</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-green-600">Total Paid Ever</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">LKR {totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1 font-medium">{payments.length} Payments</p>
                </CardContent>
              </Card>
              <Card className={isOwed ? "bg-amber-50 border-amber-200" : isCredit ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}>
                <CardContent className="p-4">
                  <p className={`text-sm font-medium ${isOwed ? 'text-amber-600' : isCredit ? 'text-green-600' : 'text-slate-600'}`}>
                    Current Balance
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${isOwed ? 'text-amber-700' : isCredit ? 'text-green-700' : 'text-slate-700'}`}>
                    LKR {Math.abs(student?.payment_balance || 0).toLocaleString()}
                  </p>
                  <p className={`text-xs mt-1 font-medium ${isOwed ? 'text-amber-600' : isCredit ? 'text-green-600' : 'text-slate-600'}`}>
                    {isOwed ? "Student Owes" : isCredit ? "Advance Credit" : "Fully Settled"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="payments">Payment Lifecycle</TabsTrigger>
                <TabsTrigger value="invoices">AR Invoices</TabsTrigger>
                <TabsTrigger value="gl">General Ledger (Live JEs)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="payments" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recorded Payments</CardTitle>
                    <CardDescription>All payments recorded for this student by Operations or Bank Import</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {payments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        No payments recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {payments.map(payment => (
                          <div key={payment.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-white shadow-sm gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">LKR {Number(payment.amount_paid).toLocaleString()}</span>
                                <Badge className={payment.gl_posted ? "bg-green-600" : "bg-amber-500"}>
                                  {payment.gl_posted ? <CheckCircle className="w-3 h-3 mr-1"/> : <Clock className="w-3 h-3 mr-1"/>}
                                  {payment.gl_posted ? "GL Posted" : "GL Pending"}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-500 flex items-center gap-4">
                                <span><Clock className="w-3 h-3 inline mr-1" />{format(new Date(payment.created_at), 'PPP p')}</span>
                                <span><Database className="w-3 h-3 inline mr-1" />{payment.payment_method}</span>
                                {payment.reference_no && <span>Ref: {payment.reference_no}</span>}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2 items-center">
                                <span>Balance Shift: LKR {Number(payment.payment_balance_before || 0).toLocaleString()} → LKR {Number(payment.payment_balance_after || 0).toLocaleString()}</span>
                                {payment.journal_entry_id && (
                                  <Badge variant="outline" className="text-xs font-normal border-slate-300 text-slate-600 bg-slate-50">
                                    JE ID: {payment.journal_entry_id.substring(0, 8)}...
                                  </Badge>
                                )}
                                {invoices.find(inv => inv.payment_id === payment.id) && (
                                  <Badge variant="outline" className="text-xs font-normal border-blue-200 text-blue-600 bg-blue-50">
                                    Settled: {invoices.find(inv => inv.payment_id === payment.id)?.invoice_number}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 md:max-w-[200px]">
                                {!payment.gl_posted && (
                                  <Button 
                                    variant="outline" 
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 w-full md:w-auto text-xs h-8"
                                    onClick={() => setGlSyncDialog({ isOpen: true, payment })}
                                    disabled={actionLoading}
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Sync GL
                                  </Button>
                                )}
                                {payment.gl_posted && Number(payment.amount_paid) > 0 && !payment.payment_method.includes('Transfer Out') && (
                                  <Button 
                                    variant="outline" 
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 w-full md:w-auto text-xs h-8"
                                    onClick={() => setReallocateDialog({ 
                                      isOpen: true, 
                                      payment, 
                                      targetStudentId: '', 
                                      amount: Number(payment.amount_paid).toString() 
                                    })}
                                    disabled={actionLoading}
                                  >
                                    <ArrowRight className="w-3 h-3 mr-1" />
                                    Reallocate
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full md:w-auto text-xs h-8"
                                  onClick={() => setTransactionToDelete(payment)}
                                  disabled={actionLoading}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Reverse
                                </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoices" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Accounts Receivable Invoices</CardTitle>
                    <CardDescription>Operational invoices and their status in Master Finance AR</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-slate-600">Month</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Amount</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Paid Amount</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Finance AR Integration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium">{inv.invoice_month ? format(new Date(inv.invoice_month), 'MMM yyyy') : '-'}</td>
                              <td className="px-4 py-3">LKR {Number(inv.amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-green-600">LKR {Number(inv.paid_amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'partial' ? 'secondary' : 'outline'}>
                                  {inv.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-2">
                                  {inv.ar_invoice ? (
                                    <div className="flex flex-col gap-1">
                                      <div className="text-xs">
                                        <span className="font-medium text-blue-600">ID: {inv.ar_invoice.invoice_number}</span>
                                        <br/>
                                        <span className="text-slate-500">Master Status: {inv.ar_invoice.status}</span>
                                      </div>
                                      {inv.payment_id && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          <Badge variant="outline" className="text-[10px] py-0 border-green-200 text-green-700 bg-green-50">
                                            PAY: {payments.find(p => p.id === inv.payment_id)?.amount_paid}
                                          </Badge>
                                          <Badge variant="outline" className="text-[10px] py-0 border-slate-200 text-slate-600">
                                            JE: {payments.find(p => p.id === inv.payment_id)?.journal_entry_id?.substring(0,8)}...
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-amber-500 text-xs flex items-center">
                                      <Clock className="w-3 h-3 mr-1" /> Not Synced
                                    </span>
                                  )}
                                  
                                  {(inv.status === 'unpaid' || inv.status === 'posted' || inv.ar_invoice?.status === 'unpaid') && payments.some(p => p.gl_posted && !invoices.some(i => i.payment_id === p.id)) && (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-7 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 w-fit"
                                      onClick={() => initiateAllocation(inv.id, inv.invoice_number, Number(inv.amount))}
                                      disabled={actionLoading}
                                    >
                                      Allocate Payment
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {invoices.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No invoices generated yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="gl" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">General Ledger Entries</CardTitle>
                    <CardDescription>Live General Ledger postings linked to this student's Payments and Invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {journalEntries.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        No Journal Entries posted yet.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {journalEntries.map(je => {
                          const isFromPayment = payments.some(p => p.journal_entry_id === je.id);
                          const isFromInvoice = invoices.some(i => i.journal_entry_id === je.id);
                          
                          return (
                            <div key={je.id} className="border rounded-lg overflow-hidden shadow-sm">
                              <div className="bg-slate-50 p-3 border-b flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-800">{je.entry_number}</p>
                                    {isFromPayment && <Badge variant="outline" className="text-[10px] py-0 h-4 bg-green-50 text-green-700 border-green-200">Payment</Badge>}
                                    {isFromInvoice && <Badge variant="outline" className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">Invoice</Badge>}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{je.description}</p>
                                </div>
                                <div className="text-right">
                                  <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-300">{je.status}</Badge>
                                  <p className="text-xs text-slate-500 mt-1">{format(new Date(je.created_at), 'PPP')}</p>
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Account</th>
                                    <th className="px-4 py-2 text-right font-semibold">Debit</th>
                                    <th className="px-4 py-2 text-right font-semibold">Credit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {je.lines?.map((line: any) => (
                                    <tr key={line.id}>
                                      <td className="px-4 py-2">
                                        <p className="font-medium text-slate-700 whitespace-nowrap">{line.account?.account_name}</p>
                                        <p className="text-xs text-slate-400 capitalize">{line.account?.account_type}</p>
                                      </td>
                                      <td className="px-4 py-2 text-right text-slate-600 whitespace-nowrap">
                                        {Number(line.debit) > 0 ? Number(line.debit).toLocaleString() : '-'}
                                      </td>
                                      <td className="px-4 py-2 text-right text-slate-600 whitespace-nowrap">
                                        {Number(line.credit) > 0 ? Number(line.credit).toLocaleString() : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                  {(!je.lines || je.lines.length === 0) && (
                                    <tr>
                                      <td colSpan={3} className="px-4 py-4 text-center text-red-500 font-medium">
                                        ⚠️ This Journal Entry is orphaned and has NO lines. Please reverse/delete the payment and try again.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t font-semibold">
                                  <tr>
                                    <td className="px-4 py-2 text-right text-slate-600">Total:</td>
                                    <td className="px-4 py-2 text-right text-slate-800 whitespace-nowrap">LKR {Number(je.total_debit).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right text-slate-800 whitespace-nowrap">LKR {Number(je.total_credit).toLocaleString()}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
      
      {/* Allocation Breakdown Dialog */}
      {allocationDialog && (
        <Dialog open={allocationDialog.isOpen} onOpenChange={(open) => !open && setAllocationDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Allocate Payment to Invoice
              </DialogTitle>
              <DialogDescription>
                You are about to bridge an orphaned operational payment to an Accounts Receivable Invoice. Review the breakdown below before confirming.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 my-2">
              <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <Card className="flex-1 bg-slate-50 border-slate-200 shadow-none">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Unallocated Payment</p>
                    <p className="text-2xl font-bold text-green-700">LKR {Number(allocationDialog.payment.amount_paid).toLocaleString()}</p>
                    <p className="text-sm text-slate-600 mt-1">{allocationDialog.payment.payment_method}</p>
                    <div className="text-xs text-slate-400 mt-2 space-y-1">
                      <p>{format(new Date(allocationDialog.payment.created_at), 'PPP p')}</p>
                      {allocationDialog.payment.journal_entry_id && (
                         <p>JE: {allocationDialog.payment.journal_entry_id.substring(0, 8)}...</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-center text-slate-400 shrink-0">
                  <ArrowRight className="w-8 h-8 hidden md:block" />
                </div>

                <Card className="flex-1 bg-slate-50 border-slate-200 shadow-none">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Target Invoice</p>
                    <p className="text-2xl font-bold text-blue-700">LKR {allocationDialog.invoiceAmount.toLocaleString()}</p>
                    <p className="text-sm text-slate-600 mt-1 font-medium">{allocationDialog.invoiceNumber}</p>
                    <div className="text-xs text-slate-400 mt-2">
                      Target AR Master
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 text-sm">
                <p className="font-semibold text-blue-800 mb-2">What will happen?</p>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>1. Link Operations:</strong> The payment will be officially tied to <code className="text-xs bg-white px-1 py-0.5 rounded border">{allocationDialog.invoiceNumber}</code> in the school database.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>2. Auto-Status:</strong> The operational status will flip from <em>Unpaid</em> to <em>{Number(allocationDialog.payment.amount_paid) >= allocationDialog.invoiceAmount ? 'Paid' : 'Partial'}</em>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>3. Finance AR Sync:</strong> The system will instantly bypass caching and push the updated status straight to the master Finance ERP <code className="text-xs bg-white px-1 py-0.5 rounded border">ar_invoices</code> table.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setAllocationDialog(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleAllocatePayment} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {actionLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Confirm Allocation & Sync
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* GL Sync Breakdown Dialog */}
      {glSyncDialog && (
        <Dialog open={glSyncDialog.isOpen} onOpenChange={(open) => !open && setGlSyncDialog(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Synchronize Payment to General Ledger
              </DialogTitle>
              <DialogDescription>
                You are about to push an orphaned operational payment into the master accounting engine. Review the financial actions below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 my-2">
              <Card className="bg-slate-50 border-slate-200 shadow-none">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pending Payment</p>
                  <p className="text-2xl font-bold text-green-700">LKR {Number(glSyncDialog.payment.amount_paid).toLocaleString()}</p>
                  <p className="text-sm text-slate-600 mt-1">{glSyncDialog.payment.payment_method}</p>
                  <div className="text-xs text-slate-400 mt-2 space-y-1">
                    <p>{format(new Date(glSyncDialog.payment.created_at), 'PPP p')}</p>
                    {glSyncDialog.payment.reference_no && <p>Ref: {glSyncDialog.payment.reference_no}</p>}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-1.5 p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                <Label className="text-sm font-medium text-blue-900">Override Receiving GL Account (Optional)</Label>
                <p className="text-xs text-blue-700">Select an account here if this payment was imported to a specific Inter-Company or non-default GL account.</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between mt-1 bg-white"
                    >
                      {overrideBankAccountId
                        ? assetAccounts.find((acc) => acc.id === overrideBankAccountId)?.account_name
                        : `Default (${glSyncDialog.payment.payment_method === 'Bank Transfer' ? (settings?.bank_account_name || 'Bank Account') : (settings?.cash_account_name || 'Cash Account')})`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search Asset Account..." />
                      <CommandList>
                        <CommandEmpty>No accounts found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => setOverrideBankAccountId("")}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !overrideBankAccountId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Use Default Branch Account
                          </CommandItem>
                          {assetAccounts.map((acc) => (
                            <CommandItem
                              key={acc.id}
                              value={`${acc.account_code} ${acc.account_name}`}
                              onSelect={() => {
                                setOverrideBankAccountId(acc.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  overrideBankAccountId === acc.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {acc.account_code} - {acc.account_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 text-sm mt-4">
                <p className="font-semibold text-blue-800 mb-2">What will happen?</p>
                <ul className="space-y-3 text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>1. Journal Entry:</strong> A double-entry accounting record will be created.
                      <div className="text-xs text-slate-500 mt-1 flex flex-col gap-1">
                        <div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-0 mr-1">Debit</Badge>
                          {overrideBankAccountId 
                            ? assetAccounts.find((acc) => acc.id === overrideBankAccountId)?.account_name 
                            : (glSyncDialog.payment.payment_method === 'Bank Transfer' 
                              ? (settings?.bank_account_name || 'Bank Account')
                              : (settings?.cash_account_name || 'Cash Account'))}
                        </div>
                        <div>
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 py-0 mr-1">Credit</Badge>
                          Accounts Receivable (AR)
                        </div>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>2. Official Receipt:</strong> A formal Accounts Receivable Receipt will be generated.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>3. AR Sync check:</strong> The backend engine will check if this payment altered any invoice statuses and will automatically sync them to the Master ERP.
                      {(() => {
                        const targetInvoices = invoices.filter(i => (i.status === 'unpaid' || i.status === 'partial') && !i.payment_id);
                        if (targetInvoices.length > 0) {
                          return (
                            <div className="text-xs text-slate-500 mt-1">
                              Targeting: <code className="bg-white px-1 py-0.5 rounded border text-blue-600 font-semibold">{targetInvoices[0].invoice_number}</code>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>4. Status Update:</strong> The payment tag will permanently flip from <em className="text-amber-500">GL Pending</em> to <em className="text-green-600">GL Posted</em>.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setGlSyncDialog(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleSyncToGL} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {actionLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Post to General Ledger
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reallocate Advance Dialog */}
      {reallocateDialog && (
        <Dialog open={reallocateDialog.isOpen} onOpenChange={(open) => !open && setReallocateDialog(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-emerald-600" />
                Reallocate Advance Credit
              </DialogTitle>
              <DialogDescription>
                Transfer a portion of this payment's balance to another student in the same branch.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 my-2">
              <Card className="bg-slate-50 border-slate-200 shadow-none">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Original Payment Amount</p>
                  <p className="text-2xl font-bold text-slate-700">LKR {Number(reallocateDialog.payment.amount_paid).toLocaleString()}</p>
                  <p className="text-sm text-slate-600 mt-1">{reallocateDialog.payment.payment_method}</p>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Transfer Amount (LKR)</Label>
                  <Input 
                    type="number" 
                    value={reallocateDialog.amount}
                    onChange={(e) => setReallocateDialog({...reallocateDialog, amount: e.target.value})}
                    placeholder="Enter amount to transfer"
                    max={Number(reallocateDialog.payment.amount_paid)}
                  />
                  <p className="text-xs text-slate-500">Maximum allowed: LKR {Number(reallocateDialog.payment.amount_paid).toLocaleString()}</p>
                </div>

                <div className="space-y-2">
                  <Label>Target Student (Same Branch)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between mt-1 bg-white"
                      >
                        {reallocateDialog.targetStudentId
                          ? activeStudents.find((s: any) => s.id === reallocateDialog.targetStudentId)?.student_name
                          : "Select a student to receive funds..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by name or admission no..." />
                        <CommandList>
                          <CommandEmpty>No students found.</CommandEmpty>
                          <CommandGroup>
                            {activeStudents
                              .filter((s: any) => s.id !== student.id)
                              .map((s: any) => (
                              <CommandItem
                                key={s.id}
                                value={`${s.student_name} ${s.admission_number || ''}`}
                                onSelect={() => {
                                  setReallocateDialog({...reallocateDialog, targetStudentId: s.id});
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    reallocateDialog.targetStudentId === s.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col w-full">
                                  <div className="flex justify-between items-center w-full">
                                    <span className="font-medium">{s.student_name}</span>
                                    {Number(s.current_amount_due) > 0 ? (
                                      <span className="text-xs font-semibold text-red-600">Owes LKR {Number(s.current_amount_due).toLocaleString()}</span>
                                    ) : Number(s.payment_balance) > 0 ? (
                                      <span className="text-xs font-semibold text-emerald-600">Credit LKR {Number(s.payment_balance).toLocaleString()}</span>
                                    ) : (
                                      <span className="text-xs text-slate-400">Settled (0)</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-500">{s.admission_number || 'No ADM'}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Selected Target Student Breakdown */}
                  {reallocateDialog.targetStudentId && (
                    <div className="mt-3 p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Target Student Status</p>
                      {activeStudents.find((s: any) => s.id === reallocateDialog.targetStudentId) && (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {activeStudents.find((s: any) => s.id === reallocateDialog.targetStudentId)?.student_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Monthly Fee: LKR {Number(activeStudents.find((s: any) => s.id === reallocateDialog.targetStudentId)?.fixed_monthly_amount || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            {Number(activeStudents.find((s: any) => s.id === reallocateDialog.targetStudentId)?.current_amount_due) > 0 ? (
                              <div>
                                <p className="text-sm font-bold text-red-600">
                                  Owes LKR {Number(activeStudents.find((s: any) => s.id === reallocateDialog.targetStudentId)?.current_amount_due).toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">Pending Invoices</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-bold text-emerald-600">
                                  Credit LKR {Number(activeStudents.find((s: any) => s.id === reallocateDialog.targetStudentId)?.payment_balance || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">Advance Balance</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100 text-sm">
                <p className="font-semibold text-emerald-800 mb-2">What will happen?</p>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>1. Balance Updated:</strong> {student.student_name}'s advance drops, and the new student's balance is credited.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>2. Audit Trail:</strong> A negative payment is logged here, and a positive payment is logged on the new student.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>3. GL Balanced:</strong> A Journal Entry moves AR (Accounts Receivable) from this student to the new student without affecting the Bank.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setReallocateDialog(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleReallocatePayment} disabled={actionLoading || !reallocateDialog.targetStudentId} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {actionLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Confirm Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DeleteSchoolPaymentDialog
        paymentId={transactionToDelete?.id || null}
        paymentAmount={transactionToDelete?.amount_paid || 0}
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
        onSuccess={() => {
          fetchFinanceData();
          setTransactionToDelete(null);
        }}
      />
    </Dialog>
  );
}
