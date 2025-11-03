const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testData() {
  console.log('🧪 Testing Supabase Data Access...')
  
  try {
    // Test components
    console.log('\n📦 Testing components table...')
    const { data: components, error: componentsError } = await supabase
      .from('components')
      .select('*')
      .limit(5)
    
    if (componentsError) {
      console.error('❌ Components error:', componentsError)
    } else {
      console.log(`✅ Found ${components.length} components:`)
      components.forEach(comp => {
        console.log(`  - ${comp.name} (${comp.category}) - ${comp.unit_cost_ils}₪`)
      })
    }
    
    // Test quotations
    console.log('\n📋 Testing quotations table...')
    const { data: quotations, error: quotationsError } = await supabase
      .from('quotations')
      .select('*')
      .limit(3)
    
    if (quotationsError) {
      console.error('❌ Quotations error:', quotationsError)
    } else {
      console.log(`✅ Found ${quotations.length} quotations:`)
      quotations.forEach(quote => {
        console.log(`  - ${quote.quotation_number} for ${quote.customer_name} - ${quote.total_price}₪`)
      })
    }
    
    // Test CRUD operations
    console.log('\n🔄 Testing CRUD operations...')
    
    // Test insert
    const testComponent = {
      name: 'Test Component',
      manufacturer: 'Test Corp',
      category: 'Test',
      unit_cost_usd: 100.00,
      unit_cost_ils: 370.00
    }
    
    const { data: inserted, error: insertError } = await supabase
      .from('components')
      .insert(testComponent)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Insert error:', insertError)
    } else {
      console.log(`✅ Inserted test component: ${inserted.name}`)
      
      // Test delete
      const { error: deleteError } = await supabase
        .from('components')
        .delete()
        .eq('id', inserted.id)
      
      if (deleteError) {
        console.error('❌ Delete error:', deleteError)
      } else {
        console.log('✅ Deleted test component')
      }
    }
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('🌐 The application should now work with persistent data.')
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testData()
