const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTables() {
  console.log('Creating tables using Supabase client...')
  
  try {
    // Create components table
    console.log('Creating components table...')
    const { error: componentsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS components (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          manufacturer TEXT,
          manufacturer_part_number TEXT,
          category TEXT,
          description TEXT,
          unit_cost_usd DECIMAL(12,2),
          unit_cost_ils DECIMAL(12,2),
          supplier TEXT,
          supplier_part_number TEXT,
          lead_time_days INTEGER,
          min_order_quantity INTEGER DEFAULT 1,
          notes TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    if (componentsError) {
      console.error('Components table error:', componentsError)
    } else {
      console.log('✅ Components table created')
    }

    // Create quotations table
    console.log('Creating quotations table...')
    const { error: quotationsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS quotations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          quotation_number TEXT UNIQUE NOT NULL,
          customer_name TEXT NOT NULL,
          customer_email TEXT,
          project_name TEXT,
          project_description TEXT,
          currency TEXT DEFAULT 'USD',
          exchange_rate DECIMAL(10,4) DEFAULT 1.0,
          margin_percentage DECIMAL(5,2) DEFAULT 20.0,
          status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
          valid_until_date DATE,
          terms TEXT,
          notes TEXT,
          total_cost DECIMAL(15,2),
          total_price DECIMAL(15,2),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    if (quotationsError) {
      console.error('Quotations table error:', quotationsError)
    } else {
      console.log('✅ Quotations table created')
    }

    // Create quotation_systems table
    console.log('Creating quotation_systems table...')
    const { error: systemsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS quotation_systems (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
          system_name TEXT NOT NULL,
          system_description TEXT,
          quantity INTEGER DEFAULT 1,
          unit_cost DECIMAL(15,2),
          total_cost DECIMAL(15,2),
          margin_percentage DECIMAL(5,2),
          unit_price DECIMAL(15,2),
          total_price DECIMAL(15,2),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    if (systemsError) {
      console.error('Quotation systems table error:', systemsError)
    } else {
      console.log('✅ Quotation systems table created')
    }

    // Create quotation_items table
    console.log('Creating quotation_items table...')
    const { error: itemsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS quotation_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          quotation_system_id UUID REFERENCES quotation_systems(id) ON DELETE CASCADE,
          component_id UUID REFERENCES components(id),
          item_name TEXT NOT NULL,
          manufacturer TEXT,
          manufacturer_part_number TEXT,
          quantity DECIMAL(12,4) NOT NULL,
          unit_cost DECIMAL(12,2),
          total_cost DECIMAL(15,2),
          margin_percentage DECIMAL(5,2),
          unit_price DECIMAL(12,2),
          total_price DECIMAL(15,2),
          notes TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    if (itemsError) {
      console.error('Quotation items table error:', itemsError)
    } else {
      console.log('✅ Quotation items table created')
    }

    console.log('\n✅ All tables created successfully!')
    
  } catch (error) {
    console.error('Error creating tables:', error)
  }
}

createTables()
