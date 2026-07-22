const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { data, error } = await supabase.from('project_shares').select('*').limit(1);
  console.log('project_shares:', error, data);
  const { data: d2, error: e2 } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles:', e2, d2);
}
check();
