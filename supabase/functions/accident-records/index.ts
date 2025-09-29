import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const { searchParams } = url;

    switch (req.method) {
      case 'GET': {
        // Build query with filters
        let query = supabase
          .from('accident_records')
          .select('*')
          .order('created_at', { ascending: false });

        // Apply filters
        const vehicleNumber = searchParams.get('vehicleNumber');
        const blNumber = searchParams.get('blNumber');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const salvage = searchParams.get('salvage');
        const accidentMark = searchParams.get('accidentMark');
        const status = searchParams.get('status');

        if (vehicleNumber) {
          query = query.ilike('vehicle_number', `%${vehicleNumber}%`);
        }
        if (blNumber) {
          query = query.ilike('bl_number', `%${blNumber}%`);
        }
        if (startDate) {
          query = query.gte('accident_date', startDate);
        }
        if (endDate) {
          query = query.lte('accident_date', endDate);
        }
        if (salvage !== null && salvage !== '') {
          query = query.eq('salvage', salvage === 'true');
        }
        if (accidentMark !== null && accidentMark !== '') {
          query = query.eq('accident_mark', accidentMark === 'true');
        }
        if (status) {
          query = query.eq('status', status);
        }

        // Pagination
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({ 
            data, 
            count,
            pagination: {
              limit,
              offset,
              hasMore: count ? offset + limit < count : false
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'POST': {
        const body = await req.json();
        
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

        const { data, error } = await supabase
          .from('accident_records')
          .insert({
            ...body,
            created_by: user.id,
            updated_by: user.id
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify(data),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201
          }
        );
      }

      case 'PUT': {
        const body = await req.json();
        
        // Extract ID from the request body instead of URL path
        const recordId = body.id;
        
        if (!recordId) {
          throw new Error('Record ID is required for updates');
        }

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

        // Remove id and no from body to avoid conflicts, use it in the where clause
        const { id, no, ...updateData } = body;

        const { data, error } = await supabase
          .from('accident_records')
          .update({
            ...updateData,
            updated_by: user.id
          })
          .eq('id', recordId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify(data),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'DELETE': {
        const pathSegments = url.pathname.split('/');
        const id = pathSegments[pathSegments.length - 1];
        
        if (!id || id === 'accident-records') {
          throw new Error('Record ID is required for deletion');
        }

        const { error } = await supabase
          .from('accident_records')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({ message: 'Record deleted successfully' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      default:
        return new Response('Method not allowed', { 
          status: 405,
          headers: corsHeaders 
        });
    }
  } catch (error: unknown) {
    console.error('Error in accident-records function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});