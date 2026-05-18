const XLSX = require('xlsx');

const csvData = `Transaction Date,Transaction Description,,,
01/04/26,OPENING BALANCE,,,,1733178.51 Cr
02/04/26,FUNDING TO 1000516089,233178.51,,,1500000.00 Cr
02/04/26,CHEQUE DEPOSIT,,28500000.00,,30000000.00 Cr`;

const wb = XLSX.read(csvData, { type: 'string' });
const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
console.log(JSON.stringify(json, null, 2));
