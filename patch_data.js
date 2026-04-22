const fs = require('fs');
const file = 'src/hooks/useSpecialHireSpreadsheetData.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add fields to interface
code = code.replace(
  'customer_name: string;',
  'customer_name: string;\n  contacted_person: string;\n  hire_type: string;\n  hire_month: string;'
);

// 2. Add to mapping
code = code.replace(
  'customer_name: q.customer_name || \'\',',
  `customer_name: q.customer_name || '',
          contacted_person: getExpenseField(expenses, 'contacted_person') ? String((expenses as any).contacted_person) : '',
          hire_type: getExpenseField(expenses, 'hire_type') ? String((expenses as any).hire_type) : '',
          hire_month: q.pickup_datetime ? new Date(q.pickup_datetime).toLocaleString('default', { month: 'short', year: 'numeric' }) : '',`
);

// 3. Add to expenseFields for saving
code = code.replace(
  "'buses_deployed', 'operation_remark', 'remark', 'fuel_price_per_liter'",
  "'buses_deployed', 'operation_remark', 'remark', 'fuel_price_per_liter', 'contacted_person', 'hire_type'"
);

fs.writeFileSync(file, code);
console.log("Patched data hook");
