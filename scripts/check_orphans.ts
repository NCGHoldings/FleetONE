import { supabase } from "../src/integrations/supabase/client";

async function main() {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, reference, source_module, description")
    .eq("business_unit_code", "SBO")
    .limit(10);
  console.log(data, error);
}
main();
