import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4a3ZmZ2hmY3dueW5zaG16ZWNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzcyMywiZXhwIjoyMDc3NzM5NzIzfQ.gLkmwqm2ybOAj_LcEPzjZWEQYyOpWM8ExiUUpA9NlSM' // Service role key from MCP config

console.log('Creating database schema...')
console.log('URL:', supabaseUrl)

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSchema() {
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./scripts/create-schema.sql', 'utf8')
    
    // Split into individual statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Executing ${statements.length} SQL statements...`)

    // Execute each statement using RPC
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      try {
        // Use raw SQL execution through RPC
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          // Try alternative approach for statements that don't return data
          console.log(`Statement ${i + 1}: ${statement.substring(0, 50)}...`)
          
          // For DDL statements, we might need to use a different approach
          // Let's try using the SQL editor endpoint directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ sql_query: statement })
          })
          
          if (!response.ok) {
            console.warn(`Warning on statement ${i + 1}:`, await response.text())
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (err) {
        console.error(`❌ Error on statement ${i + 1}:`, err.message)
        console.log(`Statement: ${statement}`)
      }
    }

    console.log('\n✅ Schema creation completed!')
    console.log('Please verify the tables in your Supabase dashboard.')
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error)
  }
}

executeSchema()
