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
    // For now, use existing quotations with confirmed status as a temporary solution
    const { data: quotations } = await supabase
      .from('special_hire_quotations')
      .select('*')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (quotations) {
      // Map quotations to our expected format temporarily
      const mappedTrips = quotations.map(q => ({
        id: q.id,
        quotation_id: q.id,
        status: q.status,
        total_amount: q.gross_revenue,
        advance_paid: 0,
        balance_due: q.gross_revenue,
        created_at: q.created_at,
        quotation: q,
        payments: [],
        invoices: []
      }));
      setTrips(mappedTrips);
    }
  };

  const handlePaymentConfirmation = async (paymentData: PaymentConfirmationData) => {
    if (!selectedTrip) return;

    setLoading(true);
    try {
      // Generate and store invoice
      const invoiceData: InvoiceData = {
        invoiceNo: `INV-${new Date().getFullYear()}-${Math.random().toString().substr(2, 4)}`,
        invoiceType: paymentData.paymentType === 'full' ? 'final' : 'advance',
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
        paidAmount: paymentData.amount,
        companyLogo
      };

      const pdfBlob = await generateInvoicePDF(invoiceData);
      
      // Upload invoice PDF to storage
      const fileName = `invoices/${invoiceData.invoiceNo}.pdf`;
      await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      // Update quotation status
      await supabase
        .from('special_hire_quotations')
        .update({ 
          status: paymentData.paymentType === 'full' ? 'completed' : 'paid'
        })
        .eq('id', selectedTrip.quotation_id);

      toast({
        title: 'Payment Confirmed',
        description: `${paymentData.paymentType === 'full' ? 'Full payment' : 'Advance payment'} confirmed and invoice generated successfully`
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
      companyLogo
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
    const hasAdvancePayment = trip.payments.some(p => p.payment_type === 'advance' && p.payment_status === 'confirmed');
    const hasFullPayment = trip.payments.some(p => p.payment_type === 'full' && p.payment_status === 'confirmed');
    const hasFinalPayment = trip.payments.some(p => p.payment_type === 'final' && p.payment_status === 'confirmed');

    if (hasFullPayment || (hasAdvancePayment && hasFinalPayment)) {
      return <Badge variant="default" className="bg-green-500">Fully Paid</Badge>;
    } else if (hasAdvancePayment) {
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
            gross_revenue: selectedTrip.quotation.gross_revenue
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