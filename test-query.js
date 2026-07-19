const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role if available
const supabase = createClient(supabaseUrl, supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: diffs, error } = await supabase
    .from('questions')
    .select('difficulty, id');
    
  if (error) {
    console.error(error);
    return;
  }
  
  const stats = {};
  for (const row of diffs) {
    const d = row.difficulty;
    stats[d] = (stats[d] || 0) + 1;
  }
  
  console.log("Questions Table Difficulty Stats:", stats);
}

test();
