# Database Schema & Business Logic

## Core Tables

### components
```sql
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  manufacturer_part_number VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  unit_cost_usd DECIMAL(10,2),
  unit_cost_ils DECIMAL(10,2),
  unit_cost_eur DECIMAL(10,2),
  currency TEXT CHECK (currency IN ('NIS', 'USD', 'EUR')) DEFAULT 'NIS',
  original_cost DECIMAL(12,2),
  supplier VARCHAR(255),
  lead_time_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### quotations
```sql
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  version INTEGER DEFAULT 1,
  customer_name VARCHAR(255) NOT NULL,
  project_name VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'ILS',
  exchange_rate DECIMAL(10,4) DEFAULT 3.7000,
  margin_percentage DECIMAL(5,2) DEFAULT 25.00,
  status VARCHAR(20) DEFAULT 'draft',
  total_cost DECIMAL(12,2),
  total_price DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Key TypeScript Types

### QuotationProject
```typescript
interface QuotationProject {
  id: string;
  name: string;
  customerName: string;
  status: 'draft' | 'sent' | 'won' | 'lost';
  systems: QuotationSystem[];
  parameters: QuotationParameters;
  items: QuotationItem[];
}
```

### QuotationParameters
```typescript
interface QuotationParameters {
  usdToIlsRate: number;
  eurToIlsRate: number;
  markupPercent: number;
  dayWorkCost: number;
  profitPercent: number;
  riskPercent: number;
  includeVAT: boolean;
  vatRate: number;
}
```

## Price Calculations

### Unit Price Conversion
```typescript
// USD to ILS
const priceILS = priceUSD * exchangeRate;

// ILS to USD
const priceUSD = priceILS / exchangeRate;
```

### Markup Application
```typescript
const customerPrice = unitCost * (1 + markupPercent / 100);
```

### Total Quotation Calculation
```
1. hardwareTotal = Σ(item.quantity × item.unitPrice)
2. laborTotal = Σ(item.quantity × dayWorkCost)
3. subtotal = hardwareTotal + laborTotal
4. customerPrice = subtotal × (1 + markupPercent / 100)
5. withRisk = customerPrice × (1 + riskPercent / 100)
6. finalTotal = withRisk × (1 + vatRate / 100)
```

## Database Patterns

All database operations go through `cpqService.ts`:
1. Optimistic UI update first
2. Sync to Supabase
3. Handle errors with toast
4. Validate pricing integrity

Never query Supabase directly from components.
