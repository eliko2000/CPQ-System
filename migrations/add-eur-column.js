const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addEuroColumn() {
  try {
    console.log('Adding Euro column to components table...');
    
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: 'ALTER TABLE components ADD COLUMN IF NOT EXISTS unit_cost_eur DECIMAL(12,2);'
      });

    if (error) {
      console.error('Error adding Euro column:', error);
      
      // Try alternative approach using direct SQL
      console.log('Trying direct SQL execution...');
      const { data: sqlData, error: sqlError } = await supabase
        .from('components')
        .select('unit_cost_eur')
        .limit(1);
      
      if (sqlError && sqlError.message.includes('column "unit_cost_eur" does not exist')) {
        console.log('Column does not exist. You need to manually run this SQL in Supabase SQL Editor:');
        console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS unit_cost_eur DECIMAL(12,2);');
      } else if (!sqlError) {
        console.log('Euro column already exists!');
      }
    } else {
      console.log('Euro column added successfully!');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addEuroColumn();
