const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'adampdx09@gmail.com',
    password: 'password' // just guessing or I shouldn't bother.
  });
}
check();
