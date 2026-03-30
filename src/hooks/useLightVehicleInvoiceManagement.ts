import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { generateLightVehicleInvoicePDF, type LightVehicleInvoiceData } from '@/lib/lightvehicle-invoice-generator';

export interface LightVehicleStoredInvoice {
  id: string;
  quotation_id: string;
  invoice_no: string;
  invoice_type: 'advance' | 'balance' | 'full';
  amount: number;
  status: 'draft' | 'approved';
  generated_by: string;
  generated_at: string;
  approved_by?: string;
  approved_at?: string;
}

export interface LightVehicleStoredDocument {
  id: string;
  quotation_id: string;
  document_type: string;
  document_status: string;
  document_data: string; // base64 encoded PDF
  file_name: string;
  file_size: number;
  generated_by: string;
  generated_at: string;
  approved_by?: string;
  approved_at?: string;
  updated_at: string;
  created_at: string;
}

export const useLightVehicleInvoiceManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const generateAndStoreDraftInvoice = async (
    invoiceData: LightVehicleInvoiceData, 
    quotationId: string
  ) => {
    try {
      setIsLoading(true);

      // First create the invoice record
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('lightvehicle_invoices')
        .insert({
          quotation_id: quotationId,
          invoice_type: 'full',
          amount: invoiceData.totalPrice,
          status: 'draft',
          generated_by: user?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate PDF with DRAFT status
      const draftInvoiceData = {
        ...invoiceData,
        invoice_status: 'draft' as const,
      };

      const pdfBlob = await generateLightVehicleInvoicePDF(draftInvoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Store in document_storage
      const fileName = `DRAFT-LightVehicle-Invoice-${invoiceData.quotationNo}-${Date.now()}.pdf`;
      
      const { data: document, error: docError } = await supabase
        .from('document_storage')
        .insert({
          quotation_id: quotationId,
          payment_type: 'full',
          document_type: 'invoice',
          document_status: 'draft',
          document_data: base64Data,
          file_name: fileName,
          file_size: uint8Array.length,
          generated_by: user?.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      toast.success('Draft LightVehicle invoice generated and stored successfully');
      return { success: true, invoice: invoiceRecord, document };
    } catch (error) {
      console.error('Error generating draft invoice:', error);
      toast.error('Failed to generate draft invoice');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const approveInvoice = async (invoiceId: string, documentId: string) => {
    try {
      setIsLoading(true);

      // Get the invoice and related quotation data
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('lightvehicle_invoices')
        .select(`
          *,
          lightvehicle_quotations (
            quotation_no,
            customer_name,
            customer_phone,
            customer_email,
            company_name,
            bus_model,
            quantity,
            unit_price,
            discount_percentage,
            total_price,
            payment_terms,
            delivery_timeline,
            warranty_terms,
            special_features,
            valid_until
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const quotation = (invoiceData as any).lightvehicle_quotations;
      if (!quotation) throw new Error('Quotation data not found');

      // Prepare invoice data for regeneration
      const approvedInvoiceData: LightVehicleInvoiceData = {
        invoiceNo: invoiceData.invoice_no,
        quotationNo: quotation.quotation_no,
        customerName: quotation.customer_name,
        customerPhone: quotation.customer_phone,
        customerEmail: quotation.customer_email,
        companyName: quotation.company_name,
        busModel: quotation.bus_model,
        quantity: quotation.quantity,
        unitPrice: quotation.unit_price,
        discountAmount: quotation.discount_amount,
        totalPrice: quotation.total_price,
        paymentTerms: quotation.payment_terms,
        deliveryTimeline: quotation.delivery_timeline,
        warrantyTerms: quotation.warranty_terms,
        specialFeatures: quotation.special_features,
        validUntil: new Date(quotation.valid_until),
        invoice_status: 'approved',
      };

      // Generate approved PDF (without DRAFT watermark)
      const pdfBlob = await generateLightVehicleInvoicePDF(approvedInvoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Update invoice status
      const { error: updateInvoiceError } = await supabase
        .from('lightvehicle_invoices')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (updateInvoiceError) throw updateInvoiceError;

      // Update document with approved PDF
      const approvedFileName = invoiceData.invoice_no + '-APPROVED.pdf';
      const { error: updateDocError } = await supabase
        .from('document_storage')
        .update({
          document_status: 'approved',
          document_data: base64Data,
          file_name: approvedFileName,
          file_size: uint8Array.length,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateDocError) throw updateDocError;

      toast.success('Invoice approved successfully');
      return { success: true };
    } catch (error) {
      console.error('Error approving invoice:', error);
      toast.error('Failed to approve invoice');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const getInvoicesByQuotation = async (quotationId: string) => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_invoices')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return { success: true, invoices: data };
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return { success: false, error };
    }
  };

  const getInvoiceDocuments = async (quotationId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_storage')
        .select('*')
        .eq('quotation_id', quotationId)
        .eq('document_type', 'invoice')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return { success: true, documents: data };
    } catch (error) {
      console.error('Error fetching invoice documents:', error);
      return { success: false, error };
    }
  };

  const regenerateInvoice = async (documentId: string) => {
    try {
      setIsLoading(true);

      // Get document and related data
      const { data: document, error: docError } = await supabase
        .from('document_storage')
        .select(`
          *,
          lightvehicle_invoices!inner (
            *,
            lightvehicle_quotations (
              quotation_no,
              customer_name,
              customer_phone,
              customer_email,
              company_name,
              bus_model,
              quantity,
              unit_price,
              discount_percentage,
              total_price,
              payment_terms,
              delivery_timeline,
              warranty_terms,
              special_features,
              valid_until
            )
          )
        `)
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      const invoice = (document as any).lightvehicle_invoices;
      const quotation = invoice.lightvehicle_quotations;

      // Prepare invoice data
      const invoiceData: LightVehicleInvoiceData = {
        invoiceNo: invoice.invoice_no,
        quotationNo: quotation.quotation_no,
        customerName: quotation.customer_name,
        customerPhone: quotation.customer_phone,
        customerEmail: quotation.customer_email,
        companyName: quotation.company_name,
        busModel: quotation.bus_model,
        quantity: quotation.quantity,
        unitPrice: quotation.unit_price,
        discountAmount: quotation.discount_amount,
        totalPrice: quotation.total_price,
        paymentTerms: quotation.payment_terms,
        deliveryTimeline: quotation.delivery_timeline,
        warrantyTerms: quotation.warranty_terms,
        specialFeatures: quotation.special_features,
        validUntil: new Date(quotation.valid_until),
        invoice_status: document.document_status as 'draft' | 'approved',
      };

      // Generate new PDF
      const pdfBlob = await generateLightVehicleInvoicePDF(invoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Update document
      const newFileName = `${invoice.invoice_no}-REGENERATED-${Date.now()}.pdf`;
      const { error: updateError } = await supabase
        .from('document_storage')
        .update({
          document_data: base64Data,
          file_name: newFileName,
          file_size: uint8Array.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      toast.success('Invoice regenerated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error regenerating invoice:', error);
      toast.error('Failed to regenerate invoice');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    generateAndStoreDraftInvoice,
    approveInvoice,
    getInvoicesByQuotation,
    getInvoiceDocuments,
    regenerateInvoice,
  };
};