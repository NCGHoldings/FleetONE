import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://wwjpdszkmtnzshbulkon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const files = fs.readdirSync('.');
  const targetFile = files.find(f => f.includes('FINANCE - BATCH 6') && f.endsWith('.xlsx'));
  
  if (!targetFile) {
    console.error('Target file not found');
    process.exit(1);
  }

  const workbook = XLSX.readFile(targetFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  console.log('Parsed', data.length, 'rows');
  console.log('Headers:', data[0]);
  console.log('First Record:', data[1]);
}

run().catch(console.error);
