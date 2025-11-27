const { createClient } = require('../src/supabaseClient.ts')

async function addVersionColumn() {
  console.log('Adding version column to quotations table...')
  
  const supabase = createClient()
  
  try {
    // Use raw SQL to add the version column
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'quotations' 
                AND column_name = 'version'
            ) THEN
                ALTER TABLE quotations ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
                RAISE NOTICE 'Version column added successfully!';
            ELSE
                RAISE NOTICE 'Version column already exists!';
            END IF;
        END $$;
      `
    })
    
    if (error) {
      console.error('Error adding version column:', error)
      throw error
    }
    
    console.log('Version column migration completed!')
    return true
    
  } catch (error) {
    console.error('Unexpected error:', error)
    throw error
  }
}

// Run migration
addVersionColumn()
  .then(() => {
    console.log('Migration completed successfully!')
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
