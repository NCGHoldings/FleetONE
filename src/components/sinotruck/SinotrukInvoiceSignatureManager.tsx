// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SinotrukInvoiceSignatureModal } from './SinotrukInvoiceSignatureModal';
import { useSinotrukInvoiceSignatures, SinotrukInvoiceSignature } from '@/hooks/useSinotrukInvoiceSignatures';
import { Plus, Trash2, PenTool, Type, Image as ImageIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface SinotrukInvoiceSignatureManagerProps {
  invoiceRecordId: string;
  onSignaturesUpdated?: () => void;
}

export function SinotrukInvoiceSignatureManager({
  invoiceRecordId,
  onSignaturesUpdated
}: SinotrukInvoiceSignatureManagerProps) {
  const [signatures, setSignatures] = useState<SinotrukInvoiceSignature[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'prepared_by' | 'approved_by' | 'received_by'>('prepared_by');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [signatureToDelete, setSignatureToDelete] = useState<string | null>(null);
  const { fetchSignatures, deleteSignature, loading } = useSinotrukInvoiceSignatures();

  useEffect(() => {
    loadSignatures();
  }, [invoiceRecordId]);

  const loadSignatures = async () => {
    const data = await fetchSignatures(invoiceRecordId);
    setSignatures(data);
  };

  const handleAddSignature = (role: 'prepared_by' | 'approved_by' | 'received_by') => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleSignatureSaved = () => {
    loadSignatures();
    if (onSignaturesUpdated) {
      onSignaturesUpdated();
    }
  };

  const handleDeleteClick = (signatureId: string) => {
    setSignatureToDelete(signatureId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (signatureToDelete) {
      const success = await deleteSignature(signatureToDelete);
      if (success) {
        loadSignatures();
        if (onSignaturesUpdated) {
          onSignaturesUpdated();
        }
      }
    }
    setDeleteDialogOpen(false);
    setSignatureToDelete(null);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'prepared_by':
        return 'Prepared By';
      case 'approved_by':
        return 'Approved By';
      case 'received_by':
        return 'Customer';
      default:
        return role;
    }
  };

  const getSignatureIcon = (type: string) => {
    switch (type) {
      case 'drawing':
        return <PenTool className="h-4 w-4" />;
      case 'text':
        return <Type className="h-4 w-4" />;
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const renderSignaturePreview = (signature: SinotrukInvoiceSignature) => {
    if (signature.signature_type === 'text') {
      return (
        <div className="text-2xl font-serif text-center py-4">
          {signature.signature_data}
        </div>
      );
    } else if (signature.signature_type === 'drawing' || signature.signature_type === 'image') {
      return (
        <div className="flex justify-center py-4">
          <img 
            src={signature.signature_data} 
            alt={`${signature.signer_name}'s signature`}
            className="max-h-24 border rounded"
          />
        </div>
      );
    }
    return null;
  };

  const signatureRoles: Array<'prepared_by' | 'approved_by' | 'received_by'> = [
    'prepared_by',
    'approved_by',
    'received_by'
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Invoice Signatures</h3>
            <p className="text-sm text-muted-foreground">
              Manage signatures for this invoice
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {signatureRoles.map((role) => {
            const signature = signatures.find(s => s.signature_role === role);
            
            return (
              <Card key={role} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{getRoleLabel(role)}</h4>
                    {signature && (
                      <div className="flex items-center gap-2">
                        {getSignatureIcon(signature.signature_type)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(signature.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {signature ? (
                    <div className="space-y-2">
                      {renderSignaturePreview(signature)}
                      <div className="text-center">
                        <p className="font-medium">{signature.signer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(signature.signed_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSignature(role)}
                        className="w-full"
                      >
                        Update
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <p className="text-sm mb-3">No signature added</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSignature(role)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Signature
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <SinotrukInvoiceSignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoiceRecordId={invoiceRecordId}
        defaultRole={selectedRole}
        onSignatureSaved={handleSignatureSaved}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Signature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this signature? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
