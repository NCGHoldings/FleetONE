const fs = require('fs');

let content = fs.readFileSync('src/components/accounting/DataImportWizard.tsx', 'utf8');

const importsToAdd = `
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
`;

content = content.replace('import { Progress } from "@/components/ui/progress";', 'import { Progress } from "@/components/ui/progress";\n' + importsToAdd);

const importTypesMatch = `  { value: "journal_entries", label: "Journal Entries", fields: ["entry_date", "description", "account_code", "debit_amount", "credit_amount", "reference"] },
];`;
const importTypesReplace = `  { value: "journal_entries", label: "Journal Entries", fields: ["entry_date", "description", "account_code", "debit_amount", "credit_amount", "reference"] },
  { value: "bank_accounts", label: "Bank Accounts (with Opening Balances)", fields: ["account_number", "bank_name", "account_name", "currency", "opening_balance"] },
  { value: "accounts_receivable", label: "Accounts Receivable (Opening Balances)", fields: ["customer_name", "invoice_number", "invoice_date", "due_date", "amount"] },
  { value: "accounts_payable", label: "Accounts Payable (Opening Balances)", fields: ["vendor_name", "invoice_number", "invoice_date", "due_date", "amount"] },
];`;

content = content.replace(importTypesMatch, importTypesReplace);

// Add fullData state
content = content.replace('const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);', 'const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);\n  const [fullData, setFullData] = useState<any[][]>([]);\n  const { selectedCompanyId } = useCompany();');

// Update onDrop to save fullData
content = content.replace('const rows = jsonData.slice(1, 6); // Preview first 5 rows', 'const rows = jsonData.slice(1, 6); // Preview first 5 rows\n      setFullData(jsonData);');

// Replace handleStartImport
const handleStartImportMatch = `const handleStartImport = async () => {
    setStep(4);
    setImportProgress(0);
    
    // Simulate import process
    const totalRows = preview?.totalRows || 0;
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < totalRows; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setImportProgress(Math.round(((i + 1) / totalRows) * 100));
      
      // Simulate random errors (5% chance)
      if (Math.random() < 0.05) {
        errors.push(\`Row \${i + 2}: Invalid data format\`);
      } else {
        successCount++;
      }
    }

    setImportResult({ success: successCount, errors });
    toast.success(\`Import completed: \${successCount} records imported\`);
  };`;

const handleStartImportReplace = `const handleStartImport = async () => {
    setStep(4);
    setImportProgress(0);
    
    let successCount = 0;
    const errors: string[] = [];

    if (["bank_accounts", "accounts_receivable", "accounts_payable"].includes(importType)) {
       const totalRows = fullData.length - 1;
       if (!selectedCompanyId) {
         setImportResult({ success: 0, errors: ["No company selected"]});
         return;
       }

       // Helper to find or create "Opening Balance Equity"
       const { data: equityAccounts } = await supabase.from('chart_of_accounts')
         .select('id, account_code')
         .eq('company_id', selectedCompanyId)
         .ilike('account_name', '%Opening Balance%')
         .eq('account_type', 'equity');
       
       let equityAccountId = equityAccounts?.[0]?.id;
       if (!equityAccountId) {
          const { data: newEquity } = await supabase.from('chart_of_accounts').insert({
             company_id: selectedCompanyId,
             account_name: 'Opening Balance Equity',
             account_code: '3999',
             account_type: 'equity',
             is_active: true,
             account_level: 5,
             current_balance: 0
          }).select().single();
          equityAccountId = newEquity?.id;
       }

       // Get Period ID
       const { data: periods } = await supabase.from('financial_periods')
          .select('id')
          .eq('company_id', selectedCompanyId)
          .eq('status', 'open')
          .order('start_date', { ascending: false })
          .limit(1);
       const periodId = periods?.[0]?.id;

       const mapIdx = (field: string) => {
         const mapping = columnMappings.find(m => m.targetField === field);
         if (!mapping) return -1;
         return preview?.headers.indexOf(mapping.sourceColumn) ?? -1;
       };

       for (let i = 1; i < fullData.length; i++) {
         const row = fullData[i];
         try {
           if (importType === "bank_accounts") {
              const accNumIdx = mapIdx("account_number");
              const bankNameIdx = mapIdx("bank_name");
              const accNameIdx = mapIdx("account_name");
              const currIdx = mapIdx("currency");
              const obIdx = mapIdx("opening_balance");

              const ob = parseFloat(row[obIdx]) || 0;
              
              const { data: bankAcc, error: bankErr } = await supabase.from('bank_accounts').insert({
                 company_id: selectedCompanyId,
                 account_number: row[accNumIdx]?.toString() || \`BANK-\${Date.now()}\`,
                 bank_name: row[bankNameIdx] || 'Unknown Bank',
                 account_name: row[accNameIdx] || 'Bank Account',
                 currency: row[currIdx] || 'LKR',
                 opening_balance: ob,
                 current_balance: ob,
                 is_active: true
              }).select().single();

              if (bankErr) throw bankErr;

              if (ob !== 0 && periodId && bankAcc.gl_account_id && equityAccountId) {
                 const { data: je } = await supabase.from('journal_entries').insert({
                    company_id: selectedCompanyId,
                    period_id: periodId,
                    entry_date: new Date().toISOString().split('T')[0],
                    entry_number: \`OB-BANK-\${Date.now()}-\${i}\`,
                    description: \`Opening Balance for \${bankAcc.bank_name}\`,
                    total_debit: ob > 0 ? ob : 0,
                    total_credit: ob < 0 ? Math.abs(ob) : 0,
                    status: 'posted'
                 }).select().single();

                 if (je) {
                    await supabase.from('journal_entry_lines').insert([
                       { journal_entry_id: je.id, account_id: bankAcc.gl_account_id, debit: ob > 0 ? ob : 0, credit: ob < 0 ? Math.abs(ob) : 0, company_id: selectedCompanyId },
                       { journal_entry_id: je.id, account_id: equityAccountId, debit: ob < 0 ? Math.abs(ob) : 0, credit: ob > 0 ? ob : 0, company_id: selectedCompanyId }
                    ]);
                 }
              }
           } else if (importType === "accounts_receivable") {
              const cNameIdx = mapIdx("customer_name");
              const invNumIdx = mapIdx("invoice_number");
              const invDateIdx = mapIdx("invoice_date");
              const dueDateIdx = mapIdx("due_date");
              const amtIdx = mapIdx("amount");

              const amt = parseFloat(row[amtIdx]) || 0;
              if (amt > 0) {
                 const { data: ar, error: arErr } = await supabase.from('accounts_receivable').insert({
                    company_id: selectedCompanyId,
                    customer_name: row[cNameIdx] || 'Unknown Customer',
                    invoice_number: row[invNumIdx]?.toString() || \`INV-\${Date.now()}-\${i}\`,
                    invoice_date: row[invDateIdx] || new Date().toISOString().split('T')[0],
                    due_date: row[dueDateIdx] || new Date().toISOString().split('T')[0],
                    amount: amt,
                    balance: amt,
                    received_amount: 0,
                    status: 'open'
                 }).select().single();

                 if (arErr) throw arErr;

                 const { data: arAccounts } = await supabase.from('chart_of_accounts')
                    .select('id').eq('company_id', selectedCompanyId).ilike('account_name', '%Account%Receivable%').limit(1);
                 
                 if (arAccounts?.[0] && equityAccountId && periodId) {
                    const { data: je } = await supabase.from('journal_entries').insert({
                       company_id: selectedCompanyId, period_id: periodId,
                       entry_date: ar.invoice_date, entry_number: \`OB-AR-\${Date.now()}-\${i}\`,
                       description: \`Opening Balance AR - \${ar.invoice_number}\`,
                       total_debit: amt, total_credit: amt, status: 'posted'
                    }).select().single();

                    if (je) {
                       await supabase.from('journal_entry_lines').insert([
                          { journal_entry_id: je.id, account_id: arAccounts[0].id, debit: amt, credit: 0, company_id: selectedCompanyId },
                          { journal_entry_id: je.id, account_id: equityAccountId, debit: 0, credit: amt, company_id: selectedCompanyId }
                       ]);
                    }
                 }
              }
           } else if (importType === "accounts_payable") {
              const vNameIdx = mapIdx("vendor_name");
              const invNumIdx = mapIdx("invoice_number");
              const invDateIdx = mapIdx("invoice_date");
              const dueDateIdx = mapIdx("due_date");
              const amtIdx = mapIdx("amount");

              const amt = parseFloat(row[amtIdx]) || 0;
              if (amt > 0) {
                 const { data: ap, error: apErr } = await supabase.from('accounts_payable').insert({
                    company_id: selectedCompanyId,
                    vendor_name: row[vNameIdx] || 'Unknown Vendor',
                    invoice_number: row[invNumIdx]?.toString() || \`BILL-\${Date.now()}-\${i}\`,
                    invoice_date: row[invDateIdx] || new Date().toISOString().split('T')[0],
                    due_date: row[dueDateIdx] || new Date().toISOString().split('T')[0],
                    amount: amt,
                    balance: amt,
                    paid_amount: 0,
                    status: 'open'
                 }).select().single();

                 if (apErr) throw apErr;

                 const { data: apAccounts } = await supabase.from('chart_of_accounts')
                    .select('id').eq('company_id', selectedCompanyId).ilike('account_name', '%Account%Payable%').limit(1);
                 
                 if (apAccounts?.[0] && equityAccountId && periodId) {
                    const { data: je } = await supabase.from('journal_entries').insert({
                       company_id: selectedCompanyId, period_id: periodId,
                       entry_date: ap.invoice_date, entry_number: \`OB-AP-\${Date.now()}-\${i}\`,
                       description: \`Opening Balance AP - \${ap.invoice_number}\`,
                       total_debit: amt, total_credit: amt, status: 'posted'
                    }).select().single();

                    if (je) {
                       await supabase.from('journal_entry_lines').insert([
                          { journal_entry_id: je.id, account_id: equityAccountId, debit: amt, credit: 0, company_id: selectedCompanyId },
                          { journal_entry_id: je.id, account_id: apAccounts[0].id, debit: 0, credit: amt, company_id: selectedCompanyId }
                       ]);
                    }
                 }
              }
           }

           successCount++;
         } catch (err: any) {
           errors.push(\`Row \${i + 1}: \${err.message || 'Import error'}\`);
         }
         
         setImportProgress(Math.round(((i) / totalRows) * 100));
       }

       setImportResult({ success: successCount, errors });
       if (errors.length === 0) {
         toast.success(\`Import completed: \${successCount} records imported\`);
       } else {
         toast.warning(\`Imported \${successCount} records with \${errors.length} errors\`);
       }
       return;
    }

    // Simulate import process for others
    const totalRows = preview?.totalRows || 0;
    const totalToSimulate = totalRows;

    for (let i = 0; i < totalToSimulate; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setImportProgress(Math.round(((i + 1) / totalToSimulate) * 100));
      
      if (Math.random() < 0.05) {
        errors.push(\`Row \${i + 2}: Invalid data format\`);
      } else {
        successCount++;
      }
    }

    setImportResult({ success: successCount, errors });
    toast.success(\`Import simulated: \${successCount} records processed\`);
  };`;

content = content.replace(handleStartImportMatch, handleStartImportReplace);

fs.writeFileSync('src/components/accounting/DataImportWizard.tsx', content);
console.log('Update script completed.');
