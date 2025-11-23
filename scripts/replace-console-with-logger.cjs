#!/usr/bin/env node
/**
 * Script to replace console.log/warn/error with logger across all source files
 *
 * Usage: node scripts/replace-console-with-logger.js
 */

const fs = require('fs');
const path = require('path');

// Files to process (all remaining files with console statements)
const files = [
  'src/components/library/ComponentLibrary.tsx',
  'src/components/library/EnhancedComponentGrid.tsx',
  'src/components/library/ComponentAIImport.tsx',
  'src/components/quotations/QuotationEditor.tsx',
  'src/components/quotations/QuotationDataGrid.tsx',
  'src/components/projects/BOMEditor.tsx',
  'src/components/projects/ProjectList.tsx',
  'src/components/projects/ProjectDetailPage.tsx',
  'src/components/supplier-quotes/SupplierQuotesPage.tsx',
  'src/components/supplier-quotes/SupplierQuoteImport.tsx',
  'src/components/supplier-quotes/SupplierQuoteDetailsDrawer.tsx',
  'src/components/analytics/ExportButton.tsx',
  'src/components/settings/SettingsPage.tsx',
  'src/components/shared/Sidebar.tsx',
  'src/components/shared/AppRoutes.tsx',
  'src/components/grid/CustomHeader.tsx',
  'src/components/grid/StatusCellEditor.tsx',
  'src/components/grid/CustomSetFilter.ts',
  'src/components/debug/DatabaseTestPanel.tsx',
  'src/constants/settings.ts',
];

let totalFiles = 0;
let totalReplacements = 0;

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let fileReplacements = 0;

  // Check if logger import already exists
  const hasLoggerImport = content.includes("from '@/lib/logger'") ||
                          content.includes('from "../lib/logger"') ||
                          content.includes("from '../../lib/logger'") ||
                          content.includes("from '../../../lib/logger'");

  // Add logger import if not present
  if (!hasLoggerImport && /console\.(log|warn|error|info|debug)/.test(content)) {
    // Find the last import statement
    const importRegex = /^import .+ from .+$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;

      content = content.slice(0, insertPosition) +
                "\nimport { logger } from '@/lib/logger'" +
                content.slice(insertPosition);
      fileReplacements++;
    }
  }

  // Replace console statements
  // console.log → logger.debug (for debugging)
  const logMatches = content.match(/console\.log/g);
  if (logMatches) {
    content = content.replace(/console\.log/g, 'logger.debug');
    fileReplacements += logMatches.length;
  }

  // console.info → logger.info
  const infoMatches = content.match(/console\.info/g);
  if (infoMatches) {
    content = content.replace(/console\.info/g, 'logger.info');
    fileReplacements += infoMatches.length;
  }

  // console.warn → logger.warn
  const warnMatches = content.match(/console\.warn/g);
  if (warnMatches) {
    content = content.replace(/console\.warn/g, 'logger.warn');
    fileReplacements += warnMatches.length;
  }

  // console.error → logger.error
  const errorMatches = content.match(/console\.error/g);
  if (errorMatches) {
    content = content.replace(/console\.error/g, 'logger.error');
    fileReplacements += errorMatches.length;
  }

  // console.debug → logger.debug
  const debugMatches = content.match(/console\.debug/g);
  if (debugMatches) {
    content = content.replace(/console\.debug/g, 'logger.debug');
    fileReplacements += debugMatches.length;
  }

  // Write back if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath} - ${fileReplacements} replacements`);
    totalFiles++;
    totalReplacements += fileReplacements;
  } else {
    console.log(`⏭️  ${filePath} - no changes needed`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`🎉 Complete! Updated ${totalFiles} files`);
console.log(`📝 Total replacements: ${totalReplacements}`);
console.log('='.repeat(50));
