-- CPQ System Database Schema
-- Create tables for components, quotations, quotation_systems, and quotation_items

-- Components Table: Master library of all purchasable items
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

-- Quotations Table: Main quotation records
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

-- Quotation Systems Table: Systems/assemblies within quotations
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

-- Quotation Items Table: Individual items within systems
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
CREATE INDEX IF NOT EXISTS idx_components_manufacturer ON components(manufacturer);
CREATE INDEX IF NOT EXISTS idx_components_active ON components(is_active);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotation_systems_quotation_id ON quotation_systems(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_system_id ON quotation_items(quotation_system_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_component_id ON quotation_items(component_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_components_updated_at
  BEFORE UPDATE ON components
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_quotation_systems_updated_at
  BEFORE UPDATE ON quotation_systems
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_quotation_items_updated_at
  BEFORE UPDATE ON quotation_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - can be restricted later)
CREATE POLICY "Enable all operations for components" ON components
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for quotations" ON quotations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for quotation_systems" ON quotation_systems
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for quotation_items" ON quotation_items
  FOR ALL USING (true) WITH CHECK (true);
