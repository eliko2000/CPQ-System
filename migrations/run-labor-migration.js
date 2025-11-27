/**
 * Run the labor_subtype migration on Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running labor_subtype migration...\n');

  // Read the SQL migration file
  const sqlPath = path.join(__dirname, 'add-labor-subtype.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split into individual statements (by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    console.log(`   ${statement.substring(0, 60)}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct execution if RPC doesn't work
        console.log('   Trying alternative method...');
        const { error: directError } = await supabase.from('_sql').insert({ query: statement });

        if (directError) {
          console.log(`   ⚠️  Warning: ${directError.message}`);
        } else {
          console.log('   ✅ Success');
        }
      } else {
        console.log('   ✅ Success');
      }
    } catch (err) {
      console.log(`   ⚠️  Warning: ${err.message}`);
    }
  }

  console.log('\n✨ Migration completed!');
  console.log('\nNote: If you see warnings, you may need to run the SQL manually in Supabase SQL Editor:');
  console.log(`   https://supabase.com/dashboard/project/uxkvfghfcwnynshmzeck/sql`);
  console.log('\n   Copy the contents of scripts/add-labor-subtype.sql');
}

runMigration()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  });
