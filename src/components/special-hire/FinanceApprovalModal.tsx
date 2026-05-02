import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, ExternalLink, FileText, Download, Eye, PenTool, User, Calendar, AlertTriangle, Wand2, Loader2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentManagement } from '@/hooks/useDocumentManagement';
import { useSignatureManagement } from '@/hooks/useSignatureManagement';
import { DocumentViewer } from './DocumentViewer';
import { SignatureCaptureModal } from './SignatureCaptureModal';
import { SearchableFinanceAccountSelector } from '@/components/settings/SearchableFinanceAccountSelector';
import { useSpecialHireFinanceSettings, useUpdateSpecialHireFinanceSettings } from '@/hooks/useSpecialHireFinance';
import { useChartOfAccounts } from '@/hooks/useAccountingData';
import { useCompany, NCG_HOLDING_ID } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FinanceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (notes?: string, signatures?: any) => void;
  onReject: (reason: string) => void;
  paymentData: {
    id: string;
    amount: number;
    payment_type: string;
    method: string;
    reference_no?: string;
    payment_proof_url?: string;
    notes?: string;
    status: string;
    created_at: string;
    quotation: {
      quotation_no: string;
      customer_name: string;
      company_name?: string;
    };
  };
  loading?: boolean;
  isSyncMode?: boolean;
}

export const FinanceApprovalModal = ({ 
  isOpen, 
  onClose, 
  onApprove, 
  onReject, 
  paymentData, 
  loading = false,
  isSyncMode = false
}: FinanceApprovalModalProps) => {
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [signatures, setSignatures] = useState({
    prepared_by: null as any,
    checked_by: null as any,
    approved_by: null as any,
  });
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [currentSignatureType, setCurrentSignatureType] = useState<'prepared_by' | 'checked_by' | 'approved_by'>('prepared_by');
  const [existingSignatures, setExistingSignatures] = useState<any>({});
  
  const { getDocumentsByQuotation, approveDocument } = useDocumentManagement();
  const { saveApproval, getDocumentApprovals } = useSignatureManagement();
  const { selectedCompany, isTestCompany, setSelectedCompanyId, isNCGHoldingOrSubCompany } = useCompany();

  // GL Configuration State
  const { data: settings, isLoading: settingsLoading } = useSpecialHireFinanceSettings();
  const { data: chartOfAccounts } = useChartOfAccounts();
  const updateSettings = useUpdateSpecialHireFinanceSettings();
  
  const [localSettings, setLocalSettings] = useState<any>({});
  
  const isSettingsComplete = 
    settings?.trade_receivable_account_id && 
    settings?.customer_advance_account_id && 
    settings?.default_bank_account_id && 
    (settings?.revenue_internal_account_id || settings?.revenue_external_account_id);

  const isCorrectWorkspace = selectedCompany && isNCGHoldingOrSubCompany(selectedCompany.id) && !isTestCompany;

  // Settings are required for GL auto-posting but not for the approval action itself.
  // The hook validates settings before GL posting and shows a specific error toast.
  const isApproveBlocked = loading || action === 'reject';

  useEffect(() => {
    if (settings && !isSettingsComplete) {
      setLocalSettings({
        revenue_external_account_id: settings.revenue_external_account_id || '',
        trade_receivable_account_id: settings.trade_receivable_account_id || '',
        customer_advance_account_id: settings.customer_advance_account_id || '',
        default_bank_account_id: settings.default_bank_account_id || '',
      });
    }
  }, [settings, isSettingsComplete]);

  const handleAutoFill = () => {
    if (!chartOfAccounts || chartOfAccounts.length === 0) return;
    
    const matchAccount = (keywords: string[], type?: string) => {
      return chartOfAccounts.find(a => 
        (!type || a.account_type === type) && 
        keywords.some(k => a.account_name.toLowerCase().includes(k))
      )?.id || "";
    };

    setLocalSettings({
      revenue_external_account_id: localSettings.revenue_external_account_id || matchAccount(["special hire revenue - external", "external revenue", "sales", "revenue"], "revenue"),
      trade_receivable_account_id: localSettings.trade_receivable_account_id || matchAccount(["trade receivable", "accounts receivable", "trade debtor"], "asset"),
      customer_advance_account_id: localSettings.customer_advance_account_id || matchAccount(["customer advance", "advance receipt", "advance"], "liability"),
      default_bank_account_id: localSettings.default_bank_account_id || matchAccount(["bank", "cash", "petty cash"], "asset"),
    });
    toast.success("Accounts auto-filled. Please save.");
  };

  const handleSaveSettings = async () => {
    try {
      // If we are creating the settings for the first time, we must include all required NOT NULL fields
      const payload = {
        ...localSettings,
        auto_post_advance_payments: settings?.auto_post_advance_payments ?? false,
        auto_post_invoices: settings?.auto_post_invoices ?? false,
        auto_post_balance_payments: settings?.auto_post_balance_payments ?? false,
        invoice_prefix: settings?.invoice_prefix ?? 'SPH-INV',
        advance_receipt_prefix: settings?.advance_receipt_prefix ?? 'SPH-ADV',
        quotation_bank_name: settings?.quotation_bank_name ?? 'Commercial Bank',
        quotation_account_name: settings?.quotation_account_name ?? 'NCG Holding',
        quotation_account_no: settings?.quotation_account_no ?? '1001077213'
      };
      
      await updateSettings.mutateAsync(payload);
    } catch (e: any) {
      console.error('Settings save failed:', e);
    }
  };

  const getAccountName = (id: string) => {
    return chartOfAccounts?.find(a => a.id === id)?.account_name || 'Unknown Account';
  };

  // Load documents and signatures when modal opens
  useEffect(() => {
    if (isOpen && paymentData) {
      loadDocuments();
      loadExistingSignatures();
    }
  }, [isOpen, paymentData]);

  const loadDocuments = async () => {
    if (!paymentData) return;
    
    setDocumentsLoading(true);
    try {
      // Get documents by quotation ID (we need to find the quotation ID from the payment)
      const { data: paymentDetails, error } = await supabase
        .from('special_hire_payments')
        .select('quotation_id')
        .eq('id', paymentData.id)
        .single();
      
      if (error) throw error;
      
      const result = await getDocumentsByQuotation(paymentDetails.quotation_id);
      if (result.success) {
        // Filter documents related to this payment
        const paymentDocuments = result.documents?.filter(doc => doc.payment_id === paymentData.id) || [];
        setDocuments(paymentDocuments);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadExistingSignatures = async () => {
    if (!paymentData) return;
    
    try {
      // Get documents related to this payment to check for existing signatures
      const { data: paymentDetails, error } = await supabase
        .from('special_hire_payments')
        .select('quotation_id')
        .eq('id', paymentData.id)
        .single();

      if (error) throw error;

      const result = await getDocumentsByQuotation(paymentDetails.quotation_id);
      if (result.success && result.documents && result.documents.length > 0) {
        // Filter to documents for this specific payment
        const paymentDocs = result.documents.filter(doc => doc.payment_id === paymentData.id);
        const docToCheck = paymentDocs.length > 0 ? paymentDocs[0] : result.documents[0];
        
        // Load signatures using the actual document ID
        const signaturesResult = await getDocumentApprovals(docToCheck.id);
        
        if (signaturesResult.success) {
          const existingSigs: any = {};
          signaturesResult.approvals.forEach((approval: any) => {
            existingSigs[approval.approval_type] = {
              approver_name: approval.approver_name,
              signature_data: approval.signature_data,
              approval_date: approval.approval_date,
            };
          });
          setExistingSignatures(existingSigs);
        }
      }
    } catch (error) {
      console.error('Error loading existing signatures:', error);
    }
  };

  const handleApproveDocument = async (documentId: string) => {
    const result = await approveDocument(documentId);
    if (result.success) {
      await loadDocuments(); // Reload documents to show updated status
    }
    return result;
  };

  const handleApprove = async () => {
    setAction('approve');
    
    // Combine existing signatures with new ones (auto-signature handled in hook)
    const finalSignatures = { ...existingSignatures };
    Object.entries(signatures).forEach(([type, sig]) => {
      if (sig) {
        finalSignatures[type] = sig;
      }
    });
    onApprove(notes || undefined, finalSignatures);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    setAction('reject');
    onReject(rejectionReason);
  };

  const handleSignatureSave = async (data: any, documentId?: string) => {
    // Save to temporary signatures state
    setSignatures(prev => ({
      ...prev,
      [currentSignatureType]: {
        approver_name: data.approverName,
        signature_data: data.signatureData,
        approval_date: format(data.approvalDate, 'yyyy-MM-dd'),
      }
    }));
    
    // Also save to database for future reference if we have a document ID
    if (documentId) {
      await saveApproval({
        document_id: documentId,
        approval_type: currentSignatureType,
        approver_name: data.approverName,
        signature_data: data.signatureData,
        approval_date: format(data.approvalDate, 'yyyy-MM-dd'),
      });
    }
    
    setSignatureModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_finance':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Finance</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApprovalTypeName = (type: string) => {
    switch (type) {
      case 'prepared_by': return 'Prepared By';
      case 'approved_by': return 'Approved By';
      case 'received_by': return 'Received By';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isSyncMode ? "Confirm GL Sync" : "Finance Payment Approval"}</DialogTitle>
        </DialogHeader>

        {selectedCompany?.name && !selectedCompany.name.toLowerCase().includes('special hire') && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">
              Database Mismatch Warning
            </AlertTitle>
            <AlertDescription>
              You are approving a Special Hire finance transaction, but you are currently connected to the <strong>{selectedCompany?.name}</strong> ledger. 
              Please ensure you are connected to the correct database before confirming.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={isSyncMode || !isSettingsComplete ? "gl_preview" : "payment"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payment">Payment Details</TabsTrigger>
            <TabsTrigger value="gl_preview" className={!isSettingsComplete ? "text-red-600 font-semibold" : ""}>
              {!isSettingsComplete && <AlertTriangle className="w-4 h-4 mr-1" />}
              GL Preview
            </TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="signatures">Signatures</TabsTrigger>
          </TabsList>

          <TabsContent value="gl_preview" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {settingsLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Checking finance configurations...</p>
                  </div>
                ) : !isSettingsComplete ? (
                  <div className="space-y-6">
                    {!isCorrectWorkspace ? (
                      <div className="space-y-4">
                        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
                          <AlertTriangle className="h-5 w-5" />
                          <AlertTitle className="text-lg">Workspace Configuration Locked</AlertTitle>
                          <AlertDescription className="mt-2 text-sm leading-relaxed">
                            You are currently in the <strong>{selectedCompany?.name || 'Unknown'}</strong> workspace, which does not have Special Hire Finance settings configured.
                            <br/><br/>
                            To prevent cross-tenant data contamination, configuration of Live Special Hire settings is restricted to the primary NCG Holding workspace.
                          </AlertDescription>
                        </Alert>
                        <div className="flex justify-center pt-4">
                          <Button 
                            size="lg" 
                            className="bg-primary text-primary-foreground font-semibold"
                            onClick={() => setSelectedCompanyId(NCG_HOLDING_ID)}
                          >
                            Switch to NCG Holding Workspace
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Alert variant="destructive" className="bg-amber-50 text-amber-900 border-amber-200">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>GL Auto-Posting Not Configured</AlertTitle>
                          <AlertDescription>
                            GL accounts are not fully mapped — automatic journal entries will be <strong>skipped</strong> on approval. 
                            You can still approve the payment. Configure the accounts below and save to enable auto-posting going forward.
                          </AlertDescription>
                        </Alert>

                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={handleAutoFill}>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Auto-Fill Defaults
                          </Button>
                        </div>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Default Bank/Cash Account (Debit)</Label>
                        <SearchableFinanceAccountSelector
                          value={localSettings.default_bank_account_id || null}
                          onValueChange={(val) => setLocalSettings((p: any) => ({ ...p, default_bank_account_id: val || '' }))}
                          accounts={chartOfAccounts || []}
                          placeholder="Select bank account..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Customer Advance Liability Account (Credit)</Label>
                        <SearchableFinanceAccountSelector
                          value={localSettings.customer_advance_account_id || null}
                          onValueChange={(val) => setLocalSettings((p: any) => ({ ...p, customer_advance_account_id: val || '' }))}
                          accounts={chartOfAccounts || []}
                          placeholder="Select advance account..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Trade Receivable Account (AR)</Label>
                        <SearchableFinanceAccountSelector
                          value={localSettings.trade_receivable_account_id || null}
                          onValueChange={(val) => setLocalSettings((p: any) => ({ ...p, trade_receivable_account_id: val || '' }))}
                          accounts={chartOfAccounts || []}
                          placeholder="Select receivable account..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Special Hire Revenue Account</Label>
                        <SearchableFinanceAccountSelector
                          value={localSettings.revenue_external_account_id || null}
                          onValueChange={(val) => setLocalSettings((p: any) => ({ ...p, revenue_external_account_id: val || '' }))}
                          accounts={chartOfAccounts || []}
                          placeholder="Select revenue account..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                        {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Settings
                      </Button>
                    </div>
                  </>
                )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm text-slate-500 flex items-center gap-2">
                          PROJECTED JOURNAL ENTRY
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground font-medium flex items-center">
                            <Database className="w-3 h-3 mr-1" />
                            Database Link:
                          </span>
                          <Badge variant={isTestCompany ? "destructive" : "default"} className={!isTestCompany ? "bg-green-600 hover:bg-green-700" : ""}>
                            {isTestCompany ? "Test Environment" : "Live Database"}
                          </Badge>
                          <span className="text-muted-foreground ml-1">
                            ({selectedCompany?.name || 'Unknown Company'})
                          </span>
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Account</th>
                              <th className="px-4 py-2 text-right font-medium">Debit</th>
                              <th className="px-4 py-2 text-right font-medium">Credit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(paymentData.payment_type === 'advance' || paymentData.payment_type === 'full') && (
                              <>
                                <tr>
                                  <td className="px-4 py-3 font-medium">
                                    {getAccountName(settings?.default_bank_account_id)}
                                    <p className="text-xs text-muted-foreground font-normal">Asset - Bank/Cash</p>
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                                    {paymentData.amount.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 font-medium pl-8">
                                    {getAccountName(settings?.customer_advance_account_id)}
                                    <p className="text-xs text-muted-foreground font-normal">Liability - Customer Advance</p>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400">-</td>
                                  <td className="px-4 py-3 text-right font-medium">
                                    {paymentData.amount.toLocaleString()}
                                  </td>
                                </tr>
                              </>
                            )}
                            {paymentData.payment_type === 'balance' && (
                              <>
                                <tr>
                                  <td className="px-4 py-3 font-medium">
                                    {getAccountName(settings?.default_bank_account_id)}
                                    <p className="text-xs text-muted-foreground font-normal">Asset - Bank/Cash</p>
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                                    {paymentData.amount.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 font-medium pl-8">
                                    {getAccountName(settings?.trade_receivable_account_id)}
                                    <p className="text-xs text-muted-foreground font-normal">Asset - Trade Receivable</p>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400">-</td>
                                  <td className="px-4 py-3 text-right font-medium">
                                    {paymentData.amount.toLocaleString()}
                                  </td>
                                </tr>
                              </>
                            )}
                          </tbody>
                          <tfoot className="bg-slate-50 font-semibold border-t-2">
                            <tr>
                              <td className="px-4 py-2 text-right">Total:</td>
                              <td className="px-4 py-2 text-right text-primary">LKR {paymentData.amount.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right text-primary">LKR {paymentData.amount.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Quotation No:</p>
                    <p className="text-muted-foreground">{paymentData.quotation.quotation_no}</p>
                  </div>
                  <div>
                    <p className="font-medium">Customer:</p>
                    <p className="text-muted-foreground">{paymentData.quotation.company_name || paymentData.quotation.customer_name}</p>
                  </div>
                  <div>
                    <p className="font-medium">Amount:</p>
                    <p className="text-muted-foreground font-semibold text-lg">LKR {paymentData.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Payment Type:</p>
                    <p className="text-muted-foreground capitalize">{paymentData.payment_type}</p>
                  </div>
                  <div>
                    <p className="font-medium">Method:</p>
                    <p className="text-muted-foreground capitalize">{paymentData.method}</p>
                  </div>
                  <div>
                    <p className="font-medium">Status:</p>
                    {getStatusBadge(paymentData.status)}
                  </div>
                  {paymentData.reference_no && (
                    <div className="col-span-2">
                      <p className="font-medium">Reference:</p>
                      <p className="text-muted-foreground">{paymentData.reference_no}</p>
                    </div>
                  )}
                  {paymentData.notes && (
                    <div className="col-span-2">
                      <p className="font-medium">Operations Notes:</p>
                      <p className="text-muted-foreground">{paymentData.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Proof */}
            {paymentData.payment_proof_url && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label className="font-medium">Payment Proof</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { data: signedUrl } = await supabase.storage
                              .from('payment-proofs')
                              .createSignedUrl(paymentData.payment_proof_url!, 300);
                            if (signedUrl?.signedUrl) {
                              window.open(signedUrl.signedUrl, '_blank');
                            }
                          } catch (e) {
                            window.open(paymentData.payment_proof_url!, '_blank');
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Payment Proof
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            {/* Draft Documents Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Label className="font-medium">Generated Documents</Label>
                  
                  {documentsLoading ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Loading documents...</p>
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {doc.document_type === 'sales_receipt' ? 'Sales Receipt' : 'Invoice'}
                                </span>
                                <Badge variant={doc.document_status === 'draft' ? 'secondary' : 'default'}>
                                  {doc.document_status === 'draft' ? 'DRAFT' : 'APPROVED'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Generated: {format(new Date(doc.generated_at), 'MMM dd, yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setDocumentViewerOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            
                            {doc.document_status === 'draft' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApproveDocument(doc.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve Document
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No documents found for this payment.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signatures" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PenTool className="w-5 h-5" />
                  <Label className="text-base font-medium">Document Signatures</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add signatures that will be included in the approved documents. These signatures will appear on all generated invoices and sales receipts.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['prepared_by', 'checked_by', 'approved_by'] as const).map((type) => {
                  const existingSig = existingSignatures[type];
                  const currentSig = signatures[type];
                  const activeSig = currentSig || existingSig;

                  return (
                    <div key={type} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{getApprovalTypeName(type)}</Label>
                        {activeSig && (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {currentSig ? 'Updated' : 'Existing'}
                          </Badge>
                        )}
                      </div>
                      
                      {activeSig ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{activeSig.approver_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {format(new Date(activeSig.approval_date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                          
                          {activeSig.signature_data && (
                            <div className="border rounded p-2 bg-gray-50">
                              <img 
                                src={activeSig.signature_data} 
                                alt="Signature" 
                                className="h-12 object-contain"
                              />
                            </div>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentSignatureType(type);
                              setSignatureModalOpen(true);
                            }}
                          >
                            <PenTool className="w-4 h-4 mr-2" />
                            Update Signature
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground text-sm mb-3">No signature added</p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setCurrentSignatureType(type);
                              setSignatureModalOpen(true);
                            }}
                          >
                            <PenTool className="w-4 h-4 mr-2" />
                            Add Signature
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Finance Review (Hidden in Sync Mode) */}
        {!isSyncMode && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Finance Review</Label>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Approval Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the approval..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection">Rejection Reason (Required if rejecting)</Label>
              <Textarea
                id="rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide detailed reason for rejection..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {!isSyncMode && (
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={loading || !rejectionReason.trim() || action === 'approve'}
            >
              {loading && action === 'reject' ? 'Rejecting...' : 'Reject Payment'}
            </Button>
          )}
          <Button 
            onClick={handleApprove} 
            disabled={isApproveBlocked}
            className="bg-green-600 hover:bg-green-700"
            title={!isSettingsComplete ? 'GL accounts not fully configured — payment will be approved but GL entry will be skipped. Configure accounts in Settings > Special Hire Finance.' : undefined}
          >
            {loading && action === 'approve' ? (isSyncMode ? 'Syncing...' : 'Approving...') : (isSyncMode ? 'Confirm GL Sync' : 'Approve Payment')}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Document Viewer */}
      {documentViewerOpen && selectedDocument && (
        <DocumentViewer
          isOpen={documentViewerOpen}
          onClose={() => {
            setDocumentViewerOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
        />
      )}

      {/* Signature Capture Modal */}
      <SignatureCaptureModal
        isOpen={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        onSave={(data) => handleSignatureSave(data, documents[0]?.id)}
        approvalType={currentSignatureType}
        title={`Add ${getApprovalTypeName(currentSignatureType)} Signature`}
        documentId={documents[0]?.id || 'temp'}
      />
    </Dialog>
  );
};