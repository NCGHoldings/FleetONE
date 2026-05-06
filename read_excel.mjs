import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('./dist/BUS master data sheet /ALL BUSES DATA BASE.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Headers:");
console.log(data[0]);
console.log("\nFirst row:");
console.log(data[1]);
