import fs from 'fs';
let content = fs.readFileSync('src/utils/bank-statement-processor.ts', 'utf-8');

const oldParseDate = `const parseDate = (dateValue: any): Date => {
  if (!dateValue) return new Date(NaN); // Return invalid date instead of today
  if (dateValue instanceof Date) return dateValue;
  
  // Handle Excel date serial numbers
  if (typeof dateValue === 'number') {
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  
  const dateStr = String(dateValue).trim();
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\\d{1,2})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const month = parseInt(dmyMatch[2]) - 1;
    let year = parseInt(dmyMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  
  // YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\\d{4})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{1,2})$/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]));
  }
  
  // MM/DD/YYYY format
  const mdyMatch = dateStr.match(/^(\\d{1,2})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{4})$/);
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1]);
    const day = parseInt(mdyMatch[2]);
    const year = parseInt(mdyMatch[3]);
    // If month > 12, it's likely DD/MM/YYYY already handled above
    if (month <= 12) {
      return new Date(year, month - 1, day);
    }
  }
  
  // Try native parse
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
};`;

const newParseDate = `import { parse, isValid } from 'date-fns';

const parseDate = (dateValue: any): Date => {
  if (!dateValue) return new Date(NaN);
  if (dateValue instanceof Date) return dateValue;
  
  // Handle Excel date serial numbers
  if (typeof dateValue === 'number') {
    // Excel leap year bug offset (1900 is not a leap year in reality, but Excel thinks it is)
    return new Date(Math.round((dateValue - 25569) * 86400 * 1000));
  }
  
  const dateStr = String(dateValue).trim();
  
  // 1. Explicitly try parsing as Sri Lankan / UK style: DD/MM/YYYY
  const formatsToTry = [
    'dd/MM/yyyy', 'dd-MM-yyyy', 'dd.MM.yyyy',
    'd/M/yyyy', 'd-M-yyyy', 'd.M.yyyy',
    'dd/MM/yy', 'dd-MM-yy'
  ];
  
  for (const fmt of formatsToTry) {
    const parsed = parse(dateStr, fmt, new Date());
    // Basic sanity check: year should be reasonable
    if (isValid(parsed) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2050) {
      // Validate that date-fns didn't overflow the day into the next month (e.g. 31/02 becomes 03/03)
      const dmyMatch = dateStr.match(/^(\\d{1,2})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{2,4})$/);
      if (dmyMatch) {
         if (parsed.getDate() === parseInt(dmyMatch[1])) {
             return parsed;
         }
      } else {
         return parsed;
      }
    }
  }

  // 2. YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\\d{4})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{1,2})$/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]));
  }
  
  // 3. MM/DD/YYYY fallback (only if DD/MM/YYYY failed)
  const mdyMatch = dateStr.match(/^(\\d{1,2})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{4})$/);
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1]);
    const day = parseInt(mdyMatch[2]);
    const year = parseInt(mdyMatch[3]);
    if (month <= 12) {
      return new Date(year, month - 1, day);
    }
  }
  
  // 4. Try native parse as absolute fallback
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
};`;

content = content.replace(oldParseDate, newParseDate);
// Also need to add import if it's not there, wait I added it to the string above, but let's put the import at the top of the file
content = content.replace("import { parse, isValid } from 'date-fns';\\n\\nconst parseDate", "const parseDate");
if (!content.includes("import { parse, isValid } from 'date-fns';")) {
   content = "import { parse, isValid } from 'date-fns';\n" + content;
}

fs.writeFileSync('src/utils/bank-statement-processor.ts', content);
console.log("Updated parseDate");
