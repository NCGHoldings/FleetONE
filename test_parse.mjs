import fs from 'fs';
import * as XLSX from 'xlsx';

async function run() {
  const files = fs.readdirSync('.');
  const targetFile = files.find(f => f.includes('FINANCE - BATCH 6'));
  if (!targetFile) {
    console.log('File not found');
    return;
  }
  console.log('Found:', targetFile);
  
  const workbook = XLSX.readFile(targetFile);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const headers = data[0];
  console.log("Headers:", headers);
  console.log("Row 1:", data[1]);
  console.log("Total rows:", data.length);
}

run();
