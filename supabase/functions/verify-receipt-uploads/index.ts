import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptVerificationData {
  receipt_id: string;
  verification_status: 'verified' | 'rejected';
  payment_amount?: number;
  payment_date?: string;
  notes?: string;
  verified_by: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      receipt_id, 
      verification_status, 
      payment_amount, 
      payment_date,
      notes,
      verified_by 
    }: ReceiptVerificationData = await req.json();

    if (!receipt_id || !verification_status || !verified_by) {
      throw new Error('Missing required fields: receipt_id, verification_status, or verified_by');
    }

    console.log(`Verifying receipt ${receipt_id} with status: ${verification_status}`);

    // Get the receipt details
    const { data: receipt, error: receiptError } = await supabaseClient
      .from('school_receipts')
      .select(`
        *,
        school_students:student_id (
          id,
          student_name,
          branch_id,
          payment_status,
          payment_amount,
          payment_balance,
          fixed_monthly_amount,
          update_new
        )
      `)
      .eq('id', receipt_id)
      .single();

    if (receiptError || !receipt) {
      throw new Error('Receipt not found or access denied');
    }

    // Start a transaction-like process
    if (verification_status === 'verified') {
      // Update receipt status
      const { error: receiptUpdateError } = await supabaseClient
        .from('school_receipts')
        .update({
          verification_status: 'verified',
          verified_by,
          verified_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', receipt_id);

      if (receiptUpdateError) {
        throw new Error(`Failed to update receipt: ${receiptUpdateError.message}`);
      }

      // Get student's current payment details
      const studentData = receipt.school_students;
      if (studentData) {
        const fixedAmount = studentData.fixed_monthly_amount || studentData.payment_amount || 0;
        const previousBalance = studentData.payment_balance || 0;
        const amountPaid = payment_amount || 0;
        const difference = amountPaid - fixedAmount;
        const newBalance = previousBalance + difference;

        // Create payment transaction record (trigger will update student automatically)
        const { error: transactionError } = await supabaseClient
          .from('school_payment_transactions')
          .insert({
            student_id: studentData.id,
            payment_month: payment_date || new Date().toISOString().split('T')[0],
            fixed_amount: fixedAmount,
            amount_paid: amountPaid,
            difference: difference,
            payment_balance_before: previousBalance,
            payment_balance_after: newBalance,
            payment_method: 'Receipt Upload',
            reference_no: receipt_id,
            payment_date: payment_date || new Date().toISOString().split('T')[0],
            notes: notes || 'Payment verified through receipt upload',
            created_by: verified_by
          });

        if (transactionError) {
          console.error('Failed to create payment transaction:', transactionError);
          throw new Error(`Failed to create payment transaction: ${transactionError.message}`);
        }
      }

      console.log(`Receipt ${receipt_id} approved successfully`);

    } else if (verification_status === 'rejected') {
      // Update receipt as rejected
      const { error: receiptUpdateError } = await supabaseClient
        .from('school_receipts')
        .update({
          verification_status: 'rejected',
          verified_by,
          verified_at: new Date().toISOString(),
          rejection_reason: notes || 'Receipt verification failed'
        })
        .eq('id', receipt_id);

      if (receiptUpdateError) {
        throw new Error(`Failed to update receipt: ${receiptUpdateError.message}`);
      }

      console.log(`Receipt ${receipt_id} rejected: ${notes}`);
    }

    // Send notification to parent (simulate)
    const studentInfo = receipt.school_students;
    if (studentInfo) {
      console.log(`Notification sent to parent of ${studentInfo.student_name}: Receipt ${verification_status}`);
      
      // In a real implementation, you would send email/SMS notification here
      // using the student's parent contact information
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Receipt ${verification_status} successfully`,
        receipt_id,
        verification_status,
        student_updated: verification_status === 'verified'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Error verifying receipt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: 'Check the Edge Function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});