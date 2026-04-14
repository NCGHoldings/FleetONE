const fs = require('fs');

let content = fs.readFileSync('src/hooks/useFinanceApproval.ts', 'utf-8');

// Replace standard variables
content = content.replace(/<<<<<<< HEAD\n\s*const settings = await fetchSpecialHireFinanceSettings\(effectiveCompanyId\);\n=======\n\s*const settings = await fetchSpecialHireFinanceSettings\(companyId\);\n>>>>>>> globallyceum\/main/g, 'const settings = await fetchSpecialHireFinanceSettings(effectiveCompanyId);');

content = content.replace(/<<<<<<< HEAD\n\s*companyId: effectiveCompanyId,\n=======\n\s*companyId: companyId,\n>>>>>>> globallyceum\/main/g, 'companyId: effectiveCompanyId,');

content = content.replace(/<<<<<<< HEAD\n\s*effectiveCompanyId: effectiveCompanyId,\n=======\n\s*effectiveCompanyId: companyId,\n>>>>>>> globallyceum\/main/g, 'effectiveCompanyId: effectiveCompanyId,');

// Handle the huge AR Invoice block
const arInvoiceRegex = /<<<<<<< HEAD\n\s*\/\/ Step 2b: Create AR Invoice if full or balance payment and customer exists[\s\S]*?=======\n(\s*\/\/ Step 2b: AR Invoice creation is now deferred[\s\S]*?)\n>>>>>>> globallyceum\/main/;
content = content.replace(arInvoiceRegex, '$1');

fs.writeFileSync('src/hooks/useFinanceApproval.ts', content);
