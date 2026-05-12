const { Client } = require('pg');

const regions = [
  'ap-southeast-1',
  'us-east-1',
  'eu-central-1',
  'us-west-1',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'ca-central-1',
  'sa-east-1'
];

async function testRegions() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL or SUPABASE_DB_URL must be provided in environment variables');
  }

  let failedCount = 0;
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    let connectionString;
    try {
      const parsed = new URL(dbUrl);
      parsed.hostname = host;
      parsed.port = '5432';
      connectionString = parsed.toString();
    } catch (err) {
      throw new Error('Invalid DATABASE_URL provided');
    }
    
    const client = new Client({ connectionString });
    try {
      await client.connect();
      console.log(`✅ SUCCESS on ${region}`);
      return;
    } catch (e) {
      failedCount++;
      if (e.message.includes('Tenant or user not found')) {
        console.log(`❌ ${region}: Tenant not found`);
      } else {
        console.log(`❌ ${region}: ${e.message}`);
      }
    } finally {
      await client.end().catch(() => {});
    }
  }

  if (failedCount === regions.length) {
    console.error('❌ All regions failed.');
    process.exit(1);
  }
}

testRegions().catch(e => {
  console.error(e);
  process.exit(1);
});
