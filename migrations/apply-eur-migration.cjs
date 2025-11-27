const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyEuroMigration() {
  try {
    console.log('Applying Euro column migration...');
    
    // Use raw SQL execution through PostgREST
    const { data, error } = await supabase
      .rpc('exec', {
        sql: 'ALTER TABLE components ADD COLUMN IF NOT EXISTS unit_cost_eur NUMERIC(10, 2) DEFAULT 0;'
      });
    
    if (error) {
      console.log('Direct SQL execution failed, trying alternative approach...');
      
      // Try to check if column exists first
      const { data: checkData, error: checkError } = await supabase
        .from('components')
        .select('unit_cost_eur')
        .limit(1);
      
      if (checkError && checkError.message.includes('does not exist')) {
        console.log('❌ Euro column does not exist in database.');
        console.log('📋 MANUAL ACTION REQUIRED:');
        console.log('Please run this SQL in your Supabase Dashboard SQL Editor:');
        console.log('');
        console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS unit_cost_eur NUMERIC(10, 2) DEFAULT 0;');
        console.log('');
        console.log('Steps:');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Go to SQL Editor');
        console.log('4. Paste and run the SQL above');
        console.log('5. Verify with: SELECT column_name FROM information_schema.columns WHERE table_name = \'components\' AND column_name = \'unit_cost_eur\';');
      } else if (!checkError) {
        console.log('✅ Euro column already exists!');
      } else {
        console.error('Error checking column:', checkError);
      }
    } else {
      console.log('✅ Euro column added successfully!');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

applyEuroMigration();
