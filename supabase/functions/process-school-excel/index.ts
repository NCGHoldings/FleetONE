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

    const { data, branch_id, mode = 'replace_all' }: ImportRequest = await req.json();

    if (!data || !Array.isArray(data) || !branch_id) {
      throw new Error('Invalid request data: missing data array or branch_id');
    }

    console.log(`Processing ${data.length} student records for branch ${branch_id} in ${mode} mode`);

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
      
      // Skip empty rows
      if (!row.student_name || row.student_name.trim() === '') {
        continue;
      }

      try {
        const normalizedData: any = {};
        
        // Normalize all fields with proper type conversion
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (value === null || value === undefined || value === '') {
            normalizedData[key] = null;
          } else if (key === 'payment_amount' || key === 'update_new') {
            const numValue = parseFloat(value);
            normalizedData[key] = isNaN(numValue) ? null : numValue;
          } else if (typeof value === 'string') {
            normalizedData[key] = value.trim();
          } else {
            normalizedData[key] = value?.toString()?.trim() || null;
          }
        });

        const record: StudentRecord = {
          student_name: normalizedData.student_name,
          admission_no: normalizedData.admission_no,
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
          service_type: normalizedData.service_type,
          pickup_point: normalizedData.pickup_point,
          dropoff_point: normalizedData.dropoff_point,
          payment_status: normalizedData.payment_status?.toLowerCase() || 'pending',
          payment_amount: normalizedData.payment_amount,
          update_new: normalizedData.update_new
        };

        validatedRecords.push(record);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    if (validatedRecords.length === 0) {
      throw new Error('No valid student records found in the uploaded data');
    }

    // Step 3: Process records in batches
    const BATCH_SIZE = 250;
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < validatedRecords.length; i += BATCH_SIZE) {
      const batch = validatedRecords.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)`);

      if (mode === 'replace_all') {
        // Replace All: Direct insert all records
        const recordsToInsert = batch.map(record => ({
          ...record,
          branch_id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { data: batchResult, error: batchError } = await supabaseClient
          .from('school_students')
          .insert(recordsToInsert)
          .select('id');

        if (batchError) {
          console.error('Batch insert error:', batchError);
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`);
        } else {
          insertedCount += batchResult?.length || 0;
        }
      } else {
        // Upsert mode: Check for existing and update/insert accordingly
        for (const record of batch) {
          try {
            let existingQuery = supabaseClient
              .from('school_students')
              .select('id')
              .eq('branch_id', branch_id)
              .eq('is_active', true);

            // Primary key: admission_no if available
            if (record.admission_no) {
              existingQuery = existingQuery.eq('admission_no', record.admission_no);
            } else {
              // Fallback: student_name
              existingQuery = existingQuery.eq('student_name', record.student_name);
            }

            const { data: existing } = await existingQuery.single();

            if (existing) {
              // Update existing record
              const { error: updateError } = await supabaseClient
                .from('school_students')
                .update({
                  ...record,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

              if (updateError) {
                console.error('Update error:', updateError);
                errors.push(`Update error for ${record.student_name}: ${updateError.message}`);
              } else {
                updatedCount++;
              }
            } else {
              // Insert new record
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
                console.error('Insert error:', insertError);
                errors.push(`Insert error for ${record.student_name}: ${insertError.message}`);
              } else {
                insertedCount++;
              }
            }
          } catch (error) {
            console.error('Processing error:', error);
            errors.push(`Processing error for ${record.student_name}: ${error.message}`);
            skippedCount++;
          }
        }
      }
    }

    const result: ImportResult = {
      success: true,
      total: data.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.slice(0, 10) // Show first 10 errors
    };

    console.log('Import completed:', result);

    return new Response(
      JSON.stringify({
        ...result,
        message: `Import completed: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped`
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