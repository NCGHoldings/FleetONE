const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('school_students').select('is_active, id').eq('branch_id', 'dd387300-dc45-4c1e-ae24-933750c78a8e');
  if (error) console.error(error);
  else {
    const active = data.filter(d => d.is_active === true).length;
    const inactive = data.filter(d => d.is_active === false).length;
    const nullActive = data.filter(d => d.is_active === null).length;
    console.log(`Active: ${active}, Inactive: ${inactive}, Null: ${nullActive}`);
  }
}
run();
