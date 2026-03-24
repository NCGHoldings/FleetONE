import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { uploadPdfToStorage } from '@/lib/document-storage-helpers';

export const useDocumentRegeneration = () => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { user } = useAuth();

  const regenerateDocumentWithSignatures = async (
    documentId: string,
    quotationId: string,
    paymentId?: string
  ) => {
    try {
      setIsRegenerating(true);

      // Get the existing document
      const { data: existingDoc, error: docError } = await supabase
        .from('document_storage')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Get quotation data
      const { data: quotationData, error: quotationError } = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      // Get payment data if paymentId is provided
      let paymentData = null;
      if (paymentId || existingDoc.payment_id) {
        const { data, error } = await supabase
          .from('special_hire_payments')
          .select('*')
          .eq('id', paymentId || existingDoc.payment_id)
          .single();

        if (error) throw error;
        paymentData = data;
      }

      // Fetch all approved payments for the quotation to calculate total paid
      const { data: allPayments } = await supabase
        .from('special_hire_payments')
        .select('amount')
        .eq('quotation_id', quotationId)
        .eq('status', 'approved');

      const totalApprovedPaid = allPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Fetch adjustment data for balance invoices
      let adjustmentData = null;
      if (existingDoc.document_type === 'invoice' && existingDoc.payment_type === 'balance') {
        const { data: adjustment } = await supabase
          .from('special_hire_trip_adjustments')
          .select('*')
          .eq('quotation_id', quotationId)
          .eq('adjustment_status', 'finalized')
          .maybeSingle();
        
        adjustmentData = adjustment;
        console.log('Adjustment data for regeneration:', adjustmentData);
      }

      // Fetch current signatures for the document (use quotationId for consistency)
      const { data: signatures } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', quotationId);

      // Map signatures to the format expected by invoice generator
      const signatureMap = {
        preparedBy: signatures?.find(s => s.approval_type === 'prepared_by') ? {
          approver_name: signatures.find(s => s.approval_type === 'prepared_by')?.approver_name || '',
          signature_data: signatures.find(s => s.approval_type === 'prepared_by')?.signature_data,
          approval_date: signatures.find(s => s.approval_type === 'prepared_by')?.approval_date || ''
        } : undefined,
        checkedBy: signatures?.find(s => s.approval_type === 'checked_by') ? {
          approver_name: signatures.find(s => s.approval_type === 'checked_by')?.approver_name || '',
          signature_data: signatures.find(s => s.approval_type === 'checked_by')?.signature_data,
          approval_date: signatures.find(s => s.approval_type === 'checked_by')?.approval_date || ''
        } : undefined,
        approvedBy: signatures?.find(s => s.approval_type === 'approved_by') ? {
          approver_name: signatures.find(s => s.approval_type === 'approved_by')?.approver_name || '',
          signature_data: signatures.find(s => s.approval_type === 'approved_by')?.signature_data,
          approval_date: signatures.find(s => s.approval_type === 'approved_by')?.approval_date || ''
        } : undefined,
      };

      // Calculate total amount
      const calculateTotalAmount = (quotation: any) => {
        return quotation.gross_revenue + 
               (quotation.fuel_cost_fuel_only || 0) + 
               (quotation.commission_pass_through_amount || 0) +
               (quotation.total_additional_charges || 0) - 
               (quotation.discount_amount_lkr || 0);
      };

      // Determine if this is an advance document or balance/full invoice
      const isAdvanceDoc = existingDoc.document_type === 'sales_receipt' || existingDoc.payment_type === 'advance';
      
      // For advance documents, use the specific payment amount
      // For balance/full invoices, use the sum of all approved payments
      const paidAmount = isAdvanceDoc ? (paymentData?.amount || 0) : totalApprovedPaid;

      // Check if we have adjustment data (for balance invoices)
      const hasAdjustments = adjustmentData !== null;

      console.log('Regenerating document:', {
        documentType: existingDoc.document_type,
        paymentType: existingDoc.payment_type,
        hasAdjustments,
        totalAmount: hasAdjustments ? adjustmentData.original_quotation_amount : calculateTotalAmount(quotationData),
        paidAmount,
        adjustmentData: adjustmentData ? {
          original_quotation_amount: adjustmentData.original_quotation_amount,
          extra_km_total_charge: adjustmentData.extra_km_total_charge,
          balance_due: adjustmentData.balance_due
        } : null
      });

      // Create invoice data with fresh signatures
      const invoiceData: InvoiceData = {
        invoiceNo: `UPDATED-${existingDoc.payment_type.toUpperCase()}-${Date.now()}`,
        invoiceType: existingDoc.payment_type as 'advance' | 'balance',
        quotationNo: quotationData.quotation_no,
        customerName: quotationData.customer_name,
        customerPhone: quotationData.customer_phone || '',
        customerEmail: quotationData.customer_email,
        companyName: quotationData.company_name,
        pickupLocation: quotationData.pickup_location,
        dropLocation: quotationData.drop_location,
        pickupDate: new Date(quotationData.pickup_datetime),
        dropDate: new Date(quotationData.drop_datetime || quotationData.pickup_datetime),
        busType: 'Standard Bus',
        numberOfBuses: quotationData.number_of_buses,
        numberOfPassengers: quotationData.number_of_passengers,
        
        // Use original_quotation_amount from adjustments if available, otherwise calculate
        totalAmount: hasAdjustments 
          ? (adjustmentData.original_quotation_amount || calculateTotalAmount(quotationData))
          : calculateTotalAmount(quotationData),
        
        advanceAmount: quotationData.advance_paid || 0,
        paidAmount,
        vehicleNo: quotationData.assigned_bus_no,
        driverName: quotationData.assigned_driver_name,
        conductorName: quotationData.assigned_conductor_name,
        invoice_status: existingDoc.document_status as 'draft' | 'approved',
        document_type: existingDoc.document_type as 'sales_receipt' | 'invoice',
        
        // Include adjustment data if this is a balance invoice
        ...(hasAdjustments ? {
          hasAdjustments: true,
          extraKm: adjustmentData.extra_km || 0,
          extraKmChargePerKm: adjustmentData.extra_km_charge_per_km || 0,
          extraKmTotalCharge: adjustmentData.extra_km_total_charge || 0,
          additionalExpenses: adjustmentData.additional_expenses || [],
          totalAdditionalExpenses: adjustmentData.total_additional_expenses || 0,
          adjustmentNotes: adjustmentData.notes || '',
        } : {}),
        
        ...signatureMap
      };

      // Generate new PDF with updated signatures
      const pdfBlob = await generateInvoicePDF(invoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Update document in database with fresh signature data
      const { error: updateError } = await supabase
        .from('document_storage')
        .update({
          document_data: base64Data,
          file_name: `UPDATED-${existingDoc.document_type}-${quotationData.quotation_no}-${Date.now()}.pdf`,
          file_size: uint8Array.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      toast.success('Document updated with signatures successfully!');
      return { success: true, document_data: base64Data };
    } catch (error) {
      console.error('Error regenerating document with signatures:', error);
      toast.error('Failed to update document with signatures');
      return { success: false, error };
    } finally {
      setIsRegenerating(false);
    }
  };

  return {
    regenerateDocumentWithSignatures,
    isRegenerating,
  };
};