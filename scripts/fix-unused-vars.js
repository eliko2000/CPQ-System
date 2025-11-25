/**
 * Script to automatically fix unused variable warnings by prefixing them with underscore
 * Run with: node scripts/fix-unused-vars.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of unused variables to fix (from ESLint output)
const fixes = [
  // ComponentAnalytics.tsx
  { file: 'src/components/analytics/ComponentAnalytics.tsx', line: 22, old: 'Legend', new: '_Legend' },

  // CustomHeader.filter.test.tsx
  { file: 'src/components/grid/__tests__/CustomHeader.filter.test.tsx', line: 84, old: 'expectedModel', new: '_expectedModel' },
  { file: 'src/components/grid/__tests__/CustomHeader.filter.test.tsx', line: 105, old: 'expectedModel', new: '_expectedModel' },
  { file: 'src/components/grid/__tests__/CustomHeader.filter.test.tsx', line: 207, old: 'expectedModel', new: '_expectedModel' },

  // CustomHeader.integration.test.tsx
  { file: 'src/components/grid/__tests__/CustomHeader.integration.test.tsx', line: 5, old: 'SmartFilter', new: '_SmartFilter' },
  { file: 'src/components/grid/__tests__/CustomHeader.integration.test.tsx', line: 87, old: 'container', new: '_container' },
  { file: 'src/components/grid/__tests__/CustomHeader.integration.test.tsx', line: 207, old: 'user', new: '_user' },

  // AssemblyForm.tsx
  { file: 'src/components/library/AssemblyForm.tsx', line: 7, old: 'Plus', new: '_Plus' },

  // ComponentLibrary.tsx
  { file: 'src/components/library/ComponentLibrary.tsx', line: 30, old: 'addComponent', new: '_addComponent' },

  // ComponentLibrary.test.tsx
  { file: 'src/components/library/__tests__/ComponentLibrary.test.tsx', line: 2, old: 'fireEvent', new: '_fireEvent' },
  { file: 'src/components/library/__tests__/ComponentLibrary.test.tsx', line: 2, old: 'within', new: '_within' },

  // ProjectList.tsx
  { file: 'src/components/projects/ProjectList.tsx', line: 3, old: 'GridReadyEvent', new: '_GridReadyEvent' },
  { file: 'src/components/projects/ProjectList.tsx', line: 440, old: 'index', new: '_index' },

  // QuotationStatisticsPanel.tsx
  { file: 'src/components/quotations/QuotationStatisticsPanel.tsx', line: 14, old: 'TrendingUp', new: '_TrendingUp' },
  { file: 'src/components/quotations/QuotationStatisticsPanel.tsx', line: 14, old: 'TrendingDown', new: '_TrendingDown' },
  { file: 'src/components/quotations/QuotationStatisticsPanel.tsx', line: 14, old: 'Minus', new: '_Minus' },
  { file: 'src/components/quotations/QuotationStatisticsPanel.tsx', line: 31, old: 'validation', new: '_validation' },

  // QuotationEditor.test.tsx
  { file: 'src/components/quotations/__tests__/QuotationEditor.test.tsx', line: 148, old: 'columnDefs', new: '_columnDefs' },
  { file: 'src/components/quotations/__tests__/QuotationEditor.test.tsx', line: 181, old: 'quotation', new: '_quotation' },
  { file: 'src/components/quotations/__tests__/QuotationEditor.test.tsx', line: 205, old: 'assembly', new: '_assembly' },
  { file: 'src/components/quotations/__tests__/QuotationEditor.test.tsx', line: 205, old: 'rates', new: '_rates' },
  { file: 'src/components/quotations/__tests__/QuotationEditor.test.tsx', line: 217, old: 'pricing', new: '_pricing' },

  // SettingsPage.tsx
  { file: 'src/components/settings/SettingsPage.tsx', line: 9, old: 'Save', new: '_Save' },
  { file: 'src/components/settings/SettingsPage.tsx', line: 13, old: 'Check', new: '_Check' },
  { file: 'src/components/settings/SettingsPage.tsx', line: 14, old: 'AlertCircle', new: '_AlertCircle' },
  { file: 'src/components/settings/SettingsPage.tsx', line: 116, old: 'getDefaultSettings', new: '_getDefaultSettings' },
  { file: 'src/components/settings/SettingsPage.tsx', line: 190, old: 'validateSettings', new: '_validateSettings' },
  { file: 'src/components/settings/SettingsPage.tsx', line: 231, old: 'applySettings', new: '_applySettings' },
];

console.log(`Fixing ${fixes.length} unused variable warnings...`);

// Group fixes by file
const fileGroups = {};
fixes.forEach(fix => {
  if (!fileGroups[fix.file]) {
    fileGroups[fix.file] = [];
  }
  fileGroups[fix.file].push(fix);
});

// Process each file
Object.keys(fileGroups).forEach(relPath => {
  const filePath = path.join(path.dirname(__dirname), relPath);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Apply fixes for this file (in reverse order to preserve line numbers)
    const fileFixes = fileGroups[relPath].sort((a, b) => b.line - a.line);

    fileFixes.forEach(fix => {
      const lineIndex = fix.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        // Replace only the first occurrence of the old name on this line
        lines[lineIndex] = lines[lineIndex].replace(
          new RegExp(`\\b${fix.old}\\b`),
          fix.new
        );
      }
    });

    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed ${fileFixes.length} issues in ${relPath}`);
  } catch (error) {
    console.error(`✗ Error fixing ${relPath}:`, error.message);
  }
});

console.log('\nDone! Run `npm run lint` to verify.');
