const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('Hire Done Report.xlsx Original.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length > 0) {
    console.log("HEADERS:", JSON.stringify(data[0], null, 2));
    if (data.length > 1) {
      console.log("FIRST ROW:", JSON.stringify(data[1], null, 2));
    }
  } else {
    console.log("Sheet is empty");
  }
} catch (err) {
  console.error("Error reading file:", err.message);
}
