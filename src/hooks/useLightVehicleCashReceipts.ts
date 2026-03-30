// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LightVehicleCashReceipt {
  id: string;
  order_id: string;
  payment_id?: string;
  receipt_no: string;
  receipt_date: string;
  amount: number;
  amount_in_words?: string;
  payment_method?: string;
  product_description?: string;
  quotation_no?: string;
  customer_name?: string;
  customer_address?: string;
  customer_contact?: string;
  customer_signature_data?: string;
  customer_signature_type?: string;
  customer_signed_at?: string;
  customer_signer_name?: string;
  finance_signature_data?: string;
  finance_signature_type?: string;
  finance_signed_at?: string;
  finance_signer_name?: string;
  pdf_url?: string;
  status: string;
  created_at: string;
}

// Number to words conversion - International Million format with RUPEES
function numberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  
  if (num === 0) return 'ZERO RUPEES ONLY';
  
  function convertHundreds(n: number): string {
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
  }
  
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
}

export function useLightVehicleCashReceipts() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchReceiptsForOrder = async (orderId: string): Promise<LightVehicleCashReceipt[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lightvehicle_cash_receipts')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to fetch receipts');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReceiptByPayment = async (paymentId: string): Promise<LightVehicleCashReceipt | null> => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_cash_receipts')
        .select('*')
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching receipt:', error);
      return null;
    }
  };

  const createReceipt = async (receiptData: {
    orderId: string;
    paymentId?: string;
    amount: number;
    paymentMethod: string;
    productDescription: string;
    quotationNo?: string;
    customerName: string;
    customerAddress?: string;
    customerContact?: string;
  }): Promise<LightVehicleCashReceipt | null> => {
    setIsCreating(true);
    try {
      // Generate receipt number
      const { data: receiptNo, error: noError } = await supabase.rpc('generate_lightvehicle_receipt_no');
      if (noError) throw noError;

      const amountInWords = numberToWords(receiptData.amount);

      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('lightvehicle_cash_receipts')
        .insert({
          order_id: receiptData.orderId,
          payment_id: receiptData.paymentId,
          receipt_no: receiptNo,
          receipt_date: new Date().toISOString().split('T')[0],
          amount: receiptData.amount,
          amount_in_words: amountInWords,
          payment_method: receiptData.paymentMethod,
          product_description: receiptData.productDescription,
          quotation_no: receiptData.quotationNo,
          customer_name: receiptData.customerName,
          customer_address: receiptData.customerAddress,
          customer_contact: receiptData.customerContact,
          status: 'draft',
          created_by: user?.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Receipt ${receiptNo} created successfully`);
      return data;
    } catch (error: any) {
      console.error('Error creating receipt:', error);
      toast.error('Failed to create receipt: ' + error.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const updateReceiptSignature = async (
    receiptId: string,
    signatureType: 'customer' | 'finance',
    signatureData: string,
    signerName: string
  ): Promise<boolean> => {
    try {
      const updateData = signatureType === 'customer' 
        ? {
            customer_signature_data: signatureData,
            customer_signature_type: 'drawn',
            customer_signed_at: new Date().toISOString(),
            customer_signer_name: signerName
          }
        : {
            finance_signature_data: signatureData,
            finance_signature_type: 'drawn',
            finance_signed_at: new Date().toISOString(),
            finance_signer_name: signerName
          };

      const { error } = await supabase
        .from('lightvehicle_cash_receipts')
        .update(updateData)
        .eq('id', receiptId);

      if (error) throw error;

      toast.success('Signature added successfully');
      return true;
    } catch (error: any) {
      console.error('Error updating signature:', error);
      toast.error('Failed to add signature');
      return false;
    }
  };

  const finalizeReceipt = async (receiptId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lightvehicle_cash_receipts')
        .update({ status: 'finalized' })
        .eq('id', receiptId);

      if (error) throw error;

      toast.success('Receipt finalized');
      return true;
    } catch (error: any) {
      console.error('Error finalizing receipt:', error);
      toast.error('Failed to finalize receipt');
      return false;
    }
  };

  return {
    isLoading,
    isCreating,
    fetchReceiptsForOrder,
    fetchReceiptByPayment,
    createReceipt,
    updateReceiptSignature,
    finalizeReceipt
  };
}
