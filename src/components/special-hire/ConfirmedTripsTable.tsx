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
import { useRealtimeSpecialHire, type QuotationWithPayments } from '@/hooks/useRealtimeSpecialHire';
import { PaymentConfirmationModal, type PaymentConfirmationData } from './PaymentConfirmationModal';
import { EnhancedTripStatusManagementModal, type TripStatusData } from './EnhancedTripStatusManagementModal';
import { TripDetailsModal } from './TripDetailsModal';
import { InvoiceViewer } from './InvoiceViewer';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { format } from 'date-fns';

export function ConfirmedTripsTable() {
  const { quotations, loading: realtimeLoading, refetch } = useRealtimeSpecialHire();
  const [filteredTrips, setFilteredTrips] = useState<QuotationWithPayments[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<QuotationWithPayments | null>(null);
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
    fetchCompanyLogo();
  }, []);

  // Enhanced filtering and search functionality
  useEffect(() => {
    let filtered = quotations;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(trip =>
        trip.quotation_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.customer_phone.includes(searchQuery) ||
        trip.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.drop_location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'pending') {
        filtered = filtered.filter(trip => trip.total_paid === 0);
      } else if (paymentFilter === 'partial') {
        filtered = filtered.filter(trip => trip.total_paid > 0 && trip.balance_due > 0);
      } else if (paymentFilter === 'paid') {
        filtered = filtered.filter(trip => trip.balance_due <= 0);
      }
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.pickup_datetime);
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
  }, [quotations, searchQuery, statusFilter, paymentFilter, dateFilter]);

  const fetchCompanyLogo = async () => {
    // For now, we'll use a default empty logo
    setCompanyLogo('');
  };

  const handlePaymentConfirmation = async (paymentData: PaymentConfirmationData) => {
    if (!selectedTrip) return;

    console.log('Payment confirmation started:', {
      paymentData,
      selectedTrip,
      advancePaid: selectedTrip.advance_paid,
      balanceDue: selectedTrip.balance_due
    });

    setLoading(true);
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error('User not authenticated');

      // Calculate final total amount
      const finalTotalAmount = (selectedTrip.gross_revenue || 0) + 
                              (selectedTrip.fuel_cost_fuel_only || 0) + 
                              (selectedTrip.commission_pass_through_amount || 0) - 
                              (selectedTrip.discount_amount_lkr || 0);

      // Determine payment and invoice type
      const isFullPayment = paymentData.amount >= finalTotalAmount;
      const isFinalPayment = paymentData.paymentType === 'final' || paymentData.paymentType === 'full';
      const invoiceType: 'advance' | 'final' = isFinalPayment || isFullPayment ? 'final' : 'advance';

      // Generate invoice number
      const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      console.log('Saving payment to database:', {
        quotation_id: selectedTrip.id,
        payment_type: paymentData.paymentType,
        amount: paymentData.amount,
        payment_method: paymentData.method,
        reference_no: paymentData.reference,
        created_by: currentUser.data.user.id
      });

      // Save payment to database
      const { error: paymentError } = await supabase
        .from('special_hire_payments')
        .insert({
          quotation_id: selectedTrip.id,
          payment_type: paymentData.paymentType,
          amount: paymentData.amount,
          payment_method: paymentData.method,
          reference_no: paymentData.reference || null,
          created_by: currentUser.data.user.id
        });

      if (paymentError) {
        console.error('Error saving payment:', paymentError);
        throw paymentError;
      }

      // Save invoice to database
      const { error: invoiceError } = await supabase
        .from('special_hire_invoices')
        .insert({
          quotation_id: selectedTrip.id,
          invoice_type: invoiceType,
          invoice_no: invoiceNo,
          amount: paymentData.amount,
          generated_by: currentUser.data.user.id
        });

      if (invoiceError) {
        console.error('Error saving invoice:', invoiceError);
        throw invoiceError;
      }

      // Update trip assignment if provided
      const updateData: any = {};
      if (paymentData.driverName) updateData.assigned_driver_name = paymentData.driverName;
      if (paymentData.conductorName) updateData.assigned_conductor_name = paymentData.conductorName;
      if (paymentData.busNo) updateData.assigned_bus_no = paymentData.busNo;

      // Update status based on payment type
      if (invoiceType === 'final') {
        updateData.status = 'completed';
      } else if (paymentData.paymentType === 'advance') {
        updateData.status = 'paid';
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('special_hire_quotations')
          .update(updateData)
          .eq('id', selectedTrip.id);

        if (updateError) {
          console.error('Error updating quotation:', updateError);
          throw updateError;
        }
      }

      // Generate and download PDF
      const invoiceData: InvoiceData = {
        invoiceNo,
        invoiceType,
        quotationNo: selectedTrip.quotation_no,
        customerName: selectedTrip.customer_name,
        customerPhone: selectedTrip.customer_phone || '',
        customerEmail: selectedTrip.customer_email,
        companyName: selectedTrip.company_name,
        pickupLocation: selectedTrip.pickup_location,
        dropLocation: selectedTrip.drop_location,
        pickupDate: new Date(selectedTrip.pickup_datetime),
        dropDate: new Date(selectedTrip.drop_datetime || selectedTrip.pickup_datetime),
        busType: selectedTrip.bus_type,
        numberOfBuses: selectedTrip.number_of_buses,
        numberOfPassengers: selectedTrip.number_of_passengers,
        totalAmount: finalTotalAmount,
        advanceAmount: invoiceType === 'final' ? selectedTrip.advance_paid : paymentData.amount,
        balanceAmount: finalTotalAmount - (selectedTrip.advance_paid || 0),
        paidAmount: paymentData.amount,
        companyLogo,
        vehicleNo: paymentData.busNo,
        driverName: paymentData.driverName,
        conductorName: paymentData.conductorName,
        itemDetail: `${format(new Date(selectedTrip.pickup_datetime), 'dd/MM/yyyy')} ${selectedTrip.pickup_location} → ${selectedTrip.drop_location}; ${selectedTrip.number_of_passengers} Pax, ${selectedTrip.number_of_buses} bus(es), ${selectedTrip.bus_type}`,
      };

      console.log('Generated invoice data:', invoiceData);
      
      // Generate and auto-download PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success!',
        description: `${invoiceType === 'final' ? 'Final payment' : 'Advance payment'} confirmed and invoice PDF downloaded successfully. Real-time updates will sync across all users.`
      });

      setPaymentModalOpen(false);
      
      // The real-time hook will automatically refresh the data
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

  const viewInvoice = async (trip: QuotationWithPayments, invoiceType: 'advance' | 'final') => {
    const invoice = trip.invoices.find(inv => inv.invoice_type === invoiceType);
    if (!invoice) return;

    const finalTotalAmount = (trip.gross_revenue || 0) + 
                            (trip.fuel_cost_fuel_only || 0) + 
                            (trip.commission_pass_through_amount || 0) - 
                            (trip.discount_amount_lkr || 0);

    const invoiceData: InvoiceData = {
      invoiceNo: invoice.invoice_no,
      invoiceType: invoice.invoice_type as 'advance' | 'final',
      quotationNo: trip.quotation_no,
      customerName: trip.customer_name,
      customerPhone: trip.customer_phone,
      customerEmail: trip.customer_email,
      companyName: trip.company_name,
      pickupLocation: trip.pickup_location,
      dropLocation: trip.drop_location,
      pickupDate: new Date(trip.pickup_datetime),
      dropDate: new Date(trip.drop_datetime || trip.pickup_datetime),
      busType: trip.bus_type,
      numberOfBuses: trip.number_of_buses,
      numberOfPassengers: trip.number_of_passengers,
      totalAmount: finalTotalAmount,
      advanceAmount: trip.advance_paid,
      paidAmount: invoice.amount,
      companyLogo,
      vehicleNo: trip.assigned_bus_no,
      driverName: trip.assigned_driver_name,
      conductorName: trip.assigned_conductor_name,
      itemDetail: `${format(new Date(trip.pickup_datetime), 'dd/MM/yyyy')} ${trip.pickup_location} → ${trip.drop_location}; ${trip.number_of_passengers} Pax, ${trip.number_of_buses} bus(es), ${trip.bus_type}`,
    };
    setCurrentInvoiceData(invoiceData);
    setInvoiceViewerOpen(true);
  };

  const handleStatusChange = async (statusData: TripStatusData) => {
    if (!selectedTrip) return;

    setStatusLoading(true);
    try {
      const updateData: any = {
        status: statusData.status,
        // Add any additional status fields if they exist in the database
      };

      // Handle refund data for cancellations
      if (statusData.status === 'cancelled' && statusData.refundAmount) {
        updateData.refund_amount = statusData.refundAmount;
        updateData.refund_status = statusData.refundStatus || 'pending';
      }

      if (statusData.reason) {
        updateData.cancellation_reason = statusData.reason;
      }

      const { error } = await supabase
        .from('special_hire_quotations')
        .update(updateData)
        .eq('id', selectedTrip.id);

      if (error) throw error;

      let statusMessage = 'Trip status updated successfully';
      if (statusData.status === 'cancelled' && statusData.refundAmount) {
        statusMessage += ` - Refund of LKR ${statusData.refundAmount.toLocaleString()} ${statusData.refundStatus}`;
      }

      toast({
        title: 'Success',
        description: statusMessage,
      });

      setStatusModalOpen(false);
      // Real-time hook will update automatically
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

  const getTripStatusBadge = (trip: QuotationWithPayments) => {
    const status = trip.status;
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
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (trip: QuotationWithPayments) => {
    if (trip.status === 'completed' || trip.balance_due <= 0) {
      return <Badge variant="default" className="bg-green-500">Fully Paid</Badge>;
    } else if (trip.advance_paid > 0) {
      return <Badge variant="secondary">Advance Paid</Badge>;
    } else {
      return <Badge variant="outline">Payment Pending</Badge>;
    }
  };

  const calculateTotalAmount = (trip: QuotationWithPayments) => {
    return (trip.gross_revenue || 0) + 
           (trip.fuel_cost_fuel_only || 0) + 
           (trip.commission_pass_through_amount || 0) - 
           (trip.discount_amount_lkr || 0);
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
                Manage confirmed trips, payments, and status updates with real-time synchronization
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
                  {filteredTrips.filter(t => t.status === 'cancelled').length}
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
          {realtimeLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading trips...</p>
            </div>
          ) : (
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
                          <div className="font-medium text-sm">{trip.quotation_no}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(trip.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </TableCell>

                      {/* Customer Details */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{trip.customer_name}</div>
                          {trip.company_name && (
                            <div className="text-xs text-muted-foreground flex items-center space-x-1">
                              <Building className="w-3 h-3" />
                              <span>{trip.company_name}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{trip.customer_phone}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Trip Information */}
                      <TableCell className="max-w-xs">
                        <div className="space-y-2">
                          <div className="flex items-start space-x-2 text-xs">
                            <MapPin className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="truncate">{trip.pickup_location}</div>
                          </div>
                          <div className="flex items-start space-x-2 text-xs">
                            <MapPin className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="truncate">{trip.drop_location}</div>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(trip.pickup_datetime), 'MMM dd')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{trip.number_of_passengers}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Bus className="w-3 h-3" />
                              <span>{trip.number_of_buses}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Vehicle Assignment */}
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {trip.assigned_driver_name && (
                            <div className="flex items-center space-x-1">
                              <UserPlus className="w-3 h-3 text-blue-500" />
                              <span>{trip.assigned_driver_name}</span>
                            </div>
                          )}
                          {trip.assigned_conductor_name && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3 text-green-500" />
                              <span>{trip.assigned_conductor_name}</span>
                            </div>
                          )}
                          {trip.assigned_bus_no && (
                            <div className="flex items-center space-x-1">
                              <Bus className="w-3 h-3 text-orange-500" />
                              <span>{trip.assigned_bus_no}</span>
                            </div>
                          )}
                          {!trip.assigned_driver_name && !trip.assigned_conductor_name && !trip.assigned_bus_no && (
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
                          <div className="font-medium">LKR {calculateTotalAmount(trip).toLocaleString()}</div>
                          <div className="text-green-600">
                            Paid: LKR {trip.total_paid.toLocaleString()}
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
            quotation_no: selectedTrip.quotation_no,
            customer_name: selectedTrip.customer_name,
            gross_revenue: selectedTrip.gross_revenue,
            fuel_cost_fuel_only: selectedTrip.fuel_cost_fuel_only,
            commission_pass_through_amount: selectedTrip.commission_pass_through_amount,
            discount_amount_lkr: selectedTrip.discount_amount_lkr,
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
        trip={selectedTrip ? {
          id: selectedTrip.id,
          quotation: {
            quotation_no: selectedTrip.quotation_no,
            customer_name: selectedTrip.customer_name,
            pickup_location: selectedTrip.pickup_location,
            drop_location: selectedTrip.drop_location,
            pickup_datetime: selectedTrip.pickup_datetime,
            number_of_passengers: selectedTrip.number_of_passengers
          },
          total_amount: calculateTotalAmount(selectedTrip),
          advance_paid: selectedTrip.advance_paid,
          status: selectedTrip.status,
        } : null}
        onStatusChange={handleStatusChange}
        loading={statusLoading}
      />

      {/* Trip Details Modal */}
      {selectedTrip && (
        <TripDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          trip={{
            id: selectedTrip.id,
            quotation_id: selectedTrip.id,
            status: selectedTrip.status,
            total_amount: calculateTotalAmount(selectedTrip),
            advance_paid: selectedTrip.advance_paid,
            balance_due: selectedTrip.balance_due,
            created_at: selectedTrip.created_at,
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
              gross_revenue: selectedTrip.gross_revenue,
              fuel_cost_fuel_only: selectedTrip.fuel_cost_fuel_only,
              commission_pass_through_amount: selectedTrip.commission_pass_through_amount,
              discount_amount_lkr: selectedTrip.discount_amount_lkr,
            },
            payments: selectedTrip.payments.map(p => ({
              id: p.id,
              amount: p.amount,
              payment_type: p.payment_type,
              payment_status: 'confirmed',
              method: p.payment_method,
              reference: p.reference_no,
              paid_at: p.paid_at
            })),
            invoices: selectedTrip.invoices.map(i => ({
              id: i.id,
              invoice_no: i.invoice_no,
              invoice_type: i.invoice_type,
              amount: i.amount,
              pdf_path: '',
              issued_at: i.generated_at
            }))
          }}
          onViewInvoice={(type) => {
            setDetailsModalOpen(false);
            viewInvoice(selectedTrip, type);
          }}
          onDownloadInvoice={(type) => {
            // Download logic here if needed
          }}
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