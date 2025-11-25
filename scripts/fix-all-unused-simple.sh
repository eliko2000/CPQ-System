#!/bin/bash
# Fix all simple unused variable issues in one pass

cd "$(dirname "$0")/.."

# ComponentAnalytics - remove unused imports and prefix unused param
sed -i '/import.*Legend.*recharts/d' src/components/analytics/ComponentAnalytics.tsx
sed -i 's/renderLabel={(entry)/renderLabel={(_entry)/' src/components/analytics/ComponentAnalytics.tsx

# TypeSystemDebug - remove React import
sed -i '/^import React/d' src/components/debug/TypeSystemDebug.tsx

# AssemblyForm - remove Plus import
sed -i 's/import { Plus }/import { }/' src/components/library/AssemblyForm.tsx
sed -i '/^import { }$/d' src/components/library/AssemblyForm.tsx

# ComponentLibrary - remove useComponents import
sed -i '/^import.*useComponents.*$/d' src/components/library/ComponentLibrary.tsx

# ProjectDetailPage - remove React import
sed -i '/^import React/d' src/components/projects/ProjectDetailPage.tsx

# ProjectList - remove React and GridReadyEvent imports
sed -i '/^import React/d' src/components/projects/ProjectList.tsx
sed -i 's/GridReadyEvent, //' src/components/projects/ProjectList.tsx

# ProjectPicker - remove React import  
sed -i '/^import React/d' src/components/quotations/ProjectPicker.tsx

# QuotationStatisticsPanel - remove React, icons, and validation
sed -i '/^import React/d' src/components/quotations/QuotationStatisticsPanel.tsx
sed -i 's/, TrendingUp, TrendingDown, Minus//' src/components/quotations/QuotationStatisticsPanel.tsx
sed -i '/const validateStatistics/,/^}/d' src/components/quotations/QuotationStatisticsPanel.tsx

# QuotationStatisticsPanelSimplified - remove React import
sed -i '/^import React/d' src/components/quotations/QuotationStatisticsPanelSimplified.tsx

# SettingsPage - remove unused imports and functions
sed -i 's/Save, //' src/components/settings/SettingsPage.tsx
sed -i 's/, Check//' src/components/settings/SettingsPage.tsx
sed -i 's/, AlertCircle//' src/components/settings/SettingsPage.tsx
sed -i '/const _getDefaultSettings/,/^  }/d' src/components/settings/SettingsPage.tsx
sed -i '/const _validateSettings/,/^  }/d' src/components/settings/SettingsPage.tsx
sed -i '/const _applySettings/,/^  }/d' src/components/settings/SettingsPage.tsx

# SupplierQuoteDetailsDrawer - remove Download import
sed -i '/import.*Download.*lucide/d' src/components/supplier-quotes/SupplierQuoteDetailsDrawer.tsx

# useComponents - remove dbToComponent declaration
sed -i '/const dbToComponent/,/^  }/d' src/hooks/useComponents.ts

# useSupplierQuotes - remove Component import and quoteId variable
sed -i 's/Component, //' src/hooks/useSupplierQuotes.ts
sed -i '/const quoteId = /d' src/hooks/useSupplierQuotes.ts

# useAssemblies - prefix unused imports
sed -i 's/DbAssemblyComponent/_DbAssemblyComponent/' src/hooks/useAssemblies.ts
sed -i 's/Component,/_Component,/' src/hooks/useAssemblies.ts

echo "✓ Fixed all simple unused variable issues"
