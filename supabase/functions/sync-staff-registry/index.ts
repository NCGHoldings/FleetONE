import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StaffCandidate {
  name: string;
  type: 'driver' | 'conductor';
  source: string;
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Check if two names are similar (fuzzy match)
function isSimilarName(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check if first/last name matches
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');
  
  for (const p1 of parts1) {
    for (const p2 of parts2) {
      if (p1.length > 2 && p2.length > 2 && (p1 === p2 || p1.includes(p2) || p2.includes(p1))) {
        return true;
      }
    }
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting staff registry sync...');

    const candidates: StaffCandidate[] = [];

    // 1. Extract from daily_trips notes JSON
    console.log('Fetching daily_trips...');
    const { data: trips, error: tripsError } = await supabase
      .from('daily_trips')
      .select('notes, income_details')
      .not('notes', 'is', null);

    if (tripsError) {
      console.error('Error fetching trips:', tripsError);
    } else {
      console.log(`Found ${trips?.length || 0} trips with notes`);
      
      for (const trip of trips || []) {
        // Try to parse notes as JSON
        if (trip.notes) {
          try {
            // Check if notes contains driver/conductor info
            const notesLower = trip.notes.toLowerCase();
            
            // Common patterns: "Driver: Name", "Conductor: Name", etc.
            const driverMatch = trip.notes.match(/driver[:\s]+([A-Za-z\s]+)/i);
            const conductorMatch = trip.notes.match(/conductor[:\s]+([A-Za-z\s]+)/i);
            
            if (driverMatch && driverMatch[1]) {
              const name = driverMatch[1].trim().split(/[,\n]/)[0].trim();
              if (name.length > 1) {
                candidates.push({ name, type: 'driver', source: 'daily_trips_notes' });
              }
            }
            
            if (conductorMatch && conductorMatch[1]) {
              const name = conductorMatch[1].trim().split(/[,\n]/)[0].trim();
              if (name.length > 1) {
                candidates.push({ name, type: 'conductor', source: 'daily_trips_notes' });
              }
            }
          } catch {
            // Not JSON, skip
          }
        }

        // Try income_details JSON
        if (trip.income_details && typeof trip.income_details === 'object') {
          const details = trip.income_details as Record<string, any>;
          if (details.driver_name) {
            candidates.push({ name: details.driver_name, type: 'driver', source: 'income_details' });
          }
          if (details.conductor_name) {
            candidates.push({ name: details.conductor_name, type: 'conductor', source: 'income_details' });
          }
        }
      }
    }

    // 2. Extract from driver_allocations
    console.log('Fetching driver_allocations...');
    const { data: allocations, error: allocError } = await supabase
      .from('driver_allocations')
      .select(`
        driver_id,
        conductor_id,
        driver:profiles!driver_allocations_driver_id_fkey(full_name),
        conductor:profiles!driver_allocations_conductor_id_fkey(full_name)
      `);

    if (allocError) {
      console.error('Error fetching allocations:', allocError);
    } else {
      console.log(`Found ${allocations?.length || 0} allocations`);
      
      for (const alloc of allocations || []) {
        if (alloc.driver && (alloc.driver as any).full_name) {
          candidates.push({ 
            name: (alloc.driver as any).full_name, 
            type: 'driver', 
            source: 'driver_allocations' 
          });
        }
        if (alloc.conductor && (alloc.conductor as any).full_name) {
          candidates.push({ 
            name: (alloc.conductor as any).full_name, 
            type: 'conductor', 
            source: 'driver_allocations' 
          });
        }
      }
    }

    // 3. Extract from profiles with driver/conductor roles
    console.log('Fetching profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('full_name, role')
      .or('role.eq.driver,role.eq.conductor');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log(`Found ${profiles?.length || 0} profiles with driver/conductor roles`);
      
      for (const profile of profiles || []) {
        if (profile.full_name && profile.role) {
          candidates.push({ 
            name: profile.full_name, 
            type: profile.role as 'driver' | 'conductor', 
            source: 'profiles' 
          });
        }
      }
    }

    // 4. Get existing staff registry
    const { data: existingStaff, error: staffError } = await supabase
      .from('staff_registry')
      .select('staff_name, staff_type');

    if (staffError) {
      console.error('Error fetching existing staff:', staffError);
      throw staffError;
    }

    console.log(`Existing staff count: ${existingStaff?.length || 0}`);
    console.log(`Total candidates found: ${candidates.length}`);

    // 5. De-duplicate candidates
    const uniqueCandidates: StaffCandidate[] = [];
    
    for (const candidate of candidates) {
      if (!candidate.name || candidate.name.length < 2) continue;
      
      // Check if already in unique list
      const existsInUnique = uniqueCandidates.some(
        uc => isSimilarName(uc.name, candidate.name) && uc.type === candidate.type
      );
      
      if (!existsInUnique) {
        uniqueCandidates.push(candidate);
      }
    }

    console.log(`Unique candidates after dedup: ${uniqueCandidates.length}`);

    // 6. Filter out existing staff
    const newStaff: StaffCandidate[] = [];
    
    for (const candidate of uniqueCandidates) {
      const existsInRegistry = (existingStaff || []).some(
        es => isSimilarName(es.staff_name, candidate.name) && es.staff_type === candidate.type
      );
      
      if (!existsInRegistry) {
        newStaff.push(candidate);
      }
    }

    console.log(`New staff to add: ${newStaff.length}`);

    // 7. Insert new staff
    let addedCount = 0;
    const errors: string[] = [];

    for (const staff of newStaff) {
      const { error: insertError } = await supabase
        .from('staff_registry')
        .insert({
          staff_name: staff.name.trim(),
          staff_type: staff.type,
          salary_type: 'daily', // Default to daily
          daily_rate: staff.type === 'driver' ? 3000 : 2500, // Default rates
          monthly_salary: 0,
          is_active: true,
          notes: `Auto-synced from ${staff.source}`,
        });

      if (insertError) {
        console.error(`Error inserting ${staff.name}:`, insertError);
        errors.push(`${staff.name}: ${insertError.message}`);
      } else {
        addedCount++;
        console.log(`Added: ${staff.name} (${staff.type})`);
      }
    }

    const result = {
      success: true,
      message: `Synced ${addedCount} new staff members`,
      summary: {
        totalCandidates: candidates.length,
        uniqueCandidates: uniqueCandidates.length,
        existingStaff: existingStaff?.length || 0,
        newStaffFound: newStaff.length,
        addedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
      newStaff: newStaff.map(s => ({ name: s.name, type: s.type, source: s.source })),
    };

    console.log('Sync complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
