// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightVehicleCashReceiptPreview } from './LightVehicleCashReceiptPreview';
import { LightVehicleCashReceiptSignatureModal } from './LightVehicleCashReceiptSignatureModal';
import { useLightVehicleCashReceipts, LightVehicleCashReceipt } from '@/hooks/useLightVehicleCashReceipts';
import { Download, FileText, PenTool, UserCheck, Plus, Edit, CheckCircle, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface LightVehicleCashReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: LightVehicleCashReceipt;
  onRefresh: () => void;
}

export function LightVehicleCashReceiptModal({
  open,
  onOpenChange,
  receipt: initialReceipt,
  onRefresh
}: LightVehicleCashReceiptModalProps) {
  const { updateReceiptSignature, finalizeReceipt } = useLightVehicleCashReceipts();
  const [receipt, setReceipt] = useState<LightVehicleCashReceipt>(initialReceipt);
  const [activeTab, setActiveTab] = useState('preview');
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [selectedSignatureType, setSelectedSignatureType] = useState<'customer' | 'finance'>('customer');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setReceipt(initialReceipt);
  }, [initialReceipt]);

  const handleAddSignature = (type: 'customer' | 'finance') => {
    setSelectedSignatureType(type);
    setSignatureModalOpen(true);
  };

  const handleSaveSignature = async (signerName: string, signatureData: string) => {
    const success = await updateReceiptSignature(receipt.id, selectedSignatureType, signatureData, signerName);
    if (success) {
      // Update local state
      if (selectedSignatureType === 'customer') {
        setReceipt(prev => ({
          ...prev,
          customer_signature_data: signatureData,
          customer_signer_name: signerName,
          customer_signed_at: new Date().toISOString()
        }));
      } else {
        setReceipt(prev => ({
          ...prev,
          finance_signature_data: signatureData,
          finance_signer_name: signerName,
          finance_signed_at: new Date().toISOString()
        }));
      }
      onRefresh();
    }
  };

  const handleFinalize = async () => {
    const success = await finalizeReceipt(receipt.id);
    if (success) {
      setReceipt(prev => ({ ...prev, status: 'finalized' }));
      onRefresh();
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Find the iframe and capture it
      const iframe = document.querySelector('iframe[title="Receipt Preview"]') as HTMLIFrameElement;
      if (!iframe?.contentDocument?.body) {
        toast.error('Could not capture receipt');
        return;
      }

      const canvas = await html2canvas(iframe.contentDocument.body, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${receipt.receipt_no}.pdf`);
      
      toast.success('Receipt downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    } finally {
      setIsDownloading(false);
    }
  };

  const SIGNATURE_SLOTS = [
    {
      key: 'customer',
      label: 'Customer Signature',
      description: 'Customer acknowledgement of payment',
      data: receipt.customer_signature_data,
      name: receipt.customer_signer_name,
      signedAt: receipt.customer_signed_at
    },
    {
      key: 'finance',
      label: 'Finance Department',
      description: 'Finance department confirmation',
      data: receipt.finance_signature_data,
      name: receipt.finance_signer_name,
      signedAt: receipt.finance_signed_at
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{receipt.receipt_no}</DialogTitle>
              <Badge variant={receipt.status === 'finalized' ? 'default' : 'secondary'}>
                {receipt.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="signatures" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Signatures
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <LightVehicleCashReceiptPreview receipt={receipt} />
          </TabsContent>

          <TabsContent value="signatures" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Receipt Signatures</h3>
              </div>

              <div className="grid gap-4">
                {SIGNATURE_SLOTS.map((slot) => (
                  <Card key={slot.key} className={slot.data ? 'border-green-200 bg-green-50/50' : ''}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-medium">{slot.label}</CardTitle>
                          <p className="text-xs text-muted-foreground">{slot.description}</p>
                        </div>
                        <Badge variant={slot.data ? 'default' : 'secondary'} className={slot.data ? 'bg-green-600' : ''}>
                          {slot.data ? 'Signed' : 'Pending'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {slot.data ? (
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="border rounded bg-white p-2">
                              <img src={slot.data} alt="Signature" className="h-12 w-auto" />
                            </div>
                            <div>
                              <p className="font-medium">{slot.name}</p>
                              {slot.signedAt && (
                                <p className="text-xs text-muted-foreground">
                                  {new Date(slot.signedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddSignature(slot.key as 'customer' | 'finance')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSignature(slot.key as 'customer' | 'finance')}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Signature
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Amount: Rs {receipt.amount.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
            {receipt.status === 'draft' && (
              <Button onClick={handleFinalize}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Finalize
              </Button>
            )}
          </div>
        </div>

        <LightVehicleCashReceiptSignatureModal
          open={signatureModalOpen}
          onOpenChange={setSignatureModalOpen}
          onSave={handleSaveSignature}
          signatureType={selectedSignatureType}
          existingName={
            selectedSignatureType === 'customer'
              ? receipt.customer_signer_name
              : receipt.finance_signer_name
          }
        />
      </DialogContent>
    </Dialog>
  );
}
