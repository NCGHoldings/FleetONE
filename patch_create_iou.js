const fs = require('fs');
const file = 'src/hooks/usePettyCash.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `      const { data: result, error } = await supabase
        .from("iou_records")
        .insert([{
          iou_number: iouNumber,
          business_unit_code: data.business_unit_code || "SBO",
          company_id: selectedCompanyId,
          staff_id: data.staff_id,
          staff_name_draft: data.staff_name_draft,
          amount: data.amount || 0,
          purpose: data.purpose,
          issued_date: data.issued_date || new Date().toISOString().split("T")[0],
          due_date: data.due_date,
          petty_cash_fund_id: data.petty_cash_fund_id || null,
        }])
        .select()
        .single();`;

const replacement = `      const { data: result, error } = await supabase
        .from("iou_records")
        .insert([{
          iou_number: iouNumber,
          business_unit_code: data.business_unit_code || "SBO",
          company_id: selectedCompanyId,
          staff_id: data.staff_id,
          staff_name_draft: data.staff_name_draft,
          amount: data.amount || 0,
          purpose: data.purpose,
          issued_date: data.issued_date || new Date().toISOString().split("T")[0],
          due_date: data.due_date,
          petty_cash_fund_id: data.petty_cash_fund_id || null,
          bank_account_id: data.bank_account_id || null,
        }])
        .select()
        .single();`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
