const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

supabase.from('special_hire_finance_settings').select('*').then(({data, error}) => {
  console.log('DATA:', JSON.stringify(data, null, 2));
  console.log('ERROR:', error);
});
