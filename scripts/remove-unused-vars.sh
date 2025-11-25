#!/bin/bash
# Remove truly unused variables

cd "$(dirname "$0")/.."

# Remove unused React imports (no longer needed in React 18+)
sed -i '1s/^import React from .react.//' src/components/debug/TypeSystemDebug.tsx
sed -i '1s/^import React from .react.//' src/components/projects/ProjectDetailPage.tsx
sed -i '1s/^import React from .react.//' src/components/projects/ProjectList.tsx
sed -i '1s/^import React from .react.//' src/components/quotations/ProjectPicker.tsx
sed -i '1s/^import React from .react.//' src/components/quotations/QuotationStatisticsPanel.tsx
sed -i '1s/^import React from .react.//' src/components/quotations/QuotationStatisticsPanelSimplified.tsx

# Remove unused Download import
sed -i '/^import.*Download.*from/d' src/components/supplier-quotes/SupplierQuoteDetailsDrawer.tsx

# Remove unused uploadedFile variable
sed -i '/const uploadedFile = /d' src/components/supplier-quotes/SupplierQuoteImport.tsx

# Remove unused isLastBeforeSettings
sed -i '/const isLastBeforeSettings = /d' src/components/shared/Sidebar.tsx

# Remove unused validation
sed -i '/const _validation = /d' src/components/quotations/QuotationStatisticsPanel.tsx

# Remove unused functions in SettingsPage
sed -i '/const _getDefaultSettings = /,/^}/d' src/components/settings/SettingsPage.tsx
sed -i '/const _validateSettings = /,/^}/d' src/components/settings/SettingsPage.tsx
sed -i '/const _applySettings = /,/^}/d' src/components/settings/SettingsPage.tsx

echo "✓ Removed unused variables"
