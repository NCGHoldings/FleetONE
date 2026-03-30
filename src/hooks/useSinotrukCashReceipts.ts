import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SinotrukCashReceipt {
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

export const useSinotrukCashReceipts = () => {
  const [loading, setLoading] = useState(false);

  const generateReceiptNumber = async (orderId: string): Promise<string> => {
    try {
      // Get the quotation number for this order
      const { data: order, error: orderError } = await supabase
        .from('sinotruck_orders')
        .select('sinotruck_quotations(quotation_no)')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const quotationNo = order?.sinotruck_quotations?.quotation_no || 'UNKNOWN';

      // Count existing receipts for this order
      const { count, error: countError } = await supabase
        .from('sinotruck_cash_receipts')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId);

      if (countError) throw countError;

      const sequence = (count || 0) + 1;
      return `NCG${quotationNo}-${String(sequence).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      return `NCG-RECEIPT-${Date.now()}`;
    }
  };

  const createCashReceipt = async (
    paymentId: string,
    orderId: string,
    paymentAmount: number,
    paymentMethod: string,
    paymentDate: string
  ): Promise<SinotrukCashReceipt | null> => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get order and quotation details
      const { data: order, error: orderError } = await supabase
        .from('sinotruck_orders')
        .select(`
          *,
          sinotruck_quotations(
            quotation_no,
            customer_name,
            customer_address,
            customer_phone,
            customer_email,
            bus_model,
            quantity
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const quotation = order?.sinotruck_quotations;
      const receiptNo = await generateReceiptNumber(orderId);
      
      const productDescription = `ADVANCE PAYMENT FOR ${quotation?.quantity || 1} UNIT OF SINOTRUCK - ${quotation?.bus_model || 'BUS'}`;
      const customerContact = [quotation?.customer_phone, quotation?.customer_email].filter(Boolean).join(' / ');

      const { data, error } = await supabase
        .from('sinotruck_cash_receipts')
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
      return data as SinotrukCashReceipt;
    } catch (error: any) {
      console.error('Error creating cash receipt:', error);
      toast.error(`Failed to create cash receipt: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getCashReceiptByPaymentId = async (paymentId: string): Promise<SinotrukCashReceipt | null> => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_cash_receipts')
        .select('*')
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (error) throw error;
      return data as SinotrukCashReceipt | null;
    } catch (error) {
      console.error('Error fetching cash receipt:', error);
      return null;
    }
  };

  const getCashReceiptsForOrder = async (orderId: string): Promise<SinotrukCashReceipt[]> => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_cash_receipts')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SinotrukCashReceipt[];
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
        .from('sinotruck_cash_receipts')
        .update(updateData)
        .eq('id', receiptId);

      if (error) throw error;

      // Check if both signatures are present to update status
      const { data: receipt } = await supabase
        .from('sinotruck_cash_receipts')
        .select('customer_signature_data, finance_signature_data')
        .eq('id', receiptId)
        .single();

      if (receipt?.customer_signature_data && receipt?.finance_signature_data) {
        await supabase
          .from('sinotruck_cash_receipts')
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
        .from('sinotruck_cash_receipts')
        .update({ pdf_url: pdfUrl, status: 'completed' })
        .eq('id', receiptId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating PDF URL:', error);
      return false;
    }
  };

  // Regenerate cash receipt with updated amount_in_words format (Million instead of Lakh)
  const regenerateCashReceipt = async (receiptId: string): Promise<SinotrukCashReceipt | null> => {
    try {
      setLoading(true);
      
      // Get the existing receipt
      const { data: receipt, error: fetchError } = await supabase
        .from('sinotruck_cash_receipts')
        .select('*')
        .eq('id', receiptId)
        .single();
      
      if (fetchError || !receipt) {
        throw fetchError || new Error('Receipt not found');
      }
      
      // Regenerate amount in words using the updated Million format function
      const newAmountInWords = numberToWords(receipt.amount);
      
      // Update the receipt with new amount_in_words
      const { data: updatedReceipt, error: updateError } = await supabase
        .from('sinotruck_cash_receipts')
        .update({
          amount_in_words: newAmountInWords,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      toast.success('Cash receipt regenerated with updated format');
      return updatedReceipt as SinotrukCashReceipt;
    } catch (error: any) {
      console.error('Error regenerating cash receipt:', error);
      toast.error(`Failed to regenerate cash receipt: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
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
    regenerateCashReceipt,
    numberToWords
  };
};
