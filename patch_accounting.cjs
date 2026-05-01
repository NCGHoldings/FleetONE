const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/hooks/useAccountingData.ts');
let content = fs.readFileSync(filePath, 'utf8');

const blocks = content.split('useQuery({');
let newContent = blocks[0];

let patchedCount = 0;

for (let i = 1; i < blocks.length; i++) {
  let block = blocks[i];
  
  if (block.includes('effectiveCompanyId')) {
    if (!block.includes('enabled: !!effectiveCompanyId') && !block.includes('enabled:')) {
      block = block.replace('queryFn: async', 'enabled: !!effectiveCompanyId,\n    queryFn: async');
    }
    
    if (!block.includes('if (!effectiveCompanyId) return')) {
       block = block.replace('queryFn: async () => {\n', 'queryFn: async () => {\n      if (!effectiveCompanyId) return null;\n');
       block = block.replace('queryFn: async () => { //', 'queryFn: async () => { //\n      if (!effectiveCompanyId) return null;\n');
    }
    patchedCount++;
  }
  
  newContent += 'useQuery({' + block;
}

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Patched', patchedCount, 'useQuery hooks in useAccountingData.ts');
