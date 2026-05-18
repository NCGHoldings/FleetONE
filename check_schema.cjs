const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://wwjpdszkmtnzshbulkon.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4"
);

async function run() {
  await supabase.auth.signInWithPassword({
    email: "abishekaai34@gmail.com",
    password: "ABIncgspeed",
  });
  const ap = await supabase.from("ap_invoices").select("agent_reference").limit(1);
  console.log("AP Invoices agent_reference:", ap.error ? ap.error.message : "Exists");
  const ar = await supabase.from("ar_invoices").select("agent_reference").limit(1);
  console.log("AR Invoices agent_reference:", ar.error ? ar.error.message : "Exists");
}
run();
