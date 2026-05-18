const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    const sql = fs.readFileSync('supabase/migrations/20260518140500_remove_bus_validation.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
