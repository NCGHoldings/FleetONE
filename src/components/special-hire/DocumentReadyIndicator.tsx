import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle, Clock, Mail, Eye, FileText, Lock, Send,
  AlertCircle, CreditCard
} from 'lucide-react';

interface DocumentApproval {
  approval_type: string;
  approver_name: string;
}

interface Document {
  id: string;
  document_type: string;
  payment_type: string;
  email_status: string;
  ready_to_send: boolean;
  document_approvals: DocumentApproval[];
}

interface DocumentReadyIndicatorProps {
  documents: Document[];
  hasPayments: boolean;
  onPreviewDocument: (document: Document) => void;
}

export function DocumentReadyIndicator({ 
  documents, 
  hasPayments, 
  onPreviewDocument 
}: DocumentReadyIndicatorProps) {
  
  const getDocumentTypeLabel = (doc: Document) => {
    if (doc.payment_type === 'advance') return 'Sales Receipt';
    if (doc.payment_type === 'balance' || doc.payment_type === 'full') return 'Invoice';
    return doc.document_type === 'sales_receipt' ? 'Sales Receipt' : 'Invoice';
  };

  const getSignatureStatus = (doc: Document) => {
    const approvals = doc.document_approvals || [];
    const hasPrepared = approvals.some(a => a.approval_type === 'prepared_by');
    const hasChecked = approvals.some(a => a.approval_type === 'checked_by');
    const hasApproved = approvals.some(a => a.approval_type === 'approved_by');
    
    return { hasPrepared, hasChecked, hasApproved, count: [hasPrepared, hasChecked, hasApproved].filter(Boolean).length };
  };

  const SignatureBadge = ({ done, label }: { done: boolean; label: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
            done 
              ? 'bg-green-100 text-green-700 border border-green-300' 
              : 'bg-muted text-muted-foreground border border-border'
          }`}>
            {done ? '✓' : label}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label === 'P' ? 'Prepared By' : label === 'C' ? 'Checked By' : 'Approved By (Finance)'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // No payments yet
  if (!hasPayments) {
    return (
      <div className="flex flex-col gap-1.5">
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-xs px-2 py-1">
          <CreditCard className="w-3 h-3 mr-1" />
          Awaiting Payment
        </Badge>
        <span className="text-xs text-muted-foreground">Confirm payment first</span>
      </div>
    );
  }

  // No documents generated
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-1">
          <FileText className="w-3 h-3 mr-1" />
          No Document
        </Badge>
        <span className="text-xs text-muted-foreground">Generate document</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => {
        const sig = getSignatureStatus(doc);
        const allComplete = sig.count === 3;
        const isAwaitingFinance = sig.hasPrepared && sig.hasChecked && !sig.hasApproved;
        const emailSent = doc.email_status === 'sent';
        
        return (
          <div key={doc.id} className="flex flex-col gap-1.5 p-2 rounded-md bg-muted/30 border border-border/50">
            {/* Row 1: Document type + status + preview */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {allComplete ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="text-xs font-medium truncate max-w-[80px]">
                  {getDocumentTypeLabel(doc)}
                </span>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onPreviewDocument(doc)}
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Preview Document</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Row 2: Signature progress badges */}
            <div className="flex items-center gap-1">
              <SignatureBadge done={sig.hasPrepared} label="P" />
              <SignatureBadge done={sig.hasChecked} label="C" />
              <SignatureBadge done={sig.hasApproved} label="A" />
              <span className="text-xs text-muted-foreground ml-1">
                ({sig.count}/3)
              </span>
            </div>

            {/* Row 3: Status badge */}
            <div>
              {allComplete ? (
                emailSent ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] px-1.5 py-0.5">
                    <Mail className="w-3 h-3 mr-1" />
                    Sent
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] px-1.5 py-0.5">
                    <Send className="w-3 h-3 mr-1" />
                    Ready to Send
                  </Badge>
                )
              ) : isAwaitingFinance ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0.5">
                  <Lock className="w-3 h-3 mr-1" />
                  Awaiting Finance
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {sig.count === 0 ? 'Not Started' : `${sig.count}/3 Signed`}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
