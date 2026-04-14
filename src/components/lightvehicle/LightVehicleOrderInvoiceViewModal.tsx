// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LightVehicleOrderInvoicePreview } from './LightVehicleOrderInvoicePreview';
import { LightVehicleInvoiceSignatureManager } from './LightVehicleInvoiceSignatureManager';
import { useLightVehicleOrderInvoiceManagement, LightVehicleInvoiceRecord, LightVehicleInvoiceDocument } from '@/hooks/useLightVehicleOrderInvoiceManagement';
import { useLightVehicleInvoiceSignatures } from '@/hooks/useLightVehicleInvoiceSignatures';
import { LightVehicleOrderInvoiceData } from '@/lib/lightvehicle-order-invoice-generator';
import { Download, RefreshCw, CheckCircle, FileText, PenTool, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LightVehicleOrderInvoiceViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceRecord: LightVehicleInvoiceRecord;
  orderData: {
    orderId: string;
    orderNo: string;
    quotationNo?: string;
    customerName: string;
    customerAddress?: string;
    customerPhone?: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear?: string;
    vehicleColor?: string;
    engineNumber?: string;
    chassisNumber?: string;
    engineCapacity?: string;
    transmission?: string;
    fuelType?: string;
    mileage?: string;
    vehicleCondition?: string;
    unitPrice: number;
    quantity: number;
    totalAmount: number;
    amountPaid?: number;
  };
  onRefresh: () => void;
}

export function LightVehicleOrderInvoiceViewModal({
  open,
  onOpenChange,
  invoiceRecord,
  orderData,
  onRefresh
}: LightVehicleOrderInvoiceViewModalProps) {
  const { regenerateInvoice, approveInvoice, getInvoiceDownloadUrl, isGenerating } = useLightVehicleOrderInvoiceManagement();
  const { fetchSignatures } = useLightVehicleInvoiceSignatures();
  const [activeTab, setActiveTab] = useState('preview');
  const [invoiceData, setInvoiceData] = useState<LightVehicleOrderInvoiceData | null>(null);

  const loadInvoiceData = async () => {
    // Fetch signatures
    const signatures = await fetchSignatures(invoiceRecord.id);
    
    const signaturesMap: LightVehicleOrderInvoiceData['signatures'] = {};
    signatures.forEach(sig => {
      const key = sig.signature_role as 'prepared_by' | 'approved_by' | 'received_by';
      signaturesMap[key === 'prepared_by' ? 'preparedBy' : key === 'approved_by' ? 'approvedBy' : 'receivedBy'] = {
        name: sig.signer_name,
        signature: sig.signature_data,
        date: new Date(sig.signed_at).toLocaleDateString()
      };
    });

    setInvoiceData({
      invoiceNo: invoiceRecord.invoice_number,
      orderId: orderData.orderId,
      orderNo: orderData.orderNo,
      quotationNo: orderData.quotationNo,
      invoiceDate: invoiceRecord.generated_at || invoiceRecord.created_at,
      customerName: orderData.customerName,
      customerAddress: orderData.customerAddress,
      customerPhone: orderData.customerPhone,
      vehicleMake: orderData.vehicleMake,
      vehicleModel: orderData.vehicleModel,
      vehicleYear: orderData.vehicleYear,
      vehicleColor: orderData.vehicleColor,
      engineNumber: orderData.engineNumber,
      chassisNumber: orderData.chassisNumber,
      engineCapacity: orderData.engineCapacity,
      transmission: orderData.transmission,
      fuelType: orderData.fuelType,
      mileage: orderData.mileage,
      vehicleCondition: orderData.vehicleCondition,
      unitPrice: orderData.unitPrice,
      quantity: orderData.quantity,
      totalAmount: orderData.totalAmount,
      amountPaid: orderData.amountPaid,
      invoiceCategory: invoiceRecord.invoice_category,
      proformaPercentage: invoiceRecord.proforma_amount_percentage,
      proformaAmount: invoiceRecord.proforma_amount,
      financeCompanyName: invoiceRecord.finance_company_name,
      financeCompanyAddress: invoiceRecord.finance_company_address,
      proformaPurpose: invoiceRecord.proforma_purpose,
      signatures: signaturesMap
    });
  };

  useEffect(() => {
    if (open) {
      loadInvoiceData();
    }
  }, [open, invoiceRecord.id]);

  const handleRegenerate = async () => {
    if (!invoiceData) return;
    const success = await regenerateInvoice(invoiceRecord.id, invoiceData);
    if (success) {
      onRefresh();
    }
  };

  const handleApprove = async () => {
    const success = await approveInvoice(invoiceRecord.id);
    if (success) {
      onRefresh();
      onOpenChange(false);
    }
  };

  const handleDownload = async () => {
    const url = await getInvoiceDownloadUrl(invoiceRecord.id);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Download URL not available');
    }
  };

  const handleSignaturesChange = () => {
    loadInvoiceData();
  };

  const isProforma = invoiceRecord.invoice_category === 'proforma_invoice';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{invoiceRecord.invoice_number}</DialogTitle>
              <Badge variant={invoiceRecord.status === 'approved' ? 'default' : 'secondary'}>
                {invoiceRecord.status}
              </Badge>
              {isProforma && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  Proforma
                </Badge>
              )}
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
            {invoiceData ? (
              <LightVehicleOrderInvoicePreview invoiceData={invoiceData} />
            ) : (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="signatures" className="mt-4">
            <LightVehicleInvoiceSignatureManager
              invoiceRecordId={invoiceRecord.id}
              onSignaturesChange={handleSignaturesChange}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Created: {new Date(invoiceRecord.created_at).toLocaleDateString()}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
            {invoiceRecord.status === 'draft' && (
              <Button onClick={handleApprove}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
