import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { 
  Eye, Download, Upload, Receipt, Users, UserPlus, Bus, Settings, ChevronDown, 
  Search, Filter, MoreHorizontal, MapPin, Calendar, DollarSign, TrendingUp,
  Clock, CheckCircle, XCircle, AlertCircle, Phone, Building, RefreshCw, CreditCard, FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSpecialHire, type QuotationWithPayments } from '@/hooks/useRealtimeSpecialHire';
import { useFinanceApproval } from '@/hooks/useFinanceApproval';
import { PaymentConfirmationModal, type PaymentConfirmationData } from './PaymentConfirmationModal';
import { FinanceApprovalModal } from './FinanceApprovalModal';
import { EnhancedTripStatusManagementModal } from './EnhancedTripStatusManagementModal';
import { TripDetailsModal } from './TripDetailsModal';
import { InvoiceViewer } from './InvoiceViewer';
import { generateInvoiceHTML, generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ConfirmedTripsTable() {
  const { quotations, loading: realtimeLoading, refetch } = useRealtimeSpecialHire();
  const { user, hasRole } = useAuth();
  const { approvePayment, rejectPayment, isLoading: financeLoading } = useFinanceApproval();
  
  // State for filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Modal states
  const [selectedTrip, setSelectedTrip] = useState<QuotationWithPayments | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);
  const [financeApprovalModalOpen, setFinanceApprovalModalOpen] = useState(false);
  const [selectedFinancePayment, setSelectedFinancePayment] = useState<any>(null);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<InvoiceData | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string>('');

  // Check user roles
  const isFinanceUser = hasRole('finance') || hasRole('admin') || hasRole('super_admin');
  const isOperationsUser = hasRole('admin') || hasRole('super_admin') || hasRole('supervisor');

  // Filter quotations based on search and filters
  const filteredTrips = useMemo(() => {
    let filtered = quotations.filter(quotation => quotation.status === 'confirmed');

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trip => 
        trip.quotation_no.toLowerCase().includes(query) ||
        trip.customer_name.toLowerCase().includes(query) ||
        (trip.company_name && trip.company_name.toLowerCase().includes(query)) ||
        trip.pickup_location.toLowerCase().includes(query) ||
        trip.drop_location.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => {
        switch (statusFilter) {
          case 'paid':
            return trip.status === 'paid' || trip.status === 'completed';
          case 'pending':
            return trip.status === 'confirmed';
          case 'completed':
            return trip.status === 'completed';
          default:
            return true;
        }
      });
    }

    // Apply payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(trip => {
        const pendingFinancePayments = trip.payments?.filter(p => p.status === 'pending_finance') || [];
        const approvedPayments = trip.payments?.filter(p => p.status === 'approved') || [];
        const rejectedPayments = trip.payments?.filter(p => p.status === 'rejected') || [];
        
        switch (paymentFilter) {
          case 'pending_finance':
            return pendingFinancePayments.length > 0;
          case 'approved':
            return approvedPayments.length > 0 && pendingFinancePayments.length === 0;
          case 'rejected':
            return rejectedPayments.length > 0;
          case 'no_payments':
            return (trip.payments?.length || 0) === 0;
          default:
            return true;
        }
      });
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.pickup_datetime);
        const tripDateOnly = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate());
        
        switch (dateFilter) {
          case 'today':
            return tripDateOnly.getTime() === today.getTime();
          case 'upcoming':
            return tripDateOnly > today;
          case 'past':
            return tripDateOnly < today;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [quotations, searchQuery, statusFilter, paymentFilter, dateFilter]);

  const calculateTotalAmount = (quotation: QuotationWithPayments) => {
    return quotation.gross_revenue + 
           (quotation.fuel_cost_fuel_only || 0) + 
           (quotation.commission_pass_through_amount || 0) - 
           (quotation.discount_amount_lkr || 0);
  };

  const getTripStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (quotation: QuotationWithPayments) => {
    const pendingFinancePayments = quotation.payments?.filter(p => p.status === 'pending_finance') || [];
    const approvedPayments = quotation.payments?.filter(p => p.status === 'approved') || [];
    const rejectedPayments = quotation.payments?.filter(p => p.status === 'rejected') || [];
    
    if (rejectedPayments.length > 0) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Payment Rejected</Badge>;
    }
    
    if (pendingFinancePayments.length > 0) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Finance</Badge>;
    }
    
    if (approvedPayments.length > 0) {
      const totalApproved = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalDue = calculateTotalAmount(quotation);
      
      if (totalApproved >= totalDue) {
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Fully Paid</Badge>;
      } else {
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><DollarSign className="w-3 h-3 mr-1" />Partially Paid</Badge>;
      }
    }
    
    return <Badge variant="secondary" className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" />No Payments</Badge>;
  };

  const handlePaymentConfirmation = async (paymentData: PaymentConfirmationData) => {
    if (!selectedTrip) return;

    try {
      setLoading(true);
      
      // Create payment record with pending status
      const { data: paymentResponse, error: paymentError } = await supabase
        .from('special_hire_payments')
        .insert({
          quotation_id: selectedTrip.id,
          amount: paymentData.amount,
          payment_type: paymentData.paymentType,
          payment_method: paymentData.method,
          reference_no: paymentData.reference,
          payment_proof_url: paymentData.paymentProofUrl,
          notes: paymentData.notes,
          status: 'pending_finance', // Operations confirms, now needs finance approval
          created_by: user?.id,
        })
        .select()
        .maybeSingle();

      if (paymentError) throw paymentError;

      // Update quotation with trip assignment if provided
      if (paymentData.driverName || paymentData.conductorName || paymentData.busNo) {
        const { error: updateError } = await supabase
          .from('special_hire_quotations')
          .update({
            assigned_driver_name: paymentData.driverName,
            assigned_conductor_name: paymentData.conductorName,
            assigned_bus_no: paymentData.busNo,
          })
          .eq('id', selectedTrip.id);

        if (updateError) throw updateError;
      }

      // Create notification for finance team
      if (paymentResponse) {
        const { error: notificationError } = await supabase
          .from('payment_notifications')
          .insert({
            payment_id: paymentResponse.id,
            quotation_id: selectedTrip.id,
            notification_type: 'finance_approval_required',
            target_role: 'finance',
            message: `Payment of LKR ${paymentData.amount.toLocaleString()} for quotation ${selectedTrip.quotation_no} requires finance approval.`,
            created_by: user?.id,
          });

        if (notificationError) console.error('Notification error:', notificationError);
      }

      // Generate DRAFT documents
      const invoiceData = {
        invoiceNo: `${paymentData.paymentType.toUpperCase()}-${Date.now()}`,
        invoiceType: paymentData.paymentType === 'advance' ? 'advance' as const : 'final' as const,
        quotationNo: selectedTrip.quotation_no,
        customerName: selectedTrip.customer_name,
        customerPhone: selectedTrip.customer_phone || '',
        customerEmail: selectedTrip.customer_email,
        companyName: selectedTrip.company_name,
        pickupLocation: selectedTrip.pickup_location,
        dropLocation: selectedTrip.drop_location,
        pickupDate: new Date(selectedTrip.pickup_datetime),
        dropDate: new Date(selectedTrip.drop_datetime || selectedTrip.pickup_datetime),
        busType: 'Standard Bus',
        numberOfBuses: selectedTrip.number_of_buses,
        numberOfPassengers: selectedTrip.number_of_passengers,
        totalAmount: calculateTotalAmount(selectedTrip),
        advanceAmount: selectedTrip.advance_paid || 0,
        paidAmount: paymentData.amount,
        vehicleNo: paymentData.busNo,
        driverName: paymentData.driverName,
        conductorName: paymentData.conductorName,
        // Enhanced fields for multi-step workflow
        invoice_status: 'draft' as const,
        document_type: paymentData.paymentType === 'advance' ? 'sales_receipt' as const : 'invoice' as const,
      };

      // Store invoice record with DRAFT status
      const { error: invoiceError } = await supabase
        .from('special_hire_invoices')
        .insert({
          quotation_id: selectedTrip.id,
          invoice_no: invoiceData.invoiceNo,
          invoice_type: paymentData.paymentType === 'advance' ? 'advance' : 'final',
          amount: paymentData.amount,
          status: 'draft', // Mark as draft until finance approves
          generated_by: user?.id,
        });

      if (invoiceError) throw invoiceError;

      toast.success('Payment confirmed! Document generated as DRAFT - awaiting finance approval.');
      setPaymentModalOpen(false);
      setSelectedTrip(null);
      refetch();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinanceApproval = async (paymentId: string, notes?: string) => {
    const result = await approvePayment(paymentId, notes);
    if (result.success) {
      setFinanceApprovalModalOpen(false);
      setSelectedFinancePayment(null);
      refetch();
    }
  };

  const handleFinanceRejection = async (paymentId: string, reason: string) => {
    const result = await rejectPayment(paymentId, reason);
    if (result.success) {
      setFinanceApprovalModalOpen(false);
      setSelectedFinancePayment(null);
      refetch();
    }
  };

  const viewInvoice = async (quotation: QuotationWithPayments) => {
    try {
      const invoiceData = {
        invoiceNo: `INV-${Date.now()}`,
        invoiceType: 'final' as const,
        quotationNo: quotation.quotation_no,
        customerName: quotation.customer_name,
        customerPhone: quotation.customer_phone || '',
        customerEmail: quotation.customer_email,
        companyName: quotation.company_name,
        pickupLocation: quotation.pickup_location,
        dropLocation: quotation.drop_location,
        pickupDate: new Date(quotation.pickup_datetime),
        dropDate: new Date(quotation.drop_datetime || quotation.pickup_datetime),
        busType: 'Standard Bus',
        numberOfBuses: quotation.number_of_buses,
        numberOfPassengers: quotation.number_of_passengers,
        totalAmount: calculateTotalAmount(quotation),
        advanceAmount: quotation.advance_paid || 0,
        paidAmount: quotation.total_paid || 0,
        companyLogo: companyLogo,
        vehicleNo: quotation.assigned_bus_no,
        driverName: quotation.assigned_driver_name,
        conductorName: quotation.assigned_conductor_name,
      };

      setCurrentInvoiceData(invoiceData);
      setInvoiceViewerOpen(true);
    } catch (error) {
      console.error('Error generating invoice preview:', error);
      toast.error('Failed to generate invoice preview');
    }
  };

  const handleDownloadInvoice = async () => {
    if (!currentInvoiceData) return;
    
    try {
      const pdfBlob = await generateInvoicePDF(currentInvoiceData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentInvoiceData.invoiceType}-${currentInvoiceData.quotationNo}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  // Stats for dashboard
  const stats = useMemo(() => {
    const total = filteredTrips.length;
    const pendingFinance = filteredTrips.filter(trip => 
      trip.payments?.some(p => p.status === 'pending_finance')
    ).length;
    const approved = filteredTrips.filter(trip => 
      trip.payments?.some(p => p.status === 'approved')
    ).length;
    const totalRevenue = filteredTrips.reduce((sum, trip) => {
      const approvedPayments = trip.payments?.filter(p => p.status === 'approved') || [];
      return sum + approvedPayments.reduce((pSum, payment) => pSum + payment.amount, 0);
    }, 0);

    return { total, pendingFinance, approved, totalRevenue };
  }, [filteredTrips]);

  return (
    <div className="space-y-6">
      {/* Enhanced Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="professional-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="professional-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Finance</p>
                <p className="text-2xl font-bold">{stats.pendingFinance}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="professional-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Payments</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="professional-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Revenue</p>
                <p className="text-xl font-bold">LKR {stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters and Search */}
      <Card className="professional-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by quotation, customer, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending_finance">Pending Finance</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="no_payments">No Payments</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
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
                  {filteredTrips.map((trip) => {
                    const pendingFinancePayments = trip.payments?.filter(p => p.status === 'pending_finance') || [];
                    const totalAmount = calculateTotalAmount(trip);
                    
                    return (
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
                                <Bus className="w-3 h-3 text-purple-500" />
                                <span>{trip.assigned_bus_no}</span>
                              </div>
                            )}
                            {!trip.assigned_driver_name && !trip.assigned_conductor_name && !trip.assigned_bus_no && (
                              <span className="text-muted-foreground">Not assigned</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {getTripStatusBadge(trip.status)}
                        </TableCell>

                        {/* Payment Status */}
                        <TableCell>
                          <div className="space-y-1">
                            {getPaymentStatusBadge(trip)}
                            {pendingFinancePayments.length > 0 && isFinanceUser && (
                              <div className="text-xs text-yellow-600 flex items-center space-x-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>Requires approval</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Financial */}
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="font-medium">Total: LKR {totalAmount.toLocaleString()}</div>
                            {(trip.total_paid || 0) > 0 && (
                              <div className="text-green-600">Paid: LKR {(trip.total_paid || 0).toLocaleString()}</div>
                            )}
                            {(trip.balance_due || 0) > 0 && (
                              <div className="text-red-600">Due: LKR {(trip.balance_due || 0).toLocaleString()}</div>
                            )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTrip(trip);
                                setDetailsModalOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {/* Operations actions */}
                                {isOperationsUser && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedTrip(trip);
                                        setPaymentModalOpen(true);
                                      }}
                                    >
                                      <CreditCard className="w-4 h-4 mr-2" />
                                      Confirm Payment
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedTrip(trip);
                                        setStatusModalOpen(true);
                                      }}
                                    >
                                      <Settings className="w-4 h-4 mr-2" />
                                      Update Status
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                  </>
                                )}

                                {/* Finance actions */}
                                {isFinanceUser && pendingFinancePayments.length > 0 && (
                                  <>
                                    {pendingFinancePayments.map((payment) => (
                                      <DropdownMenuItem
                                        key={payment.id}
                                        onClick={() => {
                                          setSelectedFinancePayment({
                                            ...payment,
                                            quotation: trip
                                          });
                                          setFinanceApprovalModalOpen(true);
                                        }}
                                      >
                                        <FileCheck className="w-4 h-4 mr-2" />
                                        Approve Payment (LKR {payment.amount.toLocaleString()})
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                  </>
                                )}

                                <DropdownMenuItem onClick={() => viewInvoice(trip)}>
                                  <Receipt className="w-4 h-4 mr-2" />
                                  View Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredTrips.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No trips found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {paymentModalOpen && selectedTrip && (
        <PaymentConfirmationModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedTrip(null);
          }}
          onConfirm={handlePaymentConfirmation}
          quotationData={{
            quotation_no: selectedTrip.quotation_no,
            customer_name: selectedTrip.customer_name,
            gross_revenue: selectedTrip.gross_revenue,
            advance_paid: selectedTrip.advance_paid,
            balance_due: selectedTrip.balance_due,
            fuel_cost_fuel_only: selectedTrip.fuel_cost_fuel_only,
            commission_pass_through_amount: selectedTrip.commission_pass_through_amount,
            discount_amount_lkr: selectedTrip.discount_amount_lkr,
          }}
          loading={loading}
        />
      )}

      {financeApprovalModalOpen && selectedFinancePayment && (
        <FinanceApprovalModal
          isOpen={financeApprovalModalOpen}
          onClose={() => {
            setFinanceApprovalModalOpen(false);
            setSelectedFinancePayment(null);
          }}
          onApprove={(notes) => handleFinanceApproval(selectedFinancePayment.id, notes)}
          onReject={(reason) => handleFinanceRejection(selectedFinancePayment.id, reason)}
          paymentData={selectedFinancePayment}
          loading={financeLoading}
        />
      )}

      {statusModalOpen && selectedTrip && (
        <EnhancedTripStatusManagementModal
          open={statusModalOpen}
          onOpenChange={() => {
            setStatusModalOpen(false);
            setSelectedTrip(null);
          }}
          trip={{
            id: selectedTrip.id,
            quotation: {
              quotation_no: selectedTrip.quotation_no,
              customer_name: selectedTrip.customer_name,
              pickup_location: selectedTrip.pickup_location,
              drop_location: selectedTrip.drop_location,
              pickup_datetime: selectedTrip.pickup_datetime,
              number_of_passengers: selectedTrip.number_of_passengers,
            },
            total_amount: calculateTotalAmount(selectedTrip),
            advance_paid: selectedTrip.advance_paid || 0,
            status: selectedTrip.status,
            trip_status: selectedTrip.status, // Use status as trip_status for now
          }}
          onStatusChange={async (data) => {
            console.log('Status update:', data);
            refetch();
          }}
          loading={statusLoading}
        />
      )}

      {detailsModalOpen && selectedTrip && (
        <TripDetailsModal
          open={detailsModalOpen}
          onOpenChange={() => {
            setDetailsModalOpen(false);
            setSelectedTrip(null);
          }}
          trip={{
            ...selectedTrip,
            quotation_id: selectedTrip.id,
            quotation: {
              quotation_no: selectedTrip.quotation_no,
              customer_name: selectedTrip.customer_name,
              customer_phone: selectedTrip.customer_phone,
              customer_email: selectedTrip.customer_email,
              company_name: selectedTrip.company_name,
              pickup_location: selectedTrip.pickup_location,
              drop_location: selectedTrip.drop_location,
              pickup_datetime: selectedTrip.pickup_datetime,
              drop_datetime: selectedTrip.drop_datetime,
              number_of_buses: selectedTrip.number_of_buses,
              number_of_passengers: selectedTrip.number_of_passengers,
              gross_revenue: calculateTotalAmount(selectedTrip),
              fuel_cost_fuel_only: selectedTrip.fuel_cost_fuel_only,
              commission_pass_through_amount: selectedTrip.commission_pass_through_amount,
              discount_amount_lkr: selectedTrip.discount_amount_lkr,
            },
            total_amount: calculateTotalAmount(selectedTrip),
          }}
          onViewInvoice={(type) => viewInvoice(selectedTrip)}
          onDownloadInvoice={(type) => handleDownloadInvoice()}
          onViewPaymentProof={(url) => window.open(url, '_blank')}
        />
      )}

      {invoiceViewerOpen && currentInvoiceData && (
        <InvoiceViewer
          isOpen={invoiceViewerOpen}
          onClose={() => setInvoiceViewerOpen(false)}
          invoiceData={currentInvoiceData}
          onDownload={handleDownloadInvoice}
        />
      )}
    </div>
  );
}