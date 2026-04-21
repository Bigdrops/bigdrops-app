
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSettings() {
  console.log('Checking settings table structure...');
  
  // Try to get one row or just check if it works
  const { data, error } = await supabase
    .from('settings')
    .select('company_logo_url, footer_text')
    .limit(1);

  if (error) {
    console.error('Error selecting specific columns:', error);
  } else {
    console.log('Successfully selected company_logo_url and footer_text. Columns exist.');
  }

  // Also check all columns by trying to select *
  const { data: allData, error: allErrors } = await supabase
    .from('settings')
    .select('*')
    .limit(1);
    
  if (allErrors) {
    console.error('Error selecting *:', allErrors);
  } else {
    console.log('Full row structure (first row if exists):', allData);
  }
}

checkSettings();
