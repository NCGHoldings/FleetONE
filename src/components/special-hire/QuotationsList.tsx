import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { FileText, Eye, Edit, Mail, Download, Search, Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QuotationModal } from './QuotationModal';
import { EditQuotationModal } from './EditQuotationModal';
import { QuotationPreview } from './QuotationPreview';
import { TripDetailsModal } from './TripDetailsModal';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';
import { TripStatusManagementModal } from './TripStatusManagementModal';
import { InvoiceViewer } from './InvoiceViewer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRealtimeQuotations, QuotationWithPayments } from '@/hooks/useRealtimeQuotations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Helper function to calculate total revenue (matches Final Total from QuotationPreview)
const calculateTotalRevenue = (quotation: QuotationWithPayments): number => {
  const hireCharges = quotation.hire_charge || 0;
  const fuelCharges = quotation.fuel_cost_fuel_only || 0;
  const driverCharges = quotation.driver_charge || 0;
  const extraCharges = quotation.extra_charges || 0;
  const discount = quotation.discount_amount_lkr || 0;
  
  return hireCharges + fuelCharges + driverCharges + extraCharges - discount;
};

interface Props {
  onRefresh: () => void;
}

export function QuotationsList({ onRefresh }: Props) {
  const { quotations, loading, refreshQuotations } = useRealtimeQuotations();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithPayments | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<QuotationWithPayments | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);
  const [editingQuotation, setEditingQuotation] = useState<QuotationWithPayments | null>(null);
  const [emailingQuotationId, setEmailingQuotationId] = useState<string | null>(null);
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      sent: "secondary",
      accepted: "default",
      rejected: "destructive",
      confirmed: "default",
      declined: "destructive"
    };

    const colors: Record<string, string> = {
      draft: "text-gray-600",
      sent: "text-blue-600",
      accepted: "text-green-600",
      rejected: "text-red-600",
      confirmed: "text-green-600",
      declined: "text-red-600"
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('special_hire_quotations')
        .update({ 
          status: newStatus,
          status_changed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      refreshQuotations();
      onRefresh();
      toast({
        title: "Success",
        description: `Quotation ${newStatus} successfully`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleViewQuotation = (quotation: QuotationWithPayments) => {
    setSelectedQuotation(quotation);
    setShowModal(true);
  };

  const handleViewTrip = (quotation: QuotationWithPayments) => {
    setSelectedTrip(quotation);
    setDetailsModalOpen(true);
  };

  const handlePaymentConfirm = async (paymentData: any) => {
    // Payment is now handled directly in PaymentConfirmationModal
    // This callback is kept for any additional processing if needed
    refreshQuotations();
    onRefresh();
  };

  const handleStatusChange = async (statusData: any) => {
    if (!selectedTrip) return;

    try {
      const updateData: any = {
        trip_status: statusData.status,
        status_changed_at: new Date().toISOString(),
      };

      if (statusData.reason) {
        updateData.cancellation_reason = statusData.reason;
      }

      if (statusData.refundAmount !== undefined) {
        updateData.refund_amount = statusData.refundAmount;
        updateData.refund_status = statusData.refundStatus || 'pending';
      }

      const { error } = await supabase
        .from('special_hire_quotations')
        .update(updateData)
        .eq('id', selectedTrip.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update trip status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Trip status updated successfully",
      });

      setStatusModalOpen(false);
      refreshQuotations();
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update trip status",
        variant: "destructive",
      });
    }
  };

  const handleViewInvoice = (quotation: QuotationWithPayments, invoiceType: 'advance' | 'final') => {
    const invoice = quotation.invoices.find(inv => inv.invoice_type === invoiceType);
    
    setSelectedInvoiceData({
      quotation,
      invoiceType,
      invoiceNo: invoice?.invoice_no || `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      generatedDate: invoice?.generated_at || new Date().toISOString(),
    });
    setInvoiceViewerOpen(true);
  };

  const handleDownloadInvoice = (quotation: QuotationWithPayments, invoiceType: 'advance' | 'final') => {
    const invoice = quotation.invoices.find(inv => inv.invoice_type === invoiceType);
    
    const invoiceData = {
      quotation,
      invoiceType,
      invoiceNo: invoice?.invoice_no || `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      generatedDate: invoice?.generated_at || new Date().toISOString(),
    };
    
    console.log('Download invoice:', invoiceData);
  };

  const handleDeleteQuotation = async (quotation: QuotationWithPayments) => {
    try {
      const { error } = await supabase
        .from('special_hire_quotations')
        .delete()
        .eq('id', quotation.id);

      if (error) throw error;

      refreshQuotations();
      onRefresh();
      toast({
        title: "Success",
        description: "Quotation deleted successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const columns: ColumnDef<QuotationWithPayments>[] = [
    {
      accessorKey: "quotation_no",
      header: "Quotation No",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("quotation_no")}</div>
      ),
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("customer_name")}</div>
          <div className="text-sm text-muted-foreground">{row.original.customer_phone}</div>
        </div>
      ),
    },
    {
      accessorKey: "hire_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("hire_type")}</Badge>
      ),
    },
    {
      accessorKey: "pickup_location",
      header: "Route",
      cell: ({ row }) => {
        const routeDescription = `${row.original.pickup_location} → ${row.original.drop_location}`;
        return (
          <div className="max-w-xs">
            <div className="text-sm font-medium">{routeDescription}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "pickup_datetime",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.getValue("pickup_datetime")), "MMM dd, yyyy")}
        </div>
      ),
    },
    {
      accessorKey: "final_total",
      header: "Amount (LKR)",
      cell: ({ row }) => {
        const quotation = row.original;
        const finalTotal = calculateTotalRevenue(quotation);
        return (
          <div className="space-y-1">
            <div className="font-medium">₹ {finalTotal.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              Paid: ₹ {quotation.total_paid.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Balance: ₹ {quotation.balance_due.toLocaleString()}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const quotation = row.original;
        return (
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleViewQuotation(quotation)}
              title="View Quotation"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleViewTrip(quotation)}
              title="View Trip Details"
            >
              <FileText className="h-4 w-4" />
            </Button>
            {quotation.status === 'confirmed' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedTrip(quotation);
                  setPaymentModalOpen(true);
                }}
                title="Add Payment"
              >
                💰
              </Button>
            )}
            {quotation.status === 'draft' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    title="Delete Quotation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete quotation {quotation.quotation_no}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteQuotation(quotation)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        );
      },
    },
  ];

  const filteredQuotations = quotations.filter(quotation =>
    quotation.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.quotation_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.pickup_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quotations</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredQuotations}
            searchKey="customer_name"
          />
        </CardContent>
      </Card>

      <QuotationModal 
        quotation={selectedQuotation ? {...selectedQuotation, bus_type: 'Standard'} : null}
        open={showModal}
        onOpenChange={setShowModal}
      />

      {selectedTrip && (
        <>
          <TripDetailsModal
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
            trip={{
              ...selectedTrip,
              quotation_id: selectedTrip.id,
              total_amount: calculateTotalRevenue(selectedTrip),
              advance_paid: selectedTrip.total_paid || 0,
              balance_due: selectedTrip.balance_due || 0,
              quotation: {
                quotation_no: selectedTrip.quotation_no,
                customer_name: selectedTrip.customer_name,
                customer_phone: selectedTrip.customer_phone,
                customer_email: selectedTrip.customer_email,
                company_name: selectedTrip.company_name,
                pickup_location: selectedTrip.pickup_location,
                drop_location: selectedTrip.drop_location,
                pickup_datetime: selectedTrip.pickup_datetime,
                drop_datetime: selectedTrip.drop_datetime || selectedTrip.pickup_datetime,
                number_of_buses: selectedTrip.number_of_buses,
                number_of_passengers: selectedTrip.number_of_passengers,
                gross_revenue: selectedTrip.gross_revenue
              },
              payments: selectedTrip.payments || [],
              invoices: selectedTrip.invoices || []
            }}
            onViewInvoice={(type) => handleViewInvoice(selectedTrip, type)}
            onDownloadInvoice={(type) => handleDownloadInvoice(selectedTrip, type)}
            onViewPaymentProof={(proofUrl) => console.log('View proof:', proofUrl)}
          />

          <PaymentConfirmationModal
            isOpen={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            onConfirm={handlePaymentConfirm}
            quotationData={selectedTrip}
            loading={loading}
          />

          <TripStatusManagementModal
            open={statusModalOpen}
            onOpenChange={setStatusModalOpen}
            trip={selectedTrip ? {
              id: selectedTrip.id,
              quotation: {
                quotation_no: selectedTrip.quotation_no,
                customer_name: selectedTrip.customer_name,
              },
              total_amount: calculateTotalRevenue(selectedTrip),
              advance_paid: selectedTrip.total_paid || 0,
              status: selectedTrip.status || selectedTrip.trip_status || 'pending'
            } : null}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      {selectedInvoiceData && (
        <InvoiceViewer
          isOpen={invoiceViewerOpen}
          onClose={() => setInvoiceViewerOpen(false)}
          invoiceData={selectedInvoiceData}
        />
      )}
    </>
  );
}