import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Upload, Receipt, Users, UserPlus, Bus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PaymentConfirmationModal, type PaymentConfirmationData } from './PaymentConfirmationModal';
import { InvoiceViewer } from './InvoiceViewer';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { format } from 'date-fns';

interface ConfirmedTrip {
  id: string;
  quotation_id: string;
  status: string;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  driver_name?: string;
  conductor_name?: string;
  bus_no?: string;
  created_at: string;
  quotation: {
    quotation_no: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    company_name?: string;
    pickup_location: string;
    drop_location: string;
    pickup_datetime: string;
    drop_datetime: string;
    number_of_buses: number;
    number_of_passengers: number;
    bus_type_id: string;
    gross_revenue: number;
  };
  payments: Array<{
    id: string;
    amount: number;
    payment_type: string;
    payment_status: string;
    method?: string;
    reference?: string;
    paid_at: string;
    payment_proof_url?: string;
    payment_proof_filename?: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_no: string;
    invoice_type: string;
    amount: number;
    pdf_path: string;
    issued_at: string;
  }>;
}

export function ConfirmedTripsTable() {
  const [trips, setTrips] = useState<ConfirmedTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<ConfirmedTrip | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    fetchConfirmedTrips();
    fetchCompanyLogo();
  }, []);

  const fetchCompanyLogo = async () => {
    // For now, we'll use a default empty logo
    setCompanyLogo('');
  };

  const fetchConfirmedTrips = async () => {
    // Fall back to existing quotations approach but enhance it
    const { data: quotations } = await supabase
      .from('special_hire_quotations')
      .select('*')
      .in('status', ['confirmed', 'paid', 'completed'])
      .order('created_at', { ascending: false });

    if (quotations) {
      const mappedTrips = quotations.map(q => {
        // Check localStorage for payment tracking
        const advanceInvoice = localStorage.getItem(`invoice_${q.id}_advance`);
        const finalInvoice = localStorage.getItem(`invoice_${q.id}_final`);
        
        let advancePaid = 0;
        let invoices: any[] = [];
        
        if (advanceInvoice) {
          const advance = JSON.parse(advanceInvoice);
          advancePaid = advance.amount;
          invoices.push({
            id: `adv_${q.id}`,
            invoice_no: advance.invoiceNo,
            invoice_type: 'advance',
            amount: advance.amount,
            pdf_path: '',
            issued_at: advance.generated_at
          });
        }
        
        if (finalInvoice) {
          const final = JSON.parse(finalInvoice);
          invoices.push({
            id: `final_${q.id}`,
            invoice_no: final.invoiceNo,
            invoice_type: 'final',
            amount: final.amount,
            pdf_path: '',
            issued_at: final.generated_at
          });
        }

        return {
          id: q.id,
          quotation_id: q.id,
          status: q.status,
          total_amount: q.gross_revenue,
          advance_paid: advancePaid,
          balance_due: q.gross_revenue - advancePaid,
          driver_name: undefined,
          conductor_name: undefined,
          bus_no: undefined,
          created_at: q.created_at,
          quotation: q,
          payments: [], // Will be populated if we have payment data
          invoices
        };
      });
      setTrips(mappedTrips);
    }
  };

  const handlePaymentConfirmation = async (paymentData: PaymentConfirmationData) => {
    if (!selectedTrip) return;

    console.log('Payment confirmation started:', {
      paymentData,
      selectedTrip: selectedTrip.quotation,
      advancePaid: selectedTrip.advance_paid,
      balanceDue: selectedTrip.balance_due
    });

    setLoading(true);
    try {
      // Determine invoice type based on payment type or if it's a full payment
      const isFullPayment = paymentData.amount >= selectedTrip.quotation.gross_revenue;
      const isFinalPayment = paymentData.paymentType === 'final' || paymentData.paymentType === 'full';
      const invoiceType: 'advance' | 'final' = isFinalPayment || isFullPayment ? 'final' : 'advance';

      console.log('Invoice type determination:', {
        isFullPayment,
        isFinalPayment,
        paymentType: paymentData.paymentType,
        amount: paymentData.amount,
        grossRevenue: selectedTrip.quotation.gross_revenue,
        invoiceType
      });

      // Generate invoice number
      const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Generate invoice data
      const invoiceData: InvoiceData = {
        invoiceNo,
        invoiceType,
        quotationNo: selectedTrip.quotation.quotation_no,
        customerName: selectedTrip.quotation.customer_name,
        customerPhone: selectedTrip.quotation.customer_phone,
        customerEmail: selectedTrip.quotation.customer_email,
        companyName: selectedTrip.quotation.company_name,
        pickupLocation: selectedTrip.quotation.pickup_location,
        dropLocation: selectedTrip.quotation.drop_location,
        pickupDate: new Date(selectedTrip.quotation.pickup_datetime),
        dropDate: new Date(selectedTrip.quotation.drop_datetime),
        busType: 'Standard Bus',
        numberOfBuses: selectedTrip.quotation.number_of_buses,
        numberOfPassengers: selectedTrip.quotation.number_of_passengers,
        totalAmount: selectedTrip.quotation.gross_revenue,
        advanceAmount: selectedTrip.advance_paid,
        paidAmount: paymentData.amount,
        companyLogo,
        // New fields for NCG template
        vehicleNo: paymentData.busNo,
        driverName: paymentData.driverName,
        conductorName: paymentData.conductorName,
        itemDetail: `${format(new Date(selectedTrip.quotation.pickup_datetime), 'dd/MM/yyyy')} ${selectedTrip.quotation.pickup_location} → ${selectedTrip.quotation.drop_location}; ${selectedTrip.quotation.number_of_passengers} Pax, ${selectedTrip.quotation.number_of_buses} bus(es), Standard Bus`,
      };
      console.log('Generated invoice data:', invoiceData);
      
      // Generate PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);
      
      // Auto-download the generated PDF immediately
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Store invoice info in localStorage temporarily (until DB schema is fixed)
      const storageKey = `invoice_${selectedTrip.id}_${invoiceType}`;
      localStorage.setItem(storageKey, JSON.stringify({
        invoiceNo,
        invoiceType,
        amount: paymentData.amount,
        generated_at: new Date().toISOString()
      }));

      // Update quotation status - auto-mark as completed when final payment is received
      let newStatus = 'paid';
      if (invoiceType === 'final') {
        newStatus = 'completed';
      }

      console.log('Invoice storage and status update:', {
        storageKey,
        invoiceType,
        newStatus,
        quotationId: selectedTrip.quotation_id
      });

      await supabase
        .from('special_hire_quotations')
        .update({ status: newStatus })
        .eq('id', selectedTrip.quotation_id);

      toast({
        title: 'Success!',
        description: `${invoiceType === 'final' ? 'Final payment' : 'Advance payment'} confirmed and invoice PDF downloaded successfully`
      });

      setPaymentModalOpen(false);
      fetchConfirmedTrips();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm payment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = async (trip: ConfirmedTrip, invoiceType: 'advance' | 'final') => {
    const invoice = trip.invoices.find(inv => inv.invoice_type === invoiceType);
    if (!invoice) return;

    // Get bus type name (would need to fetch from bus_types table)
    const busTypeName = 'Standard Bus';

    const invoiceData: InvoiceData = {
      invoiceNo: invoice.invoice_no,
      invoiceType: invoice.invoice_type as 'advance' | 'final',
      quotationNo: trip.quotation.quotation_no,
      customerName: trip.quotation.customer_name,
      customerPhone: trip.quotation.customer_phone,
      customerEmail: trip.quotation.customer_email,
      companyName: trip.quotation.company_name,
      pickupLocation: trip.quotation.pickup_location,
      dropLocation: trip.quotation.drop_location,
      pickupDate: new Date(trip.quotation.pickup_datetime),
      dropDate: new Date(trip.quotation.drop_datetime),
      busType: busTypeName,
      numberOfBuses: trip.quotation.number_of_buses,
      numberOfPassengers: trip.quotation.number_of_passengers,
      totalAmount: trip.quotation.gross_revenue,
      advanceAmount: trip.advance_paid,
      paidAmount: invoice.amount,
      companyLogo,
      // New fields for NCG template
      vehicleNo: trip.bus_no,
      driverName: trip.driver_name,
      conductorName: trip.conductor_name,
      itemDetail: `${format(new Date(trip.quotation.pickup_datetime), 'dd/MM/yyyy')} ${trip.quotation.pickup_location} → ${trip.quotation.drop_location}; ${trip.quotation.number_of_passengers} Pax, ${trip.quotation.number_of_buses} bus(es), ${busTypeName}`,
    };
    setCurrentInvoiceData(invoiceData);
    setInvoiceViewerOpen(true);
  };

  const downloadInvoice = async (trip: ConfirmedTrip, invoiceType: 'advance' | 'final') => {
    const invoice = trip.invoices.find(inv => inv.invoice_type === invoiceType);
    if (!invoice) return;

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(invoice.pdf_path, 60 * 10);

      if (error || !data?.signedUrl) {
        throw new Error('Failed to generate download link');
      }

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to download invoice',
        variant: 'destructive'
      });
    }
  };

  const getPaymentStatusBadge = (trip: ConfirmedTrip) => {
    if (trip.status === 'completed' || trip.balance_due <= 0) {
      return <Badge variant="default" className="bg-green-500">Fully Paid</Badge>;
    } else if (trip.advance_paid > 0) {
      return <Badge variant="secondary">Advance Paid</Badge>;
    } else {
      return <Badge variant="outline">Payment Pending</Badge>;
    }
  };

  const openPaymentProof = async (trip: ConfirmedTrip, paymentId: string) => {
    const payment = trip.payments.find(p => p.id === paymentId);
    if (!payment?.payment_proof_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(payment.payment_proof_url, 60 * 10);

      if (error || !data?.signedUrl) {
        throw new Error('Failed to open payment proof');
      }

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Unable to open payment proof',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirmed Trips & Payment Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium">{trip.quotation.quotation_no}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{trip.quotation.customer_name}</div>
                      {trip.quotation.company_name && (
                        <div className="text-sm text-muted-foreground">{trip.quotation.company_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate">
                      {trip.quotation.pickup_location} → {trip.quotation.drop_location}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(trip.quotation.pickup_datetime), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {trip.driver_name && (
                        <div className="flex items-center gap-1">
                          <UserPlus className="w-3 h-3" />
                          <span>{trip.driver_name}</span>
                        </div>
                      )}
                      {trip.conductor_name && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{trip.conductor_name}</span>
                        </div>
                      )}
                      {trip.bus_no && (
                        <div className="flex items-center gap-1">
                          <Bus className="w-3 h-3" />
                          <span>{trip.bus_no}</span>
                        </div>
                      )}
                      {!trip.driver_name && !trip.conductor_name && !trip.bus_no && (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getPaymentStatusBadge(trip)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Total: LKR {trip.total_amount.toLocaleString()}</div>
                      <div className="text-muted-foreground">
                        Paid: LKR {trip.advance_paid.toLocaleString()}
                      </div>
                      {trip.balance_due > 0 && (
                        <div className="text-red-600">
                          Balance: LKR {trip.balance_due.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {/* Confirm Payment Button */}
                      {trip.balance_due > 0 && (
                        <Button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setPaymentModalOpen(true);
                          }}
                          size="sm"
                          variant="default"
                          className="h-8"
                        >
                          <Receipt className="w-3 h-3 mr-1" />
                          Confirm Payment
                        </Button>
                      )}
                      
                      {/* Invoice Actions */}
                      {trip.invoices.map((invoice) => (
                        <div key={invoice.id} className="flex gap-1">
                          <Button
                            onClick={() => viewInvoice(trip, invoice.invoice_type as 'advance' | 'final')}
                            size="sm"
                            variant="outline"
                            className="h-8"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {invoice.invoice_type === 'advance' ? 'Advance' : 'Final'}
                          </Button>
                          <Button
                            onClick={() => downloadInvoice(trip, invoice.invoice_type as 'advance' | 'final')}
                            size="sm"
                            variant="outline"
                            className="h-8"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      
                      {/* Payment Proof Actions */}
                      {trip.payments
                        .filter(p => p.payment_proof_url)
                        .map((payment) => (
                          <Button
                            key={payment.id}
                            onClick={() => openPaymentProof(trip, payment.id)}
                            size="sm"
                            variant="outline"
                            className="h-8"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Proof
                          </Button>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {trips.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No confirmed trips found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Confirmation Modal */}
      {selectedTrip && (
        <PaymentConfirmationModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onConfirm={handlePaymentConfirmation}
          quotationData={{
            quotation_no: selectedTrip.quotation.quotation_no,
            customer_name: selectedTrip.quotation.customer_name,
            gross_revenue: selectedTrip.quotation.gross_revenue,
            advance_paid: selectedTrip.advance_paid,
            balance_due: selectedTrip.balance_due
          }}
          loading={loading}
        />
      )}

      {/* Invoice Viewer */}
      {currentInvoiceData && (
        <InvoiceViewer
          isOpen={invoiceViewerOpen}
          onClose={() => setInvoiceViewerOpen(false)}
          invoiceData={currentInvoiceData}
          onDownload={async () => {
            if (currentInvoiceData) {
              const pdfBlob = await generateInvoicePDF(currentInvoiceData);
              const url = URL.createObjectURL(pdfBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${currentInvoiceData.invoiceNo}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            }
          }}
        />
      )}
    </div>
  );
}