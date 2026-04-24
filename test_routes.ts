import { supabase } from "./src/integrations/supabase/client";

async function run() {
  const { data, error } = await supabase.from('routes').select('*').ilike('route_name', '%kadawatha%');
  console.log(data, error);
}
run();
