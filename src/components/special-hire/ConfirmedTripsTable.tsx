import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { 
  Eye, Download, Upload, Receipt, Users, UserPlus, Bus, Settings, ChevronDown, 
  Search, Filter, MoreHorizontal, MapPin, Calendar, DollarSign, TrendingUp,
  Clock, CheckCircle, XCircle, AlertCircle, Phone, Building, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PaymentConfirmationModal, type PaymentConfirmationData } from './PaymentConfirmationModal';
import { EnhancedTripStatusManagementModal, type TripStatusData } from './EnhancedTripStatusManagementModal';
import { TripDetailsModal } from './TripDetailsModal';
import { InvoiceViewer } from './InvoiceViewer';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { format } from 'date-fns';

interface ConfirmedTrip {
  id: string;
  quotation_id: string;
  status: string;
  trip_status?: string;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  driver_name?: string;
  conductor_name?: string;
  bus_no?: string;
  created_at: string;
  cancellation_reason?: string;
  refund_amount?: number;
  refund_status?: string;
  status_changed_at?: string;
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
    fuel_cost_fuel_only?: number;
    commission_pass_through_amount?: number;
    discount_type?: string;
    discount_percentage?: number;
    discount_amount_lkr?: number;
    trip_status?: string;
    cancellation_reason?: string;
    refund_amount?: number;
    refund_status?: string;
    status_changed_at?: string;
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

// Helper function to calculate total revenue to match quotation final total
const calculateTotalRevenue = (quotation: ConfirmedTrip['quotation']): number => {
  const hireCharges = quotation.gross_revenue || 0;
  const serviceCharges = quotation.fuel_cost_fuel_only || 0;
  const commission = quotation.commission_pass_through_amount || 0;
  const discount = quotation.discount_amount_lkr || 0;
  
  return hireCharges + serviceCharges + commission - discount;
};

export function ConfirmedTripsTable() {
  const [trips, setTrips] = useState<ConfirmedTrip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<ConfirmedTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<ConfirmedTrip | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string>('');
  
  // Enhanced filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const { toast } = useToast();

  useEffect(() => {
    fetchConfirmedTrips();
    fetchCompanyLogo();
  }, []);

  // Enhanced filtering and search functionality
  useEffect(() => {
    let filtered = trips;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(trip =>
        trip.quotation.quotation_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.quotation.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.quotation.customer_phone.includes(searchQuery) ||
        trip.quotation.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.quotation.drop_location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => (trip.trip_status || trip.status) === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'pending') {
        filtered = filtered.filter(trip => trip.advance_paid === 0);
      } else if (paymentFilter === 'partial') {
        filtered = filtered.filter(trip => trip.advance_paid > 0 && trip.balance_due > 0);
      } else if (paymentFilter === 'paid') {
        filtered = filtered.filter(trip => trip.balance_due <= 0);
      }
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.quotation.pickup_datetime);
        const tripDateOnly = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate());
        
        switch (dateFilter) {
          case 'today':
            return tripDateOnly.getTime() === today.getTime();
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return tripDateOnly >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return tripDateOnly >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredTrips(filtered);
  }, [trips, searchQuery, statusFilter, paymentFilter, dateFilter]);

  const fetchCompanyLogo = async () => {
    // For now, we'll use a default empty logo
    setCompanyLogo('');
  };

  const fetchConfirmedTrips = async () => {
    // Fetch all quotations with trip statuses including cancelled, on_hold, etc.
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

        const finalAmount = calculateTotalRevenue(q);
        
        return {
          id: q.id,
          quotation_id: q.id,
          status: q.status,
          trip_status: q.trip_status || q.status,
          total_amount: finalAmount,
          advance_paid: advancePaid,
          balance_due: finalAmount - advancePaid,
          driver_name: undefined,
          conductor_name: undefined,
          bus_no: undefined,
          created_at: q.created_at,
          cancellation_reason: q.cancellation_reason,
          refund_amount: q.refund_amount || 0,
          refund_status: q.refund_status,
          status_changed_at: q.status_changed_at,
          quotation: q,
          payments: [], // Will be populated if we have payment data
          invoices
        };
      });
      setTrips(mappedTrips);
      setFilteredTrips(mappedTrips);
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
      const finalTotalAmount = calculateTotalRevenue(selectedTrip.quotation);
      const isFullPayment = paymentData.amount >= finalTotalAmount;
      const isFinalPayment = paymentData.paymentType === 'final' || paymentData.paymentType === 'full';
      const invoiceType: 'advance' | 'final' = isFinalPayment || isFullPayment ? 'final' : 'advance';

      console.log('Invoice type determination:', {
        isFullPayment,
        isFinalPayment,
        paymentType: paymentData.paymentType,
        amount: paymentData.amount,
        grossRevenue: selectedTrip.quotation.gross_revenue,
        finalTotalAmount,
        invoiceType
      });

      // Generate invoice number
      const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Prepare invoice data with proper advance amount handling
      const advanceAmountForInvoice = invoiceType === 'final' 
        ? selectedTrip.advance_paid 
        : paymentData.amount;
        
      const invoiceData: InvoiceData = {
        invoiceNo,
        invoiceType,
        quotationNo: selectedTrip.quotation.quotation_no,
        customerName: selectedTrip.quotation.customer_name,
        customerPhone: selectedTrip.quotation.customer_phone || '',
        customerEmail: selectedTrip.quotation.customer_email,
        companyName: selectedTrip.quotation.company_name,
        pickupLocation: selectedTrip.quotation.pickup_location,
        dropLocation: selectedTrip.quotation.drop_location,
        pickupDate: new Date(selectedTrip.quotation.pickup_datetime),
        dropDate: new Date(selectedTrip.quotation.drop_datetime),
        busType: 'Standard Bus', // Will need to fetch actual bus type name from bus_type_id
        numberOfBuses: selectedTrip.quotation.number_of_buses,
        numberOfPassengers: selectedTrip.quotation.number_of_passengers,
        totalAmount: finalTotalAmount,
        advanceAmount: advanceAmountForInvoice, // Use properly calculated advance amount
        balanceAmount: finalTotalAmount - (selectedTrip.advance_paid || 0),
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

      const { error: updateError } = await supabase
        .from('special_hire_quotations')
        .update({ status: newStatus })
        .eq('id', selectedTrip.quotation_id);

      if (updateError) {
        console.error('Error updating quotation status:', updateError);
        throw updateError;
      }

      // Optimistically update UI so action buttons reflect the new state immediately
      setTrips((prev) => prev.map((t) => {
        if (t.id !== selectedTrip.id) return t;
        const updatedInvoices = [
          ...t.invoices,
          {
            id: `${invoiceType}_${t.id}`,
            invoice_no: invoiceNo,
            invoice_type: invoiceType,
            amount: paymentData.amount,
            pdf_path: '',
            issued_at: new Date().toISOString(),
          },
        ];
        const newAdvancePaid = invoiceType === 'advance'
          ? (t.advance_paid || 0) + paymentData.amount
          : t.advance_paid || 0;
        const newBalance = Math.max((t.total_amount || 0) - newAdvancePaid - (invoiceType === 'final' ? paymentData.amount : 0), 0);
        return {
          ...t,
          status: newStatus,
          invoices: updatedInvoices,
          advance_paid: newAdvancePaid,
          balance_due: invoiceType === 'final' ? 0 : newBalance,
        };
      }));

      toast({
        title: 'Success!',
        description: `${invoiceType === 'final' ? 'Final payment' : 'Advance payment'} confirmed and invoice PDF downloaded successfully`
      });

      setPaymentModalOpen(false);
      // Refresh from DB as well (kept for consistency)
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
      totalAmount: calculateTotalRevenue(trip.quotation),
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

  const handleStatusChange = async (statusData: TripStatusData) => {
    if (!selectedTrip) return;

    setStatusLoading(true);
    try {
      const updateData: any = {
        trip_status: statusData.status,
        cancellation_reason: statusData.reason || null,
        status_changed_by: (await supabase.auth.getUser()).data.user?.id,
      };

      // Handle refund data for cancellations
      if (statusData.status === 'cancelled' && statusData.refundAmount) {
        updateData.refund_amount = statusData.refundAmount;
        updateData.refund_status = statusData.refundStatus || 'pending';
      }

      const { error } = await supabase
        .from('special_hire_quotations')
        .update(updateData)
        .eq('id', selectedTrip.quotation_id);

      if (error) throw error;

      // Update local state
      setTrips((prev) => prev.map((trip) => 
        trip.id === selectedTrip.id 
          ? {
              ...trip,
              trip_status: statusData.status,
              cancellation_reason: statusData.reason,
              refund_amount: statusData.refundAmount || 0,
              refund_status: statusData.refundStatus,
              status_changed_at: new Date().toISOString(),
            }
          : trip
      ));

      let statusMessage = 'Trip status updated successfully';
      if (statusData.status === 'cancelled' && statusData.refundAmount) {
        statusMessage += ` - Refund of LKR ${statusData.refundAmount.toLocaleString()} ${statusData.refundStatus}`;
      }

      toast({
        title: 'Success',
        description: statusMessage,
      });

      setStatusModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update trip status',
        variant: 'destructive',
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const getTripStatusBadge = (trip: ConfirmedTrip) => {
    const status = trip.trip_status || trip.status;
    const variants: Record<string, { variant: any; className?: string }> = {
      confirmed: { variant: 'default', className: 'bg-blue-500' },
      paid: { variant: 'default', className: 'bg-green-500' },
      completed: { variant: 'default', className: 'bg-green-600' },
      cancelled: { variant: 'destructive' },
      on_hold: { variant: 'secondary', className: 'bg-yellow-500 text-yellow-900' },
      no_bus_allocated: { variant: 'secondary', className: 'bg-orange-500 text-orange-900' },
      other: { variant: 'outline' },
    };

    const config = variants[status] || { variant: 'outline' };
    
    return (
      <div className="space-y-1">
        <Badge variant={config.variant} className={config.className}>
          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
        {trip.refund_amount && trip.refund_amount > 0 && (
          <div className="text-xs text-muted-foreground">
            Refund: LKR {trip.refund_amount.toLocaleString()} ({trip.refund_status})
          </div>
        )}
      </div>
    );
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
      {/* Enhanced Header with Analytics */}
      <Card className="professional-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span>Trip Management Dashboard</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage confirmed trips, payments, and status updates
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-primary">{filteredTrips.length}</div>
                <div className="text-xs text-muted-foreground">Total Trips</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">
                  {filteredTrips.filter(t => t.balance_due <= 0).length}
                </div>
                <div className="text-xs text-muted-foreground">Fully Paid</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredTrips.filter(t => t.advance_paid > 0 && t.balance_due > 0).length}
                </div>
                <div className="text-xs text-muted-foreground">Partial</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600">
                  {filteredTrips.filter(t => (t.trip_status || t.status) === 'cancelled').length}
                </div>
                <div className="text-xs text-muted-foreground">Cancelled</div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Enhanced Filters */}
        <CardContent className="border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="no_bus_allocated">No Bus</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial Paid</SelectItem>
                <SelectItem value="paid">Fully Paid</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPaymentFilter('all');
                setDateFilter('all');
              }}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Trip Table */}
      <Card className="professional-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Quotation</TableHead>
                  <TableHead className="font-semibold">Customer Details</TableHead>
                  <TableHead className="font-semibold">Trip Information</TableHead>
                  <TableHead className="font-semibold">Vehicle Assignment</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Payment</TableHead>
                  <TableHead className="font-semibold">Financial</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => (
                  <TableRow key={trip.id} className="table-row-hover">
                    {/* Quotation Info */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{trip.quotation.quotation_no}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(trip.created_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </TableCell>

                    {/* Customer Details */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{trip.quotation.customer_name}</div>
                        {trip.quotation.company_name && (
                          <div className="text-xs text-muted-foreground flex items-center space-x-1">
                            <Building className="w-3 h-3" />
                            <span>{trip.quotation.company_name}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{trip.quotation.customer_phone}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Trip Information */}
                    <TableCell className="max-w-xs">
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2 text-xs">
                          <MapPin className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <div className="truncate">{trip.quotation.pickup_location}</div>
                        </div>
                        <div className="flex items-start space-x-2 text-xs">
                          <MapPin className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="truncate">{trip.quotation.drop_location}</div>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(trip.quotation.pickup_datetime), 'MMM dd')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{trip.quotation.number_of_passengers}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Bus className="w-3 h-3" />
                            <span>{trip.quotation.number_of_buses}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Vehicle Assignment */}
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        {trip.driver_name && (
                          <div className="flex items-center space-x-1">
                            <UserPlus className="w-3 h-3 text-blue-500" />
                            <span>{trip.driver_name}</span>
                          </div>
                        )}
                        {trip.conductor_name && (
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3 text-green-500" />
                            <span>{trip.conductor_name}</span>
                          </div>
                        )}
                        {trip.bus_no && (
                          <div className="flex items-center space-x-1">
                            <Bus className="w-3 h-3 text-orange-500" />
                            <span>{trip.bus_no}</span>
                          </div>
                        )}
                        {!trip.driver_name && !trip.conductor_name && !trip.bus_no && (
                          <Badge variant="outline" className="text-xs">Not Assigned</Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{getTripStatusBadge(trip)}</TableCell>

                    {/* Payment Status */}
                    <TableCell>{getPaymentStatusBadge(trip)}</TableCell>

                    {/* Financial Information */}
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="font-medium">LKR {trip.total_amount.toLocaleString()}</div>
                        <div className="text-green-600">
                          Paid: LKR {(trip.invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0).toLocaleString()}
                        </div>
                        {trip.balance_due > 0 && (
                          <div className="text-red-600">
                            Due: LKR {trip.balance_due.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-center space-x-1">
                        {/* View Details */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTrip(trip);
                            setDetailsModalOpen(true);
                          }}
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>

                        {/* Quick Actions Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="text-xs">
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTrip(trip);
                                setStatusModalOpen(true);
                              }}
                            >
                              <Settings className="w-3 h-3 mr-2" />
                              Change Status
                            </DropdownMenuItem>
                            
                            {trip.status !== 'completed' && trip.balance_due > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTrip(trip);
                                    setPaymentModalOpen(true);
                                  }}
                                >
                                  <DollarSign className="w-3 h-3 mr-2" />
                                  Confirm Payment
                                </DropdownMenuItem>
                              </>
                            )}

                            {trip.invoices.length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                {trip.invoices.map((invoice) => (
                                  <DropdownMenuItem
                                    key={invoice.id}
                                    onClick={() => viewInvoice(trip, invoice.invoice_type as 'advance' | 'final')}
                                  >
                                    <Receipt className="w-3 h-3 mr-2" />
                                    View {invoice.invoice_type} Invoice
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredTrips.length === 0 && (
              <div className="text-center py-12">
                <div className="space-y-3">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Bus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">No trips found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || dateFilter !== 'all'
                        ? 'Try adjusting your filters to see more results.'
                        : 'No confirmed trips available at the moment.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Confirmation Modal */}
      {selectedTrip && (
        <PaymentConfirmationModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onConfirm={handlePaymentConfirmation}
          quotationData={{
            id: selectedTrip.quotation_id,
            quotation_no: selectedTrip.quotation.quotation_no,
            customer_name: selectedTrip.quotation.customer_name,
            gross_revenue: selectedTrip.quotation.gross_revenue,
            hire_charge: selectedTrip.quotation.gross_revenue || 0,
            driver_charge: 0, // This field doesn't exist in current schema
            extra_charges: 0, // This field doesn't exist in current schema
            fuel_cost_fuel_only: selectedTrip.quotation.fuel_cost_fuel_only,
            commission_pass_through_amount: selectedTrip.quotation.commission_pass_through_amount,
            discount_amount_lkr: selectedTrip.quotation.discount_amount_lkr,
            advance_paid: selectedTrip.advance_paid,
            balance_due: selectedTrip.balance_due
          }}
          loading={loading}
        />
      )}

      {/* Trip Status Management Modal */}
      <EnhancedTripStatusManagementModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        trip={selectedTrip}
        onStatusChange={handleStatusChange}
        loading={statusLoading}
      />

      {/* Trip Details Modal */}
      {selectedTrip && (
        <TripDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          trip={selectedTrip}
          onViewInvoice={(type) => {
            setDetailsModalOpen(false);
            viewInvoice(selectedTrip, type);
          }}
          onDownloadInvoice={(type) => downloadInvoice(selectedTrip, type)}
          onViewPaymentProof={(proofUrl) => window.open(proofUrl, '_blank')}
        />
      )}
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