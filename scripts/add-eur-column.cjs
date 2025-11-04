const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addEuroColumn() {
  try {
    console.log('Checking if Euro column exists in components table...');
    
    // Try to select the Euro column to see if it exists
    const { data, error } = await supabase
      .from('components')
      .select('unit_cost_eur')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column "unit_cost_eur" does not exist')) {
        console.log('Euro column does not exist.');
        console.log('Please manually run this SQL in your Supabase SQL Editor:');
        console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS unit_cost_eur DECIMAL(12,2);');
      } else {
        console.error('Error checking Euro column:', error);
      }
    } else {
      console.log('Euro column already exists!');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addEuroColumn();
