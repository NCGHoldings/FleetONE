import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});
async function main() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, transaction_date, reference, description, credit_amount, debit_amount, source_id, source_type
      FROM bank_transactions
      WHERE reference ILIKE '%PRV-2026-33%'
      ORDER BY transaction_date DESC;
    `);
    console.table(res.rows);
    
    // Check if the source_ids still exist in ap_payments
    for (const row of res.rows) {
      if (row.source_id && row.source_type === 'ap_payment') {
        const apRes = await client.query(`SELECT id, payment_number FROM ap_payments WHERE id = $1`, [row.source_id]);
        console.log(`Payment for ${row.reference} exists in ap_payments: ${apRes.rows.length > 0}`);
      }
    }
    
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
