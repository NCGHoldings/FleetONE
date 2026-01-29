import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLightVehicleOrderInvoiceManagement, LightVehicleInvoiceRecord } from '@/hooks/useLightVehicleOrderInvoiceManagement';
import { LightVehicleInvoiceTypeModal } from './LightVehicleInvoiceTypeModal';
import { LightVehicleInvoiceDataModal } from './LightVehicleInvoiceDataModal';
import { LightVehicleOrderInvoiceViewModal } from './LightVehicleOrderInvoiceViewModal';
import { LightVehicleOrderInvoiceData } from '@/lib/lightvehicle-order-invoice-generator';
import { FileText, Plus, ChevronDown, Eye, Download, AlertTriangle, CheckCircle, Loader2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OrderData {
  id: string;
  order_no: string;
  quotation_no?: string;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_make: string;
  vehicle_model: string;
  year_of_manufacture?: string;
  color_scheme?: string;
  engine_number?: string;
  chassis_number?: string;
  engine_capacity?: string;
  transmission?: string;
  fuel_type?: string;
  mileage?: string;
  vehicle_condition?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  total_paid?: number;
}

interface LightVehicleOrderInvoiceGeneratorProps {
  order: OrderData;
  onRefresh?: () => void;
}

export function LightVehicleOrderInvoiceGenerator({ order, onRefresh }: LightVehicleOrderInvoiceGeneratorProps) {
  const { fetchInvoicesForOrder, generateInvoice, getInvoiceDownloadUrl, isGenerating, isLoading } = useLightVehicleOrderInvoiceManagement();
  
  const [invoices, setInvoices] = useState<LightVehicleInvoiceRecord[]>([]);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<LightVehicleInvoiceRecord | null>(null);
  const [pendingInvoiceType, setPendingInvoiceType] = useState<{
    type: 'direct_invoice' | 'proforma_invoice';
    config?: any;
  } | null>(null);

  const loadInvoices = async () => {
    const data = await fetchInvoicesForOrder(order.id);
    setInvoices(data);
  };

  useEffect(() => {
    loadInvoices();
  }, [order.id]);

  // Check if vehicle details are complete
  const vehicleDetailsComplete = !!(
    order.engine_number &&
    order.chassis_number
  );

  const handleGenerateClick = () => {
    setTypeModalOpen(true);
  };

  const handleTypeSelected = (
    type: 'direct_invoice' | 'proforma_invoice',
    proformaConfig?: any
  ) => {
    if (!vehicleDetailsComplete) {
      setPendingInvoiceType({ type, config: proformaConfig });
      setDataModalOpen(true);
    } else {
      generateInvoiceNow(type, proformaConfig);
    }
  };

  const handleVehicleDataComplete = async (data: any) => {
    // Update order with vehicle details (in real app, save to DB)
    // For now, merge with order data and generate invoice
    if (pendingInvoiceType) {
      await generateInvoiceNow(
        pendingInvoiceType.type,
        pendingInvoiceType.config,
        data
      );
      setPendingInvoiceType(null);
    }
  };

  const generateInvoiceNow = async (
    type: 'direct_invoice' | 'proforma_invoice',
    proformaConfig?: any,
    vehicleOverrides?: any
  ) => {
    const invoiceData: LightVehicleOrderInvoiceData = {
      orderId: order.id,
      orderNo: order.order_no,
      quotationNo: order.quotation_no,
      customerName: order.customer_name,
      customerAddress: order.customer_address,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      vehicleMake: order.vehicle_make,
      vehicleModel: order.vehicle_model,
      vehicleYear: vehicleOverrides?.vehicleYear || order.year_of_manufacture,
      vehicleColor: vehicleOverrides?.vehicleColor || order.color_scheme,
      engineNumber: vehicleOverrides?.engineNumber || order.engine_number,
      chassisNumber: vehicleOverrides?.chassisNumber || order.chassis_number,
      engineCapacity: vehicleOverrides?.engineCapacity || order.engine_capacity,
      transmission: vehicleOverrides?.transmission || order.transmission,
      fuelType: vehicleOverrides?.fuelType || order.fuel_type,
      mileage: vehicleOverrides?.mileage || order.mileage,
      vehicleCondition: order.vehicle_condition,
      unitPrice: order.unit_price,
      quantity: order.quantity,
      totalAmount: order.total_price,
      amountPaid: order.total_paid
    };

    const invoiceId = await generateInvoice(invoiceData, type, proformaConfig);
    if (invoiceId) {
      loadInvoices();
      onRefresh?.();
    }
  };

  const handleViewInvoice = (invoice: LightVehicleInvoiceRecord) => {
    setSelectedInvoice(invoice);
    setViewModalOpen(true);
  };

  const handleDownloadInvoice = async (invoice: LightVehicleInvoiceRecord) => {
    const url = await getInvoiceDownloadUrl(invoice.id);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Download URL not available');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Invoice Management
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Generate Invoice
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleGenerateClick}>
                <FileText className="h-4 w-4 mr-2" />
                New Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {!vehicleDetailsComplete && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div className="text-sm">
              <span className="font-medium text-amber-800">Vehicle details incomplete</span>
              <p className="text-amber-700">Engine and chassis numbers are required for invoice generation.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No invoices generated yet</p>
            <p className="text-sm">Click "Generate Invoice" to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {invoice.invoice_category === 'proforma_invoice' ? (
                    <Building2 className="h-5 w-5 text-amber-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.invoice_date && format(new Date(invoice.invoice_date), 'MMM dd, yyyy')} • {formatCurrency(invoice.amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {invoice.invoice_category === 'proforma_invoice' && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                      Proforma
                    </Badge>
                  )}
                  <Badge variant={invoice.status === 'approved' ? 'default' : 'secondary'}>
                    {invoice.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {invoice.status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <LightVehicleInvoiceTypeModal
        open={typeModalOpen}
        onOpenChange={setTypeModalOpen}
        onConfirm={handleTypeSelected}
        totalAmount={order.total_price}
      />

      <LightVehicleInvoiceDataModal
        open={dataModalOpen}
        onOpenChange={setDataModalOpen}
        onConfirm={handleVehicleDataComplete}
        existingData={{
          engineNumber: order.engine_number,
          chassisNumber: order.chassis_number,
          engineCapacity: order.engine_capacity,
          vehicleColor: order.color_scheme,
          vehicleYear: order.year_of_manufacture,
          mileage: order.mileage,
          transmission: order.transmission,
          fuelType: order.fuel_type
        }}
      />

      {selectedInvoice && (
        <LightVehicleOrderInvoiceViewModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          invoiceRecord={selectedInvoice}
          orderData={{
            orderId: order.id,
            orderNo: order.order_no,
            quotationNo: order.quotation_no,
            customerName: order.customer_name,
            customerAddress: order.customer_address,
            customerPhone: order.customer_phone,
            vehicleMake: order.vehicle_make,
            vehicleModel: order.vehicle_model,
            vehicleYear: order.year_of_manufacture,
            vehicleColor: order.color_scheme,
            engineNumber: order.engine_number,
            chassisNumber: order.chassis_number,
            engineCapacity: order.engine_capacity,
            transmission: order.transmission,
            fuelType: order.fuel_type,
            mileage: order.mileage,
            vehicleCondition: order.vehicle_condition,
            unitPrice: order.unit_price,
            quantity: order.quantity,
            totalAmount: order.total_price,
            amountPaid: order.total_paid
          }}
          onRefresh={loadInvoices}
        />
      )}
    </Card>
  );
}
