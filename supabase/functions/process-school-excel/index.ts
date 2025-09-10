import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudentRecord {
  student_name: string;
  admission_no?: string;
  grade?: string;
  school_location?: string;
  route?: string;
  bus_reg_no?: string;
  driver_name?: string;
  driver_contact_no?: string;
  care_taker_name?: string;
  care_taker_contact_no?: string;
  parent_name?: string;
  address?: string;
  email_id?: string;
  father_contact_no?: string;
  mother_contact_no?: string;
  service_type?: string;
  pickup_point?: string;
  dropoff_point?: string;
  payment_status?: string;
  payment_amount?: number;
  update_new?: number;
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

    const { data, branch_id } = await req.json();

    if (!data || !Array.isArray(data) || !branch_id) {
      throw new Error('Invalid request data: missing data array or branch_id');
    }

    console.log(`Processing ${data.length} student records for branch ${branch_id}`);

    // Validate and transform the data
    const validatedRecords: StudentRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row.student_name || row.student_name.trim() === '') {
        continue;
      }

      try {
        const record: StudentRecord = {
          student_name: row.student_name.trim(),
          admission_no: row.admission_no?.toString().trim() || null,
          grade: row.grade?.toString().trim() || null,
          school_location: row.school_location?.trim() || null,
          route: row.route?.trim() || null,
          bus_reg_no: row.bus_reg_no?.toString().trim() || null,
          driver_name: row.driver_name?.trim() || null,
          driver_contact_no: row.driver_contact_no?.toString().trim() || null,
          care_taker_name: row.care_taker_name?.trim() || null,
          care_taker_contact_no: row.care_taker_contact_no?.toString().trim() || null,
          parent_name: row.parent_name?.trim() || null,
          address: row.address?.trim() || null,
          email_id: row.email_id?.trim() || null,
          father_contact_no: row.father_contact_no?.toString().trim() || null,
          mother_contact_no: row.mother_contact_no?.toString().trim() || null,
          service_type: row.service_type?.trim() || null,
          pickup_point: row.pickup_point?.trim() || null,
          dropoff_point: row.dropoff_point?.trim() || null,
          payment_status: row.payment_status?.toLowerCase() || 'pending',
          payment_amount: parseFloat(row.payment_amount) || 0,
          update_new: parseFloat(row.update_new) || 0
        };

        validatedRecords.push(record);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    if (validatedRecords.length === 0) {
      throw new Error('No valid student records found in the uploaded data');
    }

    // Insert records into database
    const recordsToInsert = validatedRecords.map(record => ({
      ...record,
      branch_id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: insertResult, error: insertError } = await supabaseClient
      .from('school_students')
      .insert(recordsToInsert)
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to insert records: ${insertError.message}`);
    }

    console.log(`Successfully processed ${insertResult.length} student records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertResult.length} student records`,
        processed: insertResult.length,
        errors: errors.length > 0 ? errors : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing Excel import:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Check the Edge Function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});