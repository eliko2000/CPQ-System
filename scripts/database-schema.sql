-- CPQ System Database Schema
-- Run this in your Supabase SQL Editor

-- Create components table
CREATE TABLE IF NOT EXISTS components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT,
  manufacturer_part_number TEXT,
  category TEXT,
  component_type TEXT NOT NULL DEFAULT 'hardware' CHECK (component_type IN ('hardware', 'software', 'labor')),
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
  assembly_id UUID REFERENCES assemblies(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  manufacturer TEXT,
  manufacturer_part_number TEXT,
  item_type TEXT NOT NULL DEFAULT 'hardware' CHECK (item_type IN ('hardware', 'software', 'labor')),
  labor_subtype TEXT CHECK (labor_subtype IN ('engineering', 'commissioning', 'installation', 'programming')),
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

-- User settings persistence (categories, pricing defaults, company info, etc.)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_setting UNIQUE(user_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_lookup
ON user_settings(user_id, setting_key);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);

-- Update trigger for user_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Assemblies table (הרכבות)
-- Stores assembly metadata; total price is calculated dynamically
CREATE TABLE IF NOT EXISTS assemblies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_complete BOOLEAN DEFAULT true, -- False if referenced components were deleted
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assembly components junction table
-- Links assemblies to their constituent components with quantities
CREATE TABLE IF NOT EXISTS assembly_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  component_id UUID REFERENCES components(id) ON DELETE SET NULL, -- Allow NULL for deleted components
  component_name TEXT NOT NULL, -- Snapshot of component name (preserved if component deleted)
  component_manufacturer TEXT, -- Snapshot for reference
  component_part_number TEXT, -- Snapshot for reference
  quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Indexes for assembly queries
CREATE INDEX IF NOT EXISTS idx_assembly_components_assembly_id ON assembly_components(assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_components_component_id ON assembly_components(component_id);

-- Enable Row Level Security
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_components ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now)
CREATE POLICY "Enable all operations for assemblies" ON assemblies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for assembly_components" ON assembly_components FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update assemblies.updated_at
DROP TRIGGER IF EXISTS update_assemblies_updated_at ON assemblies;
CREATE TRIGGER update_assemblies_updated_at
BEFORE UPDATE ON assemblies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to mark assembly as incomplete when component is deleted
CREATE OR REPLACE FUNCTION mark_assembly_incomplete_on_component_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all assemblies containing this component as incomplete
  UPDATE assemblies
  SET is_complete = false, updated_at = NOW()
  WHERE id IN (
    SELECT DISTINCT assembly_id
    FROM assembly_components
    WHERE component_id = OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to mark assemblies as incomplete when component is deleted
DROP TRIGGER IF EXISTS component_delete_mark_assemblies_incomplete ON components;
CREATE TRIGGER component_delete_mark_assemblies_incomplete
BEFORE DELETE ON components
FOR EACH ROW
EXECUTE FUNCTION mark_assembly_incomplete_on_component_delete();
