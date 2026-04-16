#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to scan
const SRC_DIR = path.resolve(__dirname, '../src');

// Regex rules for the Guardian
const RULES = [
  {
    id: 'NO_LOOP_PADSTART_IDS',
    pattern: /index.*padStart\(.*['"]0['"]\)/i,
    description: 'Avoid using padStart() combined with array index inside loops for ID generation (e.g. invoice numbers). This causes Unique Constraint Violations across batches. Use the Max Offset Pattern instead.',
    severity: 'error'
  },
  {
    id: 'NO_DATE_NOW_PRIMARY_KEYS',
    pattern: /(invoice_no|invoice_number|receipt_no|trip_no|po_number|request_number|entry_number).*Date\.now\(\)/i,
    description: 'Do not use Date.now() for primary document numbers. Use the useGenerateNumber() hook from @/hooks/useNumbering for atomic safety.',
    severity: 'error'
  }
];

let errorsFound = 0;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check if the previous line has an ignore comment
    const prevLine = index > 0 ? lines[index - 1] : '';
    
    RULES.forEach(rule => {
      // Skip if explicitly ignored
      if (prevLine.includes(`guardian-ignore-next-line ${rule.id}`) || prevLine.includes('guardian-ignore-next-line ALL')) {
        return;
      }

      if (rule.pattern.test(line)) {
        console.error(`\x1b[31m[GUARDIAN FAILED] ${rule.id}\x1b[0m`);
        console.error(`  File: ${filePath}:${index + 1}`);
        console.error(`  Line: ${line.trim()}`);
        console.error(`  Rule: ${rule.description}\n`);
        errorsFound++;
      }
    });
  });
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      scanFile(fullPath);
    }
  }
}

console.log(`🛡️  Running ERP Static Analysis Guardian...`);
walkDir(SRC_DIR);

if (errorsFound > 0) {
  console.error(`\x1b[31m❌ Guardian run complete: ${errorsFound} violations found. Please fix them to prevent duplicate key errors.\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\x1b[32m✅ Guardian run complete: 0 violations found. Codebase passes unique ID constraints safety checks.\x1b[0m`);
  process.exit(0);
}
