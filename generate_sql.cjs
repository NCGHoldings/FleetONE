const fs = require('fs');
const xlsx = require('xlsx');

function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  date_info.setUTCHours(hours, minutes, seconds);
  
  return date_info.toISOString().split('T')[0];
}

const workbook = xlsx.readFile('./dist/BUS master data sheet /ALL BUSES DATA BASE.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

let sql = "INSERT INTO public.buses (bus_no, registration_number, type, model, capacity, chassis_number, engine_number, route, year, revenue_license_expiry, insurance_expiry, status) VALUES\n";
const values = [];

for (let i = 2; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length === 0 || !row[2]) continue;

  const escapeStr = (str) => str ? "'" + String(str).replace(/'/g, "''").trim() + "'" : 'NULL';
  
  const bus_no = escapeStr(row[2]);
  const registration_number = escapeStr(row[2]);
  const type = escapeStr(row[4] || 'Unknown');
  const model = escapeStr(row[3] || 'Unknown');
  const capacity = parseInt(row[7]) || 40;
  const chassis_number = escapeStr(row[8]);
  const engine_number = escapeStr(row[9]);
  const route = escapeStr(row[12]);
  const year = parseInt(row[16]) || 2010;
  
  const revenueDate = excelDateToJSDate(row[25]);
  const revenue_license_expiry = revenueDate ? `'${revenueDate}'` : 'NULL';
  
  const insuranceDate = excelDateToJSDate(row[29]);
  const insurance_expiry = insuranceDate ? `'${insuranceDate}'` : 'NULL';

  values.push(`(${bus_no}, ${registration_number}, ${type}, ${model}, ${capacity}, ${chassis_number}, ${engine_number}, ${route}, ${year}, ${revenue_license_expiry}, ${insurance_expiry}, 'active')`);
}

sql += values.join(",\n") + "\nON CONFLICT (bus_no) DO UPDATE SET\n" +
  "registration_number = EXCLUDED.registration_number,\n" +
  "type = EXCLUDED.type,\n" +
  "model = EXCLUDED.model,\n" +
  "capacity = EXCLUDED.capacity,\n" +
  "chassis_number = EXCLUDED.chassis_number,\n" +
  "engine_number = EXCLUDED.engine_number,\n" +
  "route = EXCLUDED.route,\n" +
  "year = EXCLUDED.year,\n" +
  "revenue_license_expiry = EXCLUDED.revenue_license_expiry,\n" +
  "insurance_expiry = EXCLUDED.insurance_expiry,\n" +
  "status = EXCLUDED.status;\n";

fs.writeFileSync('seed_buses.sql', sql);
console.log(`Generated seed_buses.sql with ${values.length} records.`);
