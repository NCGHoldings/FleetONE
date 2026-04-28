import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuotation() {
  console.log("Checking quotation 1766...");
  const { data: quotation, error } = await supabase
    .from('special_hire_quotations')
    .select('id, quotation_no, customer_name, total_paid, advance_paid, ar_invoice_id, finance_customer_id, status, advance_payment_status, balance_payment_status')
    .eq('quotation_no', '1766')
    .single();

  if (error) {
    console.error("Error fetching quotation:", error);
    return;
  }

  console.log("Quotation Data:", JSON.stringify(quotation, null, 2));

  // Also get any payments
  const { data: payments, error: pmtsError } = await supabase
    .from('special_hire_payments')
    .select('id, amount, payment_type, status, ar_invoice_id, ar_receipt_id, journal_entry_id')
    .eq('quotation_id', quotation.id);

  if (pmtsError) {
    console.error("Error fetching payments:", pmtsError);
    return;
  }

  console.log("Payments Data:", JSON.stringify(payments, null, 2));
  
  // Also get AR invoices if any
  if (quotation.finance_customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, customer_name')
      .eq('id', quotation.finance_customer_id)
      .single();
    console.log("Customer:", JSON.stringify(customer, null, 2));
  }
}

checkQuotation();
