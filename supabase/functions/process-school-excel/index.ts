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

interface ImportRequest {
  data: any[];
  branch_id: string;
  mode?: 'replace_all' | 'upsert';
}

interface ImportResult {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Normalize service_type: "yes"/"Yes" → "BothWay", "no"/"No" → "OneWay"
function normalizeServiceType(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim().toLowerCase();
  if (str === 'yes' || str === 'bothway' || str === 'both way' || str === 'both') return 'BothWay';
  if (str === 'no' || str === 'oneway' || str === 'one way' || str === 'one') return 'OneWay';
  // Default to BothWay for any unrecognized non-empty value
  return 'BothWay';
}

// Fix admission_no: RO → R0 (letter O to digit 0)
function fixAdmissionNo(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  let str = String(value).trim();
  // Replace RO/Ro at the start with R0
  str = str.replace(/^[Rr][Oo]/, 'R0');
  return str;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, branch_id, mode = 'replace_all' }: ImportRequest = await req.json();

    if (!data || !Array.isArray(data) || !branch_id) {
      throw new Error('Invalid request data: missing data array or branch_id');
    }

    console.log(`Processing ${data.length} student records for branch ${branch_id} in ${mode} mode`);
    
    // Debug: log first record keys and values
    if (data.length > 0) {
      console.log('First record keys:', Object.keys(data[0]));
      console.log('First record values:', JSON.stringify(data[0]));
    }

    // Step 1: Replace All mode - soft clear existing students
    if (mode === 'replace_all') {
      console.log('Clearing existing students for branch...');
      const { error: clearError } = await supabaseClient
        .from('school_students')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('branch_id', branch_id)
        .eq('is_active', true);

      if (clearError) {
        console.error('Error clearing existing students:', clearError);
        throw new Error(`Failed to clear existing students: ${clearError.message}`);
      }
    }

    // Step 2: Validate and transform the data
    const validatedRecords: StudentRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      if (!row.student_name || String(row.student_name).trim() === '') {
        continue;
      }

      try {
        const normalizedData: any = {};
        
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (value === null || value === undefined || value === '') {
            normalizedData[key] = null;
          } else if (key === 'payment_amount' || key === 'update_new' || key === 'fixed_amount' || key === 'amount_due') {
            const numValue = parseFloat(value);
            normalizedData[key] = isNaN(numValue) ? null : numValue;
          } else if (typeof value === 'string') {
            normalizedData[key] = value.trim();
          } else {
            normalizedData[key] = value?.toString()?.trim() || null;
          }
        });

        // Handle field aliases: fixed_amount → update_new, amount_due → payment_amount
        const updateNewValue = normalizedData.update_new ?? normalizedData.fixed_amount ?? null;
        const paymentAmountValue = normalizedData.payment_amount ?? normalizedData.amount_due ?? null;

        const record: StudentRecord = {
          student_name: normalizedData.student_name,
          admission_no: fixAdmissionNo(normalizedData.admission_no),
          grade: normalizedData.grade,
          school_location: normalizedData.school_location,
          route: normalizedData.route,
          bus_reg_no: normalizedData.bus_reg_no,
          driver_name: normalizedData.driver_name,
          driver_contact_no: normalizedData.driver_contact_no,
          care_taker_name: normalizedData.care_taker_name,
          care_taker_contact_no: normalizedData.care_taker_contact_no,
          parent_name: normalizedData.parent_name,
          address: normalizedData.address,
          email_id: normalizedData.email_id,
          father_contact_no: normalizedData.father_contact_no,
          mother_contact_no: normalizedData.mother_contact_no,
          service_type: normalizeServiceType(normalizedData.service_type),
          pickup_point: normalizedData.pickup_point,
          dropoff_point: normalizedData.dropoff_point,
          payment_status: normalizedData.payment_status?.toLowerCase() || 'pending',
          payment_amount: paymentAmountValue,
          update_new: updateNewValue
        };

        validatedRecords.push(record);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    if (validatedRecords.length === 0) {
      throw new Error('No valid student records found in the uploaded data');
    }

    // Step 3: Process records
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    if (mode === 'replace_all') {
      // Per-record insert so one bad row doesn't kill the batch
      for (let i = 0; i < validatedRecords.length; i++) {
        const record = validatedRecords[i];
        const recordToInsert = {
          ...record,
          branch_id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabaseClient
          .from('school_students')
          .insert(recordToInsert);

        if (insertError) {
          console.error(`Row ${i + 1} insert error:`, insertError.message, JSON.stringify(record));
          errors.push(`Row ${i + 1} (${record.student_name}): ${insertError.message}`);
          skippedCount++;
        } else {
          insertedCount++;
        }
      }
    } else {
      // Upsert mode
      for (const record of validatedRecords) {
        try {
          let existingQuery = supabaseClient
            .from('school_students')
            .select('id')
            .eq('branch_id', branch_id)
            .eq('is_active', true);

          if (record.admission_no) {
            existingQuery = existingQuery.eq('admission_no', record.admission_no);
          } else {
            existingQuery = existingQuery.eq('student_name', record.student_name);
          }

          const { data: existing } = await existingQuery.single();

          if (existing) {
            const { error: updateError } = await supabaseClient
              .from('school_students')
              .update({
                ...record,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (updateError) {
              errors.push(`Update error for ${record.student_name}: ${updateError.message}`);
            } else {
              updatedCount++;
            }
          } else {
            const { error: insertError } = await supabaseClient
              .from('school_students')
              .insert({
                ...record,
                branch_id,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (insertError) {
              errors.push(`Insert error for ${record.student_name}: ${insertError.message}`);
            } else {
              insertedCount++;
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          errors.push(`Processing error for ${record.student_name}: ${errorMessage}`);
          skippedCount++;
        }
      }
    }

    const result: ImportResult = {
      success: true,
      total: data.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.slice(0, 20)
    };

    // Debug: field population stats
    const withAdmission = validatedRecords.filter(r => r.admission_no).length;
    const withUpdateNew = validatedRecords.filter(r => r.update_new !== null && r.update_new !== undefined).length;
    const withPayment = validatedRecords.filter(r => r.payment_amount !== null && r.payment_amount !== undefined).length;
    console.log(`Field stats: admission_no=${withAdmission}, update_new=${withUpdateNew}, payment_amount=${withPayment}`);

    console.log('Import completed:', result);

    return new Response(
      JSON.stringify({
        ...result,
        message: `Import completed: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped${errors.length > 0 ? `, ${errors.length} errors` : ''}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Error processing Excel import:', error);
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
