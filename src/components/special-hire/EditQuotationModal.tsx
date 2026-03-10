import React, { useState } from 'react';
import { SpecialHireForm } from './SpecialHireForm';
import { EditTypeSelectionModal } from './EditTypeSelectionModal';
import { QuickEditModal } from './QuickEditModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  quotation: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditQuotationModal({ quotation, onClose, onUpdate }: Props) {
  const [showEditTypeModal, setShowEditTypeModal] = useState(true);
  const [editConfig, setEditConfig] = useState<{
    editType: 'staff_edit' | 'customer_request' | 'quick_edit';
    reason?: string;
  } | null>(null);
  const { toast } = useToast();

  const handleEditTypeConfirm = (editType: 'staff_edit' | 'customer_request' | 'quick_edit', reason?: string) => {
    setEditConfig({ editType, reason });
    setShowEditTypeModal(false);
  };

  const handleEditTypeCancel = () => {
    setShowEditTypeModal(false);
    onClose();
  };

  const handleFormSubmit = async (quotationData: any) => {
    if (!editConfig) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate next version number
      const { data: versionData, error: versionError } = await supabase
        .rpc('generate_next_version_number', { p_parent_id: quotation.id });

      if (versionError) throw versionError;

      const nextVersion = versionData || '1.1';

      // Get base quotation number (remove existing version suffix if present)
      const baseQuotationNo = quotation.quotation_no.replace(/-v\d+\.\d+$/, '');
      
      // Create versioned quotation number
      const versionedQuotationNo = `${baseQuotationNo}-v${nextVersion}`;

      // Create new version with the form data
      const newVersionData = {
        ...quotationData,
        parent_quotation_id: quotation.parent_quotation_id || quotation.id,
        version_number: nextVersion,
        edit_type: editConfig.editType,
        edit_reason: editConfig.reason,
        is_active_version: true,
        created_by: user.id,
        quotation_no: versionedQuotationNo
      };

      // Mark current version as inactive
      const { error: updateError } = await supabase
        .from('special_hire_quotations')
        .update({ is_active_version: false })
        .eq('parent_quotation_id', quotation.parent_quotation_id || quotation.id)
        .or(`id.eq.${quotation.id}`);

      if (updateError) throw updateError;

      // Create new version
      const { error: insertError } = await supabase
        .from('special_hire_quotations')
        .insert(newVersionData);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: `Quotation updated with version ${nextVersion}`
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error creating quotation version:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update quotation',
        variant: "destructive"
      });
    }
  };

  if (showEditTypeModal) {
    return (
      <EditTypeSelectionModal
        isOpen={showEditTypeModal}
        onClose={handleEditTypeCancel}
        onConfirm={handleEditTypeConfirm}
        quotationNo={quotation.quotation_no}
      />
    );
  }

  if (!editConfig) {
    return null;
  }

  return (
    <SpecialHireForm 
      initialData={quotation}
      isEditing={true}
      onSubmit={handleFormSubmit}
      onCancel={onClose}
      editConfig={editConfig}
    />
  );
}