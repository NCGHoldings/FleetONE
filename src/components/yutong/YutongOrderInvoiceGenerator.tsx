import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useYutongOrderInvoiceManagement } from '@/hooks/useYutongOrderInvoiceManagement';
import { YutongInvoiceDataModal } from './YutongInvoiceDataModal';
import { YutongOrderInvoiceViewModal } from './YutongOrderInvoiceViewModal';
import { YutongOrderInvoiceData } from '@/lib/yutong-order-invoice-generator';

interface YutongOrder {
  id: string;
  order_no: string;
  quotation_id?: string;
  bus_model: string;
  quantity: number;
  total_amount: number;
  engine_number?: string;
  chassis_number?: string;
  year_of_manufacture?: number;
  fuel_type?: string;
  engine_capacity?: number;
  color_scheme?: string;
  country_of_origin?: string;
  vehicle_condition?: string;
}

interface YutongOrderInvoiceGeneratorProps {
  order: YutongOrder;
  onRefresh?: () => void;
}

export function YutongOrderInvoiceGenerator({ order, onRefresh }: YutongOrderInvoiceGeneratorProps) {
  const [showVehicleDataModal, setShowVehicleDataModal] = useState(false);
  const [showInvoiceViewModal, setShowInvoiceViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [quotation, setQuotation] = useState<any>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const {
    isLoading,
    generateAndStoreDraftInvoice,
    getInvoicesByOrder,
    getInvoiceDocuments
  } = useYutongOrderInvoiceManagement();

  const vehicleDetailsComplete = !!(
    order.engine_number &&
    order.chassis_number &&
    order.year_of_manufacture &&
    order.fuel_type &&
    order.engine_capacity &&
    order.color_scheme
  );

  useEffect(() => {
    loadData();
  }, [order.id]);

  const loadData = async () => {
    setLoadingInvoices(true);
    
    // Load quotation if linked
    if (order.quotation_id) {
      const { data: quotData } = await supabase
        .from('yutong_quotations')
        .select('*')
        .eq('id', order.quotation_id)
        .single();
      
      if (quotData) setQuotation(quotData);
    }
    
    // Load invoices and documents
    const [invoicesResult, documentsResult] = await Promise.all([
      getInvoicesByOrder(order.id),
      getInvoiceDocuments(order.id)
    ]);
    
    if (invoicesResult.success) setInvoices(invoicesResult.invoices || []);
    if (documentsResult.success) setDocuments(documentsResult.documents || []);
    
    setLoadingInvoices(false);
  };

  const handleGenerateInvoice = async () => {
    if (!vehicleDetailsComplete) {
      toast.error('Please complete all vehicle details first');
      setShowVehicleDataModal(true);
      return;
    }

    if (!order.quotation_id) {
      toast.error('No quotation linked to this order');
      return;
    }

    if (!quotation) {
      toast.error('Failed to load quotation data');
      return;
    }

    // Prepare invoice data
    const invoiceData: YutongOrderInvoiceData = {
      invoice_no: '', // Will be generated
      quotation_no: quotation.quotation_no || order.order_no,
      invoice_date: new Date().toISOString().split('T')[0],
      
      customer_name: quotation.customer_name || '',
      company_name: quotation.company_name,
      address: quotation.customer_address || '',
      contact: quotation.customer_phone,
      attn: quotation.attention_to,
      
      make: 'YUTONG',
      bus_model: order.bus_model,
      seating_capacity: quotation.seating_capacity || 'N/A',
      year_of_manufacture: order.year_of_manufacture!,
      country_of_origin: order.country_of_origin || 'China',
      vehicle_condition: order.vehicle_condition || 'New',
      fuel_type: order.fuel_type!,
      engine_capacity: order.engine_capacity!,
      color_scheme: order.color_scheme!,
      engine_number: order.engine_number!,
      chassis_number: order.chassis_number!,
      
      unit_price: order.total_amount / order.quantity,
      quantity: order.quantity,
      subtotal: order.total_amount,
      total: order.total_amount,
      
      invoice_status: 'draft'
    };

    const result = await generateAndStoreDraftInvoice(
      invoiceData,
      order.id,
      order.quotation_id
    );

    if (result.success) {
      await loadData();
      if (onRefresh) onRefresh();
    }
  };

  const handleViewInvoice = (document: any) => {
    setSelectedDocument(document);
    setShowInvoiceViewModal(true);
  };

  const handleDownloadInvoice = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge className="bg-success">{status}</Badge>;
    }
    return <Badge variant="destructive">{status}</Badge>;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bus Model</p>
                <p className="font-medium">{order.bus_model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="font-medium">{order.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium">LKR {order.total_amount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details Status */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {vehicleDetailsComplete ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-success">All vehicle details complete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span className="text-destructive">Vehicle details incomplete</span>
                  </>
                )}
              </div>
              
              {vehicleDetailsComplete ? (
                <Button onClick={handleGenerateInvoice} disabled={isLoading}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              ) : (
                <Button onClick={() => setShowVehicleDataModal(true)}>
                  Complete Vehicle Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Existing Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <p className="text-muted-foreground text-center py-4">Loading invoices...</p>
            ) : documents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No invoices generated yet</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const invoice = invoices.find(inv => inv.id === doc.invoice_record_id);
                  
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{invoice?.invoice_no}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString()} • 
                              LKR {invoice?.invoice_amount?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getStatusBadge(doc.document_status)}
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewInvoice(doc)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoice(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <YutongInvoiceDataModal
        isOpen={showVehicleDataModal}
        onClose={() => setShowVehicleDataModal(false)}
        orderId={order.id}
        existingData={{
          engine_number: order.engine_number,
          chassis_number: order.chassis_number,
          year_of_manufacture: order.year_of_manufacture,
          country_of_origin: order.country_of_origin,
          vehicle_condition: order.vehicle_condition,
          fuel_type: order.fuel_type,
          engine_capacity: order.engine_capacity,
          color_scheme: order.color_scheme
        }}
        onSuccess={() => {
          setShowVehicleDataModal(false);
          if (onRefresh) onRefresh();
          loadData();
        }}
      />

      {selectedDocument && (
        <YutongOrderInvoiceViewModal
          isOpen={showInvoiceViewModal}
          onClose={() => {
            setShowInvoiceViewModal(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
          onRefresh={() => {
            loadData();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </>
  );
}
