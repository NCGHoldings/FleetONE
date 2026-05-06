require('dotenv').config();
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('No Supabase credentials found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Convert Excel serial date to JS Date object
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  // Add 1 day if necessary (Excel leap year bug)
  // Usually this rough logic is fine for basic YYYY-MM-DD
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  date_info.setUTCHours(hours, minutes, seconds);
  
  return date_info.toISOString().split('T')[0];
}

async function main() {
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('./dist/BUS master data sheet /ALL BUSES DATA BASE.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // header: 1 gives us an array of arrays
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const headers = rows[1];
  
  const payload = [];
  
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[2]) continue; // Skip empty rows or rows without Vehicle No
    
    // row[2] = Vehicle No
    // row[3] = Vehicle Name
    // row[4] = Vehicle Brand
    // row[7] = Seating Capacity
    // row[8] = Chassie No
    // row[9] = Engine No
    // row[12] = Usage Type
    // row[16] = YOM
    // row[25] = Revenue Expire
    // row[29] = Insurence Expiry Date
    
    payload.push({
      bus_no: String(row[2]).trim(),
      registration_number: String(row[2]).trim(),
      type: row[4] ? String(row[4]).trim() : 'Unknown',
      model: row[3] ? String(row[3]).trim() : 'Unknown',
      capacity: parseInt(row[7]) || 40,
      chassis_number: row[8] ? String(row[8]).trim() : null,
      engine_number: row[9] ? String(row[9]).trim() : null,
      route: row[12] ? String(row[12]).trim() : null,
      year: parseInt(row[16]) || 2010,
      revenue_license_expiry: excelDateToJSDate(row[25]),
      insurance_expiry: excelDateToJSDate(row[29]),
      status: 'active'
    });
  }
  
  console.log(`Parsed ${payload.length} buses from Excel.`);
  
  // Upsert to Supabase
  const { data, error } = await supabase
    .from('buses')
    .upsert(payload, { onConflict: 'bus_no' })
    .select();
    
  if (error) {
    console.error('Error upserting buses:', error);
  } else {
    console.log(`Successfully upserted ${data.length} buses into the database.`);
  }
}

main();
