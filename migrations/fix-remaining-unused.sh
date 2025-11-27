#!/bin/bash
# Fix remaining unused variables in production code

cd "$(dirname "$0")/.."

# Remove unused React imports (React 18 doesn't need them)
sed -i '1s/^import React from .react.$//' src/components/debug/TypeSystemDebug.tsx
sed -i '1s/^import React from .react.$//' src/components/projects/ProjectDetailPage.tsx
sed -i '1s/^import React from .react.$//' src/components/projects/ProjectList.tsx
sed -i '1s/^import React from .react.$//' src/components/quotations/ProjectPicker.tsx
sed -i '1s/^import React from .react.$//' src/components/quotations/QuotationStatisticsPanel.tsx
sed -i '1s/^import React from .react.$//' src/components/quotations/QuotationStatisticsPanelSimplified.tsx

# Remove unused import: Legend from ComponentAnalytics
sed -i '/import.*Legend.*recharts/d' src/components/analytics/ComponentAnalytics.tsx

# Remove unused import: Plus from AssemblyForm
sed -i 's/, Plus//' src/components/library/AssemblyForm.tsx

# Remove unused variable: addComponent from ComponentLibrary
sed -i '/const.*addComponent.*=/d' src/components/library/ComponentLibrary.tsx

# Remove unused imports from QuotationStatisticsPanel
sed -i 's/, TrendingUp, TrendingDown, Minus//' src/components/quotations/QuotationStatisticsPanel.tsx
sed -i '/const.*validateStatistics.*=/d' src/components/quotations/QuotationStatisticsPanel.tsx

# Remove unused imports from SettingsPage
sed -i 's/Save, //' src/components/settings/SettingsPage.tsx
sed -i 's/, Check//' src/components/settings/SettingsPage.tsx  
sed -i 's/, AlertCircle//' src/components/settings/SettingsPage.tsx
sed -i '/const.*_getDefaultSettings.*=/,/^}/d' src/components/settings/SettingsPage.tsx
sed -i '/const.*_validateSettings.*=/,/^}/d' src/components/settings/SettingsPage.tsx
sed -i '/const.*_applySettings.*=/,/^}/d' src/components/settings/SettingsPage.tsx

# Fix Sidebar unused index parameter
sed -i 's/(item, index)/(item, _index)/g' src/components/shared/Sidebar.tsx

# Remove unused import from SupplierQuoteDetailsDrawer
sed -i '/import.*Download.*lucide-react/d' src/components/supplier-quotes/SupplierQuoteDetailsDrawer.tsx

# Remove unused variable from SupplierQuoteImport
sed -i '/const.*uploadedFile.*=/d' src/components/supplier-quotes/SupplierQuoteImport.tsx

# Remove unused variable from useComponents
sed -i '/const.*dbToComponent.*=/d' src/hooks/useComponents.ts

# Remove unused import from useSupplierQuotes
sed -i 's/Component, //' src/hooks/useSupplierQuotes.ts
sed -i '/const.*quoteId.*=/d' src/hooks/useSupplierQuotes.ts

# Remove unused imports from componentMatcher
sed -i '/^import Fuse/d' src/services/componentMatcher.ts

# Remove unused imports from documentParser  
sed -i '/^import.*parseExcelFile.*$/d' src/services/documentParser.ts
sed -i '/^import.*parsePDFFile.*$/d' src/services/documentParser.ts

echo "✓ Fixed remaining unused variables and imports"
