import React from 'react';
import { SpecialHireForm } from './SpecialHireForm';

interface Props {
  quotation: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditQuotationModal({ quotation, onClose, onUpdate }: Props) {
  const handleSubmit = () => {
    onUpdate();
    onClose();
  };

  return (
    <SpecialHireForm 
      initialData={quotation}
      isEditing={true}
      onSubmit={handleSubmit}
      onCancel={onClose}
    />
  );
}