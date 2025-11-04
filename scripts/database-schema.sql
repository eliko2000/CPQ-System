-- CPQ System Database Schema
-- Run this in your Supabase SQL Editor

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
  unit_cost_eur DECIMAL(12,2),
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
  quotation_number TEXT NOT NULL,
  version INTEGER DEFAULT 1,
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quotation_number, version)
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

-- Table configuration persistence
CREATE TABLE IF NOT EXISTS user_table_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    table_name TEXT NOT NULL, -- 'component_library' or 'quotation_editor'
    config JSONB NOT NULL, -- stores: columnOrder, columnWidths, visibleColumns, filterState
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, table_name)
);

ALTER TABLE user_table_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for user_table_configs" ON user_table_configs FOR ALL USING (true) WITH CHECK (true);
