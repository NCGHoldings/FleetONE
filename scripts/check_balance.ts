import { supabase } from "../src/integrations/supabase/client";

async function main() {
  const accountId = "55a1532f-410a-48a0-bb8d-71b30691ab39"; // I don't know the ID, I'll fetch by account_code 41103001
  const { data: accounts } = await supabase.from("chart_of_accounts").select("id, current_balance, account_code").eq("account_code", "41103001");
  console.log("Account:", accounts);
  
  if (accounts && accounts.length > 0) {
    const accId = accounts[0].id;
    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, journal_entries(status)")
      .eq("account_id", accId);
      
    if (lines) {
      let postedDebit = 0;
      let postedCredit = 0;
      let unpostedDebit = 0;
      let unpostedCredit = 0;
      
      lines.forEach(l => {
         const je = l.journal_entries as any;
         if (je?.status === 'posted') {
           postedDebit += (l.debit || 0);
           postedCredit += (l.credit || 0);
         } else {
           unpostedDebit += (l.debit || 0);
           unpostedCredit += (l.credit || 0);
         }
      });
      
      console.log("Posted Debit:", postedDebit);
      console.log("Posted Credit:", postedCredit);
      console.log("Net Posted Balance:", postedCredit - postedDebit); // Revenue is credit normal
    }
  }
}
main();
