const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/hooks/useAccountingData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace 1: Add enabled: !!effectiveCompanyId,
// We look for:
// queryKey: [..., effectiveCompanyId],
// queryFn: async () => {
// We want to insert `enabled: !!effectiveCompanyId,` before `queryFn` if it doesn't exist.

const blocks = content.split('useQuery({');
let newContent = blocks[0];

let patchedCount = 0;

for (let i = 1; i < blocks.length; i++) {
  let block = blocks[i];
  
  // Only patch if it uses effectiveCompanyId in queryKey
  if (block.includes('effectiveCompanyId')) {
    // 1. Inject enabled: !!effectiveCompanyId
    if (!block.includes('enabled: !!effectiveCompanyId') && !block.includes('enabled:')) {
      block = block.replace('queryFn: async', 'enabled: !!effectiveCompanyId,\n    queryFn: async');
    }
    
    // 2. Inject if (!effectiveCompanyId) return null/[] inside queryFn
    // Let's check if the hook usually returns an array or object.
    // If it has `.select("*")` or `.select(` it usually expects an array. Let's just return [] or null.
    // Actually, react-query handles `null` fine. `return null;` or `throw new Error()`
    // "if (!effectiveCompanyId) throw new Error('No company selected');" is safest because then it errors instead of caching an empty array, and react-query won't cache it if it's disabled anyway.
    
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
