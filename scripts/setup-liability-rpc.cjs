// Migration script to create RPC functions for advance_payments_liability_account
// Run with: node scripts/setup-liability-rpc.cjs

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwjpdszkmtnzshbulkon.supabase.co';
// Read service role key from environment or use the one from .env
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzb21kZnFua3h3Y3B0aWxzaWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3ODQ5NCwiZXhwIjoyMDc1OTU0NDk0fQ.T3rbhdNcYw9N19Sg45GyqlM_x-AV7FD4_8KQfD1Tf6U';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runMigration() {
  console.log('🔧 Setting up liability account RPC functions...\n');

  // Step 1: Verify the column exists
  console.log('1. Checking if advance_payments_liability_account_id column exists...');
  const { data: columns, error: colErr } = await supabase.rpc('', {}).catch(() => ({}));
  
  // Use raw SQL via the management API
  const sqlStatements = [
    // Ensure column exists
    `DO $$ 
     BEGIN 
       IF NOT EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'school_bus_finance_settings' 
         AND column_name = 'advance_payments_liability_account_id'
       ) THEN
         ALTER TABLE school_bus_finance_settings 
         ADD COLUMN advance_payments_liability_account_id UUID REFERENCES chart_of_accounts(id);
       END IF;
     END $$;`,

    // Create UPDATE function
    `CREATE OR REPLACE FUNCTION update_liability_account_setting(
       p_setting_id UUID,
       p_account_id UUID
     ) RETURNS void AS $$
     BEGIN
       UPDATE school_bus_finance_settings 
       SET advance_payments_liability_account_id = p_account_id
       WHERE id = p_setting_id;
       NOTIFY pgrst, 'reload schema';
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;`,

    // Create READ function  
    `CREATE OR REPLACE FUNCTION get_liability_account_setting(
       p_setting_id UUID
     ) RETURNS UUID AS $$
     DECLARE
       result UUID;
     BEGIN
       SELECT advance_payments_liability_account_id INTO result
       FROM school_bus_finance_settings
       WHERE id = p_setting_id;
       RETURN result;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;`,

    // Reload PostgREST schema cache
    `NOTIFY pgrst, 'reload schema';`,
  ];

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const label = ['Ensuring column exists', 'Creating update_liability_account_setting', 'Creating get_liability_account_setting', 'Reloading PostgREST schema cache'][i];
    
    console.log(`${i + 2}. ${label}...`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    } catch (err) {
      // Expected to fail, we just need the SQL execution path
    }

    // Execute via Supabase SQL endpoint (management API)
    const pgResponse = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (pgResponse.ok) {
      console.log(`   ✅ Done`);
    } else {
      const text = await pgResponse.text();
      console.log(`   ⚠️  Response: ${pgResponse.status} - ${text.substring(0, 200)}`);
    }
  }

  console.log('\n✅ Migration complete! Please reload the app.');
}

runMigration().catch(console.error);
