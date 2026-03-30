// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, RefreshCw, CheckCircle, AlertCircle, ChevronDown, User, Building, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useYutongOrderInvoiceManagement } from '@/hooks/useYutongOrderInvoiceManagement';
import { YutongInvoiceDataModal } from './YutongInvoiceDataModal';
import { YutongOrderInvoiceViewModal } from './YutongOrderInvoiceViewModal';
import { YutongInvoiceTypeModal, ProformaInvoiceConfig } from './YutongInvoiceTypeModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [showInvoiceTypeModal, setShowInvoiceTypeModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [quotation, setQuotation] = useState<any>(null);
   const [defaultInvoiceType, setDefaultInvoiceType] = useState<'direct_invoice' | 'proforma_invoice' | 'tax_invoice'>('direct_invoice');
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
    order.engine_capacity != null &&
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
    } else {
      // Fetch order to get customer_id
      const { data: orderData } = await supabase
        .from('yutong_orders')
        .select('customer_id')
        .eq('id', order.id)
        .single();

      if (orderData?.customer_id) {
        const { data: custData } = await supabase
          .from('yutong_customers')
          .select('*')
          .eq('id', orderData.customer_id)
          .single();

        if (custData) {
          setQuotation({
            quotation_no: `N/A`,
            customer_name: custData.name,
            customer_phone: custData.phone,
            customer_email: custData.email,
            company_name: custData.company_name,
            customer_address: custData.address,
            attention_to: custData.name,
          });
        }
      }
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

  const validateInvoiceData = async () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!quotation) {
      errors.push('Customer details not found. Please ensure the order has a linked customer or quotation.');
      return { errors, warnings, canGenerate: false, customerAddress: null };
    }
    
    let customerAddress = quotation.customer_address?.trim() || null;
    
    // If address is missing, try to fetch from customer profile
    if (!customerAddress && quotation.customer_name) {
      console.log('📍 Address missing in quotation, looking up customer profile...');
      
      const { data: customer } = await supabase
        .from('yutong_customers')
        .select('address')
        .or(`name.ilike.%${quotation.customer_name}%,phone.eq.${quotation.customer_phone},email.eq.${quotation.customer_email}`)
        .single();
      
      if (customer?.address) {
        customerAddress = customer.address;
        console.log('✅ Found customer address from profile:', customerAddress);
        toast.info('Using customer address from profile');
      } else {
        console.warn('⚠️ No address found in customer profile either');
      }
    }
    
    // Check required fields - relax for proforma
    if (!customerAddress) {
      if (defaultInvoiceType === 'proforma_invoice') {
        warnings.push('Customer address is missing - will use "TBA".');
        customerAddress = 'TBA';
      } else {
        errors.push('Customer address is required for this invoice type. Please edit the customer profile to add the address.');
      }
    }
    
    if (!quotation.customer_name?.trim()) {
      errors.push('Customer name is required in the quotation.');
    }
    
    // Check optional fields (warnings only)
    if (!quotation.seating_capacity?.trim()) {
      warnings.push('Seating capacity not specified - will use "N/A" in invoice.');
    }
    
    if (!quotation.attention_to?.trim()) {
      warnings.push('Attention-to person not specified - will use customer name.');
    }
    
    return { 
      errors, 
      warnings, 
      canGenerate: errors.length === 0,
      customerAddress 
    };
  };

   const handleGenerateInvoice = (invoiceType: 'direct_invoice' | 'proforma_invoice' | 'tax_invoice') => {
    console.log('🎬 Generate Invoice clicked, type:', invoiceType);
    console.log('📦 Order data:', order);
    console.log('📋 Quotation data:', quotation);
    
    // For non-proforma invoices, require complete vehicle details
    if (invoiceType !== 'proforma_invoice' && !vehicleDetailsComplete) {
      console.warn('⚠️ Vehicle details incomplete');
      toast.error('Please complete all vehicle details first');
      setShowVehicleDataModal(true);
      return;
    }

    if (!quotation) {
      console.error('❌ No customer details linked to this order');
      toast.error('No customer details linked to this order');
      return;
    }

    // Set the default type and show modal
    setDefaultInvoiceType(invoiceType);
    setShowInvoiceTypeModal(true);
  };

  const handleInvoiceTypeConfirm = async (config: ProformaInvoiceConfig) => {
    console.log('📋 Invoice type confirmed:', config);
    setShowInvoiceTypeModal(false);

    console.log('✅ Pre-checks passed, validating invoice data...');
    // Validate invoice data with specific error messages
    const validation = await validateInvoiceData();
    console.log('📊 Validation result:', validation);
    
    if (!validation.canGenerate) {
      console.error('❌ Validation failed:', validation.errors);
      // Show specific error messages
      validation.errors.forEach(error => {
        toast.error(error, { duration: 5000 });
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Validation warnings:', validation.warnings);
      validation.warnings.forEach(warning => {
        toast.warning(warning, { duration: 4000 });
      });
    }

    console.log('✅ Validation passed, preparing invoice data...');
    // Prepare invoice data with safe fallbacks
    const invoiceData: YutongOrderInvoiceData = {
      invoice_no: '', // Will be generated
      quotation_no: quotation.quotation_no || order.order_no,
      invoice_date: new Date().toISOString().split('T')[0],
      
      customer_name: quotation.customer_name || '',
      company_name: quotation.company_name || '',
      address: validation.customerAddress || quotation.customer_address || '',
      contact: quotation.customer_phone || '',
      attn: quotation.attention_to || quotation.customer_name || '',
      
      make: 'YUTONG',
      bus_model: order.bus_model,
      seating_capacity: quotation.seating_capacity || 'N/A',
      year_of_manufacture: order.year_of_manufacture || new Date().getFullYear(),
      country_of_origin: order.country_of_origin || 'China',
      vehicle_condition: order.vehicle_condition || 'New',
      fuel_type: order.fuel_type || 'TBA',
      engine_capacity: order.engine_capacity || 0,
      color_scheme: order.color_scheme || 'TBA',
      engine_number: order.engine_number || 'TBA',
      chassis_number: order.chassis_number || 'TBA',
      
      unit_price: order.total_amount / order.quantity,
      quantity: order.quantity,
      subtotal: order.total_amount,
      total: order.total_amount,
      
      invoice_status: 'draft',
      
      // Proforma invoice fields
      invoice_category: config.invoiceCategory,
      proforma_amount_percentage: config.proformaAmountPercentage,
      proforma_amount: config.proformaAmount,
      finance_company_name: config.financeCompanyName,
      finance_company_address: config.financeCompanyAddress,
       proforma_purpose: config.proformaPurpose,
       customer_commitment: config.customerCommitment,
       leasing_amount: config.leasingCompanyAmount,
       
       // Tax invoice fields
       is_tax_invoice: config.isTaxInvoice,
       customer_vat_number: config.customerVatNumber,
       tax_rate: config.taxRate,
       company_vat_number: '101116190 - 7000',
       base_amount: config.isTaxInvoice ? order.total_amount / (1 + (config.taxRate || 18) / 100) : undefined,
       vat_amount: config.isTaxInvoice ? order.total_amount - (order.total_amount / (1 + (config.taxRate || 18) / 100)) : undefined,
       // Sri Lanka government format fields
       supplier_tin: config.supplierTin || '101116190 - 7000',
       purchaser_tin: config.purchaserTin || config.customerVatNumber,
       place_of_supply: config.placeOfSupply,
       date_of_delivery: config.dateOfDelivery,
       mode_of_payment: config.modeOfPayment,
       additional_information: config.additionalInformation
    };
    
    console.log('📋 Final invoice data prepared:', invoiceData);
    console.log('🔄 Calling generateAndStoreDraftInvoice...');

    const result = await generateAndStoreDraftInvoice(
      invoiceData,
      order.id,
      order.quotation_id || null
    );
    
    console.log('📊 Invoice generation result:', result);

    if (result.success) {
      console.log('✅ Invoice generated successfully!');
       const successMessage = config.invoiceCategory === 'proforma_invoice' 
         ? 'Proforma invoice generated successfully'
         : config.invoiceCategory === 'tax_invoice'
           ? 'Tax invoice generated successfully'
           : 'Invoice generated successfully';
       toast.success(successMessage);
      await loadData();
      if (onRefresh) onRefresh();
    } else {
      console.error('❌ Invoice generation failed:', result.error);
      toast.error(result.error?.message || 'Failed to generate invoice');
    }
  };

  const handleViewInvoice = (document: any) => {
    setSelectedDocument(document);
    setShowInvoiceViewModal(true);
  };

  const handleDownloadInvoice = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('yutong-invoices')
        .download(doc.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
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
              
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={isLoading}>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Invoice
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem 
                      onClick={() => handleGenerateInvoice('proforma_invoice')}
                    >
                      <Building className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Proforma Invoice</div>
                        <div className="text-xs text-muted-foreground">For bank/finance company</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleGenerateInvoice('direct_invoice')}
                      disabled={!vehicleDetailsComplete}
                    >
                      <User className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Customer Invoice</div>
                        <div className="text-xs text-muted-foreground">
                          {vehicleDetailsComplete ? 'Direct invoice to customer' : 'Complete vehicle details first'}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleGenerateInvoice('tax_invoice')}
                      disabled={!vehicleDetailsComplete}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Tax Invoice</div>
                        <div className="text-xs text-muted-foreground">
                          {vehicleDetailsComplete ? 'With VAT breakdown' : 'Complete vehicle details first'}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {!vehicleDetailsComplete && (
                  <Button variant="outline" onClick={() => setShowVehicleDataModal(true)}>
                    Complete Vehicle Details
                  </Button>
                )}
              </div>
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

      <YutongInvoiceTypeModal
        isOpen={showInvoiceTypeModal}
        onClose={() => setShowInvoiceTypeModal(false)}
        totalAmount={order.total_amount}
        onConfirm={handleInvoiceTypeConfirm}
        isLoading={isLoading}
        defaultInvoiceType={defaultInvoiceType}
      />
    </>
  );
}
