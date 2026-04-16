import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LIVE_COMPANY_ID = "a0000000-0000-0000-0000-000000000001";
const TEST_COMPANY_ID = "f40b0a9d-ae5b-41b3-9188-535ae94c9020";

// Tables in dependency order (parents first)
const TABLE_CONFIG: Record<string, { children?: { table: string; fk: string; parentFk?: string }[] }> = {
  chart_of_accounts: {},
  customers: {},
  vendors: {},
  bank_accounts: {},
  journal_entries: {
    children: [{ table: "journal_entry_lines", fk: "journal_entry_id" }],
  },
  ar_invoices: {
    children: [{ table: "ar_invoice_lines", fk: "invoice_id" }],
  },
  ap_invoices: {
    children: [{ table: "ap_invoice_lines", fk: "invoice_id" }],
  },
  ar_receipts: {
    children: [{ table: "ar_receipt_allocations", fk: "receipt_id" }],
  },
  ap_payments: {
    children: [
      { table: "ap_payment_allocations", fk: "payment_id" },
      { table: "ap_payment_lines", fk: "payment_id" },
    ],
  },
  bank_transactions: {},
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user with anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // Check super_admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Only super_admin can transfer data" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      direction,
      mode,
      tables,
    }: {
      direction: "live_to_test" | "test_to_live";
      mode: "clear_then_copy" | "merge";
      tables: string[];
    } = body;

    if (!direction || !mode || !tables?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: direction, mode, tables" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceCompanyId = direction === "live_to_test" ? LIVE_COMPANY_ID : TEST_COMPANY_ID;
    const targetCompanyId = direction === "live_to_test" ? TEST_COMPANY_ID : LIVE_COMPANY_ID;

    const results: Record<string, { copied: number; cleared: number; errors: string[] }> = {};

    // Process tables in order
    const orderedTables = Object.keys(TABLE_CONFIG).filter((t) => tables.includes(t));

    for (const tableName of orderedTables) {
      const config = TABLE_CONFIG[tableName];
      const tableResult = { copied: 0, cleared: 0, errors: [] as string[] };

      try {
        // Step 1: Clear target data if mode is clear_then_copy
        if (mode === "clear_then_copy") {
          // Clear children first
          if (config.children) {
            for (const child of config.children) {
              // Get parent IDs in target
              const { data: parentIds } = await adminClient
                .from(tableName)
                .select("id")
                .eq("company_id", targetCompanyId);

              if (parentIds && parentIds.length > 0) {
                const ids = parentIds.map((p: any) => p.id);
                // Delete in batches
                for (let i = 0; i < ids.length; i += 100) {
                  const batch = ids.slice(i, i + 100);
                  await adminClient.from(child.table).delete().in(child.fk, batch);
                }
              }
            }
          }

          // Clear parent
          const { count } = await adminClient
            .from(tableName)
            .delete()
            .eq("company_id", targetCompanyId)
            .select("*");

          // Actually delete
          await adminClient.from(tableName).delete().eq("company_id", targetCompanyId);
          tableResult.cleared = count || 0;
        }

        // Step 2: Fetch source data
        const { data: sourceData, error: fetchError } = await adminClient
          .from(tableName)
          .select("*")
          .eq("company_id", sourceCompanyId)
          .limit(5000);

        if (fetchError) {
          tableResult.errors.push(`Fetch error: ${fetchError.message}`);
          results[tableName] = tableResult;
          continue;
        }

        if (!sourceData || sourceData.length === 0) {
          results[tableName] = tableResult;
          continue;
        }

        // Step 3: Build ID mapping (old ID → new ID)
        const idMap: Record<string, string> = {};
        const mappedRows = sourceData.map((row: any) => {
          const newId = crypto.randomUUID();
          idMap[row.id] = newId;
          const newRow = { ...row, id: newId, company_id: targetCompanyId };

          // For COA, special handling — match by account_code instead of creating new
          // We skip this for COA as it needs special logic below
          return newRow;
        });

        // Special COA handling: match by account_code
        if (tableName === "chart_of_accounts") {
          // Get existing target COA
          const { data: existingCOA } = await adminClient
            .from("chart_of_accounts")
            .select("id, account_code")
            .eq("company_id", targetCompanyId);

          const existingByCode: Record<string, string> = {};
          (existingCOA || []).forEach((acc: any) => {
            existingByCode[acc.account_code] = acc.id;
          });

          // Update existing or insert new
          let updated = 0;
          let inserted = 0;
          for (const row of sourceData) {
            const targetRow = { ...row, company_id: targetCompanyId };
            delete targetRow.id; // Let it match or auto-generate

            if (existingByCode[row.account_code]) {
              // Update existing
              const targetId = existingByCode[row.account_code];
              idMap[row.id] = targetId;
              const { id: _, ...updateData } = targetRow;
              await adminClient
                .from("chart_of_accounts")
                .update(updateData)
                .eq("id", targetId);
              updated++;
            } else {
              // Insert new
              const newId = crypto.randomUUID();
              idMap[row.id] = newId;
              const { error: insertErr } = await adminClient
                .from("chart_of_accounts")
                .insert({ ...targetRow, id: newId });
              if (insertErr) {
                tableResult.errors.push(`Insert COA ${row.account_code}: ${insertErr.message}`);
              } else {
                inserted++;
              }
            }
          }
          tableResult.copied = updated + inserted;
          results[tableName] = tableResult;
          continue;
        }

        // Step 4: Remap FK references for non-COA tables
        // Remap parent_id for hierarchical tables
        for (const row of mappedRows) {
          if (row.parent_id && idMap[row.parent_id]) {
            row.parent_id = idMap[row.parent_id];
          }
          // Remap account references
          if (row.account_id && idMap[row.account_id]) {
            row.account_id = idMap[row.account_id];
          }
          if (row.bank_account_id && idMap[row.bank_account_id]) {
            row.bank_account_id = idMap[row.bank_account_id];
          }
          if (row.customer_id && idMap[row.customer_id]) {
            row.customer_id = idMap[row.customer_id];
          }
          if (row.vendor_id && idMap[row.vendor_id]) {
            row.vendor_id = idMap[row.vendor_id];
          }
          // Clear journal_entry_id references that might not exist in target
          if (row.journal_entry_id && !idMap[row.journal_entry_id]) {
            row.journal_entry_id = null;
          } else if (row.journal_entry_id && idMap[row.journal_entry_id]) {
            row.journal_entry_id = idMap[row.journal_entry_id];
          }
          // Remove auto-generated columns
          delete row.no; // serial columns
        }

        // Step 5: Insert parent rows in batches
        if (mode === "merge") {
          // Upsert to skip conflicts
          for (let i = 0; i < mappedRows.length; i += 50) {
            const batch = mappedRows.slice(i, i + 50);
            const { error: insertErr, count } = await adminClient
              .from(tableName)
              .upsert(batch, { onConflict: "id", ignoreDuplicates: true });
            if (insertErr) {
              tableResult.errors.push(`Insert batch: ${insertErr.message}`);
            }
          }
        } else {
          for (let i = 0; i < mappedRows.length; i += 50) {
            const batch = mappedRows.slice(i, i + 50);
            const { error: insertErr } = await adminClient.from(tableName).insert(batch);
            if (insertErr) {
              tableResult.errors.push(`Insert batch: ${insertErr.message}`);
            }
          }
        }
        tableResult.copied = mappedRows.length;

        // Step 6: Copy children
        if (config.children) {
          for (const child of config.children) {
            const parentIds = sourceData.map((r: any) => r.id);
            if (parentIds.length === 0) continue;

            // Fetch child rows
            let allChildRows: any[] = [];
            for (let i = 0; i < parentIds.length; i += 100) {
              const batch = parentIds.slice(i, i + 100);
              const { data: childData } = await adminClient
                .from(child.table)
                .select("*")
                .in(child.fk, batch);
              if (childData) allChildRows = [...allChildRows, ...childData];
            }

            if (allChildRows.length === 0) continue;

            // Remap child rows
            const mappedChildren = allChildRows.map((row: any) => {
              const newRow = {
                ...row,
                id: crypto.randomUUID(),
                company_id: targetCompanyId,
              };
              // Remap parent FK
              if (row[child.fk] && idMap[row[child.fk]]) {
                newRow[child.fk] = idMap[row[child.fk]];
              }
              // Remap account_id if present
              if (row.account_id && idMap[row.account_id]) {
                newRow.account_id = idMap[row.account_id];
              }
              delete newRow.no;
              return newRow;
            });

            // Insert children
            for (let i = 0; i < mappedChildren.length; i += 50) {
              const batch = mappedChildren.slice(i, i + 50);
              const { error: childErr } = await adminClient.from(child.table).insert(batch);
              if (childErr) {
                tableResult.errors.push(`${child.table}: ${childErr.message}`);
              }
            }

            // Add child count to results
            if (!results[child.table]) {
              results[child.table] = { copied: mappedChildren.length, cleared: 0, errors: [] };
            } else {
              results[child.table].copied += mappedChildren.length;
            }
          }
        }
      } catch (err: any) {
        tableResult.errors.push(`Unexpected: ${err.message}`);
      }

      results[tableName] = tableResult;
    }

    // Log the transfer
    await adminClient.from("accounting_activity_log").insert({
      activity_type: "data_transfer",
      module: "accounting",
      description: `Data transfer: ${direction}, mode: ${mode}, tables: ${tables.join(", ")}`,
      user_id: userId,
      company_id: targetCompanyId,
    });

    return new Response(
      JSON.stringify({ success: true, direction, mode, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
