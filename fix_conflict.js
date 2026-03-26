const fs = require('fs');
const path = 'src/hooks/useAccountingMutations.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /<<<<<<< HEAD\n\s*\/\/ ========== AUTO GL POSTING[\s\S]*?toast\.success\("Vendor invoice recorded & posted to GL"\);\n>>>>>>> [a-f0-9]+/;

const replacement = `      // ========== AUTO GL POSTING at creation: DR Expense, CR Trade Payable ==========
      try {
        const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
        const resolved = await resolveVendorAPAccounts(invoice.vendor_id, effectiveCompanyId);
        
        const tradePayableId = resolved.apAccountId;
        const defaultExpenseAccountId = resolved.expenseAccountId;

        // Fetch input tax account for AP invoices
        let inputTaxAccountId: string | null = null;
        const totalTax = invoice.tax_amount || 0;
        if (totalTax > 0) {
          const { data: glSettingsForTax } = await (supabase as any)
            .from("gl_settings")
            .select("input_tax_account_id")
            .eq("company_id", effectiveCompanyId)
            .maybeSingle();
          inputTaxAccountId = glSettingsForTax?.input_tax_account_id || null;

          // Fallback: look for "Input Tax" or "Tax Receivable" in COA
          if (!inputTaxAccountId) {
            const { data: taxAccount } = await (supabase as any)
              .from("chart_of_accounts")
              .select("id")
              .eq("company_id", effectiveCompanyId)
              .or("account_name.ilike.%input tax%,account_name.ilike.%tax receivable%")
              .limit(1)
              .maybeSingle();
            inputTaxAccountId = taxAccount?.id || null;
          }
        }

        if (tradePayableId && defaultExpenseAccountId && invoice.total_amount > 0) {
          const { postAPInvoiceToGL } = await import("@/lib/gl-posting-utils");

          // Fetch vendor name for JE description
          const { data: vendorData } = await supabase
            .from("vendors")
            .select("vendor_name")
            .eq("id", invoice.vendor_id)
            .single();

          const vendorName = vendorData?.vendor_name || "";

          // Build per-line expense entries using 3-tier resolution: line > category > global
          const expenseLines = (lines || []).map(line => ({
            accountId: line.account_id || defaultExpenseAccountId,
            amount: (line.line_total || 0) - (line.tax_amount || 0),
            description: \`\${line.description || 'Expense'} - \${invoice.invoice_number}\`,
          }));

          const glResult = await postAPInvoiceToGL({
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            totalAmount: invoice.total_amount,
            taxAmount: totalTax,
            expenseAccountId: defaultExpenseAccountId,
            tradePayableId,
            inputTaxAccountId: inputTaxAccountId || undefined,
            companyId: effectiveCompanyId,
            businessUnitCode,
            vendorName,
            expenseLines: expenseLines.length > 0 ? expenseLines : undefined,
          });

          if (glResult.success && glResult.journalEntryId) {
            await (supabase as any)
              .from("ap_invoices")
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq("id", data.id);
            console.log(\`[AP GL] Auto-posted GL for \${invoice.invoice_number}\`);
          } else if (!glResult.success) {
            console.warn("[AP GL] GL posting failed:", glResult.error);
          }
        } else {
          console.warn("[AP GL] Skipped GL posting - missing accounts:", {
            tradePayableId, defaultExpenseAccountId, amount: invoice.total_amount
          });
        }
      } catch (glError) {
        console.warn("[AP GL] GL auto-posting error:", glError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Vendor invoice recorded & posted to GL");`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
  console.log("Merge conflict resolved successfully.");
} else {
  console.log("Could not find regex match.");
}
