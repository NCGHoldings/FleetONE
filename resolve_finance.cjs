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

// For the View files, typically the conflict is just imports or the modal injection.
const filesToFix = [
  'src/components/accounting/APPaymentsView.tsx',
  'src/components/accounting/ARReceiptsView.tsx',
  'src/components/accounting/inventory/LandedCostView.tsx',
  '.lovable/plan.md'
];

filesToFix.forEach(file => {
  let fileContent = fs.readFileSync(file, 'utf-8');
  // Simple heuristic: accept incoming changes (globallyceum/main) for these UI files, 
  // EXCEPT LandedCostView where we both added a modal, so it's safer to keep BOTH.
  
  if (file === '.lovable/plan.md') {
    // Just wipe HEAD, keep theirs.
    fileContent = fileContent.replace(/<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> globallyceum\/main/g, '$1');
  } else if (file.includes('LandedCostView.tsx')) {
    // Keep both, by removing markers and ========
    fileContent = fileContent.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> globallyceum\/main/g, '$1\n$2');
  } else {
    // APPaymentsView, ARReceiptsView - we didn't touch these recently, the bot did. So keep THEIR changes.
    fileContent = fileContent.replace(/<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> globallyceum\/main/g, '$1');
  }
  
  fs.writeFileSync(file, fileContent);
});

