/**
 * SBO (School Bus Operations) April 21 Live Audit
 * Cross-checks: AR Invoices vs Journal Entries, Branch totals, Student counts
 * ONLY touches SBO company — does NOT affect other sub-companies.
 */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wwjpdszkmtnzshbulkon.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function audit() {
  console.log("=".repeat(70));
  console.log("  SBO LIVE DATABASE AUDIT — April 21 Data Check");
  console.log("=".repeat(70));

  // 1. Find the SBO company
  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id, name, code, business_unit_code")
    .order("name");

  if (compErr) { console.error("ERROR fetching companies:", compErr.message); return; }

  console.log("\n📋 ALL COMPANIES (to confirm we only touch SBO):");
  for (const c of companies) {
    console.log(`  ${c.name} | code: ${c.code} | BU: ${c.business_unit_code} | id: ${c.id}`);
  }

  // Find SBO company
  const sbo = companies.find(c => 
    (c.business_unit_code === "SBO") || 
    (c.name && c.name.toLowerCase().includes("school")) ||
    (c.code && c.code.toLowerCase().includes("sbo"))
  );

  if (!sbo) {
    console.error("\n❌ Could not find SBO company! Listing all for manual identification.");
    return;
  }

  const SBO_ID = sbo.id;
  console.log(`\n✅ SBO Company identified: "${sbo.name}" (${SBO_ID})`);

  // 2. School Branches
  console.log("\n" + "─".repeat(70));
  console.log("🏫 SCHOOL BRANCHES (school_branches table):");
  const { data: branches } = await supabase
    .from("school_branches")
    .select("id, branch_name, branch_code, is_active, company_id")
    .or(`company_id.eq.${SBO_ID},company_id.is.null`)
    .order("branch_name");

  if (branches && branches.length > 0) {
    for (const b of branches) {
      console.log(`  ${b.branch_name} | code: ${b.branch_code} | active: ${b.is_active} | id: ${b.id}`);
    }
  } else {
    console.log("  (no branches found)");
  }

  // 3. Active students/customers per branch
  console.log("\n" + "─".repeat(70));
  console.log("👨‍🎓 CUSTOMERS (students) — SBO only:");
  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .select("id, customer_name, branch_id, is_active, company_id, current_balance, customer_type")
    .eq("company_id", SBO_ID)
    .order("customer_name");

  if (custErr) {
    console.log("  ERROR:", custErr.message);
    // Try without current_balance if column doesn't exist
    const { data: customers2 } = await supabase
      .from("customers")
      .select("id, customer_name, branch_id, is_active, company_id, customer_type")
      .eq("company_id", SBO_ID)
      .order("customer_name");
    if (customers2) {
      console.log(`  Total SBO customers: ${customers2.length}`);
      console.log(`  Active: ${customers2.filter(c => c.is_active !== false).length}`);
    }
  } else {
    const active = customers.filter(c => c.is_active !== false);
    console.log(`  Total SBO customers: ${customers.length} | Active: ${active.length}`);
    
    // Group by branch
    const branchGroups = {};
    for (const c of active) {
      const branchName = branches?.find(b => b.id === c.branch_id)?.branch_name || "(no branch)";
      branchGroups[branchName] = (branchGroups[branchName] || 0) + 1;
    }
    console.log("\n  📊 Active Students by Branch:");
    for (const [branch, count] of Object.entries(branchGroups).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${branch}: ${count} students`);
    }
    console.log(`    TOTAL: ${active.length}`);
  }

  // 4. AR Invoices — SBO only
  console.log("\n" + "─".repeat(70));
  console.log("🧾 AR INVOICES — SBO only:");
  const { data: arInvoices, error: arErr } = await supabase
    .from("ar_invoices")
    .select("id, invoice_number, invoice_date, total_amount, status, customer_id, journal_entry_id, company_id, branch_id")
    .eq("company_id", SBO_ID)
    .order("invoice_date", { ascending: false });

  if (arErr) {
    console.log("  ERROR:", arErr.message);
  } else {
    console.log(`  Total AR invoices: ${arInvoices.length}`);
    
    // By status
    const statusCounts = {};
    for (const inv of arInvoices) {
      statusCounts[inv.status || "null"] = (statusCounts[inv.status || "null"] || 0) + 1;
    }
    console.log("  By status:", JSON.stringify(statusCounts));

    // By branch
    const branchInvoices = {};
    const branchTotals = {};
    for (const inv of arInvoices) {
      const branchName = branches?.find(b => b.id === inv.branch_id)?.branch_name || "(no branch)";
      branchInvoices[branchName] = (branchInvoices[branchName] || 0) + 1;
      branchTotals[branchName] = (branchTotals[branchName] || 0) + (inv.total_amount || 0);
    }
    console.log("\n  📊 AR Invoices by Branch:");
    for (const [branch, count] of Object.entries(branchInvoices).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${branch}: ${count} invoices | Total: Rs ${(branchTotals[branch] || 0).toLocaleString()}`);
    }

    // Count how many have linked JE
    const withJE = arInvoices.filter(i => i.journal_entry_id).length;
    const withoutJE = arInvoices.filter(i => !i.journal_entry_id).length;
    console.log(`\n  📊 JE Linkage: ${withJE} with JE | ${withoutJE} WITHOUT JE`);

    // Total amount
    const totalAR = arInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
    console.log(`  Total AR amount: Rs ${totalAR.toLocaleString()}`);
  }

  // 5. Journal Entries — SBO only
  console.log("\n" + "─".repeat(70));
  console.log("📒 JOURNAL ENTRIES — SBO only:");
  const { data: journalEntries, error: jeErr } = await supabase
    .from("journal_entries")
    .select("id, entry_number, entry_date, description, total_debit, total_credit, status, company_id, reference")
    .eq("company_id", SBO_ID)
    .order("entry_date", { ascending: false })
    .limit(1000);

  if (jeErr) {
    console.log("  ERROR:", jeErr.message);
  } else {
    console.log(`  Total JEs: ${journalEntries.length}`);

    // By status
    const jeStatusCounts = {};
    for (const je of journalEntries) {
      jeStatusCounts[je.status || "null"] = (jeStatusCounts[je.status || "null"] || 0) + 1;
    }
    console.log("  By status:", JSON.stringify(jeStatusCounts));

    // AR-related JEs
    const arJEs = journalEntries.filter(je => 
      (je.description && je.description.toLowerCase().includes("invoice")) ||
      (je.entry_number && je.entry_number.startsWith("AR-")) ||
      (je.reference && je.reference.startsWith("AR-"))
    );
    console.log(`  AR-related JEs: ${arJEs.length}`);

    // Total debits/credits
    const totalDebit = journalEntries.reduce((s, je) => s + (je.total_debit || 0), 0);
    const totalCredit = journalEntries.reduce((s, je) => s + (je.total_credit || 0), 0);
    console.log(`  Total Debits: Rs ${totalDebit.toLocaleString()} | Total Credits: Rs ${totalCredit.toLocaleString()}`);
  }

  // 6. CRITICAL CHECK: AR Invoice count vs JE count mismatch
  if (arInvoices && journalEntries) {
    console.log("\n" + "=".repeat(70));
    console.log("⚠️  CRITICAL INTEGRITY CHECK: AR ↔ JE MATCHING");
    console.log("=".repeat(70));

    const arCount = arInvoices.length;
    const jeCount = journalEntries.length;
    const arWithoutJE = arInvoices.filter(i => !i.journal_entry_id);

    console.log(`  AR Invoices: ${arCount}`);
    console.log(`  Journal Entries: ${jeCount}`);
    console.log(`  AR Invoices missing JE: ${arWithoutJE.length}`);

    if (arWithoutJE.length > 0) {
      console.log("\n  ❌ INVOICES WITHOUT JOURNAL ENTRIES:");
      const sample = arWithoutJE.slice(0, 20);
      for (const inv of sample) {
        const branchName = branches?.find(b => b.id === inv.branch_id)?.branch_name || "(no branch)";
        console.log(`    ${inv.invoice_number} | ${inv.invoice_date} | Rs ${(inv.total_amount || 0).toLocaleString()} | ${branchName} | status: ${inv.status}`);
      }
      if (arWithoutJE.length > 20) {
        console.log(`    ... and ${arWithoutJE.length - 20} more`);
      }
    } else {
      console.log("\n  ✅ ALL AR invoices have linked Journal Entries!");
    }

    // Check for orphan JEs (JEs that reference AR but AR invoice doesn't link back)
    const arJeIds = new Set(arInvoices.filter(i => i.journal_entry_id).map(i => i.journal_entry_id));
    const arRelatedJEs = journalEntries.filter(je => 
      (je.description && je.description.toLowerCase().includes("invoice")) ||
      (je.entry_number && je.entry_number.startsWith("AR-"))
    );
    const orphanJEs = arRelatedJEs.filter(je => !arJeIds.has(je.id));
    if (orphanJEs.length > 0) {
      console.log(`\n  ⚠️  ORPHAN JEs (AR-related but not linked from any invoice): ${orphanJEs.length}`);
      for (const je of orphanJEs.slice(0, 10)) {
        console.log(`    ${je.entry_number} | ${je.entry_date} | ${je.description?.slice(0, 60)} | Rs ${(je.total_debit || 0).toLocaleString()}`);
      }
    }
  }

  // 7. Expected vs Actual comparison
  console.log("\n" + "=".repeat(70));
  console.log("📋 EXPECTED vs ACTUAL (from your spreadsheet):");
  console.log("=".repeat(70));

  const expected = {
    "Katunayaka": { students: 33, correctTotal: 192240 },
    "Panadura": { students: 440, correctTotal: 2762960 },
    "Nuwara Eliya": { students: 197, correctTotal: 1139560 },
  };

  if (customers && branches) {
    const activeCustomers = customers.filter(c => c.is_active !== false);
    for (const [branchName, exp] of Object.entries(expected)) {
      const branch = branches.find(b => b.branch_name && b.branch_name.toLowerCase().includes(branchName.toLowerCase()));
      if (!branch) {
        console.log(`\n  ❌ Branch "${branchName}" not found in database!`);
        continue;
      }
      
      const branchStudents = activeCustomers.filter(c => c.branch_id === branch.id);
      const branchInvs = (arInvoices || []).filter(i => i.branch_id === branch.id);
      const branchInvTotal = branchInvs.reduce((s, i) => s + (i.total_amount || 0), 0);
      
      const studentMatch = branchStudents.length === exp.students ? "✅" : "❌";
      const totalMatch = branchInvTotal === exp.correctTotal ? "✅" : "❌";

      console.log(`\n  ${branchName}:`);
      console.log(`    Students: Expected ${exp.students} | Actual ${branchStudents.length} ${studentMatch}`);
      console.log(`    AR Total: Expected Rs ${exp.correctTotal.toLocaleString()} | Actual Rs ${branchInvTotal.toLocaleString()} ${totalMatch}`);
      console.log(`    AR Invoices count: ${branchInvs.length}`);
      
      if (branchStudents.length !== exp.students) {
        console.log(`    ⚠️  Student count MISMATCH: diff = ${branchStudents.length - exp.students}`);
      }
      if (branchInvTotal !== exp.correctTotal) {
        console.log(`    ⚠️  Invoice total MISMATCH: diff = Rs ${(branchInvTotal - exp.correctTotal).toLocaleString()}`);
      }
    }
  }

  // 8. Other companies safety check
  console.log("\n" + "=".repeat(70));
  console.log("🛡️  SAFETY CHECK — Other companies NOT affected:");
  console.log("=".repeat(70));
  for (const c of companies) {
    if (c.id === SBO_ID) continue;
    const { count: arCount } = await supabase
      .from("ar_invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", c.id);
    const { count: jeCount } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", c.id);
    console.log(`  ${c.name}: ${arCount || 0} AR invoices | ${jeCount || 0} JEs`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("  AUDIT COMPLETE");
  console.log("=".repeat(70));
}

audit().catch(console.error);
