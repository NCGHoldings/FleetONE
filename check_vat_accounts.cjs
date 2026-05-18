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
  const { data } = await supabase.from("chart_of_accounts").select("id, account_code, account_name, company_id").ilike("account_name", "%VAT%");
  console.log("VAT Accounts in DB:");
  console.log(data);
}
run();
