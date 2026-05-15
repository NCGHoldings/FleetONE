import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle, Clock, XCircle, DollarSign, FileText, 
  AlertTriangle, Receipt, Database, Building2, RefreshCw, Undo2,
  BookOpen, ExternalLink, ArrowDown, CalendarIcon, Pencil, ArrowRight, Banknote, CreditCard, ReceiptText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FinanceApprovalModal } from './FinanceApprovalModal';
import { useFinanceApproval } from '@/hooks/useFinanceApproval';

interface SpecialHireFinanceSettlementProps {
  quotationId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerateInvoice?: () => void;
}

export function SpecialHireFinanceSettlement({
  quotationId,
  isOpen,
  onClose,
  onGenerateInvoice
}: SpecialHireFinanceSettlementProps) {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  
  const { approvePayment, rejectPayment, retryFinanceIntegration } = useFinanceApproval();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [arInvoice, setArInvoice] = useState<any>(null);
  
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [isSyncMode, setIsSyncMode] = useState(false);
  
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [bulkApproveLoading, setBulkApproveLoading] = useState(false);
  const [editingJEDate, setEditingJEDate] = useState<string | null>(null);
  const [jeNewDate, setJeNewDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && quotationId) {
      fetchFinanceData();
    }
  }, [isOpen, quotationId]);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Quotation
      const { data: quoData, error: quoError } = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('id', quotationId)
        .single();
        
      if (quoError) throw quoError;
      setQuotation(quoData);

      // 2. Fetch Payments
      const { data: payData, error: payError } = await supabase
        .from('special_hire_payments')
        .select(`
          *,
          journal_entry_id,
          quotation:quotation_id (
            quotation_no,
            customer_name,
            company_name
          )
        `)
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: true });

      if (payError) throw payError;
      
      let enrichedPayments = payData || [];
      
      // 2b. Fetch Approver Profiles
      const approverIds = [...new Set(enrichedPayments.map(p => p.finance_approved_by).filter(Boolean))];
      if (approverIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', approverIds);
          
        if (profiles) {
          const profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown User';
            return acc;
          }, {} as Record<string, string>);
          
          enrichedPayments = enrichedPayments.map(p => ({
            ...p,
            approver_name: p.finance_approved_by ? profileMap[p.finance_approved_by] : undefined
          }));
        }
      }
      
      setPayments(enrichedPayments);

      // 3. Fetch AR Invoice if linked + SELF-HEALING RECONCILIATION
      if (quoData?.ar_invoice_id) {
        const { data: arData, error: arError } = await supabase
          .from('ar_invoices')
          .select('*')
          .eq('id', quoData.ar_invoice_id)
          .single();
        if (!arError && arData) {
          // ── Self-healing: reconcile paid_amount from actual approved payments ──
          // This fixes the timing gap where payments were approved before the
          // AR invoice existed, leaving paid_amount stale.
          const approvedPayments = (enrichedPayments || []).filter(
            (p: any) => p.status === 'approved'
          );
          const actualTotalPaid = approvedPayments.reduce(
            (sum: number, p: any) => sum + (p.amount || 0), 0
          );

          if (Math.abs((arData.paid_amount || 0) - actualTotalPaid) > 0.01) {
            const correctedBalance = arData.total_amount - actualTotalPaid;
            const correctedStatus = correctedBalance <= 0
              ? 'paid'
              : (actualTotalPaid > 0 ? 'partial' : 'unpaid');

            console.log('[SPH Finance Hub] 🔧 AR Invoice reconciliation triggered:',
              'DB paid_amount:', arData.paid_amount, '→ actual:', actualTotalPaid);

            // Update the database silently
            await supabase
              .from('ar_invoices')
              .update({
                paid_amount: actualTotalPaid,
                balance: Math.max(0, correctedBalance),
                status: correctedStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', arData.id);

            // Also link any orphaned payments to the AR invoice
            for (const pmt of approvedPayments) {
              if (!pmt.ar_invoice_id) {
                await supabase
                  .from('special_hire_payments')
                  .update({ ar_invoice_id: arData.id })
                  .eq('id', pmt.id)
                  .is('ar_invoice_id', null);
              }
            }

            // Display the corrected values immediately (no second fetch needed)
            setArInvoice({
              ...arData,
              paid_amount: actualTotalPaid,
              balance: Math.max(0, correctedBalance),
              status: correctedStatus,
            });

            console.log('[SPH Finance Hub] ✅ AR Invoice corrected — paid:', actualTotalPaid,
              'balance:', Math.max(0, correctedBalance), 'status:', correctedStatus);
          } else {
            setArInvoice(arData);
          }
        } else {
          setArInvoice(null);
        }
      } else {
        setArInvoice(null);
      }

      // 4. Fetch JEs linked to this quotation
      if (quoData?.quotation_no) {
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
          .eq('reference', quoData.quotation_no)
          .order('created_at', { ascending: false });
          
        if (jeError) throw jeError;
        setJournalEntries(jeData || []);
      }

    } catch (err: any) {
      console.error('Error fetching finance settlement data:', err);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproval = (payment: any, syncMode: boolean = false) => {
    setSelectedPayment(payment);
    setIsSyncMode(syncMode);
    setApprovalModalOpen(true);
  };

  const handleApproveComplete = async () => {
    setApprovalModalOpen(false);
    setSelectedPayment(null);
    await fetchFinanceData(); // Refresh all data
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/>Approved</Badge>;
      case 'pending_finance': return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1"/>Pending Finance</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/>Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleToggleSelection = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const handleSelectAll = (pendingIds: string[]) => {
    if (selectedPayments.length === pendingIds.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(pendingIds);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPayments.length === 0) return;
    
    if (!confirm(`Are you sure you want to approve ${selectedPayments.length} selected payment(s)? This will post them to the General Ledger.`)) {
      return;
    }
    
    setBulkApproveLoading(true);
    let successCount = 0;
    
    for (const id of selectedPayments) {
      try {
        const res = await approvePayment(id, "Bulk approved by Finance", undefined, effectiveCompanyId);
        if (res.success) successCount++;
      } catch (e) {
        console.error(`Error approving payment ${id}:`, e);
      }
    }
    
    setBulkApproveLoading(false);
    setSelectedPayments([]);
    
    if (successCount > 0) {
      toast.success(`Successfully approved ${successCount} payment(s)`);
      await fetchFinanceData();
    } else {
      toast.error('Failed to approve selected payments');
    }
  };

  // === JE Date Adjust Handler ===
  const handleJEDateAdjust = async (jeId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_date: newDate,
          posted_at: new Date(newDate + 'T00:00:00').toISOString(),
        })
        .eq('id', jeId);
      if (error) throw error;
      toast.success(`GL posting date adjusted to ${format(new Date(newDate), 'PPP')}`);
      setEditingJEDate(null);
      setJeNewDate('');
      await fetchFinanceData();
    } catch (err: any) {
      console.error('JE date adjust error:', err);
      toast.error('Failed to adjust posting date');
    }
  };

  // === JE Flow Helpers ===
  const getJEFlowInfo = (je: any) => {
    const entryNumber = je.entry_number || '';
    const description = (je.description || '').toLowerCase();

    // Check more-specific prefixes FIRST to avoid prefix collision
    if (entryNumber.startsWith('SPH-ADV-APPLY-')) return { label: 'Advance Applied to Invoice', icon: ArrowRight, color: 'amber', step: 4 };
    if (entryNumber.startsWith('SPH-ADV-')) return { label: 'Advance Payment Received', icon: Banknote, color: 'blue', step: 1 };
    if (entryNumber.startsWith('SPH-FULL-')) return { label: 'Full Payment Received', icon: CreditCard, color: 'emerald', step: 1 };
    if (entryNumber.startsWith('SPH-BAL-')) return { label: 'Balance Payment Received', icon: DollarSign, color: 'green', step: 2 };
    if (entryNumber.startsWith('SPH-INV-')) return { label: 'AR Invoice Raised (Revenue Recognition)', icon: ReceiptText, color: 'purple', step: 3 };

    // Smart fallback for JV- and other generic entry numbers:
    // Inspect line account names to determine the transaction type
    const accountNames = (je.lines || []).map((l: any) => (l.account?.account_name || '').toLowerCase());
    const allAccounts = accountNames.join(' ');

    if (allAccounts.includes('customer advance') || allAccounts.includes('customer advances')) {
      // Has an advance account → this is an advance payment JE
      if (allAccounts.includes('trade receivable')) {
        return { label: 'Advance Applied to Invoice', icon: ArrowRight, color: 'amber', step: 4 };
      }
      return { label: 'Advance Payment Received', icon: Banknote, color: 'blue', step: 1 };
    }
    if (allAccounts.includes('trade receivable') && allAccounts.includes('bank')) {
      return { label: 'Balance Payment Received', icon: DollarSign, color: 'green', step: 2 };
    }
    if (allAccounts.includes('transport income') || allAccounts.includes('revenue')) {
      return { label: 'AR Invoice Raised (Revenue Recognition)', icon: ReceiptText, color: 'purple', step: 3 };
    }
    if (description.includes('advance')) {
      return { label: 'Advance Payment Received', icon: Banknote, color: 'blue', step: 1 };
    }
    if (description.includes('balance') || description.includes('full payment')) {
      return { label: 'Balance Payment Received', icon: DollarSign, color: 'green', step: 2 };
    }

    return { label: 'Journal Entry', icon: Database, color: 'slate', step: 5 };
  };

  if (!isOpen) return null;

  // Compute totalPayable with defensive fallback to avoid 0/negative when total_amount_after_tax is unset
  const computedTotal = (quotation?.gross_revenue || 0) +
    (quotation?.fuel_cost_fuel_only || 0) +
    (quotation?.commission_pass_through_amount || 0) +
    (quotation?.total_additional_charges || 0) -
    (quotation?.discount_amount_lkr || 0);
  const totalPayable = quotation?.total_amount_after_tax || computedTotal || 0;
  const approvedAdvances = payments.filter(p => p.status === 'approved' && p.payment_type === 'advance').reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAdvances = payments.filter(p => p.status === 'pending_finance' && p.payment_type === 'advance').reduce((sum, p) => sum + Number(p.amount), 0);
  const approvedBalances = payments.filter(p => p.status === 'approved' && p.payment_type === 'balance').reduce((sum, p) => sum + Number(p.amount), 0);
  const approvedFull = payments.filter(p => p.status === 'approved' && p.payment_type === 'full').reduce((sum, p) => sum + Number(p.amount), 0);
  
  const totalPaid = approvedAdvances + approvedBalances + approvedFull;
  const balanceDue = Math.max(0, totalPayable - totalPaid);

  const isTripCompleted = quotation?.trip_status === 'completed';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <BookOpen className="w-6 h-6 text-primary" />
              Finance Settlement Hub - {quotation?.quotation_no}
            </DialogTitle>
            <DialogDescription>
              Comprehensive financial breakdown, approvals, and General Ledger tracking for this quotation.
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
                    <p className="text-sm font-medium text-slate-500">Total Payable</p>
                    <p className="text-2xl font-bold mt-1">LKR {totalPayable.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">Invoice Amount</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-blue-600">Advances Collected</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">LKR {approvedAdvances.toLocaleString()}</p>
                    {pendingAdvances > 0 && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        + LKR {pendingAdvances.toLocaleString()} Pending
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-green-600">Balance Collected</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">LKR {approvedBalances.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className={balanceDue > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}>
                  <CardContent className="p-4">
                    <p className={`text-sm font-medium ${balanceDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      Balance Due
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${balanceDue > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                      LKR {balanceDue.toLocaleString()}
                    </p>
                    {balanceDue <= 0 && <p className="text-xs text-green-600 mt-1 font-medium">Fully Settled</p>}
                  </CardContent>
                </Card>
              </div>

              {/* Action Strips */}
              <div className="space-y-3">
                {payments.filter(p => p.status === 'pending_finance').length > 0 && (
                  <Alert className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-500">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 font-bold flex items-center justify-between">
                      <span>Action Required: Pending Finance Approvals</span>
                      {selectedPayments.length > 0 && (
                        <Button 
                          size="sm" 
                          onClick={handleBulkApprove} 
                          disabled={bulkApproveLoading}
                          className="bg-green-600 hover:bg-green-700 text-white ml-auto"
                        >
                          {bulkApproveLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Approve Selected ({selectedPayments.length})
                        </Button>
                      )}
                    </AlertTitle>
                    <AlertDescription className="text-amber-700">
                      There are payments waiting for Finance Approval. Please review and approve them to post to the General Ledger.
                    </AlertDescription>
                  </Alert>
                )}

                {isTripCompleted && approvedAdvances > 0 && !quotation?.ar_invoice_id && (
                  <Alert className="bg-blue-50 border-blue-200 border-l-4 border-l-blue-500">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-800 font-bold flex justify-between items-center">
                      Action Required: Generate AR Invoice
                      {onGenerateInvoice && (
                        <Button size="sm" onClick={() => { onClose(); onGenerateInvoice(); }} className="bg-blue-600 hover:bg-blue-700">
                          Generate Now
                        </Button>
                      )}
                    </AlertTitle>
                    <AlertDescription className="text-blue-700">
                      The trip is marked as Completed. Generate the AR Invoice to recognize revenue and allocate the advance payments.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Tabs defaultValue="payments" className="w-full">
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
                
                <TabsContent value="payments" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recorded Payments</CardTitle>
                      <CardDescription>All advances and balance payments recorded by Operations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {payments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                          No payments recorded yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(() => {
                            const pendingIds = payments.filter(p => p.status === 'pending_finance').map(p => p.id);
                            if (pendingIds.length > 1) {
                              return (
                                <div className="flex items-center gap-2 mb-2 px-2">
                                  <Checkbox 
                                    id="select-all" 
                                    checked={pendingIds.length > 0 && selectedPayments.length === pendingIds.length}
                                    onCheckedChange={() => handleSelectAll(pendingIds)}
                                  />
                                  <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                    Select All Pending
                                  </label>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {payments.map(payment => (
                            <div key={payment.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-white shadow-sm gap-4">
                              <div className="flex gap-4 items-start flex-1">
                                {payment.status === 'pending_finance' && (
                                  <div className="pt-1.5">
                                    <Checkbox 
                                      checked={selectedPayments.includes(payment.id)}
                                      onCheckedChange={() => handleToggleSelection(payment.id)}
                                    />
                                  </div>
                                )}
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="capitalize text-xs font-semibold bg-slate-100">
                                    {payment.payment_type}
                                  </Badge>
                                  <span className="font-bold text-lg">LKR {Number(payment.amount).toLocaleString()}</span>
                                  {getStatusBadge(payment.status)}
                                </div>
                                <div className="text-sm text-slate-500 flex items-center gap-4">
                                  <span><Clock className="w-3 h-3 inline mr-1" />{format(new Date(payment.created_at), 'PPP p')}</span>
                                  <span><Database className="w-3 h-3 inline mr-1" />{payment.method}</span>
                                  {payment.reference_no && <span>Ref: {payment.reference_no}</span>}
                                </div>
                                {payment.journal_entry_id && (
                                  <div className="text-xs text-green-600 flex items-center mt-1">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Posted to GL
                                  </div>
                                )}
                                {payment.finance_approved_at && (
                                  <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                      <div className="bg-blue-100 p-1.5 rounded-full">
                                        <CheckCircle className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <span className="font-medium">Finance Verified</span>
                                    </div>
                                    <div className="flex flex-col sm:items-end text-xs text-slate-500">
                                      <span>Approved By: <span className="font-semibold text-slate-700">{payment.approver_name || 'Finance Team'}</span></span>
                                      <span>{format(new Date(payment.finance_approved_at), 'PPP p')}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {payment.status === 'pending_finance' && (
                                  <Button onClick={() => handleOpenApproval(payment)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                                    Review & Approve
                                  </Button>
                                )}
                                {payment.status === 'approved' && (
                                  <div className="flex gap-2">
                                    {!payment.journal_entry_id && (
                                      <Button 
                                        variant="outline" 
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                        onClick={() => handleOpenApproval(payment, true)}
                                        disabled={actionLoading}
                                      >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Sync to GL
                                      </Button>
                                    )}
                                    <Button 
                                      variant="outline" 
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                      onClick={async () => {
                                        if (confirm('Are you sure you want to reverse this payment? This will reject the payment and you will need to re-enter it if it was a mistake.')) {
                                          setActionLoading(true);
                                          const res = await rejectPayment(payment.id, "Payment reversed by Finance");
                                          if (res.success) {
                                            toast.success("Payment reversed successfully");
                                            await fetchFinanceData();
                                          }
                                          setActionLoading(false);
                                        }
                                      }}
                                      disabled={actionLoading}
                                    >
                                      <Undo2 className="w-4 h-4 mr-2" />
                                      Reverse
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* AR Invoices Tab */}
                <TabsContent value="ar" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Master AR Invoice</CardTitle>
                      <CardDescription>The official Accounts Receivable invoice for this quotation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {arInvoice ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold">Invoice #</th>
                                <th className="px-4 py-2 text-left font-semibold">Date</th>
                                <th className="px-4 py-2 text-right font-semibold">Total Amount</th>
                                <th className="px-4 py-2 text-right font-semibold">Paid Amount</th>
                                <th className="px-4 py-2 text-right font-semibold">Balance</th>
                                <th className="px-4 py-2 text-center font-semibold">Status</th>
                                <th className="px-4 py-2 text-center font-semibold">GL Status</th>
                                <th className="px-4 py-2 text-center font-semibold">Action</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                              <tr>
                                <td className="px-4 py-3 font-medium text-slate-800">{arInvoice.invoice_number}</td>
                                <td className="px-4 py-3 text-slate-600">{format(new Date(arInvoice.invoice_date), 'PPP')}</td>
                                <td className="px-4 py-3 text-right font-semibold">LKR {Number(arInvoice.total_amount).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-green-600 font-semibold">LKR {Number(arInvoice.paid_amount || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-semibold text-amber-600">LKR {Number(arInvoice.balance || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant={arInvoice.status === 'paid' ? 'default' : 'outline'} className="capitalize">
                                    {arInvoice.status?.toUpperCase() || 'UNPAID'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {arInvoice.journal_entry_id ? (
                                    <div className="flex items-center justify-center text-green-600 text-sm">
                                      <CheckCircle className="h-4 w-4 mr-1" /> Linked
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center text-muted-foreground text-sm">
                                      <Clock className="h-4 w-4 mr-1" /> Unlinked
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => {
                                      onClose();
                                      navigate(`/finance?tab=ar-invoices&highlight=${arInvoice.id}`);
                                    }}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" /> View in AR
                                  </Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No Master AR Invoice generated yet.</p>
                          <p className="text-sm mt-1">Complete the trip and use the Balance Invoice workflow to generate the AR Invoice.</p>
                          {onGenerateInvoice && isTripCompleted && (
                            <Button 
                              className="mt-4" 
                              onClick={() => { onClose(); onGenerateInvoice(); }}
                            >
                              Generate Balance Invoice
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="gl" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">GL Transaction Flow</CardTitle>
                      <CardDescription>Visual lifecycle of all General Ledger postings for this quotation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {journalEntries.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                          No Journal Entries posted yet.
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Timeline connector line */}
                          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-300 via-green-300 to-purple-300 z-0" />

                          <div className="space-y-1 relative z-10">
                            {[...journalEntries].reverse().map((je, idx) => {
                              const flow = getJEFlowInfo(je);
                              const FlowIcon = flow.icon;
                              const colorMap: Record<string, string> = {
                                blue: 'bg-blue-100 text-blue-700 border-blue-300',
                                emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                                green: 'bg-green-100 text-green-700 border-green-300',
                                purple: 'bg-purple-100 text-purple-700 border-purple-300',
                                amber: 'bg-amber-100 text-amber-700 border-amber-300',
                                slate: 'bg-slate-100 text-slate-700 border-slate-300',
                              };
                              const dotColor: Record<string, string> = {
                                blue: 'bg-blue-500', emerald: 'bg-emerald-500', green: 'bg-green-500',
                                purple: 'bg-purple-500', amber: 'bg-amber-500', slate: 'bg-slate-500',
                              };
                              const isEditing = editingJEDate === je.id;
                              const isBackdated = je.entry_date && je.created_at && je.entry_date < je.created_at.split('T')[0];

                              return (
                                <div key={je.id} className="flex gap-4 items-start">
                                  {/* Timeline dot */}
                                  <div className="flex flex-col items-center mt-1 shrink-0">
                                    <div className={`w-3 h-3 rounded-full ${dotColor[flow.color]} ring-4 ring-white shadow-sm`} />
                                    {idx < journalEntries.length - 1 && <div className="w-0.5 h-4" />}
                                  </div>

                                  {/* JE Card */}
                                  <div className={`flex-1 border rounded-lg p-4 mb-3 ${colorMap[flow.color]} shadow-sm`}>
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <FlowIcon className="w-5 h-5" />
                                        <div>
                                          <p className="font-bold text-sm">{flow.label}</p>
                                          <p className="text-xs opacity-70 font-mono">{je.entry_number}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className="bg-white/60 text-inherit border-0 text-xs">{je.status}</Badge>
                                        <div className="text-right">
                                          <p className="text-xs font-semibold">{format(new Date(je.entry_date || je.created_at), 'PPP')}</p>
                                          {isBackdated && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 bg-amber-50 mt-0.5">Backdated</Badge>}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Compact line items */}
                                    <div className="bg-white/50 rounded-md p-2 text-xs space-y-1">
                                      {je.lines?.map((line: any) => (
                                        <div key={line.id} className="flex items-center justify-between">
                                          <span className="font-medium truncate max-w-[60%]">
                                            {Number(line.debit) > 0 ? 'DR' : 'CR'} {line.account?.account_name}
                                          </span>
                                          <span className="font-bold tabular-nums">
                                            LKR {Number(Number(line.debit) > 0 ? line.debit : line.credit).toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                      <Separator className="my-1" />
                                      <div className="flex justify-between font-bold">
                                        <span>Total</span>
                                        <span className="tabular-nums">LKR {Number(je.total_debit).toLocaleString()}</span>
                                      </div>
                                    </div>

                                    {/* Date Adjust */}
                                    <div className="mt-2 flex items-center gap-2">
                                      {isEditing ? (
                                        <div className="flex items-center gap-2 bg-white rounded-md p-1.5 border shadow-sm">
                                          <Input
                                            type="date"
                                            value={jeNewDate}
                                            onChange={(e) => setJeNewDate(e.target.value)}
                                            className="h-7 text-xs w-[140px]"
                                          />
                                          <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={() => jeNewDate && handleJEDateAdjust(je.id, jeNewDate)}>
                                            Save
                                          </Button>
                                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setEditingJEDate(null); setJeNewDate(''); }}>
                                            Cancel
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[11px] opacity-60 hover:opacity-100 gap-1 px-1.5"
                                          onClick={() => { setEditingJEDate(je.id); setJeNewDate(je.entry_date || ''); }}
                                        >
                                          <Pencil className="w-3 h-3" /> Adjust Date
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Existing Finance Approval Modal */}
      {approvalModalOpen && selectedPayment && (
        <FinanceApprovalModal
          isOpen={approvalModalOpen}
          onClose={() => {
            setApprovalModalOpen(false);
            setIsSyncMode(false);
          }}
          paymentData={selectedPayment}
          loading={actionLoading}
          isSyncMode={isSyncMode}
          onApprove={async (notes, signatures, postingDate) => {
            setActionLoading(true);
            if (isSyncMode) {
              const res = await retryFinanceIntegration(selectedPayment.id);
              if (res.success) {
                toast.success("Finance Sync successful!");
                await handleApproveComplete();
              }
            } else {
              const res = await approvePayment(selectedPayment.id, notes, signatures, effectiveCompanyId, postingDate);
              if (res.success) {
                await handleApproveComplete();
              }
            }
            setActionLoading(false);
          }}
          onReject={async (reason) => {
            setActionLoading(true);
            const res = await rejectPayment(selectedPayment.id, reason);
            if (res.success) {
              await handleApproveComplete();
            }
            setActionLoading(false);
          }}
        />
      )}
    </>
  );
}
