import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? 'Present' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    // Test basic connection by checking if we can access the service
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1)
    
    // PGRST205 or PGRST116 means table doesn't exist, which is expected for a new project
    if (error && !['PGRST205', 'PGRST116'].includes(error.code)) {
      console.error('Connection error:', error)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('Database is ready for schema creation.')
    return true
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
    return false
  }
}

testConnection()
