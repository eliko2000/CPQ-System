#!/bin/bash
# Fix all incorrectly prefixed imports from Phase 2.1

cd "$(dirname "$0")/.."

# SettingsPage lucide imports
sed -i 's/_Save/Save/g; s/_Check/Check/g; s/_AlertCircle/AlertCircle/g' src/components/settings/SettingsPage.tsx

# AssemblyComponent import
sed -i 's/_AssemblyComponent/AssemblyComponent/g' src/hooks/__tests__/useAssemblies.test.ts

# DbAssemblyComponent and Component
sed -i 's/_DbAssemblyComponent/DbAssemblyComponent/g; s/, _Component/, Component/g' src/hooks/useAssemblies.ts

# Assembly_Component
sed -i 's/_Assembly_Component/Assembly_Component/g' src/hooks/useAssemblies.ts

echo "✓ Fixed all underscore-prefixed imports"
