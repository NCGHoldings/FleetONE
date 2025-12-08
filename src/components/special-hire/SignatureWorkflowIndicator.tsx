import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Mail, Clock, FileText, FileCheck, UserCheck, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SignatureWorkflowIndicatorProps {
  quotationId: string;
  documents: any[];
}

interface SignerSetting {
  role: string;
  name: string;
  isEnabled: boolean;
}

export function SignatureWorkflowIndicator({ quotationId, documents }: SignatureWorkflowIndicatorProps) {
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
        // Get all unique user IDs that are not null
        const userIds = settings
          .filter(s => s.default_user_id)
          .map(s => s.default_user_id);
        
        // Fetch profiles in one query
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
        
        // Build signer settings map
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

      // Check if quotation has any payments
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
  
  const getWorkflowInfo = (): { stage: string; signer: string; color: string; icon: React.ReactNode; description: string } => {
    // No payments yet - waiting for payment confirmation
    if (!hasPayments) {
      return {
        stage: 'Awaiting Payment',
        signer: '',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: <CreditCard className="w-3.5 h-3.5" />,
        description: 'Confirm payment to generate document'
      };
    }
    
    // Has payments but no document generated yet
    if (!hasDocuments) {
      return {
        stage: 'Generate Document',
        signer: '',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: <FileText className="w-3.5 h-3.5" />,
        description: 'Document pending generation'
      };
    }
    
    // Document exists, check signature progress
    if (!hasPreparedBy) {
      const setting = signerSettings['prepared_by'];
      return {
        stage: 'Prepared By',
        signer: setting?.name || 'Not Configured',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <FileText className="w-3.5 h-3.5" />,
        description: 'Awaiting preparation signature'
      };
    }
    
    if (!hasCheckedBy) {
      const setting = signerSettings['checked_by'];
      return {
        stage: 'Checked By',
        signer: setting?.name || 'Not Configured',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: <FileCheck className="w-3.5 h-3.5" />,
        description: 'Awaiting verification signature'
      };
    }
    
    if (!hasApprovedBy) {
      const setting = signerSettings['approved_by'];
      return {
        stage: 'Approved By',
        signer: setting?.name || 'Not Configured',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: <UserCheck className="w-3.5 h-3.5" />,
        description: 'Awaiting final approval'
      };
    }
    
    // All signatures complete
    return {
      stage: 'Complete',
      signer: '',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      description: hasEmailSent ? 'Document sent to customer' : 'Ready to send'
    };
  };

  const workflow = getWorkflowInfo();
  
  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-20 h-5 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Main workflow indicator */}
      <Badge 
        variant="outline" 
        className={`${workflow.color} text-xs font-medium px-2 py-1 flex items-center gap-1.5 border`}
      >
        {workflow.icon}
        <span>
          {allComplete ? 'Complete' : workflow.stage}
        </span>
      </Badge>
      
      {/* Secondary info: signer name or email status */}
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
      ) : workflow.signer ? (
        <span 
          className="text-xs text-muted-foreground truncate max-w-[120px]" 
          title={workflow.signer}
        >
          {workflow.signer}
        </span>
      ) : workflow.stage !== 'Awaiting Payment' && workflow.description ? (
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {workflow.description}
        </span>
      ) : null}
    </div>
  );
}
