import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Mail, Clock, FileText, FileCheck, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SignatureWorkflowIndicatorProps {
  quotationId: string;
  documents: any[];
}

interface SignerInfo {
  name: string;
  role: 'prepared_by' | 'checked_by' | 'approved_by';
}

export function SignatureWorkflowIndicator({ quotationId, documents }: SignatureWorkflowIndicatorProps) {
  const [defaultSigners, setDefaultSigners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDefaultSigners();
  }, []);

  const loadDefaultSigners = async () => {
    try {
      const { data: settings } = await supabase
        .from('special_hire_signature_settings')
        .select(`
          signature_role,
          default_user_id,
          is_enabled
        `);

      if (settings) {
        const signerNames: Record<string, string> = {};
        
        for (const setting of settings) {
          if (setting.default_user_id && setting.is_enabled) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', setting.default_user_id)
              .single();
            
            if (profile) {
              const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
              if (fullName) {
                signerNames[setting.signature_role] = fullName;
              }
            }
          }
        }
        
        setDefaultSigners(signerNames);
      }
    } catch (error) {
      console.error('Error loading default signers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all approvals from all documents
  const allApprovals = documents?.flatMap(doc => doc.document_approvals || []) || [];
  
  const hasPreparedBy = allApprovals.some(a => a.approval_type === 'prepared_by');
  const hasCheckedBy = allApprovals.some(a => a.approval_type === 'checked_by');
  const hasApprovedBy = allApprovals.some(a => a.approval_type === 'approved_by');
  
  // Check email status
  const hasEmailSent = documents?.some(d => d.email_status === 'sent');
  const hasDocuments = documents && documents.length > 0;
  
  // Determine workflow stage
  const allComplete = hasPreparedBy && hasCheckedBy && hasApprovedBy;
  
  const getNextSignerInfo = (): { stage: string; signer: string; color: string; icon: React.ReactNode } => {
    if (!hasDocuments) {
      return {
        stage: 'No Document',
        signer: 'Generate document first',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: <FileText className="w-3.5 h-3.5" />
      };
    }
    
    if (!hasPreparedBy) {
      return {
        stage: 'Prepared By',
        signer: defaultSigners['prepared_by'] || 'Pending',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <FileText className="w-3.5 h-3.5" />
      };
    }
    
    if (!hasCheckedBy) {
      return {
        stage: 'Checked By',
        signer: defaultSigners['checked_by'] || 'Pending',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: <FileCheck className="w-3.5 h-3.5" />
      };
    }
    
    if (!hasApprovedBy) {
      return {
        stage: 'Approved By',
        signer: defaultSigners['approved_by'] || 'Pending',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: <UserCheck className="w-3.5 h-3.5" />
      };
    }
    
    // All complete
    return {
      stage: 'Complete',
      signer: '',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: <CheckCircle className="w-3.5 h-3.5" />
    };
  };

  const nextSigner = getNextSignerInfo();
  
  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-16 h-5 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Main workflow indicator */}
      <Badge 
        variant="outline" 
        className={`${nextSigner.color} text-xs font-medium px-2 py-1 flex items-center gap-1.5 border`}
      >
        {nextSigner.icon}
        <span>
          {allComplete ? 'Complete' : `Next: ${nextSigner.stage}`}
        </span>
      </Badge>
      
      {/* Signer name or email status */}
      {allComplete ? (
        <div className="flex items-center gap-1 text-xs">
          {hasEmailSent ? (
            <span className="text-green-600 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Sent
            </span>
          ) : (
            <span className="text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Not Sent
            </span>
          )}
        </div>
      ) : nextSigner.signer && nextSigner.stage !== 'No Document' ? (
        <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={nextSigner.signer}>
          {nextSigner.signer}
        </span>
      ) : null}
    </div>
  );
}
