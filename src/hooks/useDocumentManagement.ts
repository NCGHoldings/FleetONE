import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { generateInvoicePDF, type InvoiceData, type ApprovalSignature } from '@/lib/invoice-generator';
import { uploadPdfToStorage, getDocumentAsBase64, blobToBase64 } from '@/lib/document-storage-helpers';

export interface StoredDocument {
  id: string;
  quotation_id: string;
  payment_id: string;
  document_type: 'sales_receipt' | 'invoice';
  payment_type: 'advance' | 'balance' | 'full';
  document_status: 'draft' | 'approved';
  document_data: string; // base64 encoded PDF
  file_name: string;
  file_size: number;
  generated_by: string;
  generated_at: string;
  approved_by?: string;
  approved_at?: string;
}

export const useDocumentManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const generateAndStoreDraftDocument = async (
    invoiceData: InvoiceData, 
    quotationId: string,
    paymentId: string
  ) => {
    try {
      setIsLoading(true);

      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Auto-add prepared_by signature FIRST, before generating PDF
      try {
        const { data: setting } = await supabase
          .from('special_hire_signature_settings')
          .select('default_user_id, is_enabled')
          .eq('signature_role', 'prepared_by')
          .single();

        if (setting?.is_enabled && setting.default_user_id) {
          // Check if prepared_by signature already exists
          const { data: existingApproval } = await supabase
            .from('document_approvals')
            .select('id')
            .eq('document_id', quotationId)
            .eq('approval_type', 'prepared_by')
            .maybeSingle();

          if (!existingApproval) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, signature_data, user_id')
              .eq('user_id', setting.default_user_id)
              .single();

            if (profile?.signature_data) {
              const { error: insertError } = await supabase.from('document_approvals').insert({
                document_id: quotationId,
                approval_type: 'prepared_by',
                approver_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
                signature_data: profile.signature_data,
                approval_date: new Date().toISOString().split('T')[0],
                user_id: profile.user_id,
              });

              if (!insertError) {
                console.log('✅ Prepared By signature auto-added:', profile.first_name);
                toast.success(`Prepared By signature auto-added: ${profile.first_name}`);
              } else {
                console.error('Failed to add prepared_by signature:', insertError);
              }
            }
          }
        }
      } catch (sigError) {
        console.log('Auto-signature skipped:', sigError);
      }

      // Fetch current signatures for the document (including the one we just added)
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

      // Generate PDF with DRAFT status and current signatures
      const draftInvoiceData = {
        ...invoiceData,
        invoice_status: 'draft' as const,
        ...signatureMap
      };

      console.log('🔄 Calling generateInvoicePDF...', invoiceData.invoiceNo);
      const pdfBlob = await generateInvoicePDF(draftInvoiceData);
      console.log('✅ PDF Blob generated successfully. Size:', pdfBlob.size);

      // Upload to Supabase Storage instead of storing base64 in DB
      const fileName = `DRAFT-${invoiceData.document_type}-${invoiceData.quotationNo}-${Date.now()}.pdf`;
      console.log('☁️ Uploading PDF to storage...', fileName);
      const { storagePath, fileSize } = await uploadPdfToStorage(pdfBlob, fileName);
      console.log('✅ Storage upload success:', storagePath);
      
      const { data, error } = await supabase
        .from('document_storage')
        .insert({
          quotation_id: quotationId,
          payment_id: paymentId,
          document_type: (invoiceData.document_type || 'sales_receipt') as 'sales_receipt' | 'invoice',
          payment_type: invoiceData.invoiceType as 'advance' | 'balance' | 'full',
          document_status: 'draft',
          document_data: '',
          file_name: fileName,
          file_size: fileSize,
          generated_by: user.id,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error inserting document:', error);
        throw error;
      }

      console.log('✅ Document insertion successful:', data);
      toast.success(`Draft ${invoiceData.document_type === 'sales_receipt' ? 'sales receipt' : 'invoice'} generated and stored.`);
      return { success: true, document: data };
    } catch (error) {
      console.error('🚨 Error generating draft document! Full trace:', error);
      toast.error(`Failed to generate draft document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const approveDocument = async (documentId: string) => {
    try {
      setIsLoading(true);

      // Get the draft document
      const { data: draftDoc, error: fetchError } = await supabase
        .from('document_storage')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Regenerate PDF without DRAFT watermark
      const { data: paymentData, error: paymentError } = await supabase
        .from('special_hire_payments')
        .select(`
          *,
          quotation:special_hire_quotations(*)
        `)
        .eq('id', draftDoc.payment_id)
        .single();

      if (paymentError) throw paymentError;

      const calculateTotalAmount = (quotation: any) => {
        return quotation.gross_revenue + 
               (quotation.fuel_cost_fuel_only || 0) + 
               (quotation.commission_pass_through_amount || 0) +
               (quotation.total_additional_charges || 0) - 
               (quotation.discount_amount_lkr || 0);
      };

      // Compute total approved payments for accurate Balance Due
      const { data: approvedPaymentsList, error: approvedPaymentsError } = await supabase
        .from('special_hire_payments')
        .select('amount')
        .eq('quotation_id', paymentData.quotation.id)
        .eq('status', 'approved');
      if (approvedPaymentsError) throw approvedPaymentsError;
      const totalApprovedPaid = (approvedPaymentsList || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);


      // Fetch current signatures for the document
      const { data: signatures } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', draftDoc.quotation_id);

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

      const approvedInvoiceData: InvoiceData = {
        invoiceNo: `APPROVED-${paymentData.id}`,
        invoiceType: draftDoc.payment_type as 'advance' | 'balance',
        quotationNo: paymentData.quotation.quotation_no,
        customerName: paymentData.quotation.customer_name,
        customerPhone: paymentData.quotation.customer_phone || '',
        customerEmail: paymentData.quotation.customer_email,
        companyName: paymentData.quotation.company_name,
        pickupLocation: paymentData.quotation.pickup_location,
        dropLocation: paymentData.quotation.drop_location,
        pickupDate: new Date(paymentData.quotation.pickup_datetime),
        dropDate: new Date(paymentData.quotation.drop_datetime || paymentData.quotation.pickup_datetime),
        busType: 'Standard Bus',
        numberOfBuses: paymentData.quotation.number_of_buses,
        numberOfPassengers: paymentData.quotation.number_of_passengers,
        totalAmount: calculateTotalAmount(paymentData.quotation),
        advanceAmount: paymentData.quotation.advance_paid || 0,
        paidAmount: totalApprovedPaid,
        vehicleNo: paymentData.quotation.assigned_bus_no,
        driverName: paymentData.quotation.assigned_driver_name,
        conductorName: paymentData.quotation.assigned_conductor_name,
        invoice_status: 'approved',
        document_type: draftDoc.document_type as 'sales_receipt' | 'invoice',
        ...signatureMap
      };

      // Generate approved PDF
      const pdfBlob = await generateInvoicePDF(approvedInvoiceData);

      // Upload to storage
      const newFileName = draftDoc.file_name.replace('DRAFT-', 'APPROVED-');
      const { storagePath, fileSize } = await uploadPdfToStorage(pdfBlob, newFileName);

      // Update document status and storage path
      const { error: updateError } = await supabase
        .from('document_storage')
        .update({
          document_status: 'approved',
          document_data: '',
          file_name: newFileName,
          file_size: fileSize,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          storage_path: storagePath,
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      toast.success('Document approved successfully!');
      return { success: true };
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error('Failed to approve document.');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentsByQuotation = async (quotationId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_storage')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return { success: true, documents: data };
    } catch (error) {
      console.error('Error fetching documents:', error);
      return { success: false, error, documents: [] };
    }
  };

  const regenerateDocument = async (documentId: string) => {
    try {
      setIsLoading(true);

      // Get the existing document
      const { data: existingDoc, error: fetchError } = await supabase
        .from('document_storage')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Get payment and quotation data
      const { data: paymentData, error: paymentError } = await supabase
        .from('special_hire_payments')
        .select(`
          *,
          quotation:special_hire_quotations(*)
        `)
        .eq('id', existingDoc.payment_id)
        .single();

      if (paymentError) throw paymentError;

      const calculateTotalAmount = (quotation: any) => {
        return quotation.gross_revenue + 
               (quotation.fuel_cost_fuel_only || 0) + 
               (quotation.commission_pass_through_amount || 0) +
               (quotation.total_additional_charges || 0) - 
               (quotation.discount_amount_lkr || 0);
      };

      // Compute total approved payments for accurate Balance Due
      const { data: approvedPaymentsList2, error: approvedPaymentsError2 } = await supabase
        .from('special_hire_payments')
        .select('amount')
        .eq('quotation_id', paymentData.quotation.id)
        .eq('status', 'approved');
      if (approvedPaymentsError2) throw approvedPaymentsError2;
      const totalApprovedPaid2 = (approvedPaymentsList2 || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Fetch current signatures for the document
      const { data: signatures } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', existingDoc.quotation_id);

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

      const invoiceData: InvoiceData = {
        invoiceNo: `REGEN-${existingDoc.payment_type.toUpperCase()}-${Date.now()}`,
        invoiceType: existingDoc.payment_type as 'advance' | 'balance',
        quotationNo: paymentData.quotation.quotation_no,
        customerName: paymentData.quotation.customer_name,
        customerPhone: paymentData.quotation.customer_phone || '',
        customerEmail: paymentData.quotation.customer_email,
        companyName: paymentData.quotation.company_name,
        pickupLocation: paymentData.quotation.pickup_location,
        dropLocation: paymentData.quotation.drop_location,
        pickupDate: new Date(paymentData.quotation.pickup_datetime),
        dropDate: new Date(paymentData.quotation.drop_datetime || paymentData.quotation.pickup_datetime),
        busType: 'Standard Bus',
        numberOfBuses: paymentData.quotation.number_of_buses,
        numberOfPassengers: paymentData.quotation.number_of_passengers,
        totalAmount: calculateTotalAmount(paymentData.quotation),
        advanceAmount: paymentData.quotation.advance_paid || 0,
        paidAmount: totalApprovedPaid2,
        vehicleNo: paymentData.quotation.assigned_bus_no,
        driverName: paymentData.quotation.assigned_driver_name,
        conductorName: paymentData.quotation.assigned_conductor_name,
        invoice_status: existingDoc.document_status as 'draft' | 'approved',
        document_type: existingDoc.document_type as 'sales_receipt' | 'invoice',
        ...signatureMap
      };

      // Generate new PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);

      // Upload to storage
      const newFileName = `REGENERATED-${existingDoc.document_type}-${paymentData.quotation.quotation_no}-${Date.now()}.pdf`;
      const { storagePath, fileSize } = await uploadPdfToStorage(pdfBlob, newFileName);

      // Update document
      const { error: updateError } = await supabase
        .from('document_storage')
        .update({
          document_data: '',
          file_name: newFileName,
          file_size: fileSize,
          generated_at: new Date().toISOString(),
          storage_path: storagePath,
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      toast.success('Document regenerated successfully!');
      return { success: true };
    } catch (error) {
      console.error('Error regenerating document:', error);
      toast.error('Failed to regenerate document.');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const ensureDocumentExists = async (quotationId: string, paymentId?: string) => {
    try {
      // Check if a document already exists for this quotation
      const { data: existing, error: fetchError } = await supabase
        .from('document_storage')
        .select('id')
        .eq('quotation_id', quotationId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (existing) {
        return { success: true, documentId: existing.id };
      }

      // No document exists, create a stub
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: newDoc, error: insertError } = await supabase
        .from('document_storage')
        .insert({
          quotation_id: quotationId,
          payment_id: paymentId || null,
          document_type: 'sales_receipt',
          payment_type: 'advance',
          document_status: 'draft',
          document_data: '', // Empty until PDF is generated
          file_name: `stub-${quotationId}`,
          file_size: 0,
          generated_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return { success: true, documentId: newDoc.id };
    } catch (error) {
      console.error('Error ensuring document exists:', error);
      toast.error('Failed to prepare document for signatures.');
      return { success: false, error };
    }
  };

  const checkAndAutoSendEmail = async (
    documentId: string,
    quotationId: string
  ) => {
    try {
      // 1. Fetch all signatures for this document
      const { data: approvals, error: approvalsError } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', documentId);

      if (approvalsError) throw approvalsError;

      // 2. Check if all 3 signatures exist
      const hasPreparedBy = approvals?.some(a => a.approval_type === 'prepared_by');
      const hasCheckedBy = approvals?.some(a => a.approval_type === 'checked_by');
      const hasApprovedBy = approvals?.some(a => a.approval_type === 'approved_by');

      if (!hasPreparedBy || !hasCheckedBy || !hasApprovedBy) {
        console.log('Not all signatures complete. Skipping auto-send.');
        return { success: false, reason: 'incomplete_signatures' };
      }

      // 3. Fetch quotation to get customer email
      const { data: quotation, error: quotationError } = await supabase
        .from('special_hire_quotations')
        .select('customer_email, customer_name, quotation_no')
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      if (!quotation?.customer_email) {
        console.log('No customer email. Marking document as ready but not sending.');
        
        // Update document with flag: ready_to_send = true
        await supabase
          .from('document_storage')
          .update({ 
            ready_to_send: true,
            email_status: 'no_email' 
          })
          .eq('id', documentId);
        
        return { success: false, reason: 'no_email' };
      }

      // 4. Get document data
      const { data: document } = await supabase
        .from('document_storage')
        .select('*')
        .eq('id', documentId)
        .single();

      if (!document) {
        throw new Error('Document not found');
      }

      // Get PDF base64 from storage or fallback to document_data
      let pdfBase64: string;
      if ((document as any).storage_path) {
        pdfBase64 = await getDocumentAsBase64((document as any).storage_path);
      } else {
        pdfBase64 = document.document_data;
      }

      // 5. Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          to: quotation.customer_email,
          subject: `${document.document_type === 'sales_receipt' ? 'Sales Receipt' : 'Final Invoice'} - ${quotation.quotation_no}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>NCG Express</h2>
              <p>Dear ${quotation.customer_name},</p>
              <p>Please find your ${document.document_type === 'sales_receipt' ? 'sales receipt' : 'final invoice'} attached.</p>
              <p><strong>Quotation:</strong> ${quotation.quotation_no}</p>
              <p>This document has been fully authorized and approved.</p>
              <br>
              <p>Best regards,<br>NCG Express Team</p>
            </div>
          `,
          attachment: {
            filename: `${document.document_type}_${quotation.quotation_no}.pdf`,
            contentBase64: pdfBase64,
            contentType: 'application/pdf'
          }
        }
      });

      if (emailError) throw emailError;

      // 6. Update document status
      await supabase
        .from('document_storage')
        .update({
          email_status: 'sent',
          email_sent_at: new Date().toISOString(),
          email_sent_by: user?.id,
          ready_to_send: true
        })
        .eq('id', documentId);

      toast.success(`📧 Email sent automatically to ${quotation.customer_email}!`);
      return { success: true };

    } catch (error) {
      console.error('Auto-send email error:', error);
      
      // Update document with failed status
      await supabase
        .from('document_storage')
        .update({
          email_status: 'failed',
          ready_to_send: true
        })
        .eq('id', documentId);
      
      return { success: false, error };
    }
  };

  return {
    generateAndStoreDraftDocument,
    approveDocument,
    getDocumentsByQuotation,
    regenerateDocument,
    ensureDocumentExists,
    checkAndAutoSendEmail,
    isLoading,
  };
};