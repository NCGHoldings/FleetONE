import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle, Mail, Clock, FileText, FileCheck, UserCheck, CreditCard, 
  Eye, Send, Lock, AlertCircle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SignatureWorkflowIndicatorProps {
  quotationId: string;
  documents: any[];
  onPreviewDocument?: (document: any) => void;
}

interface SignerSetting {
  role: string;
  name: string;
  isEnabled: boolean;
}

export function SignatureWorkflowIndicator({ quotationId, documents, onPreviewDocument }: SignatureWorkflowIndicatorProps) {
  const [signerSettings, setSignerSettings] = useState<Record<string, SignerSetting>>({});
  const [hasPayments, setHasPayments] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [quotationId]);

  const loadData = async () => {
    try {
      // Load signature settings with signer names
      const { data: settings } = await supabase
        .from('special_hire_signature_settings')
        .select(`
          signature_role,
          default_user_id,
          is_enabled
        `);

      const signerMap: Record<string, SignerSetting> = {};
      
      if (settings) {
        const userIds = settings
          .filter(s => s.default_user_id)
          .map(s => s.default_user_id);
        
        let profilesMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);
          
          if (profiles) {
            profiles.forEach(p => {
              const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ');
              if (fullName) {
                profilesMap[p.id] = fullName;
              }
            });
          }
        }
        
        settings.forEach(setting => {
          const name = setting.default_user_id ? profilesMap[setting.default_user_id] : undefined;
          signerMap[setting.signature_role] = {
            role: setting.signature_role,
            name: name || getRoleFallbackLabel(setting.signature_role),
            isEnabled: setting.is_enabled
          };
        });
      }
      
      setSignerSettings(signerMap);

      const { count } = await supabase
        .from('special_hire_payments')
        .select('id', { count: 'exact', head: true })
        .eq('quotation_id', quotationId);
      
      setHasPayments((count || 0) > 0);
    } catch (error) {
      console.error('Error loading workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleFallbackLabel = (role: string): string => {
    switch (role) {
      case 'prepared_by': return 'Assign Preparer';
      case 'checked_by': return 'Assign Checker';
      case 'approved_by': return 'Assign Approver';
      default: return 'Not Configured';
    }
  };

  const getDocumentTypeLabel = (doc: any) => {
    if (doc.payment_type === 'advance') return 'Sales Receipt';
    if (doc.payment_type === 'balance' || doc.payment_type === 'full') return 'Invoice';
    return doc.document_type === 'sales_receipt' ? 'Sales Receipt' : 'Invoice';
  };

  const getSignatureStatus = (doc: any) => {
    const approvals = doc.document_approvals || [];
    const hasPrepared = approvals.some((a: any) => a.approval_type === 'prepared_by');
    const hasChecked = approvals.some((a: any) => a.approval_type === 'checked_by');
    const hasApproved = approvals.some((a: any) => a.approval_type === 'approved_by');
    return { hasPrepared, hasChecked, hasApproved, count: [hasPrepared, hasChecked, hasApproved].filter(Boolean).length };
  };

  // Signature badge component
  const SignatureBadge = ({ done, label }: { done: boolean; label: string }) => {
    const tooltipText = label === 'P' ? 'Prepared By' : label === 'C' ? 'Checked By' : 'Approved By (Finance)';
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
              done 
                ? 'bg-green-500 text-white shadow-sm' 
                : 'bg-muted text-muted-foreground border border-border'
            }`}>
              {done ? '✓' : label}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>{tooltipText}{done ? ' ✓' : ' (pending)'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-24 h-6 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  // No payments yet
  if (!hasPayments) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-xs px-2 py-1 w-fit">
          <CreditCard className="w-3 h-3 mr-1" />
          Awaiting Payment
        </Badge>
        <span className="text-[10px] text-muted-foreground">Confirm payment first</span>
      </div>
    );
  }

  // No documents
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-1 w-fit">
          <FileText className="w-3 h-3 mr-1" />
          No Document
        </Badge>
        <span className="text-[10px] text-muted-foreground">Awaiting generation</span>
      </div>
    );
  }

  // Show per-document status
  return (
    <div className="flex flex-col gap-2 max-w-[180px]">
      {documents.slice(0, 2).map((doc) => {
        const sig = getSignatureStatus(doc);
        const allComplete = sig.count === 3;
        const isAwaitingFinance = sig.hasPrepared && sig.hasChecked && !sig.hasApproved;
        const emailSent = doc.email_status === 'sent';
        
        return (
          <div key={doc.id} className="flex flex-col gap-1 p-1.5 rounded bg-muted/40 border border-border/40">
            {/* Document type + preview button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {allComplete ? (
                  <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                ) : isAwaitingFinance ? (
                  <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                ) : (
                  <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-[10px] font-medium truncate">
                  {getDocumentTypeLabel(doc)}
                </span>
              </div>
              
              {onPreviewDocument && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-primary/10"
                        onClick={() => onPreviewDocument(doc)}
                      >
                        <Eye className="w-3 h-3 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Quick Preview</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Signature progress */}
            <div className="flex items-center gap-0.5">
              <SignatureBadge done={sig.hasPrepared} label="P" />
              <SignatureBadge done={sig.hasChecked} label="C" />
              <SignatureBadge done={sig.hasApproved} label="A" />
            </div>

            {/* Status indicator */}
            {allComplete ? (
              emailSent ? (
                <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                  <Mail className="w-3 h-3" />
                  <span>Sent to Customer</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <Send className="w-3 h-3" />
                  <span>Ready to Send</span>
                </div>
              )
            ) : isAwaitingFinance ? (
              <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                <Lock className="w-3 h-3" />
                <span>Awaiting Finance</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <AlertCircle className="w-3 h-3" />
                <span>{sig.count}/3 Signatures</span>
              </div>
            )}
          </div>
        );
      })}
      
      {documents.length > 2 && (
        <span className="text-[10px] text-muted-foreground">
          +{documents.length - 2} more document(s)
        </span>
      )}
    </div>
  );
}
