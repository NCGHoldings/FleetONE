const XLSX = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('.');
const targetFile = files.find(f => f.includes('FINANCE - BATCH 6'));
if (targetFile) {
  console.log('Found:', targetFile);
  const workbook = XLSX.readFile(targetFile);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(data.slice(0, 10)); // print first 10 rows
} else {
  console.log('File not found');
}
