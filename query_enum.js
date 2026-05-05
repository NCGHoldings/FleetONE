const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_ANON_KEY || 'fake_key_but_local_doesnt_always_check');
// actually local supabase usually requires the anon key.
