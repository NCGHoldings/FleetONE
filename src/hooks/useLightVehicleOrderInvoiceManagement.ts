import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateLightVehicleOrderInvoicePDF, LightVehicleOrderInvoiceData } from '@/lib/lightvehicle-order-invoice-generator';

export interface LightVehicleInvoiceRecord {
  id: string;
  invoice_number: string;
  order_id: string;
  quotation_id?: string;
  generated_at?: string;
  amount: number;
  status: string;
  invoice_category?: string;
  proforma_amount_percentage?: number;
  proforma_amount?: number;
  finance_company_name?: string;
  finance_company_address?: string;
  proforma_purpose?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface LightVehicleInvoiceDocument {
  id: string;
  invoice_record_id: string;
  file_name: string;
  file_path?: string;
  file_size?: number;
  document_status?: string;
  document_data?: string;
  created_at: string;
}

export function useLightVehicleOrderInvoiceManagement() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInvoicesForOrder = async (orderId: string): Promise<LightVehicleInvoiceRecord[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lightvehicle_invoice_records')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoiceDocuments = async (invoiceRecordId: string): Promise<LightVehicleInvoiceDocument[]> => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_invoice_documents')
        .select('*')
        .eq('invoice_record_id', invoiceRecordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching invoice documents:', error);
      return [];
    }
  };

  const generateInvoice = async (
    invoiceData: LightVehicleOrderInvoiceData,
    invoiceCategory: 'direct_invoice' | 'proforma_invoice',
    proformaConfig?: {
      amountPercentage?: number;
      financeCompanyName?: string;
      financeCompanyAddress?: string;
      purpose?: string;
    }
  ): Promise<string | null> => {
    setIsGenerating(true);
    try {
      // Generate invoice number
      const { data: invoiceNo, error: noError } = await supabase.rpc('generate_lightvehicle_invoice_no');
      if (noError) throw noError;

      // Calculate amounts for proforma
      let invoiceAmount = invoiceData.totalAmount;
      let proformaAmount: number | undefined;
      
      if (invoiceCategory === 'proforma_invoice' && proformaConfig?.amountPercentage) {
        proformaAmount = (invoiceData.totalAmount * proformaConfig.amountPercentage) / 100;
        invoiceAmount = proformaAmount;
      }

      // Prepare full invoice data with invoice number
      const fullInvoiceData: LightVehicleOrderInvoiceData = {
        ...invoiceData,
        invoiceNo,
        invoiceCategory,
        proformaPercentage: proformaConfig?.amountPercentage,
        proformaAmount,
        financeCompanyName: proformaConfig?.financeCompanyName,
        financeCompanyAddress: proformaConfig?.financeCompanyAddress,
        proformaPurpose: proformaConfig?.purpose
      };

      // Generate PDF
      const pdfBlob = await generateLightVehicleOrderInvoicePDF(fullInvoiceData);
      
      // Upload to storage
      const fileName = `${invoiceData.orderId}/${invoiceNo}_draft.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('lightvehicle-invoices')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lightvehicle-invoices')
        .getPublicUrl(fileName);

      // Create invoice record
      const { data: invoiceRecord, error: recordError } = await supabase
        .from('lightvehicle_invoice_records')
        .insert({
          invoice_number: invoiceNo,
          order_id: invoiceData.orderId,
          quotation_id: invoiceData.quotationId,
          generated_at: new Date().toISOString(),
          amount: invoiceAmount,
          status: 'draft',
          invoice_category: invoiceCategory,
          proforma_amount_percentage: proformaConfig?.amountPercentage,
          proforma_amount: proformaAmount,
          finance_company_name: proformaConfig?.financeCompanyName,
          finance_company_address: proformaConfig?.financeCompanyAddress,
          proforma_purpose: proformaConfig?.purpose
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Create invoice document record
      console.log('Inserting document record for:', invoiceRecord.id);
      const { data: docData, error: docError } = await supabase
        .from('lightvehicle_invoice_documents')
        .insert({
          invoice_record_id: invoiceRecord.id,
          document_type: 'invoice',
          file_name: `${invoiceNo}_draft.pdf`,
          file_path: fileName,
          file_size: pdfBlob.size,
          document_status: 'draft',
          document_data: JSON.stringify(fullInvoiceData)
        })
        .select()
        .single();

      if (docError) {
        console.error('Document insert error:', docError);
        throw docError;
      }
      console.log('Document record created:', docData);

      toast.success(`Invoice ${invoiceNo} generated successfully`);
      return invoiceRecord.id;
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice: ' + error.message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateInvoice = async (
    invoiceRecordId: string,
    invoiceData: LightVehicleOrderInvoiceData
  ): Promise<boolean> => {
    setIsGenerating(true);
    try {
      // Get existing invoice record
      const { data: record, error: fetchError } = await supabase
        .from('lightvehicle_invoice_records')
        .select('*')
        .eq('id', invoiceRecordId)
        .single();

      if (fetchError) throw fetchError;

      // Prepare full invoice data
      const fullInvoiceData: LightVehicleOrderInvoiceData = {
        ...invoiceData,
        invoiceNo: record.invoice_number,
        invoiceCategory: record.invoice_category,
        proformaPercentage: record.proforma_amount_percentage,
        proformaAmount: record.proforma_amount,
        financeCompanyName: record.finance_company_name,
        financeCompanyAddress: record.finance_company_address,
        proformaPurpose: record.proforma_purpose
      };

      // Generate new PDF
      const pdfBlob = await generateLightVehicleOrderInvoicePDF(fullInvoiceData);
      
      // Upload to storage (overwrite)
      const fileName = `${invoiceData.orderId}/${record.invoice_number}_${record.status}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('lightvehicle-invoices')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update document record
      const { error: docError } = await supabase
        .from('lightvehicle_invoice_documents')
        .update({
          file_name: `${record.invoice_number}_${record.status}.pdf`,
          file_path: fileName,
          file_size: pdfBlob.size,
          document_data: JSON.stringify(fullInvoiceData)
        })
        .eq('invoice_record_id', invoiceRecordId);

      if (docError) throw docError;

      toast.success('Invoice regenerated successfully');
      return true;
    } catch (error: any) {
      console.error('Error regenerating invoice:', error);
      toast.error('Failed to regenerate invoice: ' + error.message);
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const approveInvoice = async (invoiceRecordId: string): Promise<boolean> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('lightvehicle_invoice_records')
        .update({
          status: 'approved',
          approved_by: user?.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', invoiceRecordId);

      if (error) throw error;

      // Update document status
      await supabase
        .from('lightvehicle_invoice_documents')
        .update({ document_status: 'approved' })
        .eq('invoice_record_id', invoiceRecordId);

      toast.success('Invoice approved successfully');
      return true;
    } catch (error: any) {
      console.error('Error approving invoice:', error);
      toast.error('Failed to approve invoice');
      return false;
    }
  };

  const getInvoiceDownloadUrl = async (invoiceRecordId: string): Promise<string | null> => {
    try {
      const docs = await fetchInvoiceDocuments(invoiceRecordId);
      if (docs.length === 0 || !docs[0].file_path) return null;

      const { data } = supabase.storage
        .from('lightvehicle-invoices')
        .getPublicUrl(docs[0].file_path);

      return data.publicUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  };

  return {
    isGenerating,
    isLoading,
    fetchInvoicesForOrder,
    fetchInvoiceDocuments,
    generateInvoice,
    regenerateInvoice,
    approveInvoice,
    getInvoiceDownloadUrl
  };
}
