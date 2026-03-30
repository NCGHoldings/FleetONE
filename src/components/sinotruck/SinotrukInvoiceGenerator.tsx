import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useSinotrukInvoiceManagement, type SinotrukStoredDocument } from '@/hooks/useSinotrukInvoiceManagement';
import { type SinotrukInvoiceData } from '@/lib/sinotruck-invoice-generator';
import { SinotrukInvoiceViewModal } from './SinotrukInvoiceViewModal';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SinotrukQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  company_name?: string;
  bus_model: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  total_price: number;
  payment_terms?: string;
  delivery_timeline?: string;
  warranty_terms?: string;
  special_features?: string;
  valid_until: string;
  status: string;
}

interface SinotrukInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: SinotrukQuotation | null;
  onSuccess?: () => void;
}

export const SinotrukInvoiceGenerator: React.FC<SinotrukInvoiceGeneratorProps> = ({
  isOpen,
  onClose,
  quotation,
  onSuccess
}) => {
  const { 
    generateAndStoreDraftInvoice, 
    getInvoiceDocuments, 
    isLoading 
  } = useSinotrukInvoiceManagement();
  
  const [existingDocuments, setExistingDocuments] = useState<SinotrukStoredDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<SinotrukStoredDocument | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);


  useEffect(() => {
    if (isOpen && quotation) {
      loadExistingDocuments();
    }
  }, [isOpen, quotation]);

  // Guard after hooks to keep hook order stable
  if (!quotation) {
    return null;
  }

  const loadExistingDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const result = await getInvoiceDocuments(quotation.id);
      if (result.success) {
        setExistingDocuments(result.documents || []);
      }
    } catch (error) {
      console.error('Error loading existing documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!quotation) {
      toast.error('No quotation selected');
      return;
    }
    if (quotation.status !== 'confirmed') {
      toast.error('Only confirmed quotations can generate invoices');
      return;
    }

    const invoiceData: SinotrukInvoiceData = {
      invoiceNo: '', // Will be generated automatically
      quotationNo: quotation.quotation_no,
      customerName: quotation.customer_name,
      customerPhone: quotation.customer_phone,
      customerEmail: quotation.customer_email,
      companyName: quotation.company_name,
      busModel: quotation.bus_model,
      quantity: quotation.quantity,
      unitPrice: quotation.unit_price,
      discountAmount: quotation.discount_amount,
      totalPrice: quotation.total_price,
      paymentTerms: quotation.payment_terms,
      deliveryTimeline: quotation.delivery_timeline,
      warrantyTerms: quotation.warranty_terms,
      specialFeatures: quotation.special_features,
      validUntil: new Date(quotation.valid_until),
    };

    const result = await generateAndStoreDraftInvoice(invoiceData, quotation.id);
    if (result.success) {
      loadExistingDocuments();
      onSuccess?.();
      toast.success('Invoice generated successfully');
    }
  };

  const handleViewDocument = (document: SinotrukStoredDocument) => {
    setSelectedDocument(document);
    setShowViewModal(true);
  };

  const getInvoiceDataFromDocument = (document: SinotrukStoredDocument): SinotrukInvoiceData => {
    return {
      invoiceNo: document.id, // Temporary, will be replaced with actual invoice number
      quotationNo: quotation?.quotation_no || '',
      customerName: quotation?.customer_name || '',
      customerPhone: quotation?.customer_phone || '',
      customerEmail: quotation?.customer_email,
      companyName: quotation?.company_name,
      busModel: quotation?.bus_model || '',
      quantity: quotation?.quantity ?? 0,
      unitPrice: quotation?.unit_price ?? 0,
      discountAmount: quotation?.discount_amount,
      totalPrice: quotation?.total_price ?? 0,
      paymentTerms: quotation?.payment_terms,
      deliveryTimeline: quotation?.delivery_timeline,
      warrantyTerms: quotation?.warranty_terms,
      specialFeatures: quotation?.special_features,
      validUntil: new Date(quotation ? quotation.valid_until : Date.now()),
      invoice_status: document.document_status as 'draft' | 'approved',
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Invoice Management - {quotation?.quotation_no || ''}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 overflow-auto">
            {/* Quotation Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quotation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Customer:</strong> {quotation?.customer_name || ''}</div>
                  <div><strong>Bus Model:</strong> {quotation?.bus_model || ''}</div>
                  <div><strong>Quantity:</strong> {quotation?.quantity ?? 0}</div>
                  <div><strong>Total Amount:</strong> LKR {(quotation?.total_price != null ? quotation.total_price : 0).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generate Invoice
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotation?.status !== 'confirmed' ? (
                  <div className="flex items-center gap-2 text-amber-600 mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Quotation must be confirmed before generating an invoice
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Quotation is confirmed and ready for invoice generation
                    </span>
                  </div>
                )}
                
                <Button 
                  onClick={handleGenerateInvoice}
                  disabled={isLoading || quotation?.status !== 'confirmed'}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Invoice...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Draft Invoice
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Existing Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading invoices...
                  </div>
                ) : existingDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No invoices generated yet</p>
                    <p className="text-sm">Generate your first invoice above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {existingDocuments.map((document) => (
                      <div 
                        key={document.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{document.file_name}</span>
                            {getStatusBadge(document.document_status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Generated: {format(new Date(document.generated_at), 'MMM dd, yyyy HH:mm')}
                            {document.approved_at && (
                              <span className="ml-2">
                                • Approved: {format(new Date(document.approved_at), 'MMM dd, yyyy HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleViewDocument(document)}
                          variant="outline"
                          size="sm"
                        >
                          View & Manage
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice View Modal */}
      {selectedDocument && showViewModal && (
        <SinotrukInvoiceViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedDocument(null);
          }}
          invoiceDocument={selectedDocument}
          invoiceData={getInvoiceDataFromDocument(selectedDocument)}
          onRefresh={loadExistingDocuments}
        />
      )}
    </>
  );
};
