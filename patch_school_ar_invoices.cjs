const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function patchARInvoices() {
  console.log("Fetching school students and buses...");
  
  const { data: students, error: stdErr } = await supabase
    .from("school_students")
    .select("id, bus_reg_no");
    
  if (stdErr) throw stdErr;

  const { data: buses, error: busErr } = await supabase
    .from("buses")
    .select("id, bus_no, category_id");

  if (busErr) throw busErr;

  const busMap = new Map();
  if (buses) {
    buses.forEach(b => {
      if (b.bus_no) {
        busMap.set(b.bus_no, { id: b.id, category_id: b.category_id });
      }
    });
  }

  const studentMap = new Map();
  if (students) {
    students.forEach(s => {
      if (s.bus_reg_no) {
        const bus = busMap.get(s.bus_reg_no);
        if (bus) {
          studentMap.set(s.id, { bus_no: s.bus_reg_no, ...bus });
        } else {
          studentMap.set(s.id, { bus_no: s.bus_reg_no, id: null, category_id: null });
        }
      }
    });
  }

  console.log("Fetching school AR invoices...");
  const { data: schoolInvoices, error: siErr } = await supabase
    .from("school_ar_invoices")
    .select("ar_invoice_id, student_id")
    .not("ar_invoice_id", "is", null);

  if (siErr) throw siErr;

  console.log(`Found ${schoolInvoices.length} linked AR invoices. Updating...`);

  let count = 0;
  for (const si of schoolInvoices) {
    const busInfo = studentMap.get(si.student_id);
    if (busInfo) {
      const { error: updateErr } = await supabase
        .from("ar_invoices")
        .update({
          bus_no: busInfo.bus_no,
          bus_id: busInfo.id,
          bus_category_id: busInfo.category_id
        })
        .eq("id", si.ar_invoice_id);
      
      if (!updateErr) count++;
      if (count % 50 === 0) console.log(`Updated ${count}...`);
    }
  }

  console.log(`Successfully patched ${count} AR invoices.`);
}

patchARInvoices().catch(console.error);
