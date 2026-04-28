const fs = require('fs');
const file = 'src/hooks/usePettyCash.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the signature
content = content.replace(
  `      expense_account_id,\n      ...data \n    }: Partial<IOURecord> & { \n      id: string;\n      return_fund_id?: string;\n      expense_account_id?: string;\n    }) => {`,
  `      expense_account_id,\n      expense_amount,\n      ...data \n    }: Partial<IOURecord> & { \n      id: string;\n      return_fund_id?: string;\n      expense_account_id?: string;\n      expense_amount?: number;\n    }) => {`
);

fs.writeFileSync(file, content);
