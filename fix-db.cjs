const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to db');

    // Add calling_name
    await client.query(`ALTER TABLE public.staff_registry ADD COLUMN IF NOT EXISTS calling_name TEXT;`);
    console.log('Added calling_name column');

    // Add pin_code
    await client.query(`ALTER TABLE public.staff_registry ADD COLUMN IF NOT EXISTS pin_code TEXT;`);
    console.log('Added pin_code column');
    
    // Add employment_type
    await client.query(`ALTER TABLE public.staff_registry ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'permanent';`);
    console.log('Added employment_type column');

  } catch (err) {
    console.error('Error executing queries', err.stack);
  } finally {
    await client.end();
  }
}

run();
