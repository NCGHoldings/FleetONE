import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle, Mail, Clock, FileText, Eye, Send, Lock, AlertCircle, CreditCard, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface SignerSetting {
  role: string;
  name: string;
  isEnabled: boolean;
}

interface SignatureWorkflowIndicatorProps {
  quotationId: string;
  documents: any[];
  hasPayments: boolean;
  documentsLoading?: boolean;
  signerSettings?: Record<string, SignerSetting>;
  onPreviewDocument?: (document: any | null) => void;
}

export function SignatureWorkflowIndicator({ 
  quotationId, 
  documents, 
  hasPayments,
  documentsLoading = false,
  signerSettings = {},
  onPreviewDocument 
}: SignatureWorkflowIndicatorProps) {

  const getRoleFallbackLabel = (role: string): string => {
    switch (role) {
      case 'prepared_by': return 'Preparer';
      case 'checked_by': return 'Checker';
      case 'approved_by': return 'Finance';
      default: return 'Not Set';
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

  // Always-visible preview button component
  const PreviewButton = ({ doc }: { doc?: any }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewDocument?.(doc || null);
            }}
          >
            <Eye className="w-3 h-3 text-primary" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{doc ? 'Quick Preview' : 'View Documents'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Loading state - still show preview button
  if (documentsLoading) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
        <PreviewButton />
      </div>
    );
  }

  // No payments yet - show preview button anyway
  if (!hasPayments) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-xs px-2 py-1 w-fit">
            <CreditCard className="w-3 h-3 mr-1" />
            Awaiting Payment
          </Badge>
          <span className="text-[10px] text-muted-foreground">Confirm payment first</span>
        </div>
        <PreviewButton />
      </div>
    );
  }

  // Has payments but no documents yet - show preview button
  if (!documents || documents.length === 0) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 text-xs px-2 py-1 w-fit">
            <FileText className="w-3 h-3 mr-1" />
            No Documents
          </Badge>
          <span className="text-[10px] text-muted-foreground">Generate documents</span>
        </div>
        <PreviewButton />
      </div>
    );
  }

  // Check if ALL documents have all signatures
  const allDocumentsComplete = documents.length > 0 && documents.every((doc) => {
    const sig = getSignatureStatus(doc);
    return sig.count === 3;
  });

  // Show per-document status with always-visible preview
  return (
    <div className="flex flex-col gap-2 max-w-[200px]">
      {/* All Signed Summary Badge - shown when ALL documents complete */}
      {allDocumentsComplete && (
        <Badge className="gap-1.5 bg-green-600 hover:bg-green-700 text-white px-2 py-1 w-fit">
          <CheckCircle className="h-4 w-4" />
          All Signed ✓
        </Badge>
      )}
      
      {documents.slice(0, 2).map((doc) => {
        const sig = getSignatureStatus(doc);
        const allComplete = sig.count === 3;
        const isAwaitingFinance = sig.hasPrepared && sig.hasChecked && !sig.hasApproved;
        const emailSent = doc.email_status === 'sent';
        
        return (
          <div key={doc.id} className={`flex flex-col gap-1 p-1.5 rounded border ${
            allComplete 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
              : 'bg-muted/40 border-border/40'
          }`}>
            {/* Document type + preview button - ALWAYS VISIBLE */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {allComplete ? (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : isAwaitingFinance ? (
                  <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                ) : (
                  <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
                <span className={`text-[10px] font-medium truncate ${allComplete ? 'text-green-700 dark:text-green-400' : ''}`}>
                  {getDocumentTypeLabel(doc)}
                </span>
              </div>
              
              {/* Preview button - ALWAYS visible */}
              <PreviewButton doc={doc} />
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium cursor-help">
                      <Lock className="w-3 h-3" />
                      <span>Awaiting Finance</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                    <p>Final signature from Finance department required before document can be sent</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            +{documents.length - 2} more document(s)
          </span>
          <PreviewButton />
        </div>
      )}
    </div>
  );
}
