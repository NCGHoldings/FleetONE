const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('school_students').select('is_active').eq('branch_id', 'dd387300-dc45-4c1e-ae24-933750c78a8e');
  if (error) { console.error(error); return; }
  
  const total = data.length;
  const activeTrue = data.filter(s => s.is_active === true).length;
  const activeFalse = data.filter(s => s.is_active === false).length;
  const activeNull = data.filter(s => s.is_active === null).length;
  
  console.log(`Total: ${total}, True: ${activeTrue}, False: ${activeFalse}, Null: ${activeNull}`);
}
run();
