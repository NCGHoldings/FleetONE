import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  NO?: string;
  VehicleNumber: string;
  AccidentDate: string;
  BLNumber?: string;
  DetailsOfAccident?: string;
  EstimateAmount?: string;
  ApprovedAmount?: string;
  ProcessDetails?: string;
  AccidentMark?: string;
  Salvage?: string;
  ReportedBy?: string;
  Location?: string;
  InsurerClaimRef?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  rowErrors: Array<{
    row: number;
    errors: string[];
    data: any;
  }>;
}

function parseDate(dateValue: any): string | null {
  if (!dateValue) return null;
  
  // Handle Excel serial date numbers
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // Handle string dates
  if (typeof dateValue === 'string') {
    const trimmedDate = dateValue.trim();
    
    // Handle "DD Month YYYY" format like "05 January 2023"
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Try to parse "DD Month YYYY" format
    const parts = trimmedDate.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthName = parts[1];
      const year = parseInt(parts[2]);
      
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
      
      if (monthIndex !== -1 && !isNaN(day) && !isNaN(year) && day >= 1 && day <= 31) {
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Try standard date parsing as fallback
    const date = new Date(trimmedDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value.toString().replace(/[,$]/g, ''));
  return isNaN(num) ? null : num;
}

function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', 'yes', '1', 'y'].includes(value.toLowerCase());
  }
  return false;
}

function validateRow(row: ImportRow, rowIndex: number): string[] {
  const errors: string[] = [];
  
  if (!row.VehicleNumber?.trim()) {
    errors.push('VehicleNumber is required');
  }
  
  if (!row.AccidentDate?.trim()) {
    errors.push('AccidentDate is required');
  } else {
    const parsedDate = parseDate(row.AccidentDate);
    if (!parsedDate) {
      errors.push('AccidentDate is invalid or ambiguous');
    }
  }
  
  return errors;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Read and parse the file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];

    console.log(`Processing ${jsonData.length} rows from import file`);

    const result: ImportResult = {
      created: 0,
      updated: 0,
      errors: 0,
      rowErrors: []
    };

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowIndex = i + 2; // Excel row number (assuming header row)
      
      try {
        // Validate row
        const validationErrors = validateRow(row, rowIndex);
        if (validationErrors.length > 0) {
          result.errors++;
          result.rowErrors.push({
            row: rowIndex,
            errors: validationErrors,
            data: row
          });
          continue;
        }

        // Parse and prepare data
        const recordData = {
          vehicle_number: row.VehicleNumber?.trim(),
          accident_date: parseDate(row.AccidentDate),
          bl_number: row.BLNumber?.trim() || null,
          details_of_accident: row.DetailsOfAccident?.trim() || null,
          estimate_amount: parseNumber(row.EstimateAmount),
          approved_amount: parseNumber(row.ApprovedAmount),
          process_details: row.ProcessDetails?.trim() || null,
          accident_mark: parseBoolean(row.AccidentMark),
          salvage: parseBoolean(row.Salvage),
          reported_by: row.ReportedBy?.trim() || null,
          location: row.Location?.trim() || null,
          insurer_claim_ref: row.InsurerClaimRef?.trim() || null,
          created_by: user.id,
          updated_by: user.id
        };

        // Check for existing record (upsert logic)
        let existingRecord = null;
        
        if (recordData.bl_number) {
          const { data } = await supabase
            .from('accident_records')
            .select('id')
            .eq('bl_number', recordData.bl_number)
            .maybeSingle();
          existingRecord = data;
        }
        
        if (!existingRecord && recordData.vehicle_number && recordData.accident_date) {
          const { data } = await supabase
            .from('accident_records')
            .select('id')
            .eq('vehicle_number', recordData.vehicle_number)
            .eq('accident_date', recordData.accident_date)
            .maybeSingle();
          existingRecord = data;
        }

        if (existingRecord) {
          // Update existing record
          const { error } = await supabase
            .from('accident_records')
            .update({
              ...recordData,
              updated_by: user.id
            })
            .eq('id', existingRecord.id);

          if (error) {
            throw error;
          }
          
          result.updated++;
          console.log(`Updated record for row ${rowIndex}`);
        } else {
          // Create new record
          const { error } = await supabase
            .from('accident_records')
            .insert(recordData);

          if (error) {
            throw error;
          }
          
          result.created++;
          console.log(`Created record for row ${rowIndex}`);
        }

      } catch (error) {
        console.error(`Error processing row ${rowIndex}:`, error);
        result.errors++;
        result.rowErrors.push({
          row: rowIndex,
          errors: [error.message],
          data: row
        });
      }
    }

    console.log('Import completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: `Import completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in accident import:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});