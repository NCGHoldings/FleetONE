// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SinotruckCashReceipt {
  id: string;
  order_id: string;
  payment_id: string;
  receipt_no: string;
  receipt_date: string;
  amount: number;
  amount_in_words: string | null;
  payment_method: string;
  product_description: string | null;
  quotation_no: string | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_contact: string | null;
  customer_signature_data: string | null;
  customer_signature_type: string | null;
  customer_signed_at: string | null;
  customer_signer_name: string | null;
  finance_signature_data: string | null;
  finance_signature_type: string | null;
  finance_signed_at: string | null;
  finance_signer_name: string | null;
  pdf_url: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Convert number to words for cash receipt - International Million format
export const numberToWords = (num: number): string => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  
  if (num === 0) return 'ZERO RUPEES ONLY';
  
  const convertHundreds = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  };
  
  const rupees = Math.floor(num);
  const cents = Math.round((num - rupees) * 100);
  
  let result = '';
  const billion = Math.floor(rupees / 1000000000);
  const million = Math.floor((rupees % 1000000000) / 1000000);
  const thousand = Math.floor((rupees % 1000000) / 1000);
  const remainder = Math.floor(rupees % 1000);
  
  if (billion) result += convertHundreds(billion) + 'BILLION ';
  if (million) result += convertHundreds(million) + 'MILLION ';
  if (thousand) result += convertHundreds(thousand) + 'THOUSAND ';
  if (remainder) result += convertHundreds(remainder);
  
  result = result.trim() + ' RUPEES';
  if (cents > 0) {
    result += ' AND ' + convertHundreds(cents).trim() + ' CENTS';
  }
  result += ' ONLY';
  
  return result;
};

export const useSinotruckCashReceipts = () => {
  const [loading, setLoading] = useState(false);

  const generateReceiptNumber = async (orderId: string): Promise<string> => {
    try {
      // Get the quotation number for this order
      const { data: orderRaw, error: orderError } = await supabase
        .from('sinotruck_orders' as any)
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      const order = orderRaw as any;

      // Get quotation separately
      let quotationNo = 'UNKNOWN';
      if (order?.quotation_id) {
        const { data: quotRaw } = await supabase
          .from('sinotruck_quotations' as any)
          .select('quotation_no')
          .eq('id', order.quotation_id)
          .single();
        quotationNo = (quotRaw as any)?.quotation_no || 'UNKNOWN';
      }

      // Count existing receipts for this order
      const { count, error: countError } = await supabase
        .from('sinotruck_cash_receipts' as any)
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId);

      if (countError) throw countError;

      const sequence = (count || 0) + 1;
      return `NCG-SNT-${quotationNo}-${String(sequence).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      return `NCG-SNT-RECEIPT-${Date.now()}`;
    }
  };

  const createCashReceipt = async (
    paymentId: string,
    orderId: string,
    paymentAmount: number,
    paymentMethod: string,
    paymentDate: string
  ): Promise<SinotruckCashReceipt | null> => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get order details
      const { data: orderRaw, error: orderError } = await supabase
        .from('sinotruck_orders' as any)
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      const order = orderRaw as any;

      // Get quotation details separately
      let quotation: any = null;
      if (order?.quotation_id) {
        const { data: quotRaw } = await supabase
          .from('sinotruck_quotations' as any)
          .select('*')
          .eq('id', order.quotation_id)
          .single();
        quotation = quotRaw as any;
      }

      const receiptNo = await generateReceiptNumber(orderId);
      
      const productDescription = `ADVANCE PAYMENT FOR ${quotation?.quantity || 1} UNIT OF SINOTRUCK - ${quotation?.truck_model_name || 'TRUCK'}`;
      const customerContact = [quotation?.contact_number, quotation?.email].filter(Boolean).join(' / ');

      const { data, error } = await supabase
        .from('sinotruck_cash_receipts' as any)
        .insert({
          order_id: orderId,
          payment_id: paymentId,
          receipt_no: receiptNo,
          receipt_date: paymentDate,
          amount: paymentAmount,
          amount_in_words: numberToWords(paymentAmount),
          payment_method: paymentMethod,
          product_description: productDescription,
          quotation_no: quotation?.quotation_no,
          customer_name: quotation?.customer_name,
          customer_address: quotation?.customer_address,
          customer_contact: customerContact,
          status: 'draft',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Cash receipt created successfully');
      return data as unknown as SinotruckCashReceipt;
    } catch (error: any) {
      console.error('Error creating cash receipt:', error);
      toast.error(`Failed to create cash receipt: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getCashReceiptByPaymentId = async (paymentId: string): Promise<SinotruckCashReceipt | null> => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_cash_receipts' as any)
        .select('*')
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as SinotruckCashReceipt | null;
    } catch (error) {
      console.error('Error fetching cash receipt:', error);
      return null;
    }
  };

  const getCashReceiptsForOrder = async (orderId: string): Promise<SinotruckCashReceipt[]> => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_cash_receipts' as any)
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SinotruckCashReceipt[];
    } catch (error) {
      console.error('Error fetching cash receipts:', error);
      return [];
    }
  };

  const updateReceiptSignature = async (
    receiptId: string,
    role: 'customer' | 'finance',
    signerName: string,
    signatureData: string,
    signatureType: 'drawing' | 'text' | 'image'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      
      const updateData: Record<string, any> = {};
      
      if (role === 'customer') {
        updateData.customer_signature_data = signatureData;
        updateData.customer_signature_type = signatureType;
        updateData.customer_signed_at = new Date().toISOString();
        updateData.customer_signer_name = signerName;
      } else {
        updateData.finance_signature_data = signatureData;
        updateData.finance_signature_type = signatureType;
        updateData.finance_signed_at = new Date().toISOString();
        updateData.finance_signer_name = signerName;
      }

      const { error } = await supabase
        .from('sinotruck_cash_receipts' as any)
        .update(updateData)
        .eq('id', receiptId);

      if (error) throw error;

      // Check if both signatures are present to update status
      const { data: receiptRaw } = await supabase
        .from('sinotruck_cash_receipts' as any)
        .select('customer_signature_data, finance_signature_data')
        .eq('id', receiptId)
        .single();
      const receipt = receiptRaw as any;

      if (receipt?.customer_signature_data && receipt?.finance_signature_data) {
        await supabase
          .from('sinotruck_cash_receipts' as any)
          .update({ status: 'signed' })
          .eq('id', receiptId);
      }

      toast.success('Signature saved successfully');
      return true;
    } catch (error: any) {
      console.error('Error updating signature:', error);
      toast.error(`Failed to save signature: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateReceiptPdfUrl = async (receiptId: string, pdfUrl: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sinotruck_cash_receipts' as any)
        .update({ pdf_url: pdfUrl, status: 'completed' })
        .eq('id', receiptId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating PDF URL:', error);
      return false;
    }
  };

  return {
    loading,
    generateReceiptNumber,
    createCashReceipt,
    getCashReceiptByPaymentId,
    getCashReceiptsForOrder,
    updateReceiptSignature,
    updateReceiptPdfUrl,
    numberToWords
  };
};
