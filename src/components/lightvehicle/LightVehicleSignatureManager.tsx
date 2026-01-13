import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LightVehicleSignatureModal } from './LightVehicleSignatureModal';
import { useLightVehicleSignatures, LightVehicleSignature } from '@/hooks/useLightVehicleSignatures';
import { PenTool, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface LightVehicleSignatureManagerProps {
  quotationId: string;
  onSignaturesUpdated?: () => void;
}

export const LightVehicleSignatureManager = ({ quotationId, onSignaturesUpdated }: LightVehicleSignatureManagerProps) => {
  const [signatures, setSignatures] = useState<LightVehicleSignature[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'sales_manager' | 'approved_by' | 'customer'>('sales_manager');
  const { fetchSignatures, deleteSignature } = useLightVehicleSignatures();
  const { userProfile } = useAuth();

  useEffect(() => {
    loadSignatures();
  }, [quotationId]);

  const loadSignatures = async () => {
    const data = await fetchSignatures(quotationId);
    setSignatures(data);
  };

  const handleAddSignature = (role: 'sales_manager' | 'approved_by' | 'customer') => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleSignatureSaved = async () => {
    await loadSignatures();
    onSignaturesUpdated?.();
  };

  const handleDeleteSignature = async (signatureId: string) => {
    const success = await deleteSignature(signatureId);
    if (success) {
      await loadSignatures();
      onSignaturesUpdated?.();
    }
  };

  const getSignatureForRole = (role: string) => {
    return signatures.find(sig => sig.signature_role === role);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'sales_manager': return 'Sales Manager';
      case 'approved_by': return 'Approved By';
      case 'customer': return 'Customer';
      default: return role;
    }
  };

  const renderSignatureSlot = (role: 'sales_manager' | 'approved_by' | 'customer') => {
    const signature = getSignatureForRole(role);

    return (
      <Card key={role}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{getRoleLabel(role)}</CardTitle>
            {signature ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Signed
              </Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {signature ? (
            <div className="space-y-3">
              <div className="p-4 border rounded-lg bg-muted/50 min-h-[120px] flex items-center justify-center">
                {signature.signature_type === 'drawing' || signature.signature_type === 'image' ? (
                  <img 
                    src={signature.signature_data} 
                    alt={`${signature.signer_name} signature`}
                    className="max-h-[100px] object-contain"
                  />
                ) : (
                  <div className="text-2xl" style={{ fontFamily: 'cursive' }}>
                    {signature.signature_data}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{signature.signer_name}</p>
                <p className="text-xs text-muted-foreground">
                  Signed on {format(new Date(signature.signed_at), 'PPP')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddSignature(role)}
                  className="flex-1"
                >
                  Update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteSignature(signature.id)}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 border-2 border-dashed rounded-lg min-h-[120px] flex items-center justify-center bg-muted/30">
                <p className="text-sm text-muted-foreground">No signature added</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAddSignature(role)}
                className="w-full"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Add Signature
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quotation Signatures</CardTitle>
          <CardDescription>
            Manage signatures for this quotation. Add signatures in the designated positions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderSignatureSlot('sales_manager')}
            {renderSignatureSlot('approved_by')}
            {renderSignatureSlot('customer')}
          </div>
        </CardContent>
      </Card>

      <LightVehicleSignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        quotationId={quotationId}
        defaultRole={selectedRole}
        defaultSignerName={userProfile?.first_name && userProfile?.last_name 
          ? `${userProfile.first_name} ${userProfile.last_name}` 
          : ''}
        onSignatureSaved={handleSignatureSaved}
      />
    </>
  );
};
