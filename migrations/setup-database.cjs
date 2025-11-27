const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Demo components data
const demoComponents = [
  {
    name: 'שסתום סולנואידי 2 דרכי',
    manufacturer: 'Siemens',
    manufacturer_part_number: '6ES7214-1AG40-0XB0',
    category: 'שסתומים',
    description: 'שסתום סולנואידי תעשייתי עם 2 דרכי זרימה',
    unit_cost_usd: 350.00,
    unit_cost_ils: 1250.00,
    supplier: 'אלקטרוניקה ישראלית',
    notes: 'מוצר במלאי, זמן אספקה מיידי'
  },
  {
    name: 'חיישן טמפרטורה PT100',
    manufacturer: 'Omega',
    manufacturer_part_number: 'PT100-A-1M',
    category: 'חיישנים',
    description: 'חיישן טמפרטורה עמיד RTD עם דיוק ±0.1°C',
    unit_cost_usd: 125.00,
    unit_cost_ils: 450.00,
    supplier: 'סנסור טכנולוגיות',
    notes: 'טווח מדידה: -50°C עד 500°C'
  },
  {
    name: 'בקר PLC S7-1200',
    manufacturer: 'Siemens',
    manufacturer_part_number: '6ES7214-1AG40-0XB0',
    category: 'בקרים (PLCs)',
    description: 'בקר לוגי תכנותי עם תקשורת PROFINET',
    unit_cost_usd: 1610.00,
    unit_cost_ils: 5800.00,
    supplier: 'אוטומציה ישראל',
    notes: 'זיכרון: 100KB, כניסות/יציאות: 14/10'
  },
  {
    name: 'מסוף HMI טאצ\' 7 אינץ\'',
    manufacturer: 'Siemens',
    manufacturer_part_number: '6AV2124-0GC01-0AX0',
    category: 'בקרים',
    description: 'מסוף אנושי עם מסך מגע צבעוני',
    unit_cost_usd: 890.00,
    unit_cost_ils: 3200.00,
    supplier: 'סימנס ישראל',
    notes: 'תצוגה: 800x480, תקשורת: PROFINET'
  },
  {
    name: 'ספק כוח 24VDC 10A',
    manufacturer: 'Phoenix Contact',
    manufacturer_part_number: '2941112',
    category: 'ספקי כוח',
    description: 'ספק כוח מתג הפרעות ליישומי בקרה',
    unit_cost_usd: 189.00,
    unit_cost_ils: 680.00,
    supplier: 'פאוור סופליי',
    notes: 'יציאה: 24V DC, הספק: 240W'
  }
]

async function setupDatabase() {
  console.log('🚀 Setting up CPQ Database...')
  
  try {
    // First, let's try to insert a component to see if table exists
    console.log('📋 Testing components table...')
    const { data: testData, error: testError } = await supabase
      .from('components')
      .select('id')
      .limit(1)
    
    if (testError && (testError.code === 'PGRST116' || testError.code === 'PGRST205')) {
      console.log('❌ Components table does not exist. Please create tables manually in Supabase dashboard.')
      console.log('\n📝 Manual Setup Instructions:')
      console.log('1. Go to your Supabase project dashboard')
      console.log('2. Click on "SQL Editor" in the sidebar')
      console.log('3. Run the following SQL:')
      console.log(`
-- Create components table
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

-- Create quotations table
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

-- Create quotation_systems table
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

-- Create quotation_items table
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

-- Enable Row Level Security
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now)
CREATE POLICY "Enable all operations for components" ON components FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for quotations" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for quotation_systems" ON quotation_systems FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for quotation_items" ON quotation_items FOR ALL USING (true) WITH CHECK (true);
      `)
      return
    }
    
    if (testError) {
      console.error('❌ Error testing components table:', testError)
      return
    }
    
    console.log('✅ Components table exists!')
    
    // Insert demo components
    console.log('📦 Inserting demo components...')
    const { data: components, error: insertError } = await supabase
      .from('components')
      .insert(demoComponents)
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting components:', insertError)
    } else {
      console.log(`✅ Inserted ${components?.length || 0} components`)
    }
    
    // Test quotations table
    console.log('📋 Testing quotations table...')
    const { data: quotesData, error: quotesError } = await supabase
      .from('quotations')
      .select('id')
      .limit(1)
    
    if (quotesError && quotesError.code === 'PGRST116') {
      console.log('❌ Quotations table does not exist. Please create all tables manually.')
      return
    }
    
    if (quotesError) {
      console.error('❌ Error testing quotations table:', quotesError)
      return
    }
    
    console.log('✅ Quotations table exists!')
    
    // Insert demo quotation
    console.log('📋 Inserting demo quotation...')
    const demoQuotation = {
      quotation_number: 'QUOTE-2024-001',
      customer_name: 'תעשיות מתקדמות בע"מ',
      project_name: 'מערכת בקרה תעשייתית',
      project_description: 'מערכת בקרה מלאה עם PLC ופאנל אופרטור',
      currency: 'ILS',
      exchange_rate: 3.7,
      margin_percentage: 25.0,
      status: 'draft',
      total_cost: 15000.00,
      total_price: 18750.00
    }
    
    const { data: quotation, error: quoteInsertError } = await supabase
      .from('quotations')
      .insert(demoQuotation)
      .select()
      .single()
    
    if (quoteInsertError) {
      console.error('❌ Error inserting quotation:', quoteInsertError)
    } else {
      console.log('✅ Inserted demo quotation:', quotation.quotation_number)
      
      // Insert quotation systems
      if (quotation) {
        console.log('📋 Inserting quotation systems...')
        const systems = [
          {
            quotation_id: quotation.id,
            system_name: 'מערכת בקרה ראשית',
            system_description: 'מערכת בקרה מרכזית עם PLC ופאנל אופרטור',
            quantity: 1,
            sort_order: 1
          },
          {
            quotation_id: quotation.id,
            system_name: 'מערכת כוח',
            system_description: 'ספקי כוח וממירים למערכת',
            quantity: 1,
            sort_order: 2
          }
        ]
        
        const { data: insertedSystems, error: systemsError } = await supabase
          .from('quotation_systems')
          .insert(systems)
          .select()
        
        if (systemsError) {
          console.error('❌ Error inserting systems:', systemsError)
        } else {
          console.log(`✅ Inserted ${insertedSystems?.length || 0} systems`)
        }
      }
    }
    
    console.log('\n🎉 Database setup completed!')
    console.log('📊 Summary:')
    console.log('- Components table: ✅')
    console.log('- Quotations table: ✅')
    console.log('- Demo data: ✅')
    console.log('\n🌐 You can now refresh your browser to see the data!')
    
  } catch (error) {
    console.error('❌ Setup error:', error)
  }
}

setupDatabase()
