#!/bin/bash
# Fix type issues in test files

cd "$(dirname "$0")/.."

# useComponents.test.ts - Change null to undefined for optional fields
sed -i 's/laborSubtype: null/laborSubtype: undefined/g' src/hooks/__tests__/useComponents.test.ts
sed -i 's/componentType: null/componentType: undefined/g' src/hooks/__tests__/useComponents.test.ts
sed -i 's/productType: null/productType: undefined/g' src/hooks/__tests__/useComponents.test.ts
sed -i 's/unitCostUSD: null/unitCostUSD: undefined/g' src/hooks/__tests__/useComponents.test.ts
sed -i 's/unitCostEUR: null/unitCostEUR: undefined/g' src/hooks/__tests__/useComponents.test.ts
sed -i 's/currency: null/currency: undefined/g' src/hooks/__tests__/useComponents.test.ts
sed -i 's/originalCost: null/originalCost: undefined/g' src/hooks/__tests__/useComponents.test.ts
sed -i 's/notes: null/notes: undefined/g' src/hooks/__tests__/useComponents.test.ts

echo "✓ Fixed test type issues"
