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
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connectionString = `postgresql://postgres.wwjpdszkmtnzshbulkon:LlvTtsv8MYXJw0NT@${host}:5432/postgres`;
    
    const client = new Client({ connectionString });
    try {
      await client.connect();
      console.log(`✅ SUCCESS on ${region}`);
      await client.end();
      return;
    } catch (e) {
      if (e.message.includes('Tenant or user not found')) {
        console.log(`❌ ${region}: Tenant not found`);
      } else {
        console.log(`❌ ${region}: ${e.message}`);
      }
    }
  }
}

testRegions().catch(console.error);
