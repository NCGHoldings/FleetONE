import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Clock, CheckCircle, XCircle, AlertCircle, Phone, Building, RefreshCw, CreditCard, FileCheck, RotateCcw, FileText, Mail, Calculator, BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSpecialHire, type QuotationWithPayments } from '@/hooks/useRealtimeSpecialHire';
import { useFinanceApproval } from '@/hooks/useFinanceApproval';
import { PaymentConfirmationModal, type PaymentConfirmationData } from './PaymentConfirmationModal';
import { FinanceApprovalModal } from './FinanceApprovalModal';
import { EnhancedTripStatusManagementModal } from './EnhancedTripStatusManagementModal';
import { TripDetailsModal } from './TripDetailsModal';
import { useDocumentManagement } from '@/hooks/useDocumentManagement';
import { DocumentViewer } from './DocumentViewer';
import { InvoiceViewer } from './InvoiceViewer';
import AdvanceDetailsModal from './AdvanceDetailsModal';
import { PostTripAdjustmentModal } from './PostTripAdjustmentModal';
import { GenerateBalanceInvoiceModal } from './GenerateBalanceInvoiceModal';
import { VehicleAssignmentModal } from './VehicleAssignmentModal';
import { generateInvoiceHTML, generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { resolveBusType, calculateTotalKm, getTripDistance, getQuotationAdditionalDistance } from '@/lib/special-hire-invoice-helpers';
import { getDocumentLabel } from '@/lib/special-hire-document-helpers';
import { PaymentTimelineFresh } from './PaymentTimelineFresh';
import { SpecialHireFinanceSettlement } from './SpecialHireFinanceSettlement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SignatureWorkflowIndicator, type SignerSetting } from './SignatureWorkflowIndicator';

export function ConfirmedTripsTable() {
  const { quotations, loading: realtimeLoading, refetch } = useRealtimeSpecialHire();
  const { user, hasRole } = useAuth();
  const { approvePayment, rejectPayment, generateApprovedInvoice, retryARIntegration, isLoading: financeLoading } = useFinanceApproval();
  const { generateAndStoreDraftDocument, getDocumentsByQuotation, regenerateDocument, approveDocument } = useDocumentManagement();
  const { getEffectiveCompanyId } = useCompany();
  
  // State for filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [documentFilter, setDocumentFilter] = useState('all');
  
  // Modal states
  const [selectedTrip, setSelectedTrip] = useState<QuotationWithPayments | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [financeApprovalModalOpen, setFinanceApprovalModalOpen] = useState(false);
  const [selectedFinancePayment, setSelectedFinancePayment] = useState<any>(null);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<InvoiceData | null>(null);
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [quotationDocuments, setQuotationDocuments] = useState<any[]>([]);
  const [advanceDetailsModalOpen, setAdvanceDetailsModalOpen] = useState(false);
  const [documentsData, setDocumentsData] = useState<Record<string, any[]>>({});
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentsData, setAdjustmentsData] = useState<Record<string, any>>({});
  const [balanceInvoiceModalOpen, setBalanceInvoiceModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<any | null>(null);
  const [paymentHistoryModalOpen, setPaymentHistoryModalOpen] = useState(false);
  const [financeSettlementModalOpen, setFinanceSettlementModalOpen] = useState(false);
  const [vehicleAssignmentModalOpen, setVehicleAssignmentModalOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [signerSettings, setSignerSettings] = useState<Record<string, SignerSetting>>({});
  const [hideSignaturePage, setHideSignaturePage] = useState(false);
  // Check user roles
  const isFinanceUser = hasRole('finance') || hasRole('admin') || hasRole('super_admin');
  const isOperationsUser = hasRole('admin') || hasRole('super_admin') || hasRole('supervisor');

  // Load adjustments data for all quotations
  const loadAdjustmentData = async (quotationId: string) => {
    try {
      const { data, error } = await supabase
        .from('special_hire_trip_adjustments')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setAdjustmentsData(prev => ({ ...prev, [quotationId]: data }));
      }
    } catch (error) {
      console.error('Error loading adjustment data:', error);
    }
  };

  // Filter quotations based on search and filters
  const filteredTrips = useMemo(() => {
    let filtered = quotations.filter(quotation => quotation.status === 'confirmed');

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const queryClean = query.replace(/,/g, '');
      
      filtered = filtered.filter(trip => {
        const totalAmountStr = trip.gross_revenue ? trip.gross_revenue.toString().replace(/,/g, '') : '';
        const paidAmountStr = trip.advance_paid ? trip.advance_paid.toString().replace(/,/g, '') : '';
        const balanceAmountStr = trip.balance_due ? trip.balance_due.toString().replace(/,/g, '') : '';
        
        return trip.quotation_no.toLowerCase().includes(query) ||
          trip.customer_name.toLowerCase().includes(query) ||
          (trip.company_name && trip.company_name.toLowerCase().includes(query)) ||
          trip.pickup_location.toLowerCase().includes(query) ||
          trip.drop_location.toLowerCase().includes(query) ||
          (trip.customer_phone && trip.customer_phone.toLowerCase().includes(query)) ||
          (trip.customer_email && trip.customer_email.toLowerCase().includes(query)) ||
          totalAmountStr.includes(queryClean) ||
          paidAmountStr.includes(queryClean) ||
          balanceAmountStr.includes(queryClean);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => {
        const currentStatus = trip.trip_status || trip.status; // Use trip_status as primary, fallback to status
        switch (statusFilter) {
          case 'paid':
            return currentStatus === 'paid' || currentStatus === 'completed';
          case 'pending':
            return currentStatus === 'confirmed';
          case 'completed':
            return currentStatus === 'completed';
          case 'cancelled':
            return currentStatus === 'cancelled';
          case 'on_hold':
            return currentStatus === 'on_hold';
          case 'no_bus_allocated':
            return currentStatus === 'no_bus_allocated';
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

    // Apply document filter
    if (documentFilter !== 'all') {
      filtered = filtered.filter(trip => {
        const docs = documentsData[trip.id] || [];
        
        switch (documentFilter) {
          case 'email_sent':
            return docs.some(d => d.email_status === 'sent');
          case 'ready_to_send':
            return docs.some(d => d.ready_to_send && d.email_status !== 'sent');
          case 'no_email':
            return docs.some(d => d.email_status === 'no_email');
          case 'incomplete_signatures':
            return docs.some(d => (d.document_approvals?.length || 0) < 3);
          case 'no_documents':
            return docs.length === 0;
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
  }, [quotations, searchQuery, statusFilter, paymentFilter, dateFilter, documentFilter, documentsData]);

  // Load adjustments for all confirmed trips (Batched to prevent N+1 queries)
  useEffect(() => {
    const loadAllAdjustments = async () => {
      const confirmedQuotations = quotations.filter(q => q.status === 'confirmed');
      if (confirmedQuotations.length === 0) return;
      
      try {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Adjustments load timeout')), 5000)
        );

        const fetchPromise = (async () => {
          const tripIds = confirmedQuotations.map(t => t.id);
          const chunks = [];
          for (let i = 0; i < tripIds.length; i += 100) {
            chunks.push(tripIds.slice(i, i + 100));
          }
          
          const newAdjustmentsData: Record<string, any> = {};
          
          await Promise.all(chunks.map(async (chunk) => {
            const { data, error } = await supabase
              .from('special_hire_trip_adjustments')
              .select('*')
              .in('quotation_id', chunk)
              .order('created_at', { ascending: false });
              
            if (error) throw error;
            
            if (data) {
              data.forEach(adj => {
                if (!newAdjustmentsData[adj.quotation_id]) {
                  newAdjustmentsData[adj.quotation_id] = adj;
                }
              });
            }
          }));
          return newAdjustmentsData;
        })();

        const result = await Promise.race([fetchPromise, timeoutPromise]);
        
        setAdjustmentsData(prev => ({ ...prev, ...result }));
        
        try {
          localStorage.setItem('cached_special_hire_adjustments', JSON.stringify(result));
        } catch (e) {
          // Ignore quota error
        }
      } catch (error) {
        console.warn('Error or timeout batch loading adjustment data:', error);
        try {
          const cached = localStorage.getItem('cached_special_hire_adjustments');
          if (cached) {
            setAdjustmentsData(prev => ({ ...prev, ...JSON.parse(cached) }));
          }
        } catch (e) {}
      }
    };
    
    loadAllAdjustments();
  }, [quotations]);

  const calculateTotalAmount = (quotation: QuotationWithPayments) => {
    const hireAll = quotation.gross_revenue || 0;
    const fuelAll = quotation.fuel_cost_fuel_only || 0; // already total across buses
    const commission = quotation.commission_pass_through_amount || 0;
    const additional = quotation.total_additional_charges || 0;
    const discount = quotation.discount_amount_lkr || 0;
    const base = hireAll + fuelAll + commission + additional - discount;
    const adjustmentPct = (quotation as any).percentage_adjustment || 0;
    const adjustmentAmount = base * (adjustmentPct / 100);
    const baseTotal = Math.round(base + adjustmentAmount);
    
    // Include post-trip adjustment amounts if finalized
    const postTripAdjustment = quotation.adjustment_amount || 0;
    return baseTotal + postTripAdjustment;
  };

  const getTripStatusBadge = (status: string) => {
    // Use trip_status if available, fallback to status
    const displayStatus = status || 'confirmed';
    
    switch (displayStatus) {
      case 'confirmed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'on_hold':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />On Hold</Badge>;
      case 'no_bus_allocated':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" />No Bus Available</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{displayStatus}</Badge>;
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
      
      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('User not authenticated. Please refresh the page and try again.');
      }
      
      // Enforce 'advance' payment type if the trip is not completed yet
      const isTripCompleted = selectedTrip.trip_status === 'completed';
      const effectivePaymentType = isTripCompleted ? paymentData.paymentType : 'advance';
      
      // Create payment record with pending status
      const { data: paymentResponse, error: paymentError } = await supabase
        .from('special_hire_payments')
        .insert({
          quotation_id: selectedTrip.id,
          amount: paymentData.amount,
          payment_type: effectivePaymentType,
          payment_method: paymentData.method,
          reference_no: paymentData.reference,
          payment_proof_url: paymentData.paymentProofUrl,
          notes: paymentData.notes,
          status: 'pending_finance', // Operations confirms, now needs finance approval
          created_by: user.id,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Payment insertion error:', paymentError);
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }

      if (!paymentResponse) {
        throw new Error('No payment record returned from database');
      }

      // Run non-critical operations in parallel (quotation update + notification)
      const parallelOps: Promise<any>[] = [];

      if (paymentData.driverName || paymentData.conductorName || paymentData.busNo) {
        parallelOps.push(
          supabase
            .from('special_hire_quotations')
            .update({
              assigned_driver_name: paymentData.driverName,
              assigned_conductor_name: paymentData.conductorName,
              assigned_bus_no: paymentData.busNo,
            })
            .eq('id', selectedTrip.id)
            .then(({ error }) => { if (error) console.warn('Quotation update warning:', error); }) as unknown as Promise<any>
        );
      }

      parallelOps.push(
        supabase
          .from('payment_notifications')
          .insert({
            payment_id: paymentResponse.id,
            quotation_id: selectedTrip.id,
            notification_type: 'finance_approval_required',
            target_role: 'finance',
            message: `Payment of LKR ${paymentData.amount.toLocaleString()} for quotation ${selectedTrip.quotation_no} requires finance approval.`,
            created_by: user.id,
          })
          .then(({ error }) => { if (error) console.warn('Notification warning:', error); }) as unknown as Promise<any>
      );

      await Promise.allSettled(parallelOps);

      // Show success immediately - document generation runs in background
      toast.success('Payment confirmed! Awaiting finance approval.');
      setPaymentModalOpen(false);
      const tripForDoc = selectedTrip;
      const paymentIdForDoc = paymentResponse.id;
      setSelectedTrip(null);
      refetch();

      // Compute cumulative total paid to date (all approved payments + this new one)
      const { data: allPriorPayments } = await supabase
        .from('special_hire_payments')
        .select('amount')
        .eq('quotation_id', tripForDoc.id)
        .eq('status', 'approved');
      const priorPaidTotal = (allPriorPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const totalPaidToDate = priorPaidTotal + paymentData.amount; // include current (pending) payment

      // Fire-and-forget: Generate draft document in background
      const draftInvoiceData: InvoiceData = {
        invoiceNo: `DRAFT-${paymentIdForDoc}`,
        invoiceType: paymentData.paymentType as 'advance' | 'balance',
        quotationNo: tripForDoc.quotation_no,
        customerName: tripForDoc.customer_name,
        customerPhone: tripForDoc.customer_phone || '',
        customerEmail: tripForDoc.customer_email,
        companyName: tripForDoc.company_name,
        pickupLocation: tripForDoc.pickup_location,
        dropLocation: tripForDoc.drop_location,
        pickupDate: new Date(tripForDoc.pickup_datetime),
        dropDate: new Date(tripForDoc.drop_datetime || tripForDoc.pickup_datetime),
        busType: resolveBusType(tripForDoc),
        numberOfBuses: tripForDoc.number_of_buses,
        numberOfPassengers: tripForDoc.number_of_passengers,
        totalAmount: calculateTotalAmount(tripForDoc) + (adjustmentsData[tripForDoc.id]?.extra_km_total_charge || 0) + (adjustmentsData[tripForDoc.id]?.total_additional_expenses || 0),
        advanceAmount: tripForDoc.advance_paid || 0,
        paidAmount: paymentData.amount,
        totalPaidToDate,
        vehicleNo: paymentData.busNo || tripForDoc.assigned_bus_no,
        driverName: paymentData.driverName || tripForDoc.assigned_driver_name,
        conductorName: paymentData.conductorName || tripForDoc.assigned_conductor_name,
        invoice_status: 'draft' as const,
        document_type: 'sales_receipt' as const,
        hideSignaturePage,
        hireType: tripForDoc.hire_type || 'External',
        intermediateStops: (() => {
          try {
            if (tripForDoc.intermediate_stops) {
              const parsed = typeof tripForDoc.intermediate_stops === 'string'
                ? JSON.parse(tripForDoc.intermediate_stops)
                : tripForDoc.intermediate_stops;
              return Array.isArray(parsed) ? parsed : [];
            }
          } catch {}
          return [];
        })(),
      };

      console.log('🚀 Triggering run-in-background document generation for:', draftInvoiceData.invoiceNo);
      generateAndStoreDraftDocument(draftInvoiceData, tripForDoc.id, paymentIdForDoc)
        .then(result => { 
          if (!result.success) {
            console.error('❌ Background doc gen failed:', result.error);
            toast.error(`Document generation failed: ${result.error?.message || 'Unknown error'}`);
          } else {
            console.log('✅ Background doc gen SUCCESS! Reloading document status for UI...');
            // Reload the document status for this trip so the UI updates with the new preview badge
            loadDocumentStatus(tripForDoc.id);
          }
        })
        .catch(err => {
          console.error('❌ Background doc gen PROMISE error:', err);
          toast.error(`Document generation error: ${err.message || 'Unknown error'}`);
        });
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle trip status changes with comprehensive financial adjustments
  const handleStatusChange = async (data: any) => {
    if (!selectedTrip) return;

    try {
      setStatusLoading(true);
      
      // Call the database function that handles status changes and financial adjustments
      const { data: result, error } = await supabase.rpc('update_trip_status_with_adjustments', {
        p_quotation_id: selectedTrip.id,
        p_new_status: data.status,
        p_reason: data.reason || null,
        p_refund_amount: data.refundAmount || null,
        p_refund_status: data.refundStatus || null,
        p_changed_by: user?.id || null
      });

      if (error) {
        console.error('Database function error:', error);
        throw error;
      }

      // Type cast the result to get proper access to properties
      const functionResult = result as any;

      if (!functionResult?.success) {
        throw new Error(functionResult?.error || 'Failed to update trip status');
      }

      // Enhanced success message with financial impact details
      let message = `Trip status updated to ${data.status}`;
      
      if (data.status === 'cancelled' && data.refundAmount) {
        message += ` with refund of LKR ${data.refundAmount.toLocaleString()}`;
        
        // Show financial impact if available
        const financial = functionResult.financial_impact;
        if (financial && financial.old_total_paid !== financial.new_total_paid) {
          message += `. Total paid adjusted from LKR ${financial.old_total_paid?.toLocaleString() || '0'} to LKR ${financial.new_total_paid?.toLocaleString() || '0'}`;
        }
      }
      
      toast.success(message);
      
      // Close modal and refresh data
      setStatusModalOpen(false);
      setSelectedTrip(null);
      refetch();
      
    } catch (error) {
      console.error('Error updating trip status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update trip status. Please try again.';
      toast.error(errorMessage);
    } finally {
      setStatusLoading(false);
    }
  };

  // Load documents for a quotation
  const loadDocuments = async (quotationId: string) => {
    setDocumentsLoading(true);
    try {
      const result = await getDocumentsByQuotation(quotationId);
      if (result.success) {
        setQuotationDocuments(result.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Fetch document signature status for a quotation
  const fetchDocumentSignatureStatus = async (quotationId: string) => {
    try {
      const { data: documents } = await supabase
        .from('document_storage')
        .select(`
          id,
          document_type,
          payment_type,
          document_status,
          storage_path,
          file_name,
          generated_at,
          email_status,
          ready_to_send,
          email_sent_at,
          document_approvals (
            id,
            approval_type,
            approver_name,
            approval_date,
            user_id
          )
        `)
        .eq('quotation_id', quotationId);
      
      return documents || [];
    } catch (error) {
      console.error('Error fetching document status:', error);
      return [];
    }
  };

  // Load document status for a quotation
  const loadDocumentStatus = async (quotationId: string) => {
    const docs = await fetchDocumentSignatureStatus(quotationId);
    setDocumentsData(prev => ({
      ...prev,
      [quotationId]: docs
    }));
  };

  // Load signer settings ONCE for the entire table
  useEffect(() => {
    const loadSignerSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from('special_hire_signature_settings')
          .select('signature_role, default_user_id, is_enabled');

        const signerMap: Record<string, SignerSetting> = {};
        
        if (settings) {
          const userIds = settings.filter(s => s.default_user_id).map(s => s.default_user_id);
          
          const profilesMap: Record<string, string> = {};
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .in('id', userIds);
            
            if (profiles) {
              profiles.forEach(p => {
                const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ');
                if (fullName) profilesMap[p.id] = fullName;
              });
            }
          }
          
          const getRoleFallbackLabel = (role: string): string => {
            switch (role) {
              case 'prepared_by': return 'Preparer';
              case 'checked_by': return 'Checker';
              case 'approved_by': return 'Finance';
              default: return 'Not Set';
            }
          };

          settings.forEach(setting => {
            if (setting.signature_role === 'signature_page') {
              // This controls visibility of the entire signature page on documents
              return;
            }
            const name = setting.default_user_id ? profilesMap[setting.default_user_id] : undefined;
            signerMap[setting.signature_role] = {
              role: setting.signature_role,
              name: name || getRoleFallbackLabel(setting.signature_role),
              isEnabled: setting.is_enabled
            };
          });

          // Check if signature page is disabled
          const sigPageSetting = settings.find(s => s.signature_role === 'signature_page');
          if (sigPageSetting && !sigPageSetting.is_enabled) {
            setHideSignaturePage(true);
          } else {
            setHideSignaturePage(false);
          }
        }
        
        setSignerSettings(signerMap);
      } catch (error) {
        console.error('Error loading signer settings:', error);
      }
    };
    loadSignerSettings();
  }, []);

  // Load document statuses for all confirmed quotations (BATCHED to prevent N+1 queries)
  useEffect(() => {
    const loadAllDocuments = async () => {
      const confirmedQuotations = quotations.filter(q => q.status === 'confirmed');
      if (confirmedQuotations.length === 0) return;
      
      setDocumentsLoading(true);
      
      try {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Documents load timeout')), 5000)
        );

        const fetchPromise = (async () => {
          const tripIds = confirmedQuotations.map(t => t.id);
          const chunks = [];
          for (let i = 0; i < tripIds.length; i += 100) {
            chunks.push(tripIds.slice(i, i + 100));
          }
          
          const newDocumentsData: Record<string, any[]> = {};
          
          await Promise.all(chunks.map(async (chunk) => {
            const { data: documents, error } = await supabase
              .from('document_storage')
              .select(`
                id,
                quotation_id,
                document_type,
                payment_type,
                document_status,
                storage_path,
                file_name,
                generated_at,
                email_status,
                ready_to_send,
                email_sent_at,
                document_approvals (
                  id,
                  approval_type,
                  approver_name,
                  approval_date,
                  user_id
                )
              `)
              .in('quotation_id', chunk);
              
            if (error) throw error;
            
            if (documents) {
              documents.forEach(doc => {
                if (!newDocumentsData[doc.quotation_id]) {
                  newDocumentsData[doc.quotation_id] = [];
                }
                newDocumentsData[doc.quotation_id].push(doc);
              });
            }
          }));
          return newDocumentsData;
        })();

        const result = await Promise.race([fetchPromise, timeoutPromise]);
        
        setDocumentsData(prev => ({ ...prev, ...result }));
        
        try {
          localStorage.setItem('cached_special_hire_documents', JSON.stringify(result));
        } catch (e) {
          // Ignore quota error
        }
      } catch (error) {
        console.warn('Error or timeout batch loading documents:', error);
        try {
          const cached = localStorage.getItem('cached_special_hire_documents');
          if (cached) {
            setDocumentsData(prev => ({ ...prev, ...JSON.parse(cached) }));
          }
        } catch (e) {}
      } finally {
        setDocumentsLoading(false);
      }
    };
    
    loadAllDocuments();
  }, [quotations]);

  // Subscribe to realtime changes for documents and signatures
  useEffect(() => {
    const channel = supabase
      .channel('document-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_storage'
        },
        (payload) => {
          // Reload document status for affected quotation
          if (payload.new && (payload.new as any).quotation_id) {
            loadDocumentStatus((payload.new as any).quotation_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_approvals'
        },
        async (payload) => {
          // Find quotation_id from document_id
          if (payload.new && (payload.new as any).document_id) {
            const { data } = await supabase
              .from('document_storage')
              .select('quotation_id')
              .eq('id', (payload.new as any).document_id)
              .single();
            
            if (data?.quotation_id) {
              loadDocumentStatus(data.quotation_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Render email status badge
  const renderEmailStatusBadge = (emailStatus: string, readyToSend: boolean) => {
    if (emailStatus === 'sent') {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Email Sent
        </Badge>
      );
    } else if (emailStatus === 'no_email') {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          No Email
        </Badge>
      );
    } else if (readyToSend) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Ready
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          Not Sent
        </Badge>
      );
    }
  };

  // Render signature status
  const renderSignatureStatus = (approvals: any[]) => {
    const preparedBy = approvals?.find(a => a.approval_type === 'prepared_by');
    const checkedBy = approvals?.find(a => a.approval_type === 'checked_by');
    const approvedBy = approvals?.find(a => a.approval_type === 'approved_by');
    
    const userSigned = approvals?.some(a => a.user_id === user?.id);
    
    return (
      <div className="flex items-center gap-1">
        {/* Prepared By indicator */}
        <div 
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            preparedBy 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}
          title={preparedBy ? `Prepared by ${preparedBy.approver_name}` : 'Prepared By - Missing'}
        >
          P
        </div>
        
        {/* Checked By indicator */}
        <div 
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            checkedBy 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}
          title={checkedBy ? `Checked by ${checkedBy.approver_name}` : 'Checked By - Missing'}
        >
          C
        </div>
        
        {/* Approved By indicator */}
        <div 
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            approvedBy 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}
          title={approvedBy ? `Approved by ${approvedBy.approver_name}` : 'Approved By - Missing'}
        >
          A
        </div>
        
        {/* Current user indicator */}
        {userSigned && (
          <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 text-xs">
            You Signed
          </Badge>
        )}
      </div>
    );
  };

  // Render document status summary
  const renderDocumentStatusSummary = (documents: any[]) => {
    const salesReceipts = documents.filter(d => d.document_type === 'sales_receipt');
    const finalInvoice = documents.find(d => d.document_type === 'invoice');
    
    return (
      <div className="space-y-1">
        {salesReceipts.length > 0 && (
          <div className="text-xs flex items-center gap-1">
            <span className="font-medium">SR ×{salesReceipts.length}:</span>{' '}
            {renderEmailStatusBadge(salesReceipts[salesReceipts.length - 1].email_status, salesReceipts[salesReceipts.length - 1].ready_to_send)}
          </div>
        )}
        {finalInvoice && (
          <div className="text-xs flex items-center gap-1">
            <span className="font-medium">Invoice:</span>{' '}
            {renderEmailStatusBadge(finalInvoice.email_status, finalInvoice.ready_to_send)}
          </div>
        )}
        {salesReceipts.length === 0 && !finalInvoice && (
          <span className="text-xs text-muted-foreground">No documents</span>
        )}
      </div>
    );
  };

  // View document
  const handleViewDocument = async (document: any) => {
    setCurrentDocument(document);
    setDocumentViewerOpen(true);
  };

  // Handle finance approval with document approval
  const handleFinanceApproval = async (paymentId: string, notes?: string, signatures?: any) => {
    const result = await approvePayment(paymentId, notes, signatures, getEffectiveCompanyId());
    if (result.success) {
      setFinanceApprovalModalOpen(false);
      setSelectedFinancePayment(null);
      // Refresh both quotation data and document statuses
      await refetch();
      // Also reload document statuses for all visible quotations
      if (selectedFinancePayment?.quotation_id) {
        try {
          await getDocumentsByQuotation(selectedFinancePayment.quotation_id);
        } catch (e) {
          console.log('Document refresh after approval:', e);
        }
      }
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
      // Check if there are stored documents for this quotation
      const { success, documents } = await getDocumentsByQuotation(quotation.id);
      
      if (success && documents && documents.length > 0) {
        // Prefer approved over draft, then most recent
        const approved = documents.filter(d => d.document_status === 'approved');
        const latestDocument = approved.length > 0 ? approved[0] : documents[0];
        setCurrentDocument(latestDocument);
        setDocumentViewerOpen(true);
        return;
      }

      // No stored documents — show a message instead of generating ad-hoc preview
      toast.info('No documents have been generated for this quotation yet. A document will be created when a payment is confirmed.');
    } catch (error) {
      console.error('Error viewing documents:', error);
      toast.error('Failed to load documents');
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
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="no_bus_allocated">No Bus Available</SelectItem>
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

            <Select value={documentFilter} onValueChange={setDocumentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by documents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="email_sent">Email Sent</SelectItem>
                <SelectItem value="ready_to_send">Ready (Not Sent)</SelectItem>
                <SelectItem value="no_email">Missing Email</SelectItem>
                <SelectItem value="incomplete_signatures">Incomplete Signatures</SelectItem>
                <SelectItem value="no_documents">No Documents</SelectItem>
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
            <div className="overflow-auto max-h-[calc(100vh-320px)] relative border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold min-w-[120px]">Quotation</TableHead>
                    <TableHead className="font-semibold min-w-[150px]">Customer Details</TableHead>
                    <TableHead className="font-semibold min-w-[140px]">Trip Information</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Vehicle Assignment</TableHead>
                    <TableHead className="font-semibold min-w-[100px]">Status</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Payment</TableHead>
                    <TableHead className="font-semibold min-w-[140px]">Workflow</TableHead>
                    <TableHead className="font-semibold min-w-[140px]">Financial</TableHead>
                    <TableHead className="font-semibold text-center min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.map((trip) => {
                    const pendingFinancePayments = trip.payments?.filter(p => p.status === 'pending_finance') || [];
                    const approvedPayments = trip.payments?.filter(p => p.status === 'approved') || [];
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
                            {(() => {
                              let stops: Array<{ location: string }> = [];
                              try {
                                if (trip.intermediate_stops) {
                                  const parsed = typeof trip.intermediate_stops === 'string' 
                                    ? JSON.parse(trip.intermediate_stops) 
                                    : trip.intermediate_stops;
                                  if (Array.isArray(parsed)) stops = parsed;
                                }
                              } catch {}
                              return stops.map((stop, idx) => (
                                <div key={idx} className="flex items-start space-x-2 text-xs">
                                  <MapPin className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <div className="truncate">{stop.location}</div>
                                </div>
                              ));
                            })()}
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

                        {/* Vehicle Assignment - Clickable */}
                        <TableCell 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedTrip(trip);
                            setVehicleAssignmentModalOpen(true);
                          }}
                          title="Click to edit vehicle assignment"
                        >
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
                              <span className="text-muted-foreground italic">Click to assign →</span>
                            )}
                          </div>
                        </TableCell>

                         {/* Status */}
                         <TableCell>
                           {getTripStatusBadge(trip.trip_status || trip.status)}
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

                        {/* Workflow Column - Combined Email & Signatures with Quick Preview */}
                        <TableCell>
                          <SignatureWorkflowIndicator 
                            quotationId={trip.id}
                            documents={documentsData[trip.id] || []}
                            hasPayments={(trip.payments?.length || 0) > 0}
                            documentsLoading={!documentsData[trip.id] && documentsLoading}
                            signerSettings={signerSettings}
                            onPreviewDocument={(doc) => {
                              if (doc) {
                                setCurrentDocument(doc);
                                setSelectedTrip(trip);
                                setDocumentViewerOpen(true);
                              } else {
                                // Open documents modal when no specific document
                                loadDocuments(trip.id);
                                setSelectedTrip(trip);
                                setDocumentsModalOpen(true);
                              }
                            }}
                          />
                        </TableCell>

                        {/* Financial */}
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="font-medium">Total: LKR {totalAmount.toLocaleString()}</div>
                            {(trip as any).adjustment_amount > 0 && (
                              <div className="text-orange-600">
                                +Adj: LKR {((trip as any).adjustment_amount || 0).toLocaleString()}
                              </div>
                            )}
                            {(trip.total_paid || 0) > 0 && (
                              <div className="text-green-600">Paid: LKR {(trip.total_paid || 0).toLocaleString()}</div>
                            )}
                            {trip.balance_due > 0 && (
                              <div className="text-red-600">Due: LKR {trip.balance_due.toLocaleString()}</div>
                            )}
                            {trip.balance_due === 0 && (trip.total_paid || 0) > 0 && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs mt-1">
                                <CheckCircle className="w-3 h-3 mr-1" />Settled
                              </Badge>
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
                              <DropdownMenuContent align="end" className="w-56">
                                {/* === PAYMENT === */}
                                {isOperationsUser && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrip(trip);
                                      setPaymentModalOpen(true);
                                    }}
                                  >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Confirm Payment
                                  </DropdownMenuItem>
                                )}

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
                                  </>
                                )}
                                {/* Payment History */}
                                {approvedPayments.length > 0 && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrip(trip);
                                      setPaymentHistoryModalOpen(true);
                                    }}
                                  >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Payment History
                                  </DropdownMenuItem>
                                )}
                                
                                {/* Finance Settlement Hub */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTrip(trip);
                                    setFinanceSettlementModalOpen(true);
                                  }}
                                  className="text-blue-700 bg-blue-50 font-medium my-1"
                                >
                                  <BookOpen className="w-4 h-4 mr-2" />
                                  Finance Settlement Hub
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {/* === OPERATIONS === */}
                                {isOperationsUser && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedTrip(trip);
                                        setStatusModalOpen(true);
                                      }}
                                    >
                                      <Settings className="w-4 h-4 mr-2" />
                                      Update Status
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedTrip(trip);
                                        setAdvanceDetailsModalOpen(true);
                                      }}
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      Advance Details Form
                                    </DropdownMenuItem>

                                    {(trip.trip_status === 'confirmed' || trip.trip_status === 'completed') && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedTrip(trip);
                                          setAdjustmentModalOpen(true);
                                        }}
                                      >
                                        <Calculator className="w-4 h-4 mr-2" />
                                        Post-Trip Adjustment
                                        {adjustmentsData[trip.id] && (
                                          <Badge variant="outline" className="ml-2 text-xs">
                                            {adjustmentsData[trip.id].adjustment_status}
                                          </Badge>
                                        )}
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}

                                <DropdownMenuSeparator />

                                {/* === DOCUMENTS === */}
                                <DropdownMenuItem
                                  onClick={async () => {
                                    await loadDocuments(trip.id);
                                    setSelectedTrip(trip);
                                    setDocumentsModalOpen(true);
                                  }}
                                >
                                  <FileCheck className="w-4 h-4 mr-2" />
                                  View Documents
                                </DropdownMenuItem>

                                {/* Generate Final Invoice - Only after trip completion */}
                                {trip.trip_status === 'completed' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrip(trip);
                                      const adj = adjustmentsData[trip.id];
                                      setSelectedAdjustment(adj || null);
                                      setBalanceInvoiceModalOpen(true);
                                    }}
                                  >
                                    <FileText className="w-4 h-4 mr-2 text-orange-600" />
                                    Generate Final Invoice
                                  </DropdownMenuItem>
                                )}
                                {trip.trip_status === 'confirmed' && (
                                  <DropdownMenuItem disabled className="opacity-50">
                                    <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                                    Generate Final Invoice
                                    <span className="ml-auto text-xs text-muted-foreground">Trip must complete</span>
                                  </DropdownMenuItem>
                                )}

                                {/* View existing Final Invoice */}
                                {adjustmentsData[trip.id]?.balance_invoice_document_id && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        const { data: doc } = await supabase
                                          .from('document_storage')
                                          .select('*')
                                          .eq('id', adjustmentsData[trip.id].balance_invoice_document_id)
                                          .single();
                                        if (doc) {
                                          setCurrentDocument(doc);
                                          setSelectedTrip(trip);
                                          setDocumentViewerOpen(true);
                                        } else {
                                          toast.error('Final invoice document not found');
                                        }
                                      } catch (error) {
                                        console.error('Error loading final invoice:', error);
                                        toast.error('Failed to load final invoice');
                                      }
                                    }}
                                  >
                                    <Receipt className="w-4 h-4 mr-2 text-orange-600" />
                                    View Final Invoice
                                  </DropdownMenuItem>
                                )}

                                {/* Send Payment Reminder - invoice without signatures, NO GL */}
                                {trip.balance_due > 0 && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        // Fetch adjustment data if exists
                                        let adjustment: any = null;
                                        if (trip.has_finalized_adjustment) {
                                          const { data: adjData } = await (supabase
                                            .from('special_hire_trip_adjustments') as any)
                                            .select('*')
                                            .eq('quotation_id', trip.id)
                                            .eq('is_finalized', true)
                                            .order('created_at', { ascending: false })
                                            .limit(1)
                                            .single();
                                          adjustment = adjData;
                                        }

                                        // Generate proper invoice number
                                        let invoiceNo = `REM-${trip.quotation_no}`;
                                        // Check if a balance invoice already exists
                                        const existingInvoice = trip.invoices?.find((inv: any) => inv.invoice_type === 'balance' || inv.invoice_type === 'final');
                                        if (existingInvoice?.invoice_no) {
                                          invoiceNo = existingInvoice.invoice_no;
                                        } else {
                                          try {
                                            const { data: genNo } = await supabase.rpc('generate_entity_number', {
                                              p_entity_type: 'ar_invoice',
                                              p_company_id: null,
                                            });
                                            if (genNo) invoiceNo = genNo;
                                          } catch (e) {
                                            console.warn('Numbering fallback for payment reminder:', e);
                                          }
                                        }

                                        const reminderData: InvoiceData = {
                                          invoiceNo,
                                          invoiceType: 'balance',
                                          quotationNo: trip.quotation_no,
                                          customerName: trip.customer_name,
                                          customerPhone: trip.customer_phone || '',
                                          customerEmail: trip.customer_email,
                                          companyName: trip.company_name,
                                          pickupLocation: trip.pickup_location,
                                          dropLocation: trip.drop_location,
                                          pickupDate: new Date(trip.pickup_datetime),
                                          dropDate: new Date(trip.drop_datetime || trip.pickup_datetime),
                                          busType: resolveBusType(trip),
                                          numberOfBuses: trip.number_of_buses,
                                          numberOfPassengers: trip.number_of_passengers,
                                          totalAmount: totalAmount,
                                          advanceAmount: trip.advance_paid || 0,
                                          balanceAmount: trip.balance_due,
                                          paidAmount: trip.total_paid || 0,
                                          companyLogo,
                                          vehicleNo: trip.assigned_bus_no || '',
                                          driverName: trip.assigned_driver_name || '',
                                          conductorName: trip.assigned_conductor_name || '',
                                          tripDistance: getTripDistance(trip),
                                          totalKm: calculateTotalKm(trip),
                                          invoice_status: 'approved',
                                          document_type: 'invoice',
                                          forCustomer: true,
                                          // Adjustment data
                                          hasAdjustments: !!adjustment,
                                          originalQuotedKm: adjustment ? (adjustment.original_quoted_km || getTripDistance(trip)) : undefined,
                                          actualKmTraveled: adjustment?.actual_km_traveled,
                                          extraKm: adjustment?.extra_km,
                                          extraKmChargePerKm: adjustment?.extra_km_charge_per_km,
                                          extraKmTotalCharge: adjustment?.extra_km_total_charge,
                                          additionalExpenses: adjustment?.additional_expenses || [],
                                          totalAdditionalExpenses: adjustment?.total_additional_expenses,
                                          adjustmentNotes: adjustment?.notes,
                                          hideSignaturePage,
                                          hireType: trip.hire_type || 'External',
                                          intermediateStops: (() => {
                                            try {
                                              if (trip.intermediate_stops) {
                                                let parsed = typeof trip.intermediate_stops === 'string'
                                                  ? JSON.parse(trip.intermediate_stops)
                                                  : trip.intermediate_stops;
                                                if (typeof parsed === 'string') {
                                                  parsed = JSON.parse(parsed);
                                                }
                                                return Array.isArray(parsed) ? parsed : [];
                                              }
                                            } catch (e) {
                                              console.error("Failed to parse intermediate stops for reminder", e);
                                            }
                                            return [];
                                          })(),
                                        };

                                        const pdfBlob = await generateInvoicePDF(reminderData);
                                        const blobUrl = URL.createObjectURL(pdfBlob);
                                        const link = document.createElement('a');
                                        link.href = blobUrl;
                                        link.download = `Payment-Reminder-${trip.quotation_no}.pdf`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(blobUrl);

                                        toast.success('Payment reminder downloaded successfully.');
                                      } catch (error) {
                                        console.error('Error generating payment reminder:', error);
                                        toast.error('Failed to generate payment reminder');
                                      }
                                    }}
                                  >
                                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                                    Send Payment Reminder
                                  </DropdownMenuItem>
                                )}

                                {/* Email Sales Receipts - show all approved receipts */}
                                {(() => {
                                  const tripDocs = documentsData[trip.id] || [];
                                  const approvedReceipts = tripDocs.filter(
                                    (d: any) => d.document_type === 'sales_receipt' && d.document_status === 'approved'
                                  );
                                  if (approvedReceipts.length === 0) return null;
                                  if (approvedReceipts.length === 1) {
                                    return (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setCurrentDocument(approvedReceipts[0]);
                                          setSelectedTrip(trip);
                                          setDocumentViewerOpen(true);
                                        }}
                                      >
                                        <Mail className="w-4 h-4 mr-2 text-green-600" />
                                        Email Sales Receipt
                                      </DropdownMenuItem>
                                    );
                                  }
                                  return approvedReceipts.map((sr: any, idx: number) => (
                                    <DropdownMenuItem
                                      key={`sr-email-${sr.id}`}
                                      onClick={() => {
                                        setCurrentDocument(sr);
                                        setSelectedTrip(trip);
                                        setDocumentViewerOpen(true);
                                      }}
                                    >
                                      <Mail className="w-4 h-4 mr-2 text-green-600" />
                                      Email Sales Receipt #{idx + 1}
                                    </DropdownMenuItem>
                                  ));
                                })()}

                                <DropdownMenuSeparator />

                                {/* === FINANCE / REGENERATE === */}
                                {approvedPayments.length > 0 && (
                                  <>
                                    {approvedPayments.map((p, idx) => (
                                      <DropdownMenuItem
                                        key={`receipt-${p.id}`}
                                        onClick={() => generateApprovedInvoice(p.id)}
                                        disabled={financeLoading}
                                      >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Re-generate Sales Receipt {approvedPayments.length > 1 ? `#${idx + 1}` : ''}
                                      </DropdownMenuItem>
                                    ))}

                                    {/* Retry AR Integration */}
                                    {isFinanceUser && !trip.ar_invoice_id && (
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          const firstPayment = approvedPayments[0];
                                          const result = await retryARIntegration(firstPayment.id, getEffectiveCompanyId());
                                          if (result.success) {
                                            refetch();
                                          }
                                        }}
                                        disabled={financeLoading}
                                      >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Retry AR Integration
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
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
            number_of_buses: selectedTrip.number_of_buses,
            percentage_adjustment: (selectedTrip as any).percentage_adjustment,
            advance_paid: selectedTrip.advance_paid,
            balance_due: selectedTrip.balance_due,
            total_paid: selectedTrip.total_paid,
            assigned_driver_name: selectedTrip.assigned_driver_name,
            assigned_conductor_name: selectedTrip.assigned_conductor_name,
            assigned_bus_no: selectedTrip.assigned_bus_no,
            fuel_cost_fuel_only: selectedTrip.fuel_cost_fuel_only,
            commission_pass_through_amount: selectedTrip.commission_pass_through_amount,
            discount_amount_lkr: selectedTrip.discount_amount_lkr,
            total_additional_charges: selectedTrip.total_additional_charges,
          }}
          adjustmentData={adjustmentsData[selectedTrip.id] ? {
            extra_km: adjustmentsData[selectedTrip.id].extra_km,
            extra_km_charge_per_km: adjustmentsData[selectedTrip.id].extra_km_charge_per_km,
            extra_km_total_charge: adjustmentsData[selectedTrip.id].extra_km_total_charge,
            additional_expenses: adjustmentsData[selectedTrip.id].additional_expenses,
            total_additional_expenses: adjustmentsData[selectedTrip.id].total_additional_expenses,
            notes: adjustmentsData[selectedTrip.id].notes,
          } : undefined}
          loading={loading}
          onGenerateInvoiceRequest={() => {
            const adj = adjustmentsData[selectedTrip.id];
            if (!adj || adj.adjustment_status !== 'finalized') {
              toast.error('Please finalize post-trip adjustments before generating the balance invoice.');
              return;
            }
            setSelectedAdjustment(adj);
            setPaymentModalOpen(false);
            setBalanceInvoiceModalOpen(true);
          }}
          balanceInvoiceSent={!!adjustmentsData[selectedTrip.id]?.balance_invoice_document_id}
        />
      )}

      {balanceInvoiceModalOpen && selectedTrip && (
        <GenerateBalanceInvoiceModal
          effectiveCompanyId={getEffectiveCompanyId()}
          open={balanceInvoiceModalOpen}
          onOpenChange={(open) => {
            setBalanceInvoiceModalOpen(open);
            if (!open) {
              setSelectedAdjustment(null);
            }
          }}
          quotationData={{
            id: selectedTrip.id,
            quotation_no: selectedTrip.quotation_no,
            customer_name: selectedTrip.customer_name,
            customer_phone: selectedTrip.customer_phone || '',
            customer_email: selectedTrip.customer_email,
            company_name: selectedTrip.company_name,
            pickup_location: selectedTrip.pickup_location,
            drop_location: selectedTrip.drop_location,
            pickup_datetime: selectedTrip.pickup_datetime,
            drop_datetime: selectedTrip.drop_datetime,
            bus_type: resolveBusType(selectedTrip),
            number_of_buses: selectedTrip.number_of_buses,
            number_of_passengers: selectedTrip.number_of_passengers,
            original_quotation_amount: selectedAdjustment?.original_quotation_amount || calculateTotalAmount(selectedTrip),
            gross_revenue: selectedTrip.gross_revenue,
            fuel_cost_fuel_only: selectedTrip.fuel_cost_fuel_only,
            commission_pass_through_amount: selectedTrip.commission_pass_through_amount,
            discount_amount_lkr: selectedTrip.discount_amount_lkr,
            advance_paid: selectedTrip.advance_paid || 0,
            balance_due: selectedAdjustment?.balance_due || (selectedTrip.balance_due || 0),
            total_paid: selectedTrip.total_paid || 0,
            total_additional_charges: selectedTrip.total_additional_charges || 0,
            percentage_adjustment: (selectedTrip as any).percentage_adjustment || 0,
            driver_name: selectedTrip.assigned_driver_name,
            conductor_name: selectedTrip.assigned_conductor_name,
            bus_no: selectedTrip.assigned_bus_no,
            tripDistance: getTripDistance(selectedTrip),
            totalKm: calculateTotalKm(selectedTrip),
            intermediate_stops: selectedTrip.intermediate_stops,
          }}
          adjustmentData={{
            id: selectedAdjustment?.id || '',
            extra_km: selectedAdjustment?.extra_km || 0,
            extra_km_rate: selectedAdjustment?.extra_km_charge_per_km || 0,
            extra_km_total_charge: selectedAdjustment?.extra_km_total_charge || 0,
            additional_expenses: selectedAdjustment?.additional_expenses || [],
            total_additional_expenses: selectedAdjustment?.total_additional_expenses || 0,
            adjustment_notes: selectedAdjustment?.notes || '',
          }}
          onInvoiceGenerated={async () => {
            try {
              await loadDocumentStatus(selectedTrip.id);
              const docsResult = await getDocumentsByQuotation(selectedTrip.id);
              if (docsResult.success) {
                setQuotationDocuments(docsResult.documents || []);
              }
              await loadAdjustmentData(selectedTrip.id);
              await refetch();
              
              setBalanceInvoiceModalOpen(false);
              setSelectedAdjustment(null);
              
              toast.success('Final Invoice generated and visible in documents');
            } catch (error) {
              console.error('Error refreshing documents:', error);
              toast.error('Document saved but refresh failed. Please reload the page.');
            }
          }}
        />
      )}

      {financeApprovalModalOpen && selectedFinancePayment && (
        <FinanceApprovalModal
          isOpen={financeApprovalModalOpen}
          onClose={() => {
            setFinanceApprovalModalOpen(false);
            setSelectedFinancePayment(null);
          }}
          onApprove={(notes, signatures) => handleFinanceApproval(selectedFinancePayment.id, notes, signatures)}
          onReject={(reason) => handleFinanceRejection(selectedFinancePayment.id, reason)}
          paymentData={selectedFinancePayment}
          loading={financeLoading}
        />
      )}

      {statusModalOpen && selectedTrip && (
        <EnhancedTripStatusManagementModal
          effectiveCompanyId={getEffectiveCompanyId()}
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
            trip_status: selectedTrip.trip_status || selectedTrip.status,
          }}
          onStatusChange={handleStatusChange}
          loading={statusLoading}
        />
      )}

      <TripDetailsModal
        open={detailsModalOpen && selectedTrip !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsModalOpen(false);
            setSelectedTrip(null);
          }
        }}
        trip={selectedTrip ? {
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
        } : null}
        adjustmentStatus={selectedTrip ? adjustmentsData[selectedTrip.id]?.adjustment_status : undefined}
        adjustmentAmount={selectedTrip ? (
          (adjustmentsData[selectedTrip.id]?.extra_km_total_charge || 0) + 
          (adjustmentsData[selectedTrip.id]?.total_additional_expenses || 0)
        ) : undefined}
        adjustmentData={selectedTrip && adjustmentsData[selectedTrip.id] ? {
          extra_km: adjustmentsData[selectedTrip.id].extra_km,
          extra_km_total_charge: adjustmentsData[selectedTrip.id].extra_km_total_charge,
          total_additional_expenses: adjustmentsData[selectedTrip.id].total_additional_expenses,
        } : undefined}
        onViewInvoice={(type) => selectedTrip && viewInvoice(selectedTrip)}
        onDownloadInvoice={(type) => handleDownloadInvoice()}
        onViewPaymentProof={(url) => window.open(url, '_blank')}
      />

      {/* Document Management Modal */}
      {documentsModalOpen && selectedTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <CardTitle>Documents - {selectedTrip.quotation_no}</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setDocumentsModalOpen(false);
                  setSelectedTrip(null);
                  setQuotationDocuments([]);
                }}
                className="absolute top-4 right-4"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[70vh]">
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading documents...</span>
                </div>
              ) : quotationDocuments.length > 0 ? (
                <div className="grid gap-4">
                  {(() => {
                    // Show ALL sales receipts (one per payment) + latest final invoice
                    const salesReceipts = quotationDocuments.filter(d => d.document_type === 'sales_receipt');
                    const balanceInvoices = quotationDocuments.filter(d => d.document_type === 'invoice' && d.payment_type === 'balance');
                    const otherDocs = quotationDocuments.filter(d => 
                      d.document_type !== 'sales_receipt' && 
                      !(d.document_type === 'invoice' && d.payment_type === 'balance')
                    );
                    
                    // Pick latest invoice only (prefer approved over draft)
                    const pickLatest = (docs: typeof quotationDocuments) => {
                      if (!docs.length) return null;
                      const approved = docs.filter(d => d.document_status !== 'draft');
                      if (approved.length) return approved[approved.length - 1];
                      return docs[docs.length - 1];
                    };
                    
                    const latestInvoice = pickLatest(balanceInvoices);
                    const filteredDocs = [
                      ...salesReceipts, // Show ALL sales receipts
                      ...(latestInvoice ? [latestInvoice] : []),
                      ...otherDocs,
                    ];
                    
                    return filteredDocs;
                  })().map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={doc.document_status === 'draft' ? 'secondary' : 'default'}>
                          {doc.document_status === 'draft' ? 'DRAFT' : 'APPROVED'}
                        </Badge>
                        <span className="font-medium">
                          {getDocumentLabel(doc)}
                        </span>
                        <span className="text-muted-foreground">({doc.payment_type})</span>
                      </div>
                      {doc.payment_type === 'balance' && (
                        <p className="text-xs text-muted-foreground">
                          Final Invoice
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Generated: {format(new Date(doc.generated_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {isFinanceUser && doc.document_status === 'draft' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            const result = await approveDocument(doc.id);
                            if (result.success) {
                              await loadDocuments(selectedTrip.id);
                              toast.success('Document approved successfully!');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const result = await regenerateDocument(doc.id);
                          if (result.success) {
                            await loadDocuments(selectedTrip.id);
                          }
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No Documents Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No documents have been generated for this quotation yet.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewInvoice(selectedTrip)}
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      Generate Invoice
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {documentViewerOpen && currentDocument && (
        <DocumentViewer
          isOpen={documentViewerOpen}
          onClose={() => {
            setDocumentViewerOpen(false);
            setCurrentDocument(null);
          }}
          document={currentDocument}
          onDownload={async () => {
            // Download handled within DocumentViewer
          }}
        />
      )}

      {/* InvoiceViewer removed — all document viewing goes through DocumentViewer */}
      {/* Advance Details Modal */}
      {selectedTrip && (
        <AdvanceDetailsModal
          open={advanceDetailsModalOpen}
          onClose={() => {
            setAdvanceDetailsModalOpen(false);
            refetch();
          }}
          quotation={{
            id: selectedTrip.id,
            quotation_no: selectedTrip.quotation_no,
            pickup_date: selectedTrip.pickup_datetime || new Date().toISOString(),
            pickup_location: selectedTrip.pickup_location,
            drop_location: selectedTrip.drop_location,
            total_days: selectedTrip.pickup_datetime && selectedTrip.drop_datetime 
              ? Math.ceil((new Date(selectedTrip.drop_datetime).getTime() - new Date(selectedTrip.pickup_datetime).getTime()) / (1000 * 60 * 60 * 24)) || 1
              : 1,
          }}
        />
      )}

      {/* Post-Trip Adjustment Modal */}
      {selectedTrip && (
        <PostTripAdjustmentModal
          effectiveCompanyId={getEffectiveCompanyId()}
          open={adjustmentModalOpen}
          onOpenChange={(open) => {
            setAdjustmentModalOpen(open);
            if (!open) {
              loadAdjustmentData(selectedTrip.id);
              refetch();
            }
          }}
          quotationId={selectedTrip.id}
          quotationNo={selectedTrip.quotation_no}
          customerName={selectedTrip.customer_name}
          originalAmount={calculateTotalAmount(selectedTrip) - (selectedTrip.adjustment_amount || 0)}
          originalKm={(() => {
            // Include quotation additional distance (e.g. +10km buffer) in the original quoted KM
            const baseKm = getTripDistance(selectedTrip) || (selectedTrip as any).total_distance_km || 0;
            const { distanceKm: additionalKm } = getQuotationAdditionalDistance(selectedTrip);
            return Math.round((baseKm + additionalKm) * 100) / 100;
          })()}
          advancePaid={selectedTrip.total_paid || selectedTrip.advance_paid || 0}
          onAdjustmentSaved={() => {
            loadAdjustmentData(selectedTrip.id);
            refetch();
          }}
          originalPickupDatetime={(selectedTrip as any).pickup_datetime}
          originalDropDatetime={(selectedTrip as any).drop_datetime}
          originalOvertimeCharge={(selectedTrip as any).overtime_charge || 0}
          originalOvernightCharge={(selectedTrip as any).overnight_charge || 0}
          hourlyRate={500}
          nightBlockFee={10000}
        />
      )}

      {/* Vehicle Assignment Quick Edit Modal */}
      {selectedTrip && (
         <VehicleAssignmentModal
          isOpen={vehicleAssignmentModalOpen}
          onClose={() => setVehicleAssignmentModalOpen(false)}
          quotationId={selectedTrip.id}
          quotationNo={selectedTrip.quotation_no}
          numberOfBuses={selectedTrip.number_of_buses}
          currentAssignment={{
            driver_name: selectedTrip.assigned_driver_name,
            conductor_name: selectedTrip.assigned_conductor_name,
            bus_no: selectedTrip.assigned_bus_no,
          }}
          onSave={() => {
            refetch();
          }}
        />
      )}

      {/* Payment History Dialog */}
      {paymentHistoryModalOpen && selectedTrip && (
        <Dialog open={paymentHistoryModalOpen} onOpenChange={setPaymentHistoryModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment History - {selectedTrip.quotation_no}
              </DialogTitle>
            </DialogHeader>
            <PaymentTimelineFresh
              quotationId={selectedTrip.id}
              totalPayable={calculateTotalAmount(selectedTrip)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Finance Settlement Hub */}
      {financeSettlementModalOpen && selectedTrip && (
        <SpecialHireFinanceSettlement
          quotationId={selectedTrip.id}
          isOpen={financeSettlementModalOpen}
          onClose={() => setFinanceSettlementModalOpen(false)}
          onGenerateInvoice={() => {
            const adj = adjustmentsData[selectedTrip.id];
            setSelectedAdjustment(adj || null);
            setBalanceInvoiceModalOpen(true);
          }}
        />
      )}
    </div>
  );
}