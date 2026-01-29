import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLightVehicleInvoiceSignatures, LightVehicleInvoiceSignature } from '@/hooks/useLightVehicleInvoiceSignatures';
import { LightVehicleInvoiceSignatureModal } from './LightVehicleInvoiceSignatureModal';
import { UserCheck, Edit, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface LightVehicleInvoiceSignatureManagerProps {
  invoiceRecordId: string;
  onSignaturesChange?: () => void;
}

const SIGNATURE_ROLES = [
  { key: 'prepared_by', label: 'Prepared By', description: 'Sales/Admin who prepared the invoice' },
  { key: 'approved_by', label: 'Approved By', description: 'Manager/Supervisor approval' },
  { key: 'received_by', label: 'Received By', description: 'Customer acknowledgement' }
] as const;

export function LightVehicleInvoiceSignatureManager({
  invoiceRecordId,
  onSignaturesChange
}: LightVehicleInvoiceSignatureManagerProps) {
  const { fetchSignatures, saveSignature, deleteSignature, isLoading, isSaving } = useLightVehicleInvoiceSignatures();
  const [signatures, setSignatures] = useState<LightVehicleInvoiceSignature[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'prepared_by' | 'approved_by' | 'received_by'>('prepared_by');
  const [editingSignature, setEditingSignature] = useState<LightVehicleInvoiceSignature | null>(null);

  const loadSignatures = async () => {
    const data = await fetchSignatures(invoiceRecordId);
    setSignatures(data);
  };

  useEffect(() => {
    loadSignatures();
  }, [invoiceRecordId]);

  const getSignatureForRole = (role: string) => {
    return signatures.find(s => s.signature_role === role);
  };

  const handleAddSignature = (role: 'prepared_by' | 'approved_by' | 'received_by') => {
    const existing = getSignatureForRole(role);
    setEditingSignature(existing || null);
    setSelectedRole(role);
    setModalOpen(true);
  };

  const handleSaveSignature = async (signerName: string, signatureData: string) => {
    const success = await saveSignature(invoiceRecordId, selectedRole, signerName, signatureData);
    if (success) {
      loadSignatures();
      onSignaturesChange?.();
    }
  };

  const handleDeleteSignature = async (signatureId: string) => {
    const success = await deleteSignature(signatureId);
    if (success) {
      loadSignatures();
      onSignaturesChange?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          Invoice Signatures
        </h3>
      </div>

      <div className="grid gap-4">
        {SIGNATURE_ROLES.map((role) => {
          const signature = getSignatureForRole(role.key);
          
          return (
            <Card key={role.key} className={signature ? 'border-green-200 bg-green-50/50' : ''}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">{role.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                  {signature ? (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      Signed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      Pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {signature ? (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="border rounded bg-white p-2">
                        <img 
                          src={signature.signature_data} 
                          alt="Signature" 
                          className="h-12 w-auto"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{signature.signer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(signature.signed_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddSignature(role.key)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSignature(signature.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSignature(role.key)}
                    disabled={isSaving}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Signature
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LightVehicleInvoiceSignatureModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSaveSignature}
        role={selectedRole}
        existingName={editingSignature?.signer_name}
      />
    </div>
  );
}
